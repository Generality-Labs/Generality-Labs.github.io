// gl-edit — in-place prose editing for LOCAL drafts.
//
// Injected by scripts/edit-server.py only; staging and prod never serve it.
// Prose blocks (p, headings, lists, blockquotes) and the post header are
// contenteditable; figures and whole sections can be marked for removal with
// their × button. Edits autosave (debounced 2.5s, or Cmd/Ctrl+S) back into
// the post's index.qmd as markdown, matched by block position and verified
// against the original text so a mismatch can never corrupt the source.
// Cmd/Ctrl+Z is the browser's own undo within a block; git is the undo for
// anything saved.
//
// Saving writes the qmd only. The page you're looking at already shows your
// edits, so re-rendering is deferred: the badge offers "render html"
// whenever the html on disk is behind the qmd.

(() => {
  "use strict";

  const SLUG = location.pathname.replace(/\/(index\.html)?$/, "").split("/").pop();
  const article = document.querySelector("article .prose");
  if (!article) return;

  // the rendered html is BEHIND the qmd: editing this page would show (and
  // resave) old content — the source of the great paragraph-duplication bug.
  // Block editing, re-render, reload when fresh.
  if (window.__gleStale) {
    const veil = document.createElement("div");
    veil.style.cssText = "position:fixed;inset:0;z-index:200;background:rgba(250,250,250,.88);" +
      "display:flex;align-items:center;justify-content:center;font:500 15px 'Geist',sans-serif;color:#1a1919;";
    veil.innerHTML = "this page is behind the source — re-rendering, it will reload itself (~30s)…";
    document.body.appendChild(veil);
    fetch("/__edit/render", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: SLUG }) }).catch(() => {});
    const poll = setInterval(async () => {
      try {
        const { stale } = await (await fetch(`/__edit/status?slug=${SLUG}`)).json();
        if (!stale) { clearInterval(poll); location.reload(); }
      } catch (e) { /* server briefly busy rendering; keep polling */ }
    }, 3000);
    return;
  }

  /* ------------------------------------------------------------- styles */

  const style = document.createElement("style");
  style.textContent = `
    .gle-block { border-radius: 4px; margin-left: -0.75rem; padding-left: 0.75rem;
      border-left: 3px solid transparent; transition: border-color .15s, background .15s; }
    .gle-block:hover { border-left-color: var(--hairline, #e6e6e6); }
    .gle-block:focus { outline: none; border-left-color: var(--mint, #17cfb9); }
    .gle-block.dirty { border-left-color: var(--mint, #17cfb9);
      background: color-mix(in srgb, var(--mint, #17cfb9) 5%, transparent); }
    .gle-block.failed { border-left-color: #b4443c;
      background: color-mix(in srgb, #b4443c 6%, transparent); }
    .gle-doomed { opacity: .3; filter: grayscale(1); }
    .gle-x { position: absolute; z-index: 65; width: 26px; height: 26px; border-radius: 999px;
      border: 1px solid var(--hairline, #e6e6e6); background: #fff; color: #b4443c;
      font: 500 14px/24px "Geist", sans-serif; text-align: center; cursor: pointer;
      opacity: 0; transition: opacity .15s; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .gle-x:hover { background: #b4443c; color: #fff; }
    .gle-host:hover > .gle-x, .gle-x.on { opacity: 1; }
    .gle-badge { position: fixed; left: 18px; bottom: 16px; z-index: 70;
      font: 500 11.5px "Geist Mono", monospace; color: var(--soft, #837878);
      background: var(--paper, #f2f2f2); border: 1px solid var(--hairline, #e6e6e6);
      padding: .35rem .7rem; border-radius: 999px; }
    .gle-badge button { background: none; border: none; color: var(--mint-deep, #24857a);
      font: inherit; cursor: pointer; padding: 0; text-decoration: underline; }
    .gle-add { display: block; height: 8px; margin: -4px 0; cursor: pointer; position: relative; }
    .gle-add-opt { position: absolute; top: -7px; font: 500 11px "Geist", sans-serif;
      color: var(--mint-deep, #24857a); opacity: 0; transition: opacity .15s; }
    .gle-add-opt + .gle-add-opt { left: 6.2rem; }
    .gle-add-opt:hover { text-decoration: underline; }
    .gle-add:hover .gle-add-opt { opacity: 1; }
    .gle-add-end { height: 26px; margin: 1rem 0 0; }
    .gle-add-end .gle-add-opt { opacity: .5; top: 4px; }
    body.gle-reading .gle-add, body.gle-reading .gle-x { display: none !important; }
    body.gle-reading .gle-block { border-left-color: transparent !important; background: none !important; }
  `;
  document.head.appendChild(style);

  /* --------------------------------------------------- html <-> markdown */

  const straighten = (s) =>
    s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
     .replace(/–/g, "--").replace(/—/g, "---")
     .replace(/…/g, "...").replace(/ /g, " ");

  // visible text with footnote-ref markers removed, so a block's "old" text
  // matches the server's norm() (which strips [^label]) — otherwise the
  // rendered footnote number ("1") vs source label ([^pimpale]) never reconcile
  const visText = (el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll(".footnote-ref").forEach((n) => n.remove());
    return c.textContent;
  };

  function inlineMd(node) {
    let out = "";
    for (const c of node.childNodes) {
      if (c.nodeType === Node.TEXT_NODE) out += c.nodeValue;
      else if (c.nodeType !== Node.ELEMENT_NODE) continue;
      else if (c.classList?.contains("gle-x") || c.classList?.contains("gle-add")) continue;
      else if (c.tagName === "STRONG" || c.tagName === "B") out += `**${inlineMd(c)}**`;
      else if (c.tagName === "EM" || c.tagName === "I") out += `*${inlineMd(c)}*`;
      else if (c.tagName === "CODE") out += `\`${c.textContent}\``;
      else if (c.tagName === "A") {
        if (c.classList.contains("footnote-ref") && c.dataset.md) out += c.dataset.md;  // [^label]
        else if (c.classList.contains("footnote-back")) continue;  // never appears in prose
        else { const t = inlineMd(c); if (t.trim()) out += `[${t}](${c.getAttribute("href")})`; }
      }
      else if (c.tagName === "BR") out += "\n";
      else out += inlineMd(c);
    }
    return out;
  }

  // A block element -> markdown. Handles paragraph splits the browser makes
  // inside contenteditable (nested divs / double <br>).
  function blockMd(el) {
    const tag = el.tagName;
    if (/^H[1-6]$/.test(tag)) return "#".repeat(+tag[1]) + " " + inlineMd(el).trim();
    if (tag === "UL" || tag === "OL") {
      return [...el.children].map((li, i) =>
        (tag === "UL" ? "- " : `${i + 1}. `) + inlineMd(li).trim().replace(/\n+/g, " ")
      ).join("\n");
    }
    if (tag === "BLOCKQUOTE") {
      const inner = [...el.children].length
        ? [...el.children].map((c) => inlineMd(c).trim()).join("\n>\n> ")
        : inlineMd(el).trim();
      return "> " + inner;
    }
    const parts = [];
    let cur = "";
    const flush = () => { if (cur.trim()) parts.push(cur.trim()); cur = ""; };
    for (const c of el.childNodes) {
      if (c.nodeType === Node.ELEMENT_NODE && /^(DIV|P)$/.test(c.tagName)) { flush(); parts.push(inlineMd(c).trim()); }
      else if (c.nodeType === Node.ELEMENT_NODE && c.tagName === "BR") cur += "\n";
      else cur += c.nodeType === Node.TEXT_NODE ? c.nodeValue : inlineMd(c);
    }
    flush();
    return parts.filter(Boolean).join("\n\n").replace(/\n{2,}/g, "\n\n");
  }

  /* ------------------------------------------------------- block registry */

  const isProse = (el) => !el.closest(".cell, .glc-strip, figure") &&
    /^(P|H[1-6]|UL|OL|BLOCKQUOTE)$/.test(el.tagName);

  const state = new Map();        // original prose el -> {origText}
  const inserted = new Set();     // new paragraphs not yet in the qmd
  const doomedCells = new Set();  // figure cells marked for removal
  const doomedBlocks = new Set(); // prose els marked for removal via section ×
  const shell = new Map();       // header el -> {field, origText}
  const dirtyShell = new Set();

  const proseEls = () =>
    [...article.querySelectorAll("p, h1, h2, h3, h4, ul, ol, blockquote")]
      .filter(isProse)
      .filter((el) => !el.parentElement.closest("blockquote, ul, ol"));

  const allCells = () => [...article.querySelectorAll(".cell")];
  // quarto ids each output div ojs-cell-<fence>[-<statement>]; the fence
  // number maps a DOM cell straight to its source fence in the qmd
  const fenceOf = (cell) => {
    const id = cell.querySelector('[id^="ojs-cell-"]')?.id ?? (cell.id.startsWith("ojs-cell-") ? cell.id : null);
    return id ? parseInt(id.split("-")[2], 10) : null;
  };
  const fenceTotal = () => {
    const ns = [...document.querySelectorAll('[id^="ojs-cell-"]')].map((n) => parseInt(n.id.split("-")[2], 10));
    return ns.length ? Math.max(...ns) : 0;
  };
  // DOM ids keep their original render numbering, but each saved deletion
  // shifts later fences down in the qmd — track and adjust
  const ORIG_FENCE_TOTAL = fenceTotal();
  const deletedFences = new Set(); // original numbers already removed
  const adjFence = (n) => n - [...deletedFences].filter((d) => d < n).length;

  function makeAdd(afterEl) {
    const add = document.createElement("div");
    add.className = "gle-add";
    add.innerHTML = `<span class="gle-add-opt" data-tag="P">+ paragraph</span>` +
      `<span class="gle-add-opt" data-tag="H2">+ heading</span>`;
    add.addEventListener("click", (e) =>
      insertAfter(add, e.target.dataset?.tag || "P"));
    afterEl.after(add);
    return add;
  }

  // Enter must never create browser-made sub-paragraphs (nested divs): the
  // server maps ONE editable element to ONE qmd block, so a double newline
  // inside a block desyncs every later save. Enter splits the block into a
  // real tracked paragraph instead; Shift+Enter gives a soft line break.
  function wireEnter(el) {
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      e.preventDefault();
      const sel = getSelection();
      if (!sel.rangeCount) return;
      const tail = document.createRange();
      tail.selectNodeContents(el);
      tail.setStart(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
      const frag = tail.extractContents();
      el.classList.add("dirty");
      const add = el.nextElementSibling?.classList?.contains("gle-add") ? el.nextElementSibling : makeAdd(el);
      const np = insertAfter(add, "P");
      if (frag.textContent.trim()) np.appendChild(frag);
      const r = document.createRange();
      r.selectNodeContents(np);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      touch();
    });
  }

  proseEls().forEach((el) => {
    state.set(el, { origText: visText(el) });
    el.classList.add("gle-block");
    el.contentEditable = "true";
    el.spellcheck = true;
    el.addEventListener("input", () => { el.classList.add("dirty"); el.classList.remove("failed"); touch(); });
    wireEnter(el);
    makeAdd(el);
  });
  // inline control cells (e.g. sliders) can be written after, too
  article.querySelectorAll(".cell.gl-inline").forEach(makeAdd);
  // and the end of the post always shows an insert affordance (no hover hunt)
  const endAdd = makeAdd(article.lastElementChild);
  endAdd.classList.add("gle-add-end");

  // post header (title, eyebrow, subtitle) lives in _before.html — shell ops
  for (const [field, sel] of [["title", "article header h1"], ["eyebrow", "article header .eyebrow"],
                              ["subtitle", "article header p.text-xl"]]) {
    const el = document.querySelector(sel);
    if (!el) continue;
    shell.set(el, { field, origText: el.textContent });
    el.classList.add("gle-block");
    el.contentEditable = "true";
    el.addEventListener("input", () => { el.classList.add("dirty"); dirtyShell.add(el); touch(); });
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); el.blur(); } });
  }

  function insertAfter(addEl, tag = "P") {
    const p = document.createElement(tag); // P or H2 (blockMd maps H2 -> ##)
    p.className = "gle-block dirty";
    p.contentEditable = "true";
    inserted.add(p);
    p.addEventListener("input", () => {
      if (state.has(p)) { p.classList.add("dirty"); p.classList.remove("failed"); }
      touch();
    });
    addEl.after(p);
    const add = makeAdd(p);
    // an inserted block left empty removes itself when focus leaves it
    p.addEventListener("blur", () => {
      if (!p.textContent.trim()) { inserted.delete(p); add.remove(); p.remove(); }
    });
    p.focus();
    wireEnter(p);
    touch();
    return p;
  }

  /* ------------------------------------------- figure & section deletion */

  function addX(host, title, onToggle) {
    host.classList.add("gle-host");
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    const x = document.createElement("button");
    x.className = "gle-x";
    x.textContent = "×";
    x.title = title;
    x.style.top = "4px";
    x.style.right = "-34px";
    x.addEventListener("click", (e) => { e.stopPropagation(); x.classList.toggle("on"); onToggle(); });
    host.appendChild(x);
  }

  // × on each rendered figure. Runs on a delay (and retries) because OJS
  // fills cells in asynchronously — heights are 0 at DOMContentLoaded.
  // Invisible data-only cells get no button: deleting them would orphan the
  // variables they define.
  function wireCells() {
    allCells().forEach((cell) => {
      if (cell.classList.contains("gle-host")) return;
      if (!cell.querySelector("svg, figure, canvas, .gl-statbar, table")) return;
      addX(cell, "remove this figure", () => {
        doomedCells.has(cell) ? doomedCells.delete(cell) : doomedCells.add(cell);
        cell.classList.toggle("gle-doomed", doomedCells.has(cell));
        touch();
      });
    });
  }
  [2500, 6000, 12000].forEach((t) => setTimeout(wireCells, t));

  // × per section. This page has no <section> wrappers (quarto section-divs
  // off), so a section = an h2 plus its following siblings up to the next h2.
  // Each h2 gets a non-editable wrapper to host the button, so it can't leak
  // into the heading's text.
  article.querySelectorAll(":scope h2, :scope > * h2").forEach((h2) => {
    if (!state.has(h2)) return;
    const wrap = document.createElement("div");
    h2.before(wrap);
    wrap.appendChild(h2);
    if (h2.nextElementSibling === null && wrap.nextElementSibling?.classList.contains("gle-add"))
      wrap.appendChild(wrap.nextElementSibling); // keep h2's add-gap inside
    const members = () => {
      const out = [];
      for (let n = wrap.nextElementSibling; n; n = n.nextElementSibling) {
        if (n.querySelector?.("h2") || n.tagName === "H2") break;
        out.push(n);
      }
      return out;
    };
    addX(wrap, "remove this whole section", () => {
      const on = wrap.dataset.gleDoom !== "1";
      wrap.dataset.gleDoom = on ? "1" : "";
      const els = [wrap, ...members()];
      for (const el of els) {
        el.classList.toggle("gle-doomed", on);
        for (const c of el.matches?.(".cell") ? [el] : el.querySelectorAll?.(".cell") ?? [])
          on ? doomedCells.add(c) : doomedCells.delete(c);
      }
      on ? doomedBlocks.add(h2) : doomedBlocks.delete(h2);
      for (const el of els)
        if (state.has(el)) on ? doomedBlocks.add(el) : doomedBlocks.delete(el);
      touch();
    });
  });

  /* ---------------------------------------------------------------- save */

  const badge = document.createElement("div");
  badge.className = "gle-badge";
  document.body.appendChild(badge);
  let renderPending = false;
  let saving = false;
  let timer = null;

  let reading = localStorage.getItem("gle_reading") === "1";
  const applyMode = () => {
    document.body.classList.toggle("gle-reading", reading);
    for (const el of [...state.keys(), ...shell.keys(), ...inserted])
      el.contentEditable = reading ? "false" : "true";
    localStorage.setItem("gle_reading", reading ? "1" : "0");
  };
  const setBadge = (html) => {
    badge.innerHTML = `${reading ? "read mode" : html} · <button id="gle-mode">${reading ? "edit" : "read"}</button>`;
  };
  setBadge("edit mode");
  applyMode();

  function touch() {
    clearTimeout(timer);
    timer = setTimeout(save, 2500);
    setBadge("unsaved edits…");
  }

  function opsFromDom() {
    const ops = [];
    const originals = proseEls().filter((el) => state.has(el));
    originals.forEach((el, index) => {
      const st = state.get(el);
      const doomed = doomedBlocks.has(el);
      const text = el.textContent.trim();
      if (doomed || (!text && document.activeElement !== el)) {
        ops.push({ type: "delete", index, old: st.origText, el });
      } else if (el.classList.contains("dirty") && text) {
        ops.push({ type: "replace", index, old: st.origText, new: straighten(blockMd(el)), el });
      }
    });
    for (const el of inserted) {
      if (!el.isConnected || !el.textContent.trim()) continue;
      if (el.closest(".gle-doomed")) continue;
      // if a CELL sits between this block and the nearest preceding original
      // prose block, anchor to the cell's fence — otherwise the qmd insert
      // would land before the cell even though the DOM shows it after
      let cellAnchor = null;
      for (let sib = el.previousElementSibling; sib; sib = sib.previousElementSibling) {
        if (state.has(sib) || sib.querySelector?.("h2, p") && [...sib.querySelectorAll("h2, p")].some((n) => state.has(n))) break;
        if (sib.classList?.contains("cell") && fenceOf(sib)) { cellAnchor = sib; break; }
      }
      if (cellAnchor) {
        ops.push({ type: "insert", after_fence: adjFence(fenceOf(cellAnchor)), new: straighten(blockMd(el)), el });
        continue;
      }
      let idx = -1; // nearest preceding original block, in DOM order
      for (let i = 0; i < originals.length; i++)
        if (originals[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) idx = i;
      ops.push({ type: "insert", after_index: idx, new: straighten(blockMd(el)), el });
    }
    if (doomedCells.size) {
      const total = ORIG_FENCE_TOTAL - deletedFences.size;
      for (const cell of doomedCells) {
        const orig = fenceOf(cell);
        if (orig && !deletedFences.has(orig))
          ops.push({ type: "delete-cell", fence: adjFence(orig), fence_total: total, orig, el: cell });
      }
    }
    for (const el of dirtyShell) {
      const { field, origText } = shell.get(el);
      ops.push({ type: "shell", field, old: origText, new: straighten(el.textContent.trim()), el });
    }
    return ops;
  }

  // once a force save succeeds the page's block-count baseline is stale for
  // the rest of the session, so every later save keeps relocating by content
  let stickyForce = false;
  async function save(force = false) {
    force = force === true || stickyForce;
    if (saving) { touch(); return; }
    const ops = opsFromDom();
    if (!ops.length) { setBadge(renderBadge()); return; }
    saving = true;
    let ok = false;
    setBadge(force ? "force saving…" : "saving…");
    try {
      // on 409, retry once with force WITHOUT releasing the save lock —
      // releasing it let a debounced autosave run concurrently and
      // double-apply pending inserts (the paragraph-duplication bug, pt 2)
      let useForce = force === true;
      let res, data;
      for (let attempt = 0; ; attempt++) {
        res = await fetch("/__edit/save", { method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug: SLUG, prose_total: state.size, force: useForce,
            ops: ops.map(({ el, orig, ...rest }) => rest) }) });
        data = await res.json();
        if (res.status === 409 && !useForce && attempt === 0) { useForce = true; continue; }
        break;
      }
      force = useForce;
      if (!res.ok) {
        for (const op of ops) if (data.indices?.includes(op.index)) op.el.classList.add("failed");
        setBadge(res.status === 409
          ? `⚠ couldn't relocate some edits after the source changed — refresh to resync (${data.error})`
          : `⚠ save failed: ${data.error || res.status} — nothing written`);
        return;
      }
      if (force) stickyForce = true;
      // re-baseline: the DOM now mirrors the qmd, indices stay derivable
      for (const op of ops) {
        if (op.type === "replace") { state.get(op.el).origText = visText(op.el); op.el.classList.remove("dirty"); }
        if (op.type === "delete") {
          state.delete(op.el);
          doomedBlocks.delete(op.el);
          if (op.el.nextElementSibling?.classList?.contains("gle-add")) op.el.nextElementSibling.remove();
          const wrap = op.el.parentElement?.classList?.contains("gle-host") ? op.el.parentElement : null;
          op.el.remove();
          if (wrap && !wrap.querySelector("h2")) wrap.remove();
        }
        if (op.type === "insert") {
          inserted.delete(op.el);
          state.set(op.el, { origText: visText(op.el) });
          op.el.classList.remove("dirty");
        }
        if (op.type === "delete-cell") { deletedFences.add(op.orig); doomedCells.delete(op.el); op.el.remove(); }
        if (op.type === "shell") { shell.get(op.el).origText = op.el.textContent; op.el.classList.remove("dirty"); dirtyShell.delete(op.el); }
      }
      document.querySelectorAll(".gle-doomed").forEach((n) => n.remove());
      renderPending = true;
      ok = true;
      setBadge(renderBadge());
      clearTimeout(renderTimer);
      renderTimer = setTimeout(autoRender, 8000);
    } catch (e) {
      setBadge("⚠ edit server unreachable — edits not saved");
    } finally {
      saving = false;
    }
    if (ok && opsFromDom().length) touch(); // edits made while the save was in flight
  }

  const renderBadge = () =>
    renderPending
      ? `saved ✓ · html re-renders shortly · <button id="gle-render">render now</button>`
      : "saved ✓ · all changes in index.qmd";

  // background render so a refresh never shows a page behind the saved qmd;
  // waits for a quiet moment (no unsaved edits, no save in flight)
  let renderTimer = null;
  async function autoRender() {
    if (!renderPending) return;
    if (saving || opsFromDom().length) { renderTimer = setTimeout(autoRender, 4000); return; }
    const res = await fetch("/__edit/render", { method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: SLUG }) }).catch(() => null);
    if (res && res.ok) renderPending = false;
    if (!saving && !opsFromDom().length) setBadge(renderBadge());
  }

  badge.addEventListener("click", async (e) => {
    if (e.target.id === "gle-mode") {
      reading = !reading;
      applyMode();
      setBadge(renderPending ? renderBadge() : "edit mode");
      return;
    }
    if (e.target.id === "gle-force") { save(true); return; }
    if (e.target.id !== "gle-render") return;
    setBadge("rendering…");
    const res = await fetch("/__edit/render", { method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: SLUG }) }).catch(() => null);
    renderPending = !(res && res.ok);
    setBadge(res && res.ok ? "rendered ✓" : "⚠ render failed — check terminal");
  });

  // Cmd/Ctrl+S saves immediately; Cmd/Ctrl+B/I format the selection
  document.addEventListener("keydown", (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.key === "s") { e.preventDefault(); clearTimeout(timer); save(); }
    if ((e.key === "b" || e.key === "i") && document.activeElement?.closest?.(".gle-block")) {
      e.preventDefault();
      document.execCommand(e.key === "b" ? "bold" : "italic");
    }
  });
  window.addEventListener("beforeunload", (e) => {
    if (opsFromDom().length || saving) { e.preventDefault(); e.returnValue = ""; }
  });

  // a refresh can land on html that predates saved qmd edits (render is
  // async) — detect it, re-render, and reload so nothing looks lost
  fetch(`/__edit/status?slug=${SLUG}`).then((r) => r.json()).then(async (s) => {
    if (!s.stale) return;
    if (opsFromDom().length || saving) { renderPending = true; setBadge(renderBadge()); return; }
    setBadge("page is behind your saved edits — re-rendering…");
    const res = await fetch("/__edit/render", { method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: SLUG }) }).catch(() => null);
    if (!(res && res.ok)) { setBadge("⚠ render failed — check terminal"); return; }
    if (opsFromDom().length || saving || document.activeElement?.closest?.(".gle-block")) {
      renderPending = false; setBadge(renderBadge()); return; // user started editing — no reload under their hands
    }
    location.reload();
  }).catch(() => {});
})();
