// gl-scrolly — two-panel scrollytelling layout (prototype, this post only).
// The header stays a full-width hero; below it, prose flows in a left column
// while every figure cell moves into a sticky right rail and crossfades in
// when its original position in the text scrolls past the upper viewport.
// On narrow viewports (or after resizing down) the figures move back into
// the text flow — the ordinary sequential layout.
//
// scrolly.css hides the article until layout() has run once, then reveal()
// shows it — the reader never sees the single-column flash.
(() => {
  "use strict";
  const article = document.querySelector("main article");
  const prose = document.querySelector("article .prose");
  const reveal = () => { if (article) article.style.visibility = "visible"; };
  // the page shows immediately; only the RAIL waits (faded out) until its
  // alignment is measured, then fades in — text is instant, no rail jump
  let railShown = false;
  const showRail = () => {
    if (railShown) return;
    railShown = true;
    rail.style.opacity = "1";
  };
  if (!article || !prose) return reveal();

  // cell 0 is the invisible module-import cell; everything after is a figure,
  // except .gl-inline cells (controls that belong in the text column)
  const figCells = [...prose.querySelectorAll(":scope > .cell")].slice(1)
    .filter((c) => !c.classList.contains("gl-inline"));
  if (!figCells.length) return reveal();

  const rail = document.createElement("div");
  rail.className = "gl-scrolly-rail";
  rail.style.opacity = "0";
  rail.style.transition = "opacity .25s";
  const sticky = document.createElement("div");
  sticky.className = "gl-scrolly-sticky";
  rail.appendChild(sticky);
  // a step marks where each figure sat in the text flow: activation anchor
  // when wide, re-insertion point when narrow
  const steps = figCells.map((cell) => {
    const step = document.createElement("div");
    step.className = "gl-scrolly-step";
    cell.before(step);
    return step;
  });

  // a figure whose section contains an inline control (e.g. the rate slider)
  // stops following the scroll once its bottom meets the control's bottom,
  // so chart and control travel up the page together from there
  const inlineCells = [...prose.querySelectorAll(":scope > .cell.gl-inline")];
  const companions = figCells.map((c, i) => {
    const next = steps[i + 1];
    return inlineCells.find((ic) =>
      (steps[i].compareDocumentPosition(ic) & Node.DOCUMENT_POSITION_FOLLOWING) &&
      (!next || (ic.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING)));
  });
  // implemented by shortening the rail: position:sticky parks an element at
  // its container's bottom edge natively, so we set the rail's bottom to the
  // point where the figure's bottom coincides with the control's bottom
  function updateRailBounds() {
    const comp = wide ? companions[current] : null;
    if (!comp) { rail.style.bottom = "0px"; return; }
    const fig = figCells[current]?.querySelector("figure") ?? figCells[current];
    const proseB = prose.getBoundingClientRect().bottom;
    const compB = comp.getBoundingClientRect().bottom;
    const bottom = proseB - compB - sticky.offsetHeight + fig.getBoundingClientRect().height;
    rail.style.bottom = `${Math.max(0, bottom).toFixed(1)}px`;
  }

  let wide = null;
  let current = -1;
  function onScroll() {
    if (!wide) return;
    const mid = window.innerHeight * 1.0; // a figure activates as its step crosses the fold
    let i = 0;
    for (let j = 0; j < steps.length; j++)
      if (steps[j].getBoundingClientRect().top < mid) i = j;
    if (i !== current) {
      current = i;
      figCells.forEach((c, j) => c.classList.toggle("active", j === i));
      updateRailBounds();
    }
  }

  function layout() {
    const w = window.innerWidth >= 1100;
    if (w === wide) return;
    wide = w;
    document.body.classList.toggle("gl-scrolly", w);
    article.style.maxWidth = w ? "min(115rem, 97vw)" : ""; // inline so it beats max-w-3xl
    current = -1;
    if (w) {
      figCells.forEach((c) => c.isConnected && sticky.appendChild(c));
      prose.appendChild(rail);
      onScroll();
    } else {
      figCells.forEach((c, i) => {
        if (!c.isConnected) return;
        steps[i].after(c);
        c.classList.remove("active");
      });
      rail.remove();
    }
  }

  let rt = null;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(layout, 150); });
  document.addEventListener("scroll", onScroll, { passive: true });
  layout();
  reveal();
  setTimeout(showRail, 2600); // fallback if measurement never succeeds

  // nudge the rail so the first figure's top tick ("100%") lines up with the
  // top of the opening paragraph; measured, because fonts and Plot margins
  // aren't knowable from CSS. Skipped once the sticky rail is pinned.
  function alignRail() {
    if (!wide) { rail.style.top = ""; return; }
    const p = prose.querySelector(":scope > p");
    const first = figCells[0];
    if (!p || !first?.isConnected) return;
    if (Math.abs(sticky.getBoundingClientRect().top - rail.getBoundingClientRect().top) > 2) return;
    const tick = [...first.querySelectorAll("text")]
      .find((t) => /^100\s?%$/.test(t.textContent.trim()));
    if (!tick) return;
    const delta = p.getBoundingClientRect().top - tick.getBoundingClientRect().top;
    if (Math.abs(delta) >= 1)
      rail.style.top = `${(parseFloat(rail.style.top) || 0) + delta}px`;
    showRail(); // aligned (or already was): fade the rail in
  }
  [350, 700, 1100, 1600, 2200, 5000, 10000].forEach((t) => setTimeout(alignRail, t));
  [900, 2200, 5200].forEach((t) => setTimeout(updateRailBounds, t)); // after OJS heights settle
  window.addEventListener("resize", () => setTimeout(() => { alignRail(); updateRailBounds(); }, 300));
  // OJS cells render late and change heights long after the timers above —
  // recompute the rail's stopping bound whenever the prose column actually
  // reflows, so the sticky figure never outruns its companion control
  if (window.ResizeObserver) {
    let rb = null;
    const ro = new ResizeObserver(() => {
      clearTimeout(rb);
      rb = setTimeout(updateRailBounds, 120);
    });
    ro.observe(prose);
    ro.observe(document.body);
  }
})();
