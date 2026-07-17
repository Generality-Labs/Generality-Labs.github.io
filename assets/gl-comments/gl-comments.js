// gl-comments — Google-Docs-style margin comments for staging drafts.
//
// Injected into rendered posts by the STAGING deploy script only; the post
// source never references this file and prod never serves it. The page is
// completely inert unless a review key is present (?key=… in the shared
// review link, remembered in localStorage thereafter).
//
// How it works:
//   · Reviewers select text in the article → a "Comment" chip appears →
//     composer → POST to /api/comments (a Pages Function + D1, staging only).
//   · Comments anchor to PROSE BLOCKS (paragraphs/headings): block content
//     hash + block index + in-block offset + quote + context. Prose blocks
//     are static pandoc output, so anchors are immune to figure rendering,
//     layout scripts, and load-order — the failure mode of the old
//     whole-page text index. Anchoring logic lives in gl-anchor.mjs (pure,
//     unit-tested in review/tests/).
//   · If a block is edited the anchor recovers by position + context; if the
//     quote is gone the comment is listed as orphaned rather than misplaced.
//   · Threads render as margin cards; the active card aligns exactly beside
//     its highlight and the others flow around it.
import { makeAnchor, resolveAnchor, hashText } from "./gl-anchor.mjs";

(() => {
  "use strict";

  /* ------------------------------------------------------------ boot/auth */

  const params = new URLSearchParams(location.search);
  if (params.get("key")) {
    localStorage.setItem("gl_review_key", params.get("key"));
    params.delete("key");
    const qs = params.toString();
    history.replaceState(null, "", location.pathname + (qs ? `?${qs}` : "") + location.hash);
  }
  const KEY = localStorage.getItem("gl_review_key");
  if (!KEY) return; // no review link, no widget

  const SLUG = location.pathname.replace(/\/(index\.html)?$/, "").split("/").pop() || "home";
  const API = "/api/comments";

  const api = async (method, { query, body } = {}) => {
    const go = () => fetch(API + (query ? `?${new URLSearchParams(query)}` : ""), {
      method,
      headers: { "x-gl-key": KEY, ...(body && { "content-type": "application/json" }) },
      body: body && JSON.stringify(body),
    });
    let res;
    try {
      res = await go();
      if (res.status >= 500) throw new Error("upstream");
    } catch (_) {
      // transient network / proxy / cloudflare hiccup: one retry
      await new Promise((r) => setTimeout(r, 800));
      res = await go();
    }
    if (!res.ok) {
      const err = new Error(`${method} ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  };

  /* ------------------------------------------------------------- styling */

  const MINT = "var(--mint, #17cfb9)";
  const css = `
    .glc-hl { background: color-mix(in srgb, ${MINT} 14%, transparent);
      border-bottom: 2px solid ${MINT}; cursor: pointer; transition: background .15s; }
    .glc-hl.active, .glc-hl:hover { background: color-mix(in srgb, ${MINT} 32%, transparent); }
    .glc-hl.resolved { background: none; border-bottom: none; cursor: inherit; }
    .glc-chip { position: absolute; z-index: 60; display: inline-flex; align-items: center; gap: .35rem;
      background: var(--ink, #1a1919); color: #fff; font: 500 12.5px/1 "Geist", sans-serif;
      padding: .5rem .8rem; border-radius: 999px; cursor: pointer; border: none;
      box-shadow: 0 4px 14px rgba(0,0,0,.18); }
    .glc-chip:hover { background: #000; }
    .glc-gutter { position: absolute; top: 0; z-index: 55; }
    .glc-card { position: absolute; width: 272px; background: #fff;
      border: 1px solid var(--hairline, #e6e6e6); border-radius: 10px; padding: .8rem .9rem;
      font-family: "Geist", sans-serif; font-size: 13.5px; line-height: 1.5;
      color: var(--ink, #1a1919); box-shadow: 0 1px 4px rgba(0,0,0,.05);
      transition: top .25s ease, border-color .15s, box-shadow .15s; cursor: pointer; }
    .glc-card.active { border-color: ${MINT}; box-shadow: 0 4px 16px rgba(0,0,0,.09); cursor: default; }
    .glc-card .glc-meta { display: flex; align-items: baseline; gap: .5rem; margin-bottom: .15rem; }
    .glc-card .glc-name { font-weight: 600; }
    .glc-card .glc-time { color: var(--soft, #837878); font-size: 11.5px; }
    .glc-card .glc-body { white-space: pre-wrap; overflow-wrap: break-word; }
    .glc-card .glc-reply { margin-top: .6rem; padding-top: .6rem; border-top: 1px solid var(--hairline, #e6e6e6); }
    .glc-quote { color: var(--soft, #837878); font-size: 11.5px; border-left: 2px solid ${MINT};
      padding-left: .5rem; margin-bottom: .45rem; display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden; }
    .glc-actions { display: flex; gap: .8rem; margin-top: .55rem; }
    .glc-actions button, .glc-linkbtn { background: none; border: none; padding: 0; cursor: pointer;
      font: 500 12px "Geist", sans-serif; color: var(--mint-deep, #24857a); }
    .glc-actions button:hover, .glc-linkbtn:hover { text-decoration: underline; }
    .glc-actions .glc-danger { color: #b4443c; }
    .glc-input, .glc-ta { width: 100%; border: 1px solid var(--hairline, #e6e6e6); border-radius: 7px;
      padding: .45rem .6rem; font: 400 13.5px/1.45 "Geist", sans-serif; color: var(--ink, #1a1919);
      background: var(--bg, #fafafa); resize: vertical; box-sizing: border-box; }
    .glc-input:focus, .glc-ta:focus { outline: none; border-color: ${MINT}; }
    .glc-ta { min-height: 60px; margin-top: .4rem; }
    .glc-post { background: ${MINT}; color: #052b24; border: none; border-radius: 999px;
      font: 500 12.5px "Geist", sans-serif; padding: .45rem 1rem; cursor: pointer; }
    .glc-post:disabled { opacity: .45; cursor: default; }
    .glc-cancel { background: none; border: none; color: var(--soft, #837878);
      font: 500 12.5px "Geist", sans-serif; cursor: pointer; }
    .glc-as { font-size: 11px; color: var(--soft, #837878); margin-top: .45rem; }
    .glc-strip { max-width: 48rem; margin: 3rem auto 0; padding: 0 1.25rem;
      font-family: "Geist", sans-serif; font-size: 13.5px; color: var(--muted, #5b5858); }
    .glc-strip summary { cursor: pointer; font-weight: 500; }
    .glc-strip .glc-item { margin: .7rem 0 0 .4rem; padding-left: .7rem;
      border-left: 2px solid var(--hairline, #e6e6e6); }
    .glc-badge { position: fixed; right: 18px; bottom: 16px; z-index: 70;
      font: 500 11.5px "Geist Mono", monospace; color: var(--soft, #837878);
      background: var(--paper, #f2f2f2); border: 1px solid var(--hairline, #e6e6e6);
      padding: .35rem .7rem; border-radius: 999px; }
    @media (max-width: 1339px) {
      .glc-card { position: fixed; left: 50%; transform: translateX(-50%); width: min(340px, 92vw);
        bottom: 16px; top: auto !important; z-index: 80; display: none; }
      .glc-card.active { display: block; }
    }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const rel = (t) => {
    const m = (Date.now() - t) / 60000;
    if (m < 1) return "just now";
    if (m < 60) return `${Math.round(m)}m ago`;
    if (m < 60 * 24) return `${Math.round(m / 60)}h ago`;
    return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  /* --------------------------------------------------------- prose blocks */
  // The anchoring substrate: leaf prose blocks in document order. Their
  // textContent is static pandoc output — figures (.cell), the scrolly rail
  // and our own UI never contribute, so the same block list is rebuilt
  // identically at any point in the page lifecycle.

  const article = document.querySelector("article") || document.body;
  const EXCLUDE = ".cell, .glc-card, .glc-gutter, .glc-strip, .gl-scrolly-rail";

  function collectBlocks() {
    const els = [...article.querySelectorAll("p, h1, h2, h3, h4, li, blockquote")].filter((el) => {
      if (el.closest(EXCLUDE)) return false;
      if (el.matches("li, blockquote") && el.querySelector("p")) return false; // take the inner p
      if (el.parentElement.closest("li, blockquote") && el.matches("p")) {
        // p inside li/blockquote is the leaf; fine
      }
      return el.textContent.trim().length > 0;
    });
    return { els, texts: els.map((el) => el.textContent) };
  }

  // Text-node map for one block element (built fresh — highlight <mark>s
  // change the node list but never the concatenated text).
  function nodeMap(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let pos = 0;
    for (let n; (n = walker.nextNode()); ) {
      nodes.push({ node: n, start: pos });
      pos += n.nodeValue.length;
    }
    return nodes;
  }

  // Wrap [start, end) of a block's text in <mark class="glc-hl">.
  function paint(el, start, end, cid) {
    const marks = [];
    for (const { node, start: ns } of nodeMap(el)) {
      const ne = ns + node.nodeValue.length;
      const a = Math.max(start, ns), b = Math.min(end, ne);
      if (a >= b) continue;
      const range = document.createRange();
      range.setStart(node, a - ns);
      range.setEnd(node, b - ns);
      const mark = document.createElement("mark");
      mark.className = "glc-hl";
      mark.dataset.cid = cid;
      range.surroundContents(mark);
      marks.push(mark);
    }
    return marks;
  }

  /* ------------------------------------------------------------ identity */

  const myIds = new Set(JSON.parse(localStorage.getItem("gl_my_comments") || "[]"));
  const rememberMine = (id) => {
    myIds.add(id);
    localStorage.setItem("gl_my_comments", JSON.stringify([...myIds]));
  };
  const myName = () => localStorage.getItem("gl_reviewer_name") || "";

  /* --------------------------------------------------------------- state */

  const threads = new Map(); // id -> {root, replies, marks, card}
  const gutter = document.createElement("div");
  gutter.className = "glc-gutter";
  document.body.appendChild(gutter);

  const wideMode = () => {
    const r = article.getBoundingClientRect();
    return document.documentElement.clientWidth - r.right >= 300;
  };

  function positionCards() {
    if (!wideMode()) return; // fixed positioning handles narrow mode via CSS
    const artRect = article.getBoundingClientRect();
    const left = artRect.right + window.scrollX + 26;
    const ordered = [...threads.values()]
      .filter((t) => t.card && t.marks.length && !t.root.resolved)
      .map((t) => ({ t, y: t.marks[0].getBoundingClientRect().top + window.scrollY }))
      .sort((a, b) => a.y - b.y);
    for (const { t } of ordered) t.card.style.left = `${left}px`;
    if (!ordered.length) return;
    // docs-style: the active card sits exactly beside its highlight and the
    // others flow around it, so a clicked comment is always next to its text
    const ai = active ? ordered.findIndex((o) => o.t === threads.get(active)) : -1;
    const start = ai >= 0 ? ai : 0;
    const tops = new Array(ordered.length);
    tops[start] = ordered[start].y;
    let floor = tops[start] + ordered[start].t.card.offsetHeight + 12;
    for (let i = start + 1; i < ordered.length; i++) {
      tops[i] = Math.max(ordered[i].y, floor);
      floor = tops[i] + ordered[i].t.card.offsetHeight + 12;
    }
    let ceil = tops[start];
    for (let i = start - 1; i >= 0; i--) {
      const h = ordered[i].t.card.offsetHeight;
      tops[i] = Math.min(ordered[i].y, ceil - h - 12);
      ceil = tops[i];
    }
    ordered.forEach(({ t }, i) => { t.card.style.top = `${tops[i]}px`; });
  }

  let active = null;
  function activate(id, { scrollToMark = false } = {}) {
    if (active) {
      threads.get(active)?.card?.classList.remove("active");
      threads.get(active)?.marks.forEach((m) => m.classList.remove("active"));
    }
    active = id;
    if (!id) { positionCards(); return; }
    const t = threads.get(id);
    if (!t) return;
    t.card?.classList.add("active");
    t.marks.forEach((m) => m.classList.add("active"));
    if (scrollToMark && t.marks.length) {
      const r = t.marks[0].getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight)
        t.marks[0].scrollIntoView({ block: "center", behavior: "smooth" });
    }
    positionCards();
  }

  /* ----------------------------------------------------------- card DOM */

  const nameRow = () =>
    myName()
      ? ""
      : `<input class="glc-input" data-role="name" placeholder="Your name" style="margin-top:.4rem">`;

  function composerHTML(placeholder) {
    return `${nameRow()}
      <textarea class="glc-ta" data-role="body" placeholder="${placeholder}"></textarea>
      <div class="glc-actions" style="justify-content:flex-end; align-items:center">
        <button class="glc-cancel" data-role="cancel">Cancel</button>
        <button class="glc-post" data-role="post" disabled>Post</button>
      </div>
      ${myName() ? `<div class="glc-as">commenting as ${esc(myName())} · <button class="glc-linkbtn" data-role="rename">change</button></div>` : ""}`;
  }

  function wireComposer(el, onPost) {
    const ta = el.querySelector('[data-role="body"]');
    const nameIn = el.querySelector('[data-role="name"]');
    const post = el.querySelector('[data-role="post"]');
    const ready = () => ta.value.trim() && (myName() || nameIn?.value.trim());
    el.addEventListener("input", () => (post.disabled = !ready()));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") el.querySelector('[data-role="cancel"]')?.click();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post.click();
    });
    el.querySelector('[data-role="rename"]')?.addEventListener("click", () => {
      localStorage.removeItem("gl_reviewer_name");
      el.querySelector(".glc-as").outerHTML = nameRow();
    });
    post.addEventListener("click", async () => {
      if (!ready()) return;
      if (nameIn?.value.trim()) localStorage.setItem("gl_reviewer_name", nameIn.value.trim());
      post.disabled = true;
      post.textContent = "…";
      try {
        await onPost(ta.value.trim(), myName());
      } catch (e) {
        post.textContent = "Post";
        post.disabled = false;
        alert(
          e.status === 403
            ? "Review key not accepted — reopen the review link you were sent, then try again."
            : `Couldn't post (${e.status ?? "network error"}) — try again in a few seconds.`
        );
      }
    });
    setTimeout(() => (nameIn || ta).focus(), 30);
  }

  function commentHTML(c, isReply = false) {
    return `<div class="${isReply ? "glc-reply" : ""}" data-comment="${c.id}">
      <div class="glc-meta"><span class="glc-name">${esc(c.name)}</span>
        <span class="glc-time">${rel(c.created_at)}</span></div>
      <div class="glc-body">${esc(c.body)}</div>
    </div>`;
  }

  function renderCard(t) {
    const c = t.root;
    const card = t.card ?? document.createElement("div");
    card.className = "glc-card";
    card.dataset.thread = c.id;
    card.innerHTML = `
      ${c.quote ? `<div class="glc-quote">${esc(c.quote)}</div>` : ""}
      ${commentHTML(c)}
      ${t.replies.map((r) => commentHTML(r, true)).join("")}
      <div class="glc-actions">
        <button data-role="reply">Reply</button>
        <button data-role="resolve">Resolve</button>
        ${myIds.has(c.id) ? `<button class="glc-danger" data-role="delete">Delete</button>` : ""}
      </div>
      <div data-role="composer-slot"></div>`;
    card.querySelector('[data-role="reply"]').addEventListener("click", (e) => {
      e.stopPropagation();
      const slot = card.querySelector('[data-role="composer-slot"]');
      if (slot.childElementCount) return;
      slot.innerHTML = composerHTML("Reply…");
      slot.querySelector('[data-role="cancel"]').addEventListener("click", (e2) => {
        e2.stopPropagation();
        slot.innerHTML = "";
        positionCards();
      });
      wireComposer(slot, async (body, name) => {
        const { comment } = await api("POST", { body: { slug: SLUG, name, body, parent_id: c.id } });
        rememberMine(comment.id);
        t.replies.push(comment);
        renderCard(t);
      });
      positionCards();
    });
    card.querySelector('[data-role="resolve"]').addEventListener("click", async (e) => {
      e.stopPropagation();
      await api("PATCH", { body: { id: c.id, resolved: true } });
      c.resolved = 1;
      t.marks.forEach((m) => m.classList.add("resolved"));
      card.remove();
      t.card = null;
      renderStrip();
      positionCards();
    });
    card.querySelector('[data-role="delete"]')?.addEventListener("click", async (e) => {
      e.stopPropagation();
      await api("DELETE", { query: { id: c.id } });
      t.marks.forEach((m) => m.replaceWith(...m.childNodes));
      card.remove();
      threads.delete(c.id);
      positionCards();
    });
    card.addEventListener("click", () => activate(c.id, { scrollToMark: true }));
    card.addEventListener("mouseenter", () => t.marks.forEach((m) => m.classList.add("active")));
    card.addEventListener("mouseleave", () => {
      if (active !== c.id) t.marks.forEach((m) => m.classList.remove("active"));
    });
    if (!t.card) gutter.appendChild(card);
    t.card = card;
    positionCards();
    return card;
  }

  /* --------------------------------------------- resolved/orphaned strip */

  let strip = null;
  function renderStrip() {
    const resolved = [...threads.values()].filter((t) => t.root.resolved);
    const orphans = [...threads.values()].filter((t) => !t.root.resolved && !t.marks.length);
    strip?.remove();
    if (!resolved.length && !orphans.length) return;
    strip = document.createElement("details");
    strip.className = "glc-strip";
    const item = (t, tag) => `<div class="glc-item">
      ${t.root.quote ? `<div class="glc-quote">${esc(t.root.quote)}</div>` : ""}
      <strong>${esc(t.root.name)}</strong> ${esc(t.root.body)}
      ${tag === "resolved" ? `<button class="glc-linkbtn" data-reopen="${t.root.id}">reopen</button>` : ""}
    </div>`;
    strip.innerHTML = `<summary>${resolved.length ? `${resolved.length} resolved` : ""}${
      resolved.length && orphans.length ? " · " : ""
    }${orphans.length ? `${orphans.length} orphaned (text has changed)` : ""} comments</summary>
      ${orphans.map((t) => item(t, "orphan")).join("")}${resolved.map((t) => item(t, "resolved")).join("")}`;
    strip.querySelectorAll("[data-reopen]").forEach((b) =>
      b.addEventListener("click", async () => {
        const id = b.dataset.reopen;
        await api("PATCH", { body: { id, resolved: false } });
        const t = threads.get(id);
        t.root.resolved = 0;
        t.marks.forEach((m) => m.classList.remove("resolved"));
        renderCard(t);
        renderStrip();
      })
    );
    article.parentElement.appendChild(strip);
  }

  /* ------------------------------------------------- selection → comment */

  const chip = document.createElement("button");
  chip.className = "glc-chip";
  chip.textContent = "＋ Comment";
  chip.style.display = "none";
  document.body.appendChild(chip);

  let pendingAnchor = null;
  let authed = false; // set once the initial GET succeeds; gates all commenting UI

  document.addEventListener("mouseup", (e) => {
    if (!authed) return;
    if (chip.contains(e.target) || e.target.closest(".glc-card")) return;
    setTimeout(() => {
      const sel = getSelection();
      if (sel.isCollapsed || !article.contains(sel.anchorNode) || !article.contains(sel.focusNode)) {
        chip.style.display = "none";
        return;
      }
      const range = sel.getRangeAt(0);
      const { els, texts } = collectBlocks();
      const bi = els.findIndex((el) => el.contains(range.startContainer));
      if (bi === -1) { chip.style.display = "none"; return; }
      // in-block offset of the selection start
      const pre = document.createRange();
      pre.selectNodeContents(els[bi]);
      pre.setEnd(range.startContainer, range.startOffset);
      const offset = pre.toString().length;
      // clamp the quote to this block (selections that cross into the next
      // paragraph anchor to their first block)
      const raw = range.toString();
      const avail = texts[bi].length - offset;
      const quote = texts[bi].slice(offset, offset + Math.min(raw.length, avail));
      if (!quote.trim() || quote.length > 1000) { chip.style.display = "none"; return; }
      pendingAnchor = makeAnchor(texts, bi, offset, quote);
      const r = range.getBoundingClientRect();
      chip.style.display = "inline-flex";
      chip.style.left = `${Math.min(r.right + window.scrollX + 8, window.scrollX + document.documentElement.clientWidth - 130)}px`;
      chip.style.top = `${r.bottom + window.scrollY + 6}px`;
    }, 0);
  });

  chip.addEventListener("click", () => {
    chip.style.display = "none";
    const anchor = pendingAnchor;
    if (!anchor) return;
    // capture where the highlight sits on screen BEFORE clearing the selection
    const sel = getSelection();
    const selRect = sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
    getSelection().removeAllRanges();
    const draft = document.createElement("div");
    draft.className = "glc-card active";
    draft.innerHTML = `<div class="glc-quote">${esc(anchor.quote)}</div>${composerHTML("Comment…")}`;
    gutter.appendChild(draft);
    if (wideMode()) {
      const { els, texts } = collectBlocks();
      const loc = resolveAnchor(texts, anchor);
      const y = loc ? blockY(els[loc.block], loc.start) : window.scrollY + 200;
      draft.style.left = `${article.getBoundingClientRect().right + window.scrollX + 26}px`;
      draft.style.top = `${y}px`;
    } else if (window.innerWidth > 1339 && selRect) {
      // dead zone: too wide for the CSS fixed-centre rule (<=1339px) but too
      // little gutter for the docs-style column, so neither positioner fires
      // and the card lands top-left. Pin it fixed, right beside the highlight.
      draft.style.position = "fixed";
      draft.style.transform = "none";
      draft.style.left = `${Math.min(selRect.right + 12, window.innerWidth - 300)}px`;
      draft.style.top = `${Math.max(12, Math.min(selRect.top, window.innerHeight - 240))}px`;
    }
    draft.querySelector('[data-role="cancel"]').addEventListener("click", () => draft.remove());
    wireComposer(draft, async (body, name) => {
      const { comment } = await api("POST", { body: { slug: SLUG, name, body, ...anchor } });
      rememberMine(comment.id);
      draft.remove();
      addThread(comment, []);
      activate(comment.id);
    });
  });

  // y-coordinate of an in-block offset without leaving marks behind
  function blockY(el, start) {
    const hit = nodeMap(el).findLast?.((n) => start >= n.start) ??
      nodeMap(el).filter((n) => start >= n.start).pop();
    if (!hit) return window.scrollY + 200;
    const r = document.createRange();
    const o = Math.min(start - hit.start, hit.node.nodeValue.length);
    r.setStart(hit.node, o);
    r.setEnd(hit.node, o);
    return r.getBoundingClientRect().top + window.scrollY;
  }

  /* ---------------------------------------------------------------- init */

  function addThread(root, replies) {
    const { els, texts } = collectBlocks();
    const loc = resolveAnchor(texts, root);
    const marks = loc ? paint(els[loc.block], loc.start, loc.end, root.id) : [];
    const t = { root, replies, marks, card: null };
    threads.set(root.id, t);
    marks.forEach((m) => {
      // hovering the highlighted text surfaces its card (activation aligns
      // the card beside the highlight; on narrow screens it makes it visible)
      m.addEventListener("pointerenter", () => {
        if (!root.resolved && active !== root.id) activate(root.id);
      });
      m.addEventListener("click", () => {
        activate(root.id);
        if (root.resolved) return;
        t.card?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    });
    if (root.resolved) marks.forEach((m) => m.classList.add("resolved"));
    else renderCard(t);
    if (root.resolved || !marks.length) renderStrip();
  }

  async function load() {
    let comments;
    try {
      ({ comments } = await api("GET", { query: { slug: SLUG } }));
    } catch (e) {
      console.warn("[gl-comments] load failed:", e.message);
      const badge = document.createElement("div");
      badge.className = "glc-badge";
      if (e.status === 403) {
        badge.textContent = "review key rejected — reopen the review link";
        document.body.appendChild(badge);
        return;
      }
      // backend unreachable: keep trying rather than dying silently
      badge.textContent = "comments offline — reconnecting…";
      document.body.appendChild(badge);
      setTimeout(() => { badge.remove(); load(); }, 6000);
      return;
    }
    authed = true;
    const roots = comments.filter((c) => !c.parent_id);
    for (const root of roots)
      addThread(root, comments.filter((c) => c.parent_id === root.id));

    const badge = document.createElement("div");
    badge.className = "glc-badge";
    badge.textContent = `review mode · ${roots.length} comment${roots.length === 1 ? "" : "s"}`;
    document.body.appendChild(badge);

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".glc-card, .glc-hl, .glc-chip")) activate(null);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") activate(null);
    });
    window.addEventListener("resize", positionCards);
    new ResizeObserver(positionCards).observe(article);
    // OJS figures fill in late and shift the prose — settle positions again.
    setTimeout(positionCards, 2500);
    setTimeout(positionCards, 6000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
})();
