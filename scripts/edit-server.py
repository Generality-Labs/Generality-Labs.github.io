#!/usr/bin/env python3
"""Local dev server with in-place prose editing.

Serves the repo like `python -m http.server` did, plus:
  · injects the gl-edit client script into blog post pages, so prose becomes
    editable in the browser (localhost only — staging/prod never see this);
  · POST /__edit/save applies edited blocks back to the post's index.qmd,
    matching blocks by position and verifying against the original text
    before touching anything;
  · POST /__edit/render re-renders the post in the background.

Run from repo root:  python3 scripts/edit-server.py [port]
"""
import json
import os
import re
import subprocess
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
RENDER_LOCK = threading.Lock()
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# review comments on the local editing page: the widget is injected alongside
# gl-edit and /api/comments is proxied to staging (shared D1), so James sees
# reviewers' comments in place while editing
STAGING = "https://benchmark-saturation.generality-site.pages.dev"

def _review_key():
    try:
        for line in open(os.path.join(REPO, "..", ".env")):
            if line.startswith("GL_REVIEW_KEY="):
                return line.split("=", 1)[1].strip()
    except OSError:
        pass
    return ""

REVIEW_KEY = _review_key()
INJECT = (b'<script src="/assets/gl-edit/gl-edit.js" defer></script>'
          + (b'<script>try{localStorage.setItem("gl_review_key","'
             + REVIEW_KEY.encode() + b'")}catch(e){}</script>'
             b'<script type="module" src="/assets/gl-comments/gl-comments.js"></script>'
             if REVIEW_KEY else b"")
          + b'</body>')

LIST_RE = re.compile(r"^(\s*)([-*+]|\d+[.)])\s")


def parse_segments(text):
    """Split qmd into segments: prose blocks (editable) and everything else
    (YAML, code fences, blank runs), preserving byte-exact reconstruction."""
    lines = text.split("\n")
    segs = []  # (kind, [lines]) kind: 'prose' | 'other'
    i, n = 0, len(lines)

    def push(kind, chunk):
        if chunk:
            segs.append([kind, chunk])

    # YAML frontmatter
    if lines and lines[0].strip() == "---":
        j = 1
        while j < n and lines[j].strip() != "---":
            j += 1
        push("other", lines[: j + 1])
        i = j + 1

    while i < n:
        line = lines[i]
        if line.strip().startswith("```"):
            j = i + 1
            while j < n and not lines[j].strip().startswith("```"):
                j += 1
            push("other", lines[i : j + 1])
            i = j + 1
        elif not line.strip():
            j = i
            while j < n and not lines[j].strip():
                j += 1
            push("other", lines[i:j])
            i = j
        else:
            j = i
            while j < n and lines[j].strip() and not lines[j].strip().startswith("```"):
                j += 1
            push("prose", lines[i:j])
            i = j

    # Merge consecutive prose segments that belong to one loose list: a prose
    # segment starting with a list marker absorbs following list/indented
    # segments across single blank lines, matching how quarto renders one <ol>.
    merged = []
    for seg in segs:
        if (
            seg[0] == "prose"
            and merged
            and len(merged) >= 2
            and merged[-1][0] == "other"
            and all(not l.strip() for l in merged[-1][1])
            and len(merged[-1][1]) == 1
            and merged[-2][0] == "prose"
            and LIST_RE.match(merged[-2][1][0])
            and (LIST_RE.match(seg[1][0]) or seg[1][0].startswith(("  ", "\t")))
        ):
            blank = merged.pop()
            merged[-1][1] += blank[1] + seg[1]
        else:
            merged.append(seg)
    return merged


def norm(s):
    """Alphanumeric skeleton for verifying a block is what the client saw."""
    s = re.sub(r"\[\^[^\]]+\]", "", s)              # footnote refs -> gone
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)  # links -> text
    s = re.sub(r"(?m)^\s*(?:[-*+]|\d+[.)])\s+", "", s)  # list markers
    return re.sub(r"[^a-z0-9]", "", s.lower())[:80]


def annotate_footnotes(html, qmd_path):
    """Rendered footnote refs (<a href="#fnN" class="footnote-ref">) lose their
    source label (only the number survives), so gl-edit can't round-trip
    [^label]. Reconstruct the number->label map from the qmd (Quarto numbers
    footnotes by first-reference order) and stamp data-md="[^label]" onto each
    ref so the editor writes the footnote back faithfully."""
    if not os.path.exists(qmd_path):
        return html
    with open(qmd_path, encoding="utf-8") as f:
        q = f.read()
    labels = []
    for m in re.finditer(r"\[\^([^\]]+)\]", q):
        if q[m.end():m.end() + 1] == ":":   # a definition, not a reference
            continue
        if m.group(1) not in labels:
            labels.append(m.group(1))
    if not labels:
        return html
    def add(mo):
        n = int(mo.group(1))
        if 1 <= n <= len(labels):
            return f'{mo.group(0)[:-1]} data-md="[^{labels[n - 1]}]">'
        return mo.group(0)
    return re.sub(r'<a href="#fn(\d+)" class="footnote-ref"[^>]*>', add, html)


def ojs_fences(segs):
    """Positions of ojs fence segments, in document order (1-indexed by the
    client via quarto's ojs-cell-<fence>[-<statement>] div ids)."""
    return [pos for pos, (kind, chunk) in enumerate(segs)
            if kind == "other" and chunk and chunk[0].strip().startswith("```{ojs}")]


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    # local dev must never serve stale modules: browsers heuristically cache
    # responses that lack Cache-Control, which bit us with gl.js
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    # -- /api/comments proxy to staging (shared review database) -----------
    def proxy_comments(self):
        import urllib.request
        length = int(self.headers.get("Content-Length") or 0)
        data = self.rfile.read(length) if length else None
        req = urllib.request.Request(STAGING + self.path, data=data, method=self.command)
        # cloudflare blocks urllib's default UA (error 1010)
        req.add_header("User-Agent", "Mozilla/5.0 (gl-edit local proxy)")
        req.add_header("x-gl-key", self.headers.get("x-gl-key") or REVIEW_KEY)
        if self.headers.get("content-type"):
            req.add_header("content-type", self.headers["content-type"])
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                body = r.read()
                self.send_response(r.status)
        except urllib.error.HTTPError as e:
            body = e.read()
            self.send_response(e.code)
        except OSError:
            body = b'{"error":"staging unreachable"}'
            self.send_response(502)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_PATCH(self):
        if self.path.split("?")[0] == "/api/comments":
            return self.proxy_comments()
        self.send_error(404)

    def do_DELETE(self):
        if self.path.split("?")[0] == "/api/comments":
            return self.proxy_comments()
        self.send_error(404)

    # -- static serving with client injection on post pages ---------------
    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/comments":
            return self.proxy_comments()
        if path == "/__edit/status":
            # is the rendered html behind the saved qmd?
            slug = (self.path.split("slug=", 1) + [""])[1]
            qmd = os.path.join(REPO, "blog", "posts", slug, "index.qmd")
            page = os.path.join(REPO, "blog", "posts", slug, "index.html")
            stale = bool(re.fullmatch(r"[a-z0-9-]+", slug) and os.path.exists(qmd)
                         and os.path.exists(page) and os.path.getmtime(qmd) > os.path.getmtime(page))
            return self.reply(200, {"stale": stale})
        if path.endswith("/"):
            path += "index.html"
        if re.fullmatch(r"/blog/posts/[^/]+/index\.html", path):
            fs = os.path.join(REPO, path.lstrip("/"))
            if os.path.exists(fs):
                # if the qmd is newer than the rendered html, the page would
                # LIE about current content — flag it so gl-edit blocks
                # editing, re-renders and reloads instead
                qmd = fs[: -len("index.html")] + "index.qmd"
                stale = os.path.exists(qmd) and os.path.getmtime(qmd) > os.path.getmtime(fs)
                inject = (b'<script>window.__gleStale=true</script>' if stale else b"") + INJECT
                with open(fs, "r", encoding="utf-8") as f:
                    text = f.read()
                text = annotate_footnotes(text, qmd)
                body = text.encode("utf-8").replace(b"</body>", inject, 1)
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
                return
        return super().do_GET()

    # -- edit API ----------------------------------------------------------
    def do_POST(self):
        if self.path.split("?")[0] == "/api/comments":
            return self.proxy_comments()
        try:
            body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        except Exception:
            return self.reply(400, {"error": "bad json"})

        slug = body.get("slug", "")
        qmd = os.path.join(REPO, "blog", "posts", slug, "index.qmd")
        if not re.fullmatch(r"[a-z0-9-]+", slug) or not os.path.exists(qmd):
            return self.reply(400, {"error": f"unknown post {slug!r}"})

        if self.path == "/__edit/render":
            env = dict(os.environ, PATH=os.path.expanduser("~/.local/quarto-dist/bin") + ":" + os.environ["PATH"])
            with RENDER_LOCK:  # auto-render + manual render must not race quarto
                r = subprocess.run(["quarto", "render", "index.qmd"], cwd=os.path.dirname(qmd), env=env,
                                   capture_output=True, text=True, timeout=300)
            return self.reply(200 if r.returncode == 0 else 500,
                              {"ok": r.returncode == 0, "log": r.stderr[-800:]})

        if self.path != "/__edit/save":
            return self.reply(404, {"error": "unknown endpoint"})

        with open(qmd) as f:
            segs = parse_segments(f.read())
        prose = [s for s in segs if s[0] == "prose"]

        ops = body.get("ops", [])
        force = bool(body.get("force"))

        # refuse the whole batch if the source gained/lost prose blocks since
        # the client's page loaded (e.g. the qmd was edited directly) — insert
        # ops carry no old-text to verify, so this is their only guard.
        # force skips this; replace/delete ops are then relocated by content.
        pt = body.get("prose_total")
        if pt is not None and pt != len(prose) and not force:
            return self.reply(409, {"error": "source changed outside this page — refresh to pick it up",
                                    "indices": []})

        # shell ops edit the post header (title/eyebrow), which lives in
        # _before.html rather than the qmd prose
        shell_ops = [op for op in ops if op["type"] == "shell"]
        ops = [op for op in ops if op["type"] != "shell"]
        if shell_ops:
            before = os.path.join(os.path.dirname(qmd), "_before.html")
            with open(before) as f:
                html = f.read()
            pats = {
                "title": r'(<h1 class="display-2 mb-6">)(.*?)(</h1>)',
                "eyebrow": r'(<p class="eyebrow mb-4">)(.*?)(</p>)',
                "subtitle": r'(<p class="text-xl[^"]*">)(.*?)(</p>)',
            }
            for op in shell_ops:
                m = re.search(pats.get(op["field"], r"$^"), html, re.S)
                if not m or norm(m.group(2)) != norm(op["old"]):
                    return self.reply(409, {"error": f"shell field {op['field']} mismatch", "indices": []})
                esc = op["new"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                html = html[: m.start(2)] + esc + html[m.end(2):]
            with open(before, "w") as f:
                f.write(html)
            # keep qmd YAML title in sync (title: on scaffolded posts,
            # pagetitle: "<title> - Generality Labs" on older ones)
            for op in shell_ops:
                if op["field"] == "title":
                    t = op["new"].replace('"', "'")
                    with open(qmd) as f:
                        q = f.read()
                    q = re.sub(r'(?m)^title: .*$', f'title: "{t}"', q, count=1)
                    q = re.sub(r'(?m)^pagetitle: .*$', f'pagetitle: "{t} - Generality Labs"', q, count=1)
                    with open(qmd, "w") as f:
                        f.write(q)

        failures = []
        # verify all replaces/deletes before applying anything; under force,
        # a block that moved is relocated by (unique) content match instead
        for op in ops:
            if op["type"] in ("replace", "delete"):
                idx = op["index"]
                ok = idx < len(prose) and norm("\n".join(prose[idx][1])) == norm(op["old"])
                if not ok and force:
                    hits = [i for i, p in enumerate(prose)
                            if p[1] is not None and norm("\n".join(p[1])) == norm(op["old"])]
                    if len(hits) == 1:
                        op["index"] = hits[0]
                        ok = True
                if not ok:
                    failures.append(idx)
        if failures:
            return self.reply(409, {"error": "force could not locate the original block(s)" if force
                                    else "block mismatch", "indices": failures})
        if force:
            for op in ops:
                if op["type"] == "insert" and "after_index" in op:
                    op["after_index"] = max(0, min(op["after_index"], len(prose) - 1))

        cell_ops = [op for op in ops if op["type"] == "delete-cell"]
        ops = [op for op in ops if op["type"] != "delete-cell"]
        if cell_ops:
            fences = ojs_fences(segs)
            if not force and any(op.get("fence_total") != len(fences) for op in cell_ops):
                return self.reply(409, {"error": f"fence count mismatch (server {len(fences)})", "indices": []})
            for op in cell_ops:
                if not 1 <= op["fence"] <= len(fences):
                    return self.reply(409, {"error": "fence index out of range", "indices": []})
                segs[fences[op["fence"] - 1]][1] = None

        all_fences = ojs_fences(segs)
        inserts = {}   # after-prose-index -> [md, ...]
        finserts = {}  # after-fence seg position -> [md, ...]
        for op in ops:
            if op["type"] == "replace":
                prose[op["index"]][1] = op["new"].split("\n")
            elif op["type"] == "delete":
                prose[op["index"]][1] = None
            elif op["type"] == "insert" and "after_fence" in op:
                fn = op["after_fence"]
                if not 1 <= fn <= len(all_fences):
                    return self.reply(409, {"error": "fence anchor out of range", "indices": []})
                finserts.setdefault(all_fences[fn - 1], []).append(op["new"])
            elif op["type"] == "insert":
                inserts.setdefault(op["after_index"], []).append(op["new"])

        out, pi = [], 0
        for pos, (kind, chunk) in enumerate(segs):
            if kind == "prose":
                if chunk is not None:
                    out.append("\n".join(chunk))
                if pi in inserts:
                    for md in inserts[pi]:
                        out.append("\n\n" + md)
                pi += 1
            else:
                if chunk is not None:
                    out.append("\n".join(chunk))
                if pos in finserts:
                    for md in finserts[pos]:
                        out.append("\n\n" + md)
        text = "\n".join(out)
        # deleting a block leaves doubled blank runs; collapse 3+ newlines
        text = re.sub(r"\n{3,}", "\n\n", text)
        with open(qmd, "w") as f:
            f.write(text)
        return self.reply(200, {"ok": True, "applied": len(ops)})

    def reply(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    os.chdir(REPO)
    print(f"edit server on http://0.0.0.0:{PORT} (repo: {REPO})")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
