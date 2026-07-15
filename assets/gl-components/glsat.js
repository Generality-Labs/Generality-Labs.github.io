// glsat: saturation-post components. Same contract as gl.js — each component
// takes (deps, data, spec) and returns a DOM node; house identity throughout.
// Kept as a separate module so the simpleqa-audit post's gl.js stays untouched.

import { palette } from "./gl.js";

const font = `"Geist","Inter",-apple-system,system-ui,sans-serif`;
const mono = `"Geist Mono",ui-monospace,SFMono-Regular,monospace`;

function frame(node, { caption, provenance, wide = true } = {}) {
  const div = document.createElement("figure");
  div.style.cssText = `margin:2.2rem 0;font-family:${font};` +
    (wide ? `width:min(54rem,94vw);position:relative;left:50%;transform:translateX(-50%);` : ``);
  div.appendChild(node);
  if (caption) {
    const c = document.createElement("figcaption");
    c.style.cssText = `font-size:.82rem;color:${palette.muted};margin:0.65rem auto 0;line-height:1.5;max-width:44rem;`;
    c.textContent = caption;
    div.appendChild(c);
  }
  if (provenance) {
    const p = document.createElement("div");
    p.style.cssText = `font-size:.7rem;color:${palette.soft};margin:.35rem auto 0;font-variant-numeric:tabular-nums;max-width:44rem;`;
    p.textContent = provenance;
    div.appendChild(p);
  }
  return div;
}

// ---- glDistDesigner: sculpt a difficulty distribution, watch the implied
// saturation curve. Pure SVG, no deps. spec: {eciToday, eciPerYear, presets}
export function glDistDesigner(_, __, spec = {}) {
  const {
    nPts = 20,
    ratePerYear = 20,   // capability gained per year, in difficulty units
    alpha = 0.15,       // item ICC sharpness per difficulty unit
    years = 6,
    caption, provenance,
  } = spec;

  const W = 720, H = 460, PAD = { l: 46, r: 18, t: 30, b: 44 };
  const GAPX = 46; // sculptor left, saturation curve right
  const plotH = H - PAD.t - PAD.b;
  const step = 100 / nPts;
  const binC = Array.from({ length: nPts }, (_, i) => (i + 0.5) * step);

  let mass = binC.map((c) => (2 / 3) * Math.exp(-0.5 * ((c - 55) / 13) ** 2));

  const root = document.createElement("div");
  root.style.cssText = `font-family:${font};`;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${2 * W + GAPX} ${H + 10}`);
  svg.style.cssText = `width:100%;max-width:1400px;height:auto;display:block;margin:0 auto;touch-action:none;`;
  root.appendChild(svg);

  const xOf = (d) => PAD.l + (d / 100) * (W - PAD.l - PAD.r);

  function line(g, x1, y1, x2, y2, stroke, w, dash) {
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", x1); l.setAttribute("y1", y1);
    l.setAttribute("x2", x2); l.setAttribute("y2", y2);
    l.setAttribute("stroke", stroke); l.setAttribute("stroke-width", w);
    if (dash) l.setAttribute("stroke-dasharray", dash);
    g.appendChild(l);
  }
  function txt(g, x, y, str, fill, size, weight = 400, anchor = "start") {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("fill", fill); t.setAttribute("font-size", size);
    t.setAttribute("font-weight", weight); t.setAttribute("text-anchor", anchor);
    t.setAttribute("font-family", font);
    t.textContent = str;
    g.appendChild(t);
  }

  function draw() {
    svg.innerHTML = "";
    const y0 = H - PAD.b;

    // ---------- left: distribution sculptor ----------
    const gT = document.createElementNS(svgNS, "g");
    svg.appendChild(gT);
    txt(gT, PAD.l, 18, "task difficulty distribution (drag the points)", palette.ink, 18, 650);
    for (let d = 0; d <= 100; d += 20) {
      line(gT, xOf(d), y0, xOf(d), y0 + 5, palette.soft, 1);
      txt(gT, xOf(d), y0 + 19, `${d}`, palette.soft, 11.5, 400, "middle");
    }
    line(gT, PAD.l, y0, W - PAD.r, y0, palette.soft, 1);
    txt(gT, (PAD.l + W - PAD.r) / 2, H + 4, "difficulty", palette.soft, 12, 400, "middle");

    // joined curve through the points
    const poly = document.createElementNS(svgNS, "path");
    poly.setAttribute("d", mass.map((m, i) =>
      `${i ? "L" : "M"}${xOf(binC[i]).toFixed(1)},${(y0 - m * plotH).toFixed(1)}`).join(""));
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", palette.mintDeep); poly.setAttribute("stroke-width", "2");
    poly.setAttribute("stroke-opacity", "0.7");
    gT.appendChild(poly);
    mass.forEach((m, i) => {
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", xOf(binC[i])); c.setAttribute("cy", y0 - m * plotH);
      c.setAttribute("r", 7);
      c.setAttribute("fill", selected.has(i) ? palette.mintDeep : "#fff");
      c.setAttribute("stroke", palette.mintDeep); c.setAttribute("stroke-width", "2.4");
      gT.appendChild(c);
    });

    // ---------- right: implied saturation curve ----------
    const gB = document.createElementNS(svgNS, "g");
    gB.setAttribute("transform", `translate(${W + GAPX},0)`);
    svg.appendChild(gB);
    txt(gB, PAD.l, 18, `implied saturation curve (capability +${ratePerYear} difficulty per year)`,
        palette.ink, 18, 650);
    const x0 = PAD.l;
    line(gB, x0, y0, W - PAD.r, y0, palette.soft, 1);
    line(gB, x0, PAD.t, x0, y0, palette.soft, 1);
    for (const f of [0.5, 1.0]) {
      line(gB, x0, y0 - f * plotH, W - PAD.r, y0 - f * plotH, palette.hairline, 1);
      txt(gB, x0 - 7, y0 - f * plotH + 4, `${Math.round(f * 100)}%`, palette.soft, 11.5, 400, "end");
    }
    const xOfY = (yr) => x0 + (yr / years) * (W - PAD.r - x0);
    for (let yr = 1; yr <= years; yr++) {
      line(gB, xOfY(yr), y0, xOfY(yr), y0 + 5, palette.soft, 1);
      txt(gB, xOfY(yr), y0 + 19, `year ${yr}`, palette.soft, 11.5, 400, "middle");
    }
    const msum = mass.reduce((a, b) => a + b, 0) || 1;
    const pts = [];
    for (let px = x0; px <= W - PAD.r; px += 3) {
      const theta = ((px - x0) / (W - PAD.r - x0)) * years * ratePerYear;
      let sc = 0;
      for (let i = 0; i < nPts; i++)
        sc += (mass[i] / msum) / (1 + Math.exp(-alpha * (theta - binC[i])));
      pts.push(`${px},${(y0 - sc * plotH).toFixed(1)}`);
    }
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M" + pts.join("L"));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", palette.mintDeep); path.setAttribute("stroke-width", "2.6");
    gB.appendChild(path);
  }

  // selection + one-at-a-time dragging: click selects a point (cmd/ctrl-click
  // toggles multi-select, selected points fill in); dragging moves the whole
  // selection vertically by the same amount, never repainting across columns
  const selected = new Set();
  let drag = null; // {startY, start: Map(i -> mass)}
  const hitIndex = (ev) => {
    const rect = svg.getBoundingClientRect();
    const sx = ((ev.clientX - rect.left) / rect.width) * (2 * W + GAPX);
    if (sx > W) return null;
    const i = Math.round((((sx - PAD.l) / (W - PAD.l - PAD.r)) * 100) / step - 0.5);
    return i >= 0 && i < nPts ? i : null;
  };
  svg.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    document.body.style.userSelect = "none"; // no text highlighting mid-drag
    const i = hitIndex(ev);
    if (i == null) return;
    if (ev.metaKey || ev.ctrlKey) {
      selected.has(i) ? selected.delete(i) : selected.add(i);
      draw();
      return;
    }
    if (!selected.has(i)) { selected.clear(); selected.add(i); }
    drag = { startY: ev.clientY, start: new Map([...selected].map((j) => [j, mass[j]])) };
    svg.setPointerCapture(ev.pointerId);
    draw();
  });
  svg.addEventListener("pointermove", (ev) => {
    if (!drag) return;
    const rect = svg.getBoundingClientRect();
    const dv = -((ev.clientY - drag.startY) / rect.height) * (H + 10) / plotH;
    for (const [j, m0] of drag.start) mass[j] = Math.max(0, Math.min(1, m0 + dv));
    draw();
  });
  svg.addEventListener("pointerup", () => {
    drag = null;
    document.body.style.userSelect = "";
  });

  // presets
  const PRESETS = {
    gaussian: (c) => Math.exp(-0.5 * ((c - 55) / 13) ** 2),
    uniform: (c) => (c >= 10 && c <= 90 ? 0.7 : 0.05),
    "double bump": (c) =>
      Math.exp(-0.5 * ((c - 22) / 7) ** 2) + 0.8 * Math.exp(-0.5 * ((c - 84) / 7) ** 2),
  };
  const bar = document.createElement("div");
  bar.style.cssText = `display:flex;gap:.6rem;justify-content:center;margin-top:.8rem;`;
  for (const [name, fn] of Object.entries(PRESETS)) {
    const b = document.createElement("button");
    b.textContent = name;
    b.style.cssText = `font-family:${font};font-size:.85rem;font-weight:600;color:#06382e;` +
      `background:color-mix(in srgb, ${palette.mint} 40%, #fff);border:none;` +
      `border-radius:99px;padding:.4rem 1.1rem;cursor:pointer;`;
    b.onmouseenter = () => (b.style.background = `color-mix(in srgb, ${palette.mint} 70%, #fff)`);
    b.onmouseleave = () => (b.style.background = `color-mix(in srgb, ${palette.mint} 40%, #fff)`);
    b.onclick = () => {
      const v = binC.map(fn);
      const mx = Math.max(...v);
      const peak = name === "uniform" ? 1 / 3 : 2 / 3; // keep headroom for sculpting
      mass = v.map((x) => (x / mx) * peak);
      selected.clear();
      draw();
    };
    bar.appendChild(b);
  }
  root.appendChild(bar);

  draw();
  return frame(root, { caption, provenance });
}


export function glMaturityExamples(_, data, spec = {}) {
  // THREE benchmarks on the TIME axis: frontier dots, the final fit
  // (dashed), and the live ensemble trajectory fitted only on data dated
  // <= t* (the slider's maturity cut). The ensemble averages the time fit
  // on the seen frontier with the ECI two-step (law on all models <= t*
  // composed with the global capability clock <= t*).
  const { W = 1120, H = 330, keep } = spec;
  const PADL = 40, PADR = 8, PADT = 30, PADB = 34;
  const svgNS = "http://www.w3.org/2000/svg";
  const EPOCH0 = +new Date("2023-01-01");
  const DAY = 86400e3;
  const sig = (v) => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, v))));

  function fit2pl(xs, ys, opts = {}) {
    const n = xs.length;
    // opts.prior = [mu, plam]: Gaussian MAP prior on log k (population of
    // completed benchmarks' fits) — one extra residual sqrt(plam)*(lk - mu)
    const [pmu, plam] = opts.prior ?? [0, 0];
    const cost = (m, lk) => {
      const k = Math.exp(lk);
      let c = plam * (lk - pmu) * (lk - pmu);
      for (let i = 0; i < n; i++) { const r = sig(k * (xs[i] - m)) - ys[i]; c += r * r; }
      return c;
    };
    const refine = (m, lk) => {
      let lam = 1e-3, c = cost(m, lk);
      for (let it = 0; it < 80; it++) {
        const k = Math.exp(lk);
        let jmm = 0, jml = 0, jll = plam, gm = 0, gl = plam * (lk - pmu);
        for (let i = 0; i < n; i++) {
          const s2 = sig(k * (xs[i] - m)), r = s2 - ys[i], w = s2 * (1 - s2);
          const dm = -k * w, dl = k * (xs[i] - m) * w;
          jmm += dm * dm; jml += dm * dl; jll += dl * dl; gm += dm * r; gl += dl * r;
        }
        const det = (jmm + lam * (jmm || 1)) * (jll + lam * (jll || 1)) - jml * jml;
        if (!isFinite(det) || Math.abs(det) < 1e-30) break;
        const sm = -((jll + lam * (jll || 1)) * gm - jml * gl) / det;
        const sl2 = -((jmm + lam * (jmm || 1)) * gl - jml * gm) / det;
        const m2 = m + sm, lk2 = Math.max(-12, Math.min(3, lk + sl2));
        const c2 = cost(m2, lk2);
        if (c2 < c) { const dc = c - c2; m = m2; lk = lk2; c = c2; lam = Math.max(1e-7, lam / 3); if (dc < 1e-12) break; }
        else { lam *= 10; if (lam > 1e8) break; }
      }
      return { m, lk, c };
    };
    const mx = Math.max(...xs), mn = xs.reduce((a, b) => a + b, 0) / n;
    const off = opts.midOff ?? 365, lks = opts.lks ?? [-6.5, -5.5, -4.5, -3.5, -2.5];
    let best = null;
    for (const m0 of [mn, mx, mx + off])
      for (const lk0 of lks) {
        const r = refine(m0, lk0);
        if (!best || r.c < best.c) best = r;
      }
    return [best.m, Math.exp(best.lk)];
  }
  const ols = (xs, ys) => {
    const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    const b1 = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) /
               (xs.reduce((a, x) => a + (x - mx) ** 2, 0) || 1);
    return [b1, my - b1 * mx];  // slope, icept
  };

  // canonical time frontier: per-date max, cumulative max keeping ties
  const mkFrontier = (rows) => {
    const byX = new Map();
    for (const r of rows) {
      const x = +new Date(r.date);
      if (!byX.has(x) || r.score > byX.get(x).score) byX.set(x, { t: x, score: r.score, model: r.model });
    }
    const pts = [...byX.values()].sort((a, b) => a.t - b.t);
    let mx = -Infinity;
    return pts.filter((p) => (p.score >= mx ? ((mx = p.score), true) : false));
  };

  const byB = new Map();
  for (const r of data.points) {
    if (!byB.has(r.benchmark)) byB.set(r.benchmark, []);
    byB.get(r.benchmark).push(r);
  }
  const METHODS = [
    { key: "eci", rows: data.eci ?? [], color: "#7c4dbe", name: "two-step (ECI)",
      midOff: 10, lks: [-4, -3, -2, -1, 0], prior: [-2.11, 0.0089] },
  ];
  const PRIOR_T = [-5.14, 0.0061];  // pooled fallbacks; refs carry LOO priors
  for (const M of METHODS) {
    M.byB = new Map();
    M.vOf = new Map();  // model -> best metric value, for frontier anchoring
    for (const r of M.rows) {
      if (!M.byB.has(r.benchmark)) M.byB.set(r.benchmark, []);
      M.byB.get(r.benchmark).push({ t: +new Date(r.date), m: r[M.key], score: r.score });
      if (!M.vOf.has(r.model) || r[M.key] > M.vOf.get(r.model)) M.vOf.set(r.model, r[M.key]);
    }
    M.corners = (data.clocks?.corners?.[M.key] ?? []).map(([d, v]) => ({ t: EPOCH0 + d * DAY, v }));
    M.slope = data.clocks?.slope?.[M.key];  // granted (rung-2) clock slope
  }
  const refBy = Object.fromEntries(data.bt.ref.map((r) => [r.benchmark, r]));
  const eligible = [...byB.keys()].filter((b) =>
    (!keep || keep.includes(b)) && refBy[b]?.fit_time
    && METHODS.every((M) => (M.byB.get(b) ?? []).length >= 6));

  let delta = spec.delta ?? 0.2;
  const sample3 = (exclude = []) => {
    // draw three fresh benchmarks, never repeating the ones just shown
    let pool = eligible.filter((b) => !exclude.includes(b));
    if (pool.length < 3) pool = [...eligible];  // fallback if too few remain
    const a = [...pool];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, 3);
  };
  let picks = sample3();

  const wrap = document.createElement("div");
  wrap.style.cssText = `font-family:${font};`;
  const head = document.createElement("div");
  head.style.cssText = "display:flex;justify-content:center;align-items:center;margin-bottom:.4rem;";
  const btn = document.createElement("button");
  btn.textContent = "shuffle";
  btn.style.cssText = `font-family:${font};font-size:.8rem;font-weight:600;color:#06382e;` +
    `background:color-mix(in srgb, ${palette.mint} 70%, #fff);border:none;border-radius:99px;` +
    `padding:.35rem .9rem;cursor:pointer;`;
  head.appendChild(btn);
  wrap.appendChild(head);
  const GAP = 26;
  const PW = (W - 2 * GAP) / 3;
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.cssText = "width:100%;max-width:980px;height:auto;display:block;margin:0 auto;";
  wrap.appendChild(svg);
  const T0 = +new Date("2023-01-01"), T1 = +new Date("2027-06-01");
  const yOf = (v) => PADT + (1 - v) * (H - PADT - PADB);

  function draw() {
    svg.replaceChildren();
    const txt = (x, y, str, fill, size, anchor2 = "start", weight = 400) => {
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", x); t.setAttribute("y", y);
      t.setAttribute("fill", fill); t.setAttribute("font-size", size);
      t.setAttribute("text-anchor", anchor2); t.setAttribute("font-weight", weight);
      t.setAttribute("font-family", font);
      t.textContent = str;
      svg.appendChild(t);
    };
    picks.forEach((pick, pi) => {
      const ox = pi * (PW + GAP);
      const xL = ox + PADL, xR = ox + PW - PADR;
      const xOf = (t) => xL + ((t - T0) / (T1 - T0)) * (xR - xL);
      for (const v of [0, 0.5, 1]) {
        const l = document.createElementNS(svgNS, "line");
        l.setAttribute("x1", xL); l.setAttribute("x2", xR);
        l.setAttribute("y1", yOf(v)); l.setAttribute("y2", yOf(v));
        l.setAttribute("stroke", palette.hairline);
        l.setAttribute("stroke-dasharray", v === 0.5 ? "2,3" : "");
        svg.appendChild(l);
        if (pi === 0) txt(xL - 5, yOf(v) + 4, (v * 100) + "%", palette.soft, 11, "end");
      }
      for (let yr = 2023; yr <= 2027; yr += 2)
        txt(xOf(+new Date(yr + "-01-01")), H - PADB + 18, yr, palette.soft, 11, "middle");
      txt((xL + xR) / 2, PADT - 8, pick, palette.ink, 12.5, "middle", 650);
      const fr = mkFrontier(byB.get(pick));
      const cut = fr[0].score + delta;
      const seen = fr.filter((p) => p.score <= cut);
      const tstar = seen[seen.length - 1].t;
      const curveFn = (fn, color, dash, width) => {
        let d = "";
        for (let px = xL; px <= xR; px += 3) {
          const t = T0 + ((px - xL) / (xR - xL)) * (T1 - T0);
          d += (d ? "L" : "M") + px + "," + yOf(Math.max(0, Math.min(1, fn(t)))).toFixed(1);
        }
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", d); path.setAttribute("fill", "none");
        path.setAttribute("stroke", color); path.setAttribute("stroke-width", width);
        if (dash) path.setAttribute("stroke-dasharray", "5,4");
        svg.appendChild(path);
      };
      // dashed final time fit
      const ref = refBy[pick].fit_time;
      curveFn((t) => sig(ref[1] * ((t - EPOCH0) / DAY - ref[0])), palette.soft, true, 1.6);
      // ECI two-step: law on ALL rows <= t*, global clock corners <= t*
      let eciFn = null;
      {
        const M = METHODS[0];
        const rows2 = (M.byB.get(pick) ?? []).filter((p) => p.t <= tstar);
        const uniq = new Set(rows2.map((p) => p.m));
        const corners = M.corners.filter((c) => c.t <= tstar);
        if (rows2.length >= 4 && uniq.size >= 3 && corners.length >= 1 && M.slope > 0) {
          const [D, k] = fit2pl(rows2.map((p) => p.m), rows2.map((p) => p.score),
            { midOff: M.midOff, lks: M.lks, prior: refBy[pick].prior_eci ?? M.prior });
          // frontier calibration: shift D so the law passes through the SEEN
          // frontier points (own metric values) — the estimand is the max.
          // MAP with the LOO population prior on the offset (dprior_eci).
          const anc = seen.map((p) => ({ x: M.vOf.get(p.model), y: p.score }))
            .filter((a) => a.x != null);
          const dp = refBy[pick].dprior_eci;
          let dd = 0;
          if (anc.length >= 1) {
            let best = Infinity;
            for (let g2 = -15; g2 <= 15.001; g2 += 0.25) {
              let sse = anc.reduce((a2, p) => a2 + (sig(k * (p.x - D + g2)) - p.y) ** 2, 0);
              if (dp) sse += dp[1] * (g2 - dp[0]) ** 2;
              if (sse < best) { best = sse; dd = g2; }
            }
          }
          // granted clock: today's slope, level pinned at the last record <= t*
          const last = corners[corners.length - 1];
          const icept = last.v - M.slope * ((last.t - EPOCH0) / DAY);
          eciFn = (t) => sig(k * ((icept + M.slope * (t - EPOCH0) / DAY) - (D - dd)));
        }
      }
      if (eciFn) curveFn(eciFn, "#7c4dbe", false, 2.2);
      // time fit on the seen frontier
      if (seen.length >= 3) {
        const [m, k] = fit2pl(seen.map((p) => (p.t - EPOCH0) / DAY), seen.map((p) => p.score), { prior: refBy[pick].prior_time ?? PRIOR_T });
        curveFn((t) => sig(k * ((t - EPOCH0) / DAY - m)), palette.mintDeep, false, 2.2);
      } else {
        txt((xL + xR) / 2, H - PADB - 8, "too few points seen to fit", palette.bad, 11, "middle");
      }
      // cut-off marker + dots
      const cl = document.createElementNS(svgNS, "line");
      cl.setAttribute("x1", xOf(tstar)); cl.setAttribute("x2", xOf(tstar));
      cl.setAttribute("y1", PADT); cl.setAttribute("y2", H - PADB);
      cl.setAttribute("stroke", palette.soft); cl.setAttribute("stroke-width", 1);
      cl.setAttribute("stroke-dasharray", "2,4");
      svg.appendChild(cl);
      txt(xOf(tstar) + 4, PADT + 11, "cut-off", palette.soft, 10.5);
      for (const p of fr) {
        const c = document.createElementNS(svgNS, "circle");
        c.setAttribute("cx", xOf(p.t)); c.setAttribute("cy", yOf(p.score));
        c.setAttribute("r", 3);
        const isSeen = p.score <= cut;
        c.setAttribute("fill", isSeen ? palette.ink : "#fff");
        c.setAttribute("stroke", isSeen ? "none" : palette.soft);
        c.setAttribute("stroke-width", 1.2);
        svg.appendChild(c);
      }
    });
  }
  btn.addEventListener("click", () => {
    picks = sample3(picks);
    draw();
  });
  const legend = document.createElement("div");
  legend.style.cssText = `display:flex;justify-content:center;gap:1.1rem;margin-top:.55rem;` +
    `font-size:.8rem;color:${palette.soft};flex-wrap:wrap;`;
  legend.innerHTML =
    `<span><span style="display:inline-block;width:9px;height:9px;border-radius:99px;background:${palette.ink};margin-right:.3rem;"></span>seen</span>` +
    `<span><span style="display:inline-block;width:9px;height:9px;border-radius:99px;background:#fff;border:1.2px solid ${palette.soft};margin-right:.3rem;"></span>not yet</span>` +
    `<span><span style="display:inline-block;width:15px;border-top:2.2px solid ${palette.mintDeep};vertical-align:middle;margin-right:.3rem;"></span>time fit</span>` +
    `<span><span style="display:inline-block;width:15px;border-top:2.2px solid #7c4dbe;vertical-align:middle;margin-right:.3rem;"></span>two-step (ECI)</span>` +
    `<span><span style="display:inline-block;width:15px;border-top:2px dashed ${palette.soft};vertical-align:middle;margin-right:.3rem;"></span>final fit</span>`;
  wrap.appendChild(legend);

  // the maturity pill slider: owned here, broadcast to the error panels
  const SMIN = 0.10, SMAX = 1.0;
  const PW2 = 108;
  const sl = document.createElement("div");
  sl.style.cssText = "margin:.9rem auto 0;max-width:34rem;";
  sl.innerHTML =
    `<div class="glmd-track" style="position:relative;height:36px;border-radius:99px;` +
      `background:color-mix(in srgb, ${palette.mint} 15%, #fff);cursor:ew-resize;` +
      `touch-action:none;user-select:none;-webkit-user-select:none;">
      <div class="glmd-pill" style="position:absolute;top:50%;transform:translateY(-50%);` +
        `width:${PW2}px;height:28px;border-radius:99px;` +
        `background:color-mix(in srgb, ${palette.mint} 80%, #fff);` +
        `box-shadow:0 1px 4px rgba(0,0,0,.14);display:flex;align-items:center;` +
        `justify-content:center;font-size:.85rem;font-weight:650;color:#06382e;` +
        `font-variant-numeric:tabular-nums;pointer-events:none;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:.76rem;color:${palette.soft};margin-top:.35rem;">
      <span>sees almost nothing</span><span>sees the whole curve</span>
    </div>`;
  wrap.appendChild(sl);
  const track = sl.querySelector(".glmd-track");
  const pill = sl.querySelector(".glmd-pill");
  const paint = () => {
    const f = (delta - SMIN) / (SMAX - SMIN);
    pill.style.left = `calc(${(f * 100).toFixed(2)}% - ${(f * (PW2 + 8)).toFixed(1)}px + 4px)`;
    pill.textContent = `+${Math.round(delta * 100)}pp seen`;
  };
  let queued = false;
  const setFrom = (clientX) => {
    const r = track.getBoundingClientRect();
    let f = (clientX - r.left - PW2 / 2) / (r.width - PW2 - 8);
    f = Math.max(0, Math.min(1, f));
    delta = SMIN + f * (SMAX - SMIN);
    paint();
    document.dispatchEvent(new CustomEvent("gl-maturity-delta", { detail: delta }));
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; draw(); });
  };
  track.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    document.body.style.userSelect = "none";
    track.setPointerCapture(e.pointerId);
    setFrom(e.clientX);
  });
  track.addEventListener("pointermove", (e) => { if (track.hasPointerCapture?.(e.pointerId)) setFrom(e.clientX); });
  track.addEventListener("pointerup", () => { document.body.style.userSelect = ""; });
  track.addEventListener("pointercancel", () => { document.body.style.userSelect = ""; });
  paint();
  draw();
  return frame(wrap, { caption: spec.caption, provenance: spec.provenance });
}

/* ---------------------------------------------------------- glMaturityBias */
// Signed future error vs maturity: are the fits over or under? Median of
// (predicted - actual) on future frontier points, per method, with 16-84
// bands. Time fit straddles zero; the pre-offset two-step sits below it —
// the one-directional miss that motivates the frontier offset.
// data: backtest_maturity.json (bias_* fields).
export function glMaturityBias(_, data, spec = {}) {
  const { keep, maxDelta = 0.85, rliDelta = 0.136, after = false } = spec;
  const inKeep = (b) => !keep || keep.includes(b);
  const svgNS = "http://www.w3.org/2000/svg";
  // after: show the offset-corrected two-step, with the pre-offset line as a
  // dashed ghost — the "did the fix centre it?" view
  const SERIES = [
    { key: "bias_time", name: "time fit", color: palette.mintDeep },
    after
      ? { key: "bias_eci", name: "two-step (ECI)", color: "#7c4dbe" }
      : { key: "bias_eci_mid", name: "two-step (ECI)", color: "#7c4dbe" },
  ];
  const GHOSTKEY = after ? "bias_eci_mid" : null;
  const PAIRKEYS = ["bias_time", "bias_eci", "bias_eci_mid"];
  const slices = data.slices.map((sl) => {
    const ok = sl.fits.filter((f) => inKeep(f.benchmark) &&
      PAIRKEYS.every((k2) => f[k2] != null));
    const vals = {};
    for (const k2 of PAIRKEYS) vals[k2] = ok.map((f) => f[k2]);
    return { delta: sl.delta, vals };
  });
  const W2 = 880, H2 = 520, P2 = { l: 84, r: 20, t: 24, b: 60 }, FS = 1.3;
  const YMIN = -0.25, YMAX = 0.1;
  const x2 = (d) => P2.l + ((d - 0.05) / (maxDelta - 0.05)) * (W2 - P2.l - P2.r);
  const y2 = (v) => P2.t + (1 - (Math.max(YMIN, Math.min(YMAX, v)) - YMIN) / (YMAX - YMIN)) * (H2 - P2.t - P2.b);
  const q = (vals, pq) => {
    if (!vals.length) return null;
    const v = vals.slice().sort((a, b) => a - b);
    return v[Math.min(v.length - 1, Math.floor(pq * v.length))];
  };
  const wrap = document.createElement("div");
  wrap.style.cssText = `font-family:${font};display:flex;justify-content:center;`;
  const cell = document.createElement("div");
  cell.style.cssText = "flex:1 1 520px;min-width:320px;max-width:720px;";
  const svg2 = document.createElementNS(svgNS, "svg");
  svg2.setAttribute("viewBox", `0 0 ${W2} ${H2}`);
  svg2.style.cssText = "width:100%;height:auto;display:block;";
  const t2 = (x, y, str, fill, size, anchor2 = "start", weight = 400) => {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("fill", fill); t.setAttribute("font-size", size * FS);
    t.setAttribute("text-anchor", anchor2); t.setAttribute("font-weight", weight);
    t.setAttribute("font-family", font);
    t.textContent = str;
    svg2.appendChild(t);
  };
  for (const v of [-0.2, -0.1, 0, 0.1]) {
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", P2.l); l.setAttribute("x2", W2 - P2.r);
    l.setAttribute("y1", y2(v)); l.setAttribute("y2", y2(v));
    l.setAttribute("stroke", v === 0 ? palette.soft : palette.hairline);
    l.setAttribute("stroke-width", v === 0 ? 1.6 : 1);
    svg2.appendChild(l);
    t2(P2.l - 6, y2(v) + 4, (v > 0 ? "+" : "") + (v * 100) + "pp", palette.soft, 10.5, "end");
  }
  t2(P2.l + 8, y2(0) - 8, "predicts too high", palette.soft, 10.5);
  t2(P2.l + 8, y2(0) + 16, "predicts too low", palette.soft, 10.5);
  for (const d of [0.2, 0.4, 0.6, 0.8])
    t2(x2(d), H2 - P2.b + 26, "+" + Math.round(d * 100) + "pp", palette.soft, 10.5, "middle");
  t2((P2.l + W2 - P2.r) / 2, H2 - 8, "amount of curve seen when the fit was made", palette.muted, 11.5, "middle");
  if (GHOSTKEY) {
    const pts = slices.map((sl2) => ({ d: sl2.delta, md: q(sl2.vals[GHOSTKEY], 0.5), n: sl2.vals[GHOSTKEY].length }))
      .filter((p2) => p2.md != null && p2.n >= 5 && p2.d <= maxDelta);
    if (pts.length) {
      const line = pts.map((p2, j) => (j ? "L" : "M") + x2(p2.d).toFixed(1) + "," + y2(p2.md).toFixed(1)).join("");
      const lp = document.createElementNS(svgNS, "path");
      lp.setAttribute("d", line); lp.setAttribute("fill", "none");
      lp.setAttribute("stroke", "#7c4dbe"); lp.setAttribute("stroke-width", 1.6);
      lp.setAttribute("stroke-dasharray", "6,5"); lp.setAttribute("stroke-opacity", "0.75");
      svg2.appendChild(lp);
    }
    const lx = W2 - P2.r - 12, ly = P2.t + 18 + 2 * 26;
    const sw = document.createElementNS(svgNS, "line");
    sw.setAttribute("x1", lx - 30); sw.setAttribute("x2", lx - 8);
    sw.setAttribute("y1", ly - 5); sw.setAttribute("y2", ly - 5);
    sw.setAttribute("stroke", palette.soft); sw.setAttribute("stroke-width", 3);
    sw.setAttribute("stroke-linecap", "round"); sw.setAttribute("stroke-dasharray", "4,3");
    svg2.appendChild(sw);
    t2(lx - 38, ly, "dashed: before offset", palette.muted, 11.5, "end");
  }
  SERIES.forEach((s2, si) => {
    const pts = slices.map((sl2) => ({ d: sl2.delta, lo: q(sl2.vals[s2.key], 0.16),
      md: q(sl2.vals[s2.key], 0.5), hi: q(sl2.vals[s2.key], 0.84), n: sl2.vals[s2.key].length }))
      .filter((p2) => p2.md != null && p2.n >= 5 && p2.d <= maxDelta);
    if (!pts.length) return;
    const band = pts.map((p2, j) => (j ? "L" : "M") + x2(p2.d).toFixed(1) + "," + y2(p2.hi).toFixed(1)).join("")
      + pts.slice().reverse().map((p2) => "L" + x2(p2.d).toFixed(1) + "," + y2(p2.lo).toFixed(1)).join("") + "Z";
    const bp = document.createElementNS(svgNS, "path");
    bp.setAttribute("d", band); bp.setAttribute("fill", s2.color);
    bp.setAttribute("fill-opacity", "0.09"); bp.setAttribute("stroke", "none");
    svg2.appendChild(bp);
    const line = pts.map((p2, j) => (j ? "L" : "M") + x2(p2.d).toFixed(1) + "," + y2(p2.md).toFixed(1)).join("");
    const lp = document.createElementNS(svgNS, "path");
    lp.setAttribute("d", line); lp.setAttribute("fill", "none");
    lp.setAttribute("stroke", s2.color); lp.setAttribute("stroke-width", 2.2);
    svg2.appendChild(lp);
    const lx = W2 - P2.r - 12, ly = P2.t + 18 + si * 26;
    const sw = document.createElementNS(svgNS, "line");
    sw.setAttribute("x1", lx - 30); sw.setAttribute("x2", lx - 8);
    sw.setAttribute("y1", ly - 5); sw.setAttribute("y2", ly - 5);
    sw.setAttribute("stroke", s2.color); sw.setAttribute("stroke-width", 3);
    sw.setAttribute("stroke-linecap", "round");
    svg2.appendChild(sw);
    t2(lx - 38, ly, s2.name, palette.muted, 11.5, "end");
  });
  const rl = document.createElementNS(svgNS, "line");
  rl.setAttribute("x1", x2(rliDelta)); rl.setAttribute("x2", x2(rliDelta));
  rl.setAttribute("y1", P2.t); rl.setAttribute("y2", H2 - P2.b);
  rl.setAttribute("stroke", palette.ink); rl.setAttribute("stroke-width", 1.4);
  rl.setAttribute("stroke-dasharray", "4,3");
  svg2.appendChild(rl);
  t2(x2(rliDelta) + 5, H2 - P2.b - 8, "RLI today", palette.ink, 11.5, "start", 650);
  cell.appendChild(svg2);
  wrap.appendChild(cell);
  return frame(wrap, { caption: spec.caption, provenance: spec.provenance });
}

/* ---------------------------------------------------------------- glRhoMse */
// Forecastability diagnostic: each benchmark's capability-fit error against
// how strongly its scores correlate with ECI. Hover a dot for the name.
// data: rho_mse.json rows {benchmark, rho, mae, n}
export function glRhoMse(_, rows, spec = {}) {
  const { W = 760, H = 420, caption, provenance } = spec;
  const PAD = { l: 60, r: 20, t: 20, b: 52 };
  const svgNS = "http://www.w3.org/2000/svg";
  const rMin = 0.6, rMax = 1.0;
  const maes = rows.map((r) => r.mae);
  const yMax = Math.max(...maes) * 1.15;
  const xOf = (v) => PAD.l + ((v - rMin) / (rMax - rMin)) * (W - PAD.l - PAD.r);
  const yOf = (v) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.cssText = "width:100%;max-width:820px;height:auto;display:block;margin:0 auto;";
  const txt = (x, y, str, fill, size, weight = 400, anchor2 = "start") => {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("fill", fill); t.setAttribute("font-size", size);
    t.setAttribute("font-weight", weight); t.setAttribute("text-anchor", anchor2);
    t.setAttribute("font-family", font);
    t.textContent = str;
    svg.appendChild(t);
    return t;
  };
  for (let v = 0; v <= yMax; v += 0.02) {
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", PAD.l); l.setAttribute("x2", W - PAD.r);
    l.setAttribute("y1", yOf(v)); l.setAttribute("y2", yOf(v));
    l.setAttribute("stroke", palette.hairline); l.setAttribute("stroke-width", 1);
    svg.appendChild(l);
    txt(PAD.l - 8, yOf(v) + 4, (v * 100).toFixed(0) + "pp", palette.soft, 11.5, 400, "end");
  }
  for (let v = 0.6; v <= 1.001; v += 0.1) {
    txt(xOf(v), H - PAD.b + 20, v.toFixed(1), palette.soft, 11.5, 400, "middle");
  }
  txt((PAD.l + W - PAD.r) / 2, H - 8, "\u03c1: correlation of model scores with ECI",
      palette.muted, 12.5, 500, "middle");
  const yl = txt(16, (PAD.t + H - PAD.b) / 2, "item-CDF forecast error (MAE)", palette.muted, 12.5, 500, "middle");
  yl.setAttribute("transform", `rotate(-90 16 ${(PAD.t + H - PAD.b) / 2})`);
  const label = txt(PAD.l + 10, PAD.t + 12, "", palette.ink, 13, 650);
  // least-squares trend line
  {
    const xs = rows.map((r) => r.rho), ys = rows.map((r) => r.mae);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const b1 = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) /
               xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    const line = document.createElementNS(svgNS, "line");
    const y1 = my + b1 * (rMin - mx), y2 = my + b1 * (rMax - mx);
    line.setAttribute("x1", xOf(rMin)); line.setAttribute("y1", yOf(Math.max(y1, 0)));
    line.setAttribute("x2", xOf(rMax)); line.setAttribute("y2", yOf(Math.max(y2, 0)));
    line.setAttribute("stroke", palette.soft); line.setAttribute("stroke-width", 1.8);
    line.setAttribute("stroke-dasharray", "6,4");
    svg.appendChild(line);
    const sy = Math.sqrt(ys.reduce((a, y) => a + (y - my) ** 2, 0) / ys.length);
    const sx = Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0) / xs.length);
    const r = b1 * sx / sy;
    txt(W - PAD.r - 8, PAD.t + 14, `r = ${r.toFixed(2)}`, palette.muted, 13, 650, "end");
  }
  for (const r of rows) {
    const c = document.createElementNS(svgNS, "circle");
    c.setAttribute("cx", xOf(Math.max(r.rho, rMin))); c.setAttribute("cy", yOf(r.mae));
    c.setAttribute("r", 6);
    c.setAttribute("fill", palette.mintDeep); c.setAttribute("fill-opacity", "0.75");
    c.style.cursor = "pointer";
    c.addEventListener("pointerenter", () => {
      c.setAttribute("fill-opacity", "1");
      label.textContent = `${r.benchmark} \u00b7 \u03c1 ${r.rho.toFixed(2)} \u00b7 ${(r.mae * 100).toFixed(1)}pp`;
    });
    c.addEventListener("pointerleave", () => {
      c.setAttribute("fill-opacity", "0.75");
      label.textContent = "";
    });
    svg.appendChild(c);
  }
  // permanent name labels; right of the dot unless it would leave the frame,
  // staggered when two dots sit close
  {
    const placed = [];
    for (const r of rows.slice().sort((a, b) => a.mae - b.mae)) {
      const cx = xOf(Math.max(r.rho, rMin)), cy = yOf(r.mae);
      const rightSide = cx < W - PAD.r - 170;
      let ly = cy + 4.5;
      while (placed.some(([px, py]) => Math.abs(py - ly) < 15 &&
             ((rightSide && px > cx - 40) || (!rightSide && px < cx + 40)))) ly += 15;
      placed.push([cx, ly]);
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", rightSide ? cx + 11 : cx - 11);
      t.setAttribute("y", ly);
      t.setAttribute("text-anchor", rightSide ? "start" : "end");
      t.setAttribute("font-size", 12.5); t.setAttribute("fill", palette.muted);
      t.setAttribute("font-family", font);
      t.textContent = r.benchmark;
      svg.appendChild(t);
    }
  }
  return frame(svg, { caption, provenance });
}

/* --------------------------------------------------------------- glMetrCal */
// The calibration jump: METR task EDI (ECI units) against measured human
// completion time, log x, with the OLS line. Hover a dot for the task.
// data: [{task, minutes, edi}]
export function glMetrCal(_, data, spec = {}) {
  const pts = Array.isArray(data) ? data : data.cal;
  const projects = Array.isArray(data) ? null : data.projects;
  // with rli+clock supplied the figure grows a third panel (the anchored
  // shift); panels display smaller three-up, so type scales up to compensate
  const kit = !Array.isArray(data) && data.rli && data.clock ? rliAnchorKit(data) : null;
  const FS = kit ? 1.45 : 1;
  const { W = 560, H = 400, caption, provenance } = spec;
  const PAD = { l: 56, r: 18, t: 20, b: 52 };
  const svgNS = "http://www.w3.org/2000/svg";
  const xs = pts.map((p) => Math.log10(p.minutes));
  const ys = pts.map((p) => p.edi);
  const L0 = Math.min(...xs) - 0.2, L1 = Math.max(...xs) + 0.2;
  const E0 = 88, E1 = 175;
  const xOf = (lm) => PAD.l + ((lm - L0) / (L1 - L0)) * (W - PAD.l - PAD.r);
  const yOf = (e) => PAD.t + (1 - (e - E0) / (E1 - E0)) * (H - PAD.t - PAD.b);
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.cssText = "width:100%;height:auto;display:block;";
  const txt = (x, y, str, fill, size, anchor2 = "start", weight = 400) => {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("fill", fill); t.setAttribute("font-size", size * FS);
    t.setAttribute("text-anchor", anchor2); t.setAttribute("font-weight", weight);
    t.setAttribute("font-family", font);
    t.textContent = str;
    svg.appendChild(t);
    return t;
  };
  for (let e = 100; e <= 170; e += 20) {
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", PAD.l); l.setAttribute("x2", W - PAD.r);
    l.setAttribute("y1", yOf(e)); l.setAttribute("y2", yOf(e));
    l.setAttribute("stroke", palette.hairline);
    svg.appendChild(l);
    txt(PAD.l - 8, yOf(e) + 4, e, palette.soft, 11.5, "end");
  }
  const TICKS = [[1/60, "1s"], [1, "1min"], [15, "15min"], [240, "4h"], [1800, "30h"]];
  for (const [v, lab] of TICKS) {
    const lm = Math.log10(v);
    if (lm < L0 || lm > L1) continue;
    txt(xOf(lm), H - PAD.b + 20, lab, palette.soft, 11.5, "middle");
  }
  txt((PAD.l + W - PAD.r) / 2, H - 8, "human completion time (METR-measured)", palette.muted, 12.5, "middle");
  const yl = txt(16, (PAD.t + H - PAD.b) / 2, "task difficulty (ECI units)", palette.muted, 12.5, "middle");
  yl.setAttribute("transform", `rotate(-90 16 ${(PAD.t + H - PAD.b) / 2})`);
  // OLS on log10(minutes)
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const b1 = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) /
             xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  // OLS line with 95% bands: hyperbolic CI on the mean, wider prediction
  // band for where a NEW task of that duration should land
  {
    const n = xs.length;
    const Sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    const resid = ys.map((y, i) => y - (my + b1 * (xs[i] - mx)));
    const s2 = resid.reduce((a, r2) => a + r2 * r2, 0) / (n - 2);
    const sd = Math.sqrt(s2);
    const grid2 = [];
    for (let i = 0; i <= 60; i++) grid2.push(L0 + (L1 - L0) * i / 60);
    const mkBand = (mult, opacity) => {
      const up = grid2.map((x) => [xOf(x), yOf(my + b1 * (x - mx) +
        1.96 * sd * Math.sqrt(mult + 1 / n + (x - mx) ** 2 / Sxx))]);
      const dn = grid2.map((x) => [xOf(x), yOf(my + b1 * (x - mx) -
        1.96 * sd * Math.sqrt(mult + 1 / n + (x - mx) ** 2 / Sxx))]);
      const d0 = up.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join("") +
        dn.reverse().map((p) => "L" + p[0].toFixed(1) + "," + p[1].toFixed(1)).join("") + "Z";
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", d0); path.setAttribute("fill", palette.neutral);
      path.setAttribute("fill-opacity", opacity); path.setAttribute("stroke", "none");
      svg.appendChild(path);
    };
    mkBand(1, 0.10);  // 95% prediction band (new task)
    mkBand(0, 0.22);  // 95% CI on the line itself
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", xOf(L0)); line.setAttribute("y1", yOf(my + b1 * (L0 - mx)));
    line.setAttribute("x2", xOf(L1)); line.setAttribute("y2", yOf(my + b1 * (L1 - mx)));
    line.setAttribute("stroke", palette.neutralInk); line.setAttribute("stroke-width", 1.8);
    line.setAttribute("stroke-dasharray", "6,4");
    svg.appendChild(line);
  }
  const sy = Math.sqrt(ys.reduce((a, y) => a + (y - my) ** 2, 0) / ys.length);
  const sx = Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0) / xs.length);
  txt(W - PAD.r - 8, PAD.t + 14, `r = ${(b1 * sx / sy).toFixed(2)}`, palette.muted, 13, "end", 650);
  const hover = txt(PAD.l + 8, PAD.t + 14, "", palette.ink, 12, "start", 650);
  for (const p of pts) {
    const c = document.createElementNS(svgNS, "circle");
    c.setAttribute("cx", xOf(Math.log10(p.minutes))); c.setAttribute("cy", yOf(p.edi));
    c.setAttribute("r", 3.6 * (kit ? 1.25 : 1));
    c.setAttribute("fill", palette.mintDeep); c.setAttribute("fill-opacity", "0.55");
    c.style.cursor = "pointer";
    c.addEventListener("pointerenter", () => {
      c.setAttribute("fill-opacity", "1");
      const m = p.minutes;
      const dur = m < 1 ? Math.round(m * 60) + "s" : m < 60 ? Math.round(m) + "min" : (m / 60).toFixed(1) + "h";
      hover.textContent = `${p.task} \u00b7 ${dur} \u00b7 EDI ${p.edi.toFixed(0)}`;
    });
    c.addEventListener("pointerleave", () => {
      c.setAttribute("fill-opacity", "0.55");
      hover.textContent = "";
    });
    svg.appendChild(c);
  }
  if (!projects) return frame(svg, { caption, provenance });

  // two-panel: right side converts the RLI completion times through the
  // fitted line into an ECI-unit difficulty distribution
  const row = document.createElement("div");
  row.style.cssText = `display:flex;gap:2rem;justify-content:center;align-items:flex-start;` +
    `flex-wrap:wrap;font-family:${font};`;
  const mkCell = (titleText, node) => {
    const cell = document.createElement("div");
    cell.style.cssText = kit
      ? "flex:1 1 250px;min-width:240px;max-width:430px;"
      : "flex:1 1 400px;min-width:340px;max-width:600px;";
    const t = document.createElement("div");
    t.textContent = titleText;
    t.style.cssText = `font-size:.95rem;font-weight:650;color:${palette.ink};` +
      `text-align:center;margin-bottom:.4rem;`;
    cell.appendChild(t); cell.appendChild(node);
    row.appendChild(cell);
  };
  mkCell("METR tasks: difficulty vs human time", svg);

  const svg2 = document.createElementNS(svgNS, "svg");
  svg2.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg2.style.cssText = "width:100%;height:auto;display:block;";
  const txt2 = (x, y, str, fill, size, anchor2 = "start", weight = 400) => {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("fill", fill); t.setAttribute("font-size", size * FS);
    t.setAttribute("text-anchor", anchor2); t.setAttribute("font-weight", weight);
    t.setAttribute("font-family", font);
    t.textContent = str;
    svg2.appendChild(t);
  };
  const edis = projects.map((p) => my + b1 * (Math.log10(p.hours * 60) - mx));
  const EMIN = 110, EMAX = 185, NB = 20;
  const h = new Array(NB).fill(0);
  for (const e of edis) {
    const i = Math.max(0, Math.min(NB - 1, Math.floor((e - EMIN) / (EMAX - EMIN) * NB)));
    h[i]++;
  }
  const hMax = Math.max(...h) * 1.12;
  const x2 = (e) => PAD.l + ((e - EMIN) / (EMAX - EMIN)) * (W - PAD.l - PAD.r);
  const y0 = H - PAD.b;
  const bw = (W - PAD.l - PAD.r) / NB;
  h.forEach((n, i) => {
    if (!n) return;
    const r = document.createElementNS(svgNS, "rect");
    r.setAttribute("x", x2(EMIN + i * (EMAX - EMIN) / NB) + 0.5);
    r.setAttribute("width", bw - 1);
    r.setAttribute("y", y0 - (n / hMax) * (y0 - PAD.t));
    r.setAttribute("height", (n / hMax) * (y0 - PAD.t));
    r.setAttribute("fill", palette.mint); r.setAttribute("fill-opacity", "0.6");
    r.setAttribute("stroke", palette.mintDeep); r.setAttribute("stroke-width", "0.8");
    svg2.appendChild(r);
  });
  const ax2 = document.createElementNS(svgNS, "line");
  ax2.setAttribute("x1", PAD.l); ax2.setAttribute("x2", W - PAD.r);
  ax2.setAttribute("y1", y0); ax2.setAttribute("y2", y0);
  ax2.setAttribute("stroke", palette.soft);
  svg2.appendChild(ax2);
  for (let e = 120; e <= 180; e += 20) txt2(x2(e), y0 + 19, e, palette.soft, 11.5, "middle");
  txt2((PAD.l + W - PAD.r) / 2, H - 8, "implied RLI project difficulty (ECI units)", palette.muted, 12.5, "middle");
  const ftEci = kit ? kit.eciAt(+new Date(spec.today ?? "2026-07-10")) : 162.9;
  const ft = document.createElementNS(svgNS, "line");
  ft.setAttribute("x1", x2(ftEci)); ft.setAttribute("x2", x2(ftEci));
  ft.setAttribute("y1", PAD.t); ft.setAttribute("y2", y0);
  ft.setAttribute("stroke", palette.ink); ft.setAttribute("stroke-width", 1.2);
  ft.setAttribute("stroke-dasharray", "4,3");
  svg2.appendChild(ft);
  txt2(x2(ftEci) + 5, PAD.t + 14, "frontier today", palette.muted, 11.5);
  mkCell("RLI projects converted to ECI units", svg2);

  // third panel: the same distribution shifted onto the leaderboard anchor
  if (kit) {
    const svg3 = document.createElementNS(svgNS, "svg");
    svg3.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg3.style.cssText = "width:100%;height:auto;display:block;";
    const txt3 = (x, y, str, fill, size, anchor2 = "start", weight = 400) => {
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", x); t.setAttribute("y", y);
      t.setAttribute("fill", fill); t.setAttribute("font-size", size * FS);
      t.setAttribute("text-anchor", anchor2); t.setAttribute("font-weight", weight);
      t.setAttribute("font-family", font);
      t.textContent = str;
      svg3.appendChild(t);
    };
    const E3MIN = 110, E3MAX = 200, NB3 = 24;
    const bin3 = (vals) => {
      const h3 = new Array(NB3).fill(0);
      for (const e of vals) {
        const i = Math.max(0, Math.min(NB3 - 1, Math.floor((e - E3MIN) / (E3MAX - E3MIN) * NB3)));
        h3[i]++;
      }
      return h3;
    };
    const hRaw = bin3(kit.edis);
    const hSh = bin3(kit.edis.map((e) => e + kit.anchor));
    const hM3 = Math.max(...hRaw, ...hSh) * 1.12;
    const x3 = (e) => PAD.l + ((e - E3MIN) / (E3MAX - E3MIN)) * (W - PAD.l - PAD.r);
    const bw3 = (W - PAD.l - PAD.r) / NB3;
    const rect3 = (n, i, solid) => {
      if (!n) return;
      const r = document.createElementNS(svgNS, "rect");
      r.setAttribute("x", x3(E3MIN + i * (E3MAX - E3MIN) / NB3) + 0.5);
      r.setAttribute("width", bw3 - 1);
      r.setAttribute("y", y0 - (n / hM3) * (y0 - PAD.t));
      r.setAttribute("height", (n / hM3) * (y0 - PAD.t));
      if (solid) {
        r.setAttribute("fill", palette.mint); r.setAttribute("fill-opacity", "0.6");
        r.setAttribute("stroke", palette.mintDeep); r.setAttribute("stroke-width", "0.8");
      } else {
        r.setAttribute("fill", "none");
        r.setAttribute("stroke", palette.soft); r.setAttribute("stroke-width", "1");
        r.setAttribute("stroke-dasharray", "3,2");
      }
      svg3.appendChild(r);
    };
    hRaw.forEach((n, i) => rect3(n, i, false));
    hSh.forEach((n, i) => rect3(n, i, true));
    const ax3 = document.createElementNS(svgNS, "line");
    ax3.setAttribute("x1", PAD.l); ax3.setAttribute("x2", W - PAD.r);
    ax3.setAttribute("y1", y0); ax3.setAttribute("y2", y0);
    ax3.setAttribute("stroke", palette.soft);
    svg3.appendChild(ax3);
    for (let e = 120; e <= 200; e += 20) txt3(x3(e), y0 + 19, e, palette.soft, 11.5, "middle");
    txt3((PAD.l + W - PAD.r) / 2, H - 8, "shifted difficulty (ECI units)", palette.muted, 12.5, "middle");
    const ft3 = document.createElementNS(svgNS, "line");
    ft3.setAttribute("x1", x3(ftEci)); ft3.setAttribute("x2", x3(ftEci));
    ft3.setAttribute("y1", PAD.t); ft3.setAttribute("y2", y0);
    ft3.setAttribute("stroke", palette.ink); ft3.setAttribute("stroke-width", 1.2);
    ft3.setAttribute("stroke-dasharray", "4,3");
    svg3.appendChild(ft3);
    txt3(x3(ftEci) - 5, PAD.t + 14, "frontier today", palette.muted, 11.5, "end");
    txt3(W - PAD.r - 8, PAD.t + 14, `+${kit.anchor.toFixed(1)} ECI`, palette.muted, 13, "end", 650);
    txt3(PAD.l + 8, PAD.t + 14, "dashed: unshifted", palette.soft, 11.5);
    mkCell("shifted to match the leaderboard", svg3);
  }
  return frame(row, { caption, provenance });
}

// canonical frontier: per-x max score, then cumulative max KEEPING ties —
// the single definition every fit and anchor must share (mirrors python)
function glFrontier(pts, xOf, yOf2) {
  const byX = new Map();
  for (const pnt of pts) {
    const x = xOf(pnt), y = yOf2(pnt);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (!byX.has(x) || y > yOf2(byX.get(x))) byX.set(x, pnt);
  }
  const arr = [...byX.values()].sort((a, b) => xOf(a) - xOf(b));
  let mx = -Infinity;
  return arr.filter((pnt) => (yOf2(pnt) >= mx ? ((mx = yOf2(pnt)), true) : false));
}

/* ----------------------------------------------------------- glRliAnchored */
// The closing figure: the automation trajectory implied by the anchored RLI
// difficulty distribution composed with the frontier clock, drawn over the
// actual leaderboard, with the naive time sigmoid and the two-step as
// reference curves. The shift is fitted live on the leaderboard frontier.
// data: {cal: metr_calibration.json, projects: rli_projects.json,
//        rli: [{date, score, pretty}], clock: clock.json, pimpale}

// shared with glMetrCal: METR calibration OLS, project EDIs, clock
// interpolation, and the uniform anchor fitted on the RLI frontier
function rliAnchorKit(data) {
  const cxs = data.cal.map((p) => Math.log10(p.minutes));
  const cys = data.cal.map((p) => p.edi);
  const mx = cxs.reduce((a, b) => a + b, 0) / cxs.length;
  const my = cys.reduce((a, b) => a + b, 0) / cys.length;
  const b1 = cxs.reduce((a, x, i) => a + (x - mx) * (cys[i] - my), 0) /
             cxs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const edis = data.projects.map((p) => my + b1 * (Math.log10(p.hours * 60) - mx));
  const ck = data.clock.map((r) => ({ t: +new Date(r.date), eci: r.eci }));
  const eciAt = (t) => {
    if (t <= ck[0].t) return ck[0].eci;
    if (t >= ck[ck.length - 1].t) return ck[ck.length - 1].eci;
    let i = 1;
    while (ck[i].t < t) i++;
    const f = (t - ck[i - 1].t) / (ck[i].t - ck[i - 1].t);
    return ck[i - 1].eci + f * (ck[i].eci - ck[i - 1].eci);
  };
  const cdf = (shift, eci) => edis.reduce((a, e) => a + (e + shift <= eci ? 1 : 0), 0) / edis.length;
  const pts = data.rli.slice().sort((a, b) => +a.date - +b.date);
  const frontier = glFrontier(pts, (p) => +p.date, (p) => p.score);
  let anchor = 0, bestL = Infinity;
  for (let s = 0; s <= 40; s += 0.1) {
    const L = frontier.reduce((a, p) => a + (cdf(s, eciAt(+p.date)) - p.score) ** 2, 0);
    if (L < bestL) { bestL = L; anchor = s; }
  }
  return { edis, eciAt, cdf, anchor, frontier, pts };
}

export function glRliAnchored(_, data, spec = {}) {
  const { W = 1120, H = 640, caption, provenance } = spec;
  const PAD = { l: 96, r: 34, t: 40, b: 64 };
  const svgNS = "http://www.w3.org/2000/svg";
  const { eciAt, cdf, anchor, frontier, pts } = rliAnchorKit(data);

  // reader-controlled pace: beyond today the clock's rate eases to mult x
  // via a smoothstep (the past, and therefore the anchor, never moves)
  const T0v = +new Date(spec.today ?? "2026-07-10");
  const YRms = 365.25 * 24 * 3600e3, Wv = YRms / 4;
  const smf = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  const eciAtMult = (mult) => {
    if (mult === 1) return eciAt;
    const TA = T0v - Wv, STEP = 86400e3 * 2;
    const ts = [], es = [];
    let e = eciAt(TA);
    for (let t = TA; t <= +new Date("2029-06-01"); t += STEP) {
      ts.push(t); es.push(e);
      const slope = (eciAt(t + STEP) - eciAt(t)) / STEP;
      e += slope * (1 + (mult - 1) * smf((t - TA) / (2 * Wv))) * STEP;
    }
    return (t) => {
      if (t <= TA) return eciAt(t);
      let i = Math.min(ts.length - 1, Math.max(1, Math.ceil((t - TA) / STEP)));
      const f = (t - ts[i - 1]) / STEP;
      return es[i - 1] + f * (es[i] - es[i - 1]);
    };
  };

  const wrap = document.createElement("div");
  wrap.style.cssText = `font-family:${font};`;
  const title = document.createElement("div");
  title.textContent = "Implied automation trajectory";
  title.style.cssText = `font-size:1.15rem;font-weight:650;color:${palette.ink};` +
    `text-align:center;margin-bottom:.5rem;`;
  wrap.appendChild(title);
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.cssText = "width:100%;max-width:880px;height:auto;display:block;margin:0 auto;";
  wrap.appendChild(svg);
  const txt = (x, y, str, fill, size, anchor2 = "start", weight = 400) => {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("fill", fill); t.setAttribute("font-size", size);
    t.setAttribute("text-anchor", anchor2); t.setAttribute("font-weight", weight);
    t.setAttribute("font-family", font);
    t.textContent = str;
    svg.appendChild(t);
    return t;
  };

  const T0 = +new Date("2025-01-01"), T1 = +new Date("2029-01-01");
  const xOf = (t) => PAD.l + ((t - T0) / (T1 - T0)) * (W - PAD.l - PAD.r);
  const yOf = (v) => PAD.t + (1 - v) * (H - PAD.t - PAD.b);
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", PAD.l); l.setAttribute("x2", W - PAD.r);
    l.setAttribute("y1", yOf(v)); l.setAttribute("y2", yOf(v));
    l.setAttribute("stroke", palette.hairline);
    svg.appendChild(l);
    txt(PAD.l - 14, yOf(v) + 6, (v * 100) + "%", palette.soft, 17, "end", 600);
  }
  for (let yr = 2025; yr <= 2029; yr++) {
    txt(xOf(+new Date(yr + "-01-01")), H - PAD.b + 32, yr, palette.soft, 17, "middle", 600);
  }

  const curveD = (fn) => {
    let d = "";
    for (let px = PAD.l; px <= W - PAD.r; px += 2) {
      const t = T0 + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (T1 - T0);
      d += (d ? "L" : "M") + px + "," + yOf(Math.max(0, Math.min(1, fn(t)))).toFixed(1);
    }
    return d;
  };
  const drawCurve = (fn, color, width, dash) => {
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", curveD(fn)); path.setAttribute("fill", "none");
    path.setAttribute("stroke", color); path.setAttribute("stroke-width", width);
    if (dash) path.setAttribute("stroke-dasharray", dash);
    svg.appendChild(path);
    return path;
  };
  const legend = [];
  // naive time sigmoid on the leaderboard frontier (same fit as the opener)
  {
    const sp = frontier.map((p) => ({ t: +p.date, v: p.score }));
    const tmin = Math.min(...sp.map((d) => d.t));
    const span = Math.max(...sp.map((d) => d.t)) - tmin || 1;
    const sg = (t, t0, k) => 1 / (1 + Math.exp(-k * (t - t0)));
    const sse = (f) => sp.reduce((a, d) => a + (f(d.t) - d.v) ** 2, 0);
    let best = null;
    for (let i = 0; i <= 80; i++)
      for (let j = 0; j <= 80; j++) {
        const t0 = tmin + span * ((i / 80) * 8 - 1);
        const k = (0.03 / span) * Math.pow(4000, j / 80);
        const e = sse((t) => sg(t, t0, k));
        if (!best || e < best.e) best = { t0, k, e };
      }
    for (let it = 0; it < 60; it++)
      for (const [dt, mk] of [[span * 0.005, 1], [-span * 0.005, 1], [0, 1.03], [0, 1 / 1.03]]) {
        const t0 = best.t0 + dt, k = best.k * mk;
        const e = sse((t) => sg(t, t0, k));
        if (e < best.e) best = { t0, k, e };
      }
    drawCurve((t) => sg(t, best.t0, best.k), palette.neutralInk, 2.4, "9,6");
    legend.push(["sigmoid fit (time)", palette.neutralInk, "9,6"]);
  }
  // two-step: benchmark-level 2PL in ECI composed with the same clock
  const clocked = [];   // [path, clockFn -> valueFn] pairs, redrawn by the slider
  if (data.pimpale?.length) {
    const { D, alpha } = data.pimpale[0];
    const mk = (ck) => (t) => 1 / (1 + Math.exp(-alpha * (ck(t) - D)));
    clocked.push([drawCurve(mk(eciAt), "#7c4dbe", 2.4, "3,5"), mk]);
    legend.push(["two-step", "#7c4dbe", "3,5"]);
  }
  {
    const mk = (ck) => (t) => cdf(anchor, ck(t));
    clocked.push([drawCurve(mk(eciAt), palette.mintDeep, 3.6, null), mk]);
  }
  legend.push(["anchored item CDF", palette.mintDeep, null]);
  legend.forEach(([name, color, dash], i) => {
    const y = PAD.t + 58 + i * 27;
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", PAD.l + 14); l.setAttribute("x2", PAD.l + 50);
    l.setAttribute("y1", y - 6); l.setAttribute("y2", y - 6);
    l.setAttribute("stroke", color); l.setAttribute("stroke-width", 3.2);
    if (dash) l.setAttribute("stroke-dasharray", dash);
    svg.appendChild(l);
    txt(PAD.l + 58, y, name, palette.muted, 16.5);
  });
  const hover = txt(PAD.l + 14, PAD.t + 24, "", palette.ink, 17, "start", 650);
  for (const p of pts) {
    const c = document.createElementNS(svgNS, "circle");
    c.setAttribute("cx", xOf(+p.date)); c.setAttribute("cy", yOf(p.score));
    c.setAttribute("r", 7.5);
    const onFrontier = frontier.includes(p);
    c.setAttribute("fill", onFrontier ? palette.ink : "#fff");
    c.setAttribute("stroke", palette.ink); c.setAttribute("stroke-width", 2);
    c.style.cursor = "pointer";
    c.addEventListener("pointerenter", () => {
      hover.textContent = `${p.pretty} · ${(p.score * 100).toFixed(1)}%`;
    });
    c.addEventListener("pointerleave", () => { hover.textContent = ""; });
    svg.appendChild(c);
  }
  txt(W - PAD.r - 12, H - PAD.b - 16,
    `shift +${anchor.toFixed(1)} ECI, fitted on the frontier (filled points)`,
    palette.soft, 14.5, "end");
  const slider = glRateSlider(null, null, { min: 0.5, max: 2, value: 1 });
  slider.style.maxWidth = "34rem";
  slider.style.margin = "1rem auto 0";
  slider.addEventListener("input", () => {
    const ck = eciAtMult(slider.value);
    for (const [path, mk] of clocked) path.setAttribute("d", curveD(mk(ck)));
  });
  wrap.appendChild(slider);
  return frame(wrap, { caption, provenance });
}

/* -------------------------------------------------------------- glRliHists */
// Log-binned histograms of the digitised RLI projects: completion time and
// cost, side by side. data: [{hours, cost}]
export function glRliHists(_, pts, spec = {}) {
  const { W = 460, H = 280, caption, provenance } = spec;
  const PAD = { l: 40, r: 12, t: 18, b: 44 };
  const svgNS = "http://www.w3.org/2000/svg";
  const row = document.createElement("div");
  row.style.cssText = `display:flex;gap:2rem;justify-content:center;align-items:flex-start;` +
    `flex-wrap:wrap;font-family:${font};`;
  const panel = (titleText, vals, lo, hi, fmt) => {
    const cell = document.createElement("div");
    cell.style.cssText = "flex:1 1 380px;min-width:320px;max-width:560px;";
    const t = document.createElement("div");
    t.textContent = titleText;
    t.style.cssText = `font-size:.95rem;font-weight:650;color:${palette.ink};` +
      `text-align:center;margin-bottom:.4rem;`;
    cell.appendChild(t);
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.cssText = "width:100%;height:auto;display:block;";
    cell.appendChild(svg);
    const NB = 18;
    const L0 = Math.log10(lo), L1 = Math.log10(hi);
    const h = new Array(NB).fill(0);
    for (const v of vals) {
      const i = Math.max(0, Math.min(NB - 1, Math.floor((Math.log10(v) - L0) / (L1 - L0) * NB)));
      h[i]++;
    }
    const hMax = Math.max(...h) * 1.1;
    const xOf = (i) => PAD.l + (i / NB) * (W - PAD.l - PAD.r);
    const bw = (W - PAD.l - PAD.r) / NB;
    const y0 = H - PAD.b;
    h.forEach((n, i) => {
      if (!n) return;
      const r = document.createElementNS(svgNS, "rect");
      r.setAttribute("x", xOf(i) + 0.5); r.setAttribute("width", bw - 1);
      r.setAttribute("y", y0 - (n / hMax) * (y0 - PAD.t));
      r.setAttribute("height", (n / hMax) * (y0 - PAD.t));
      r.setAttribute("fill", palette.mint); r.setAttribute("fill-opacity", "0.6");
      r.setAttribute("stroke", palette.mintDeep); r.setAttribute("stroke-width", "0.8");
      svg.appendChild(r);
    });
    const ax = document.createElementNS(svgNS, "line");
    ax.setAttribute("x1", PAD.l); ax.setAttribute("x2", W - PAD.r);
    ax.setAttribute("y1", y0); ax.setAttribute("y2", y0);
    ax.setAttribute("stroke", palette.soft);
    svg.appendChild(ax);
    for (const [v, lab] of fmt) {
      const x = PAD.l + (Math.log10(v) - L0) / (L1 - L0) * (W - PAD.l - PAD.r);
      const tk = document.createElementNS(svgNS, "line");
      tk.setAttribute("x1", x); tk.setAttribute("x2", x);
      tk.setAttribute("y1", y0); tk.setAttribute("y2", y0 + 5);
      tk.setAttribute("stroke", palette.soft);
      svg.appendChild(tk);
      const tx = document.createElementNS(svgNS, "text");
      tx.setAttribute("x", x); tx.setAttribute("y", y0 + 19);
      tx.setAttribute("text-anchor", "middle"); tx.setAttribute("font-size", 11);
      tx.setAttribute("fill", palette.soft); tx.setAttribute("font-family", font);
      tx.textContent = lab;
      svg.appendChild(tx);
    }
    // median marker
    const med = vals.slice().sort((a, b) => a - b)[Math.floor(vals.length / 2)];
    const mx = PAD.l + (Math.log10(med) - L0) / (L1 - L0) * (W - PAD.l - PAD.r);
    const ml = document.createElementNS(svgNS, "line");
    ml.setAttribute("x1", mx); ml.setAttribute("x2", mx);
    ml.setAttribute("y1", PAD.t); ml.setAttribute("y2", y0);
    ml.setAttribute("stroke", palette.ink); ml.setAttribute("stroke-width", 1.2);
    ml.setAttribute("stroke-dasharray", "4,3");
    svg.appendChild(ml);
    const mt = document.createElementNS(svgNS, "text");
    mt.setAttribute("x", mx + 5); mt.setAttribute("y", PAD.t + 11);
    mt.setAttribute("font-size", 11.5); mt.setAttribute("font-weight", 650);
    mt.setAttribute("fill", palette.ink); mt.setAttribute("font-family", font);
    mt.textContent = "median " + (titleText.includes("cost") ? "$" + Math.round(med) : med.toFixed(1) + "h");
    svg.appendChild(mt);
    row.appendChild(cell);
  };
  panel("completion time", pts.map((p) => p.hours), 0.15, 600,
        [[1, "1h"], [10, "10h"], [100, "100h"]]);
  panel("cost", pts.map((p) => p.cost), 6, 30000,
        [[10, "$10"], [100, "$100"], [1000, "$1k"], [10000, "$10k"]]);
  return frame(row, { caption, provenance });
}

/* ------------------------------------------------------------ glRliExtract */
// Side-by-side provenance: the RLI paper's original scatter (static image)
// next to our digitised reconstruction as an interactive log-log scatter.
// data: [{hours, cost}]; spec.img: url of the original figure.
export function glRliExtract(_, pts, spec = {}) {
  const { img, W = 460, H = 400, caption, provenance } = spec;
  const PAD = { l: 52, r: 14, t: 16, b: 44 };
  const svgNS = "http://www.w3.org/2000/svg";
  const row = document.createElement("div");
  row.style.cssText = `display:flex;gap:2rem;justify-content:center;align-items:flex-start;` +
    `flex-wrap:wrap;font-family:${font};`;
  const mk = (titleText) => {
    const cell = document.createElement("div");
    cell.style.cssText = "flex:1 1 380px;min-width:320px;max-width:560px;";
    const t = document.createElement("div");
    t.textContent = titleText;
    t.style.cssText = `font-size:.95rem;font-weight:650;color:${palette.ink};` +
      `text-align:center;margin-bottom:.4rem;`;
    cell.appendChild(t);
    return cell;
  };
  const left = mk("theirs: RLI paper, Figure 15");
  const im = document.createElement("img");
  im.src = img;
  im.style.cssText = "width:100%;height:auto;display:block;border:1px solid " + palette.hairline +
    ";border-radius:6px;";
  left.appendChild(im);
  row.appendChild(left);

  const right = mk("ours: 171 projects digitised, hover them");
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.cssText = "width:100%;height:auto;display:block;";
  right.appendChild(svg);
  row.appendChild(right);

  const hMin = Math.log10(0.15), hMax = Math.log10(600);
  const cMin = Math.log10(6), cMax = Math.log10(30000);
  const xOf = (h) => PAD.l + ((Math.log10(h) - hMin) / (hMax - hMin)) * (W - PAD.l - PAD.r);
  const yOf = (c) => PAD.t + (1 - (Math.log10(c) - cMin) / (cMax - cMin)) * (H - PAD.t - PAD.b);
  const txt = (x, y, str, fill, size, anchor2 = "start", weight = 400) => {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("fill", fill); t.setAttribute("font-size", size);
    t.setAttribute("text-anchor", anchor2); t.setAttribute("font-weight", weight);
    t.setAttribute("font-family", font);
    t.textContent = str;
    svg.appendChild(t);
    return t;
  };
  for (const v of [10, 100, 1000, 10000]) {
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", PAD.l); l.setAttribute("x2", W - PAD.r);
    l.setAttribute("y1", yOf(v)); l.setAttribute("y2", yOf(v));
    l.setAttribute("stroke", palette.hairline);
    svg.appendChild(l);
    txt(PAD.l - 6, yOf(v) + 3.5, "$" + (v >= 1000 ? (v/1000) + "k" : v), palette.soft, 10.5, "end");
  }
  for (const v of [1, 10, 100]) {
    txt(xOf(v), H - PAD.b + 16, v + "h", palette.soft, 10.5, "middle");
  }
  txt((PAD.l + W - PAD.r) / 2, H - 6, "human completion time", palette.muted, 11.5, "middle");
  const hover = txt(PAD.l + 6, PAD.t + 10, "", palette.ink, 12, "start", 650);
  for (const p of pts) {
    const c = document.createElementNS(svgNS, "circle");
    c.setAttribute("cx", xOf(p.hours)); c.setAttribute("cy", yOf(p.cost));
    c.setAttribute("r", 3.4);
    c.setAttribute("fill", palette.mintDeep); c.setAttribute("fill-opacity", "0.6");
    c.style.cursor = "pointer";
    c.addEventListener("pointerenter", () => {
      c.setAttribute("fill-opacity", "1");
      const hrs = p.hours < 1 ? Math.round(p.hours * 60) + " min" : p.hours.toFixed(p.hours < 10 ? 1 : 0) + " h";
      hover.textContent = `${hrs} \u00b7 $${Math.round(p.cost).toLocaleString()}`;
    });
    c.addEventListener("pointerleave", () => {
      c.setAttribute("fill-opacity", "0.6");
      hover.textContent = "";
    });
    svg.appendChild(c);
  }
  return frame(row, { caption, provenance });
}

/* ---------------------------------------------------------------- glCdfEci */
// Verification panels with an axis toggle. ECI view (default): every model at
// (its ECI, its score) with the item-difficulty CDF integrated over ECI — no
// clock involved, so distribution errors are naked. Time view: the same CDF
// composed with the capability clock against the dated points.
// data: {dists, ecipoints, points (zoo rows), oneclock}
export function glCdfEci(_, data, spec = {}) {
  const { benchmarks, cols = 3, W = 390, H = 250, eMin = 100, eMax = 175 } = spec;
  const PAD = { l: 34, r: 10, t: 18, b: 28 };
  const svgNS = "http://www.w3.org/2000/svg";
  const DIST_NAME = { "GPQA diamond": "GPQA Diamond", "SWE-Bench verified": "SWE-bench Verified",
                      "OTIS Mock AIME 2024-2025": "OTIS Mock AIME" };
  const distBy = Object.fromEntries(data.dists.map((d) =>
    [d.benchmark, { edis: d.edis.slice().sort((a, b) => a - b), total: d.n }]));
  const eciBy = new Map(), timeBy = new Map();
  for (const r of data.ecipoints ?? []) {
    if (!eciBy.has(r.benchmark)) eciBy.set(r.benchmark, []);
    eciBy.get(r.benchmark).push({ eci: r.eci, score: r.score, t: +new Date(r.date) });
  }
  for (const r of data.points ?? []) {
    if (!timeBy.has(r.benchmark)) timeBy.set(r.benchmark, []);
    timeBy.get(r.benchmark).push({ t: +new Date(r.date), score: r.score });
  }
  const ocBy = Object.fromEntries((data.oneclock ?? []).map((r) => [r.benchmark, r.series]));
  // smoothed clock: linear between the frontier staircase's rise points, so
  // date-view curves look like the capability view stretched, not a staircase
  const corners = [];
  {
    let last = -Infinity;
    for (const c of data.clock ?? []) {
      if (c.eci > last + 1e-9) { corners.push({ t: +new Date(c.date), e: c.eci }); last = c.eci; }
    }
  }
  // future extension at the fitted trend, not the noisy last-step slope
  const YR = 365.25 * 86400e3;
  let trend = 14.8;
  if (corners.length > 3) {
    const cut = corners[corners.length - 1].t - 2 * YR;
    const recent = corners.filter((c) => c.t >= cut);
    if (recent.length >= 3) {
      const mt = recent.reduce((a, c) => a + c.t, 0) / recent.length;
      const me = recent.reduce((a, c) => a + c.e, 0) / recent.length;
      trend = recent.reduce((a, c) => a + (c.t - mt) * (c.e - me), 0) /
              recent.reduce((a, c) => a + (c.t - mt) ** 2, 0) * YR;
    }
  }
  const clockSmooth = (t) => {
    if (!corners.length) return null;
    if (t <= corners[0].t) return corners[0].e;
    if (t >= corners[corners.length - 1].t) {
      const last = corners[corners.length - 1];
      return last.e + trend * (t - last.t) / YR;
    }
    let lo = 0, hi = corners.length - 1;
    while (lo < hi - 1) { const m = (lo + hi) >> 1; corners[m].t <= t ? lo = m : hi = m; }
    const a = corners[lo], b2 = corners[hi];
    return a.e + (b2.e - a.e) * (t - a.t) / (b2.t - a.t || 1);
  };
  const cdfAt = (dist, e) => {
    let lo = 0, hi = dist.edis.length;
    while (lo < hi) { const m = (lo + hi) >> 1; dist.edis[m] <= e ? lo = m + 1 : hi = m; }
    return lo / dist.total;
  };
  const mkText = (svg, x, y, str, fill, size, anchor2 = "start") => {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("fill", fill); t.setAttribute("font-size", size);
    t.setAttribute("text-anchor", anchor2); t.setAttribute("font-family", font);
    t.textContent = str;
    svg.appendChild(t);
  };

  const build = (mode) => () => {
    const grid = document.createElement("div");
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));` +
      `gap:1.1rem 1.5rem;width:100%;font-family:${font};`;
    const tMin = +new Date("2023-01-01"), tMax = +new Date("2027-06-01");
    for (const b of benchmarks) {
      const cell = document.createElement("div");
      cell.style.cssText = "min-width:0;";
      const title = document.createElement("div");
      title.textContent = b;
      title.style.cssText = `font-size:.92rem;font-weight:650;color:${palette.ink};` +
        `margin-bottom:.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
      cell.appendChild(title);
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.style.cssText = "width:100%;height:auto;display:block;";
      cell.appendChild(svg);
      const yOf = (v) => PAD.t + (1 - v) * (H - PAD.t - PAD.b);
      for (const v of [0, 0.5, 1]) {
        const l = document.createElementNS(svgNS, "line");
        l.setAttribute("x1", PAD.l); l.setAttribute("x2", W - PAD.r);
        l.setAttribute("y1", yOf(v)); l.setAttribute("y2", yOf(v));
        l.setAttribute("stroke", palette.hairline);
        l.setAttribute("stroke-dasharray", v === 0.5 ? "2,3" : "");
        svg.appendChild(l);
        mkText(svg, PAD.l - 4, yOf(v) + 3.5, (v * 100) + "%", palette.soft, 10, "end");
      }
      const dist = distBy[DIST_NAME[b] ?? b];
      if (mode === "eci") {
        const xOf = (e) => PAD.l + ((e - eMin) / (eMax - eMin)) * (W - PAD.l - PAD.r);
        for (let e = 110; e <= 170; e += 20)
          mkText(svg, xOf(e), H - 8, e, palette.soft, 10, "middle");
        if (dist) {
          let d0 = "";
          for (let px = PAD.l; px <= W - PAD.r; px += 3) {
            const e = eMin + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (eMax - eMin);
            d0 += (d0 ? "L" : "M") + px + "," + yOf(cdfAt(dist, e)).toFixed(1);
          }
          const path = document.createElementNS(svgNS, "path");
          path.setAttribute("d", d0); path.setAttribute("fill", "none");
          path.setAttribute("stroke", "#7c4dbe"); path.setAttribute("stroke-width", "2.2");
          svg.appendChild(path);
        }
        for (const p of (eciBy.get(b) ?? [])) {
          if (p.eci < eMin || p.eci > eMax) continue;
          const c = document.createElementNS(svgNS, "circle");
          c.setAttribute("cx", xOf(p.eci)); c.setAttribute("cy", yOf(p.score));
          c.setAttribute("r", 2.8);
          c.setAttribute("fill", palette.ink); c.setAttribute("fill-opacity", "0.65");
          svg.appendChild(c);
        }
      } else {
        const xOf = (t) => PAD.l + ((t - tMin) / (tMax - tMin)) * (W - PAD.l - PAD.r);
        for (let y = 2023; y <= 2027; y++)
          mkText(svg, xOf(+new Date(`${y}-01-01`)), H - 8, y, palette.soft, 10, "middle");
        const pts = (timeBy.get(b) ?? []).slice().sort((p, q) => p.t - q.t);
        let mx = -Infinity;
        const frontier = pts.filter((p) => (p.score > mx ? ((mx = p.score), true) : false));
        if (dist && frontier.length) {
          const tBirth = frontier[0].t - 45 * 86400e3;
          // frontier clock (OLS through frontier models, r = 0.96) plus THIS
          // benchmark's frontier offset: mean deviation of its own running-max
          // models from the line. Stable within ~+-2 ECI across a benchmark's
          // life, unlike pool offsets, which drift with evaluation policy.
          const T2023 = +new Date("2023-01-01");
          const base = (t) => 109.0 + 15.51 * (t - T2023) / (365.25 * 86400e3);
          const pool = (eciBy.get(b) ?? []).filter((p) => Number.isFinite(p.t))
            .slice().sort((p, q) => p.t - q.t);
          let em = -Infinity;
          const poolFrontier = pool.filter((p) => (p.eci > em ? ((em = p.eci), true) : false));
          const off = poolFrontier.length
            ? poolFrontier.reduce((a, p) => a + (p.eci - base(p.t)), 0) / poolFrontier.length : 0;
          const linClock = (t) => base(t) + off;
          const seg = (t0, t1, opacity) => {
            let d0 = "";
            for (let px = xOf(t0); px <= xOf(t1); px += 3) {
              const t = tMin + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (tMax - tMin);
              d0 += (d0 ? "L" : "M") + px.toFixed(1) + "," + yOf(cdfAt(dist, linClock(t))).toFixed(1);
            }
            const path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", d0); path.setAttribute("fill", "none");
            path.setAttribute("stroke", "#7c4dbe"); path.setAttribute("stroke-width", "2.2");
            path.setAttribute("stroke-opacity", opacity);
            if (opacity < 1) path.setAttribute("stroke-dasharray", "4,4");
            svg.appendChild(path);
          };
          if (tBirth > tMin) seg(tMin, tBirth, 0.35); // pre-birth: faded descent
          seg(Math.max(tMin, tBirth), tMax, 1);
        }
        for (const p of pts) {
          if (p.t < tMin) continue;
          const c = document.createElementNS(svgNS, "circle");
          c.setAttribute("cx", xOf(p.t)); c.setAttribute("cy", yOf(p.score));
          c.setAttribute("r", 2);
          c.setAttribute("fill", palette.soft); c.setAttribute("fill-opacity", "0.35");
          svg.appendChild(c);
        }
        for (const p of frontier) {
          if (p.t < tMin) continue;
          const c = document.createElementNS(svgNS, "circle");
          c.setAttribute("cx", xOf(p.t)); c.setAttribute("cy", yOf(p.score));
          c.setAttribute("r", 3.2);
          c.setAttribute("fill", palette.ink);
          svg.appendChild(c);
        }
      }
      grid.appendChild(cell);
    }
    const bar = document.createElement("div");
    bar.style.cssText = `display:flex;justify-content:center;margin-top:.5rem;font-family:${font};`;
    bar.innerHTML = mode === "eci"
      ? `<span style="font-size:.82rem;color:${palette.soft};">` +
        `<span style="display:inline-block;width:9px;height:9px;border-radius:99px;background:${palette.ink};opacity:.65;margin-right:.35rem;"></span>models at their ECI` +
        `<span style="display:inline-block;width:16px;border-top:2.2px solid #7c4dbe;vertical-align:middle;margin:0 .35rem 0 1rem;"></span>item-difficulty CDF over ECI</span>`
      : `<span style="font-size:.82rem;color:${palette.soft};">` +
        `<span style="display:inline-block;width:9px;height:9px;border-radius:99px;background:${palette.ink};margin-right:.35rem;"></span>frontier` +
        `<span style="display:inline-block;width:9px;height:9px;border-radius:99px;background:${palette.soft};opacity:.4;margin:0 .35rem 0 1rem;"></span>all models` +
        `<span style="display:inline-block;width:16px;border-top:2.2px solid #7c4dbe;vertical-align:middle;margin:0 .35rem 0 1rem;"></span>item-CDF \u2218 capability clock</span>`;
    const wrap = document.createElement("div");
    wrap.appendChild(grid); wrap.appendChild(bar);
    return wrap;
  };
  // release-date view retired: the date axis conflates capability with
  // evaluation policy — capability space is the honest verification view
  const node = build("eci")();
  return frame(node, { caption: spec.caption, provenance: spec.provenance });
}

/* -------------------------------------------------------------- glCdfVsFit */
// Per benchmark: EVERY published model point (faint), the frontier (bold,
// seen/unseen by the maturity slider), the maturity-limited sigmoid (green),
// the pure item-CDF \u2218 clock (solid purple), and the anchored CDF (dashed
// purple) whose capability-shift is fitted on ALL models seen so far — in
// capability space every point is usable, not just the frontier. Top-right:
// each method's live error on the frontier points it has not seen.
// data: {points: zoo rows, bt, oneclock, dists, clock, ecipoints}.
export function glCdfVsFit(_, data, spec = {}) {
  const { benchmarks, cols = 3, W = 390, H = 250 } = spec;
  const PAD = { l: 34, r: 10, t: 18, b: 26 };
  const svgNS = "http://www.w3.org/2000/svg";
  const EPOCH0 = +new Date("2023-01-01");
  const sig = (v) => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, v))));
  const DIST_NAME = { "GPQA diamond": "GPQA Diamond", "SWE-Bench verified": "SWE-bench Verified",
                      "OTIS Mock AIME 2024-2025": "OTIS Mock AIME" };
  const distBy = Object.fromEntries((data.dists ?? []).map((d) =>
    [d.benchmark, { edis: d.edis.slice().sort((a, b) => a - b), total: d.n, floor: d.floor ?? 0 }]));
  const clock = (data.clock ?? []).map((c) => ({ t: +new Date(c.date), e: c.eci }));
  const eciAt = (t) => {
    let lo = 0, hi = clock.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; clock[m].t < t ? lo = m + 1 : hi = m; }
    return clock[Math.max(0, lo - 1)].e;
  };
  const cdfOf = (dist) => (e, sh) => {
    const arr = dist.edis;
    let lo = 0, hi = arr.length;
    const v = e + sh;
    while (lo < hi) { const m = (lo + hi) >> 1; arr[m] <= v ? lo = m + 1 : hi = m; }
    return dist.floor + (1 - dist.floor) * (lo / dist.total);
  };
  const byB = new Map();
  for (const r of data.points) {
    if (!byB.has(r.benchmark)) byB.set(r.benchmark, []);
    byB.get(r.benchmark).push({ t: +new Date(r.date), score: r.score });
  }
  const ecipts = new Map();
  for (const r of data.ecipoints ?? []) {
    if (!ecipts.has(r.benchmark)) ecipts.set(r.benchmark, []);
    ecipts.get(r.benchmark).push({ t: +new Date(r.date), eci: r.eci, score: r.score });
  }
  const ocBy = Object.fromEntries((data.oneclock ?? []).map((r) => [r.benchmark, r.series]));
  // smoothed clock: linear between the frontier staircase's rise points, so
  // date-view curves look like the capability view stretched, not a staircase
  const corners = [];
  {
    let last = -Infinity;
    for (const c of data.clock ?? []) {
      if (c.eci > last + 1e-9) { corners.push({ t: +new Date(c.date), e: c.eci }); last = c.eci; }
    }
  }
  // future extension at the fitted trend, not the noisy last-step slope
  const YR = 365.25 * 86400e3;
  let trend = 14.8;
  if (corners.length > 3) {
    const cut = corners[corners.length - 1].t - 2 * YR;
    const recent = corners.filter((c) => c.t >= cut);
    if (recent.length >= 3) {
      const mt = recent.reduce((a, c) => a + c.t, 0) / recent.length;
      const me = recent.reduce((a, c) => a + c.e, 0) / recent.length;
      trend = recent.reduce((a, c) => a + (c.t - mt) * (c.e - me), 0) /
              recent.reduce((a, c) => a + (c.t - mt) ** 2, 0) * YR;
    }
  }
  const clockSmooth = (t) => {
    if (!corners.length) return null;
    if (t <= corners[0].t) return corners[0].e;
    if (t >= corners[corners.length - 1].t) {
      const last = corners[corners.length - 1];
      return last.e + trend * (t - last.t) / YR;
    }
    let lo = 0, hi = corners.length - 1;
    while (lo < hi - 1) { const m = (lo + hi) >> 1; corners[m].t <= t ? lo = m : hi = m; }
    const a = corners[lo], b2 = corners[hi];
    return a.e + (b2.e - a.e) * (t - a.t) / (b2.t - a.t || 1);
  };

  let delta = spec.delta ?? 0.2;
  const wrap = document.createElement("div");
  wrap.style.cssText = `font-family:${font};`;
  const grid = document.createElement("div");
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));` +
    `gap:1.1rem 1.5rem;width:100%;`;
  wrap.appendChild(grid);
  const holders = benchmarks.map(() => {
    const h = document.createElement("div");
    h.style.cssText = "min-width:0;";
    grid.appendChild(h);
    return h;
  });

  const cdfOnly = !!spec.cdfOnly;
  function drawPanel(holder, b) {
    holder.replaceChildren();
    const pts = (byB.get(b) ?? []).slice().sort((p, q) => p.t - q.t);
    if (!pts.length) return;
    let mx = -Infinity;
    const frontier = pts.filter((p) => (p.score > mx ? ((mx = p.score), true) : false));
    const slice = data.bt.slices.reduce((a, c) =>
      Math.abs(c.delta - delta) < Math.abs(a.delta - delta) ? c : a);
    const fitRow = slice.fits.find((f) => f.benchmark === b);
    const cut = cdfOnly ? Infinity : frontier[0].score + slice.delta;
    // the moment maturity Δ was reached: everything published before is "seen"
    const firstOver = frontier.find((p) => p.score > cut);
    const T = firstOver ? firstOver.t : Infinity;

    // display window starts 2023: pre-2023 METR archaeology stays in the fits
    // but out of the picture
    const tMin = Math.max(pts[0].t - 90 * 86400e3, +new Date("2023-01-01"));
    const tMax = +new Date("2027-06-01");
    const xOf = (t) => PAD.l + ((t - tMin) / (tMax - tMin)) * (W - PAD.l - PAD.r);
    const yOf = (v) => PAD.t + (1 - v) * (H - PAD.t - PAD.b);

    const title = document.createElement("div");
    title.textContent = b;
    title.style.cssText = `font-size:.92rem;font-weight:650;color:${palette.ink};` +
      `margin-bottom:.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
    holder.appendChild(title);
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.cssText = "width:100%;height:auto;display:block;";
    holder.appendChild(svg);

    for (const v of [0, 0.5, 1]) {
      const l = document.createElementNS(svgNS, "line");
      l.setAttribute("x1", PAD.l); l.setAttribute("x2", W - PAD.r);
      l.setAttribute("y1", yOf(v)); l.setAttribute("y2", yOf(v));
      l.setAttribute("stroke", palette.hairline);
      l.setAttribute("stroke-dasharray", v === 0.5 ? "2,3" : "");
      svg.appendChild(l);
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", PAD.l - 4); t.setAttribute("y", yOf(v) + 3.5);
      t.setAttribute("text-anchor", "end"); t.setAttribute("font-size", 10);
      t.setAttribute("fill", palette.soft); t.setAttribute("font-family", font);
      t.textContent = (v * 100) + "%";
      svg.appendChild(t);
    }
    const spanYears = (tMax - tMin) / (365.25 * 86400e3);
    const stepY = spanYears > 6 ? 2 : 1;
    const y0year = new Date(tMin).getFullYear() + 1;
    for (let y = y0year; y <= 2027; y += stepY) {
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", xOf(+new Date(`${y}-01-01`))); t.setAttribute("y", H - 8);
      t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", 10);
      t.setAttribute("fill", palette.soft); t.setAttribute("font-family", font);
      t.textContent = y;
      svg.appendChild(t);
    }

    // pure item-CDF o clock (solid purple, sees nothing). Drawn only from the
    // benchmark's first observation onward: backwards extrapolation into the
    // pre-data era is the least-identified regime and misleads the eye.
    const oc = ocBy[DIST_NAME[b] ?? b];
    if (oc) {
      const tStart = Math.max(tMin, frontier[0].t - 45 * 86400e3);
      const d0 = oc.filter((p) => +new Date(p.date) >= tStart && +new Date(p.date) <= tMax)
        .map((p, i) => `${i ? "L" : "M"}${xOf(+new Date(p.date)).toFixed(1)},${yOf(p.med).toFixed(1)}`)
        .join("");
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", d0); path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#7c4dbe"); path.setAttribute("stroke-width", "2");
      path.setAttribute("stroke-opacity", "0.55");
      svg.appendChild(path);
    }

    // anchored CDF: shift fitted on ALL models published before T
    const dist = distBy[DIST_NAME[b] ?? b];
    let anchoredAt = null;
    const capSeen = (ecipts.get(b) ?? []).filter((p) => p.t <= T);
    if (!cdfOnly && dist && clock.length && capSeen.length >= 3) {
      const cdf = cdfOf(dist);
      let bestSh = 0, bestErr = Infinity;
      for (let sh = -25; sh <= 25; sh += 0.5) {
        let e2 = 0;
        for (const p of capSeen) e2 += (cdf(p.eci, sh) - p.score) ** 2;
        if (e2 < bestErr) { bestErr = e2; bestSh = sh; }
      }
      anchoredAt = (t) => cdf(eciAt(t), bestSh);
      let d2 = "";
      for (let px = PAD.l; px <= W - PAD.r; px += 3) {
        const t = tMin + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (tMax - tMin);
        d2 += (d2 ? "L" : "M") + px + "," + yOf(anchoredAt(t)).toFixed(1);
      }
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", d2); path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#7c4dbe"); path.setAttribute("stroke-width", "2.2");
      path.setAttribute("stroke-dasharray", "6,4");
      svg.appendChild(path);
    }

    // maturity-limited free sigmoid (frontier, time space)
    let sigAt = null;
    if (!cdfOnly && fitRow?.fit_time) {
      const [m, k] = fitRow.fit_time;
      sigAt = (t) => sig(k * ((t - EPOCH0) / 86400e3 - m));
      let d1 = "";
      for (let px = PAD.l; px <= W - PAD.r; px += 3) {
        const t = tMin + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (tMax - tMin);
        d1 += (d1 ? "L" : "M") + px + "," + yOf(sigAt(t)).toFixed(1);
      }
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", d1); path.setAttribute("fill", "none");
      path.setAttribute("stroke", palette.mintDeep); path.setAttribute("stroke-width", "2.2");
      svg.appendChild(path);
    }

    // every published model point, faint; frontier bold with seen/unseen
    for (const p of pts) {
      if (p.t < tMin) continue;
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", xOf(p.t)); c.setAttribute("cy", yOf(p.score));
      c.setAttribute("r", 2);
      c.setAttribute("fill", palette.soft); c.setAttribute("fill-opacity", "0.35");
      svg.appendChild(c);
    }
    for (const p of frontier) {
      if (p.t < tMin) continue;
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", xOf(p.t)); c.setAttribute("cy", yOf(p.score));
      c.setAttribute("r", 3.2);
      const seen = p.score <= cut;
      c.setAttribute("fill", seen ? palette.ink : "#fff");
      c.setAttribute("stroke", seen ? "none" : palette.soft);
      c.setAttribute("stroke-width", 1.2);
      svg.appendChild(c);
    }

    // future-error readouts on unseen frontier points
    const unseen = frontier.filter((p) => p.score > cut);
    if (!cdfOnly && unseen.length) {
      const readouts = [];
      if (sigAt) readouts.push([palette.mintDeep,
        unseen.reduce((a, p) => a + Math.abs(sigAt(p.t) - p.score), 0) / unseen.length]);
      if (anchoredAt) readouts.push(["#7c4dbe",
        unseen.reduce((a, p) => a + Math.abs(anchoredAt(p.t) - p.score), 0) / unseen.length]);
      readouts.forEach(([col, e], i) => {
        const t = document.createElementNS(svgNS, "text");
        t.setAttribute("x", W - PAD.r - 4); t.setAttribute("y", PAD.t + 12 + i * 15);
        t.setAttribute("text-anchor", "end"); t.setAttribute("font-size", 11);
        t.setAttribute("font-weight", 650); t.setAttribute("fill", col);
        t.setAttribute("font-family", font);
        t.textContent = `\u00b1${(e * 100).toFixed(0)}pp`;
        svg.appendChild(t);
      });
    }
  }

  const drawAll = () => holders.forEach((h, i) => drawPanel(h, benchmarks[i]));

  const bar = document.createElement("div");
  bar.style.cssText = "display:flex;justify-content:center;margin-top:.5rem;";
  if (cdfOnly) {
    bar.innerHTML = `<span style="font-size:.82rem;color:${palette.soft};">` +
      `<span style="display:inline-block;width:9px;height:9px;border-radius:99px;background:${palette.ink};margin-right:.35rem;"></span>frontier` +
      `<span style="display:inline-block;width:9px;height:9px;border-radius:99px;background:${palette.soft};opacity:.4;margin:0 .35rem 0 1rem;"></span>all models` +
      `<span style="display:inline-block;width:16px;border-top:2px solid #7c4dbe;vertical-align:middle;margin:0 .35rem 0 1rem;"></span>item-difficulty CDF \u2218 capability clock (no free parameters)</span>`;
  } else bar.innerHTML = `<span style="font-size:.82rem;color:${palette.soft};">` +
    `<span style="display:inline-block;width:9px;height:9px;border-radius:99px;background:${palette.soft};opacity:.4;margin-right:.35rem;"></span>all models` +
    `<span style="display:inline-block;width:9px;height:9px;border-radius:99px;background:${palette.ink};margin:0 .35rem 0 1rem;"></span>frontier seen` +
    `<span style="display:inline-block;width:9px;height:9px;border-radius:99px;background:#fff;border:1.2px solid ${palette.soft};margin:0 .35rem 0 1rem;"></span>not yet` +
    `<span style="display:inline-block;width:16px;border-top:2.2px solid ${palette.mintDeep};vertical-align:middle;margin:0 .35rem 0 1rem;"></span>sigmoid on seen frontier` +
    `<span style="display:inline-block;width:16px;border-top:2px solid #7c4dbe;opacity:.55;vertical-align:middle;margin:0 .35rem 0 1rem;"></span>CDF \u2218 clock (sees nothing)` +
    `<span style="display:inline-block;width:16px;border-top:2.2px dashed #7c4dbe;vertical-align:middle;margin:0 .35rem 0 1rem;"></span>CDF anchored on ALL seen models</span>`;
  wrap.appendChild(bar);

  const PW = 108;
  const sl = document.createElement("div");
  if (cdfOnly) { drawAll(); return frame(wrap, { caption: spec.caption, provenance: spec.provenance }); }
  sl.style.cssText = "margin:.8rem auto 0;max-width:34rem;";
  sl.innerHTML =
    `<div class="glcv-track" style="position:relative;height:36px;border-radius:99px;` +
      `background:color-mix(in srgb, ${palette.mint} 15%, #fff);cursor:ew-resize;` +
      `touch-action:none;user-select:none;-webkit-user-select:none;">
      <div class="glcv-pill" style="position:absolute;top:50%;transform:translateY(-50%);` +
        `width:${PW}px;height:28px;border-radius:99px;` +
        `background:color-mix(in srgb, ${palette.mint} 80%, #fff);` +
        `box-shadow:0 1px 4px rgba(0,0,0,.14);display:flex;align-items:center;` +
        `justify-content:center;font-size:.85rem;font-weight:650;color:#06382e;` +
        `font-variant-numeric:tabular-nums;pointer-events:none;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:.76rem;color:${palette.soft};margin-top:.35rem;">
      <span>sees almost nothing</span><span>sees the whole curve</span>
    </div>`;
  wrap.appendChild(sl);
  const track = sl.querySelector(".glcv-track");
  const pill = sl.querySelector(".glcv-pill");
  const paint = () => {
    const f = (delta - 0.05) / 0.95;
    pill.style.left = `calc(${(f * 100).toFixed(2)}% - ${(f * (PW + 8)).toFixed(1)}px + 4px)`;
    pill.textContent = `+${Math.round(delta * 100)}pp seen`;
  };
  let queued = false;
  const setFrom = (clientX) => {
    const r = track.getBoundingClientRect();
    let f = (clientX - r.left - PW / 2) / (r.width - PW - 8);
    f = Math.max(0, Math.min(1, f));
    delta = 0.05 + f * 0.95;
    paint();
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; drawAll(); });
  };
  track.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    document.body.style.userSelect = "none";
    track.setPointerCapture(e.pointerId);
    setFrom(e.clientX);
  });
  track.addEventListener("pointermove", (e) => { if (track.hasPointerCapture?.(e.pointerId)) setFrom(e.clientX); });
  track.addEventListener("pointerup", () => { document.body.style.userSelect = ""; });
  track.addEventListener("pointercancel", () => { document.body.style.userSelect = ""; });
  paint();
  drawAll();
  return frame(wrap, { caption: spec.caption, provenance: spec.provenance });
}

/* --------------------------------------------------------------- glDecomp */
// Frontier improvement decomposed: how much of each benchmark's total gain
// came through general capability (the central ECI curve) vs orthogonal to
// it, with the orthogonal component's own rate annotated.
// data: decomp.json rows {benchmark, rho, total, eci_part, orth, orth_slope}
export function glDecomp(_, rows, spec = {}) {
  const { W = 860, caption, provenance } = spec;
  const ROW = 44, PADL = 210, PADR = 150, PADT = 34, PADB = 30;
  const H = PADT + rows.length * ROW + PADB;
  const svgNS = "http://www.w3.org/2000/svg";
  const maxT = Math.max(...rows.map((r) => r.total));
  const xOf = (v) => PADL + (v / maxT) * (W - PADL - PADR);
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.cssText = "width:100%;max-width:900px;height:auto;display:block;margin:0 auto;";
  const txt = (x, y, str, fill, size, weight = 400, anchor2 = "start") => {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("fill", fill); t.setAttribute("font-size", size);
    t.setAttribute("font-weight", weight); t.setAttribute("text-anchor", anchor2);
    t.setAttribute("font-family", font);
    t.textContent = str;
    svg.appendChild(t);
  };
  txt(PADL, 16, "gain through general capability", palette.mintDeep, 12.5, 650);
  txt(PADL + 230, 16, "gain orthogonal to it", "#7c4dbe", 12.5, 650);
  txt(W - PADR + 12, 16, "orthogonal trend", palette.soft, 12, 500);
  const sorted = rows.slice().sort((a, b) => (a.orth / a.total) - (b.orth / b.total));
  sorted.forEach((r, i) => {
    const y = PADT + i * ROW + ROW / 2;
    txt(PADL - 10, y + 4, r.benchmark, palette.ink, 13, 600, "end");
    txt(PADL - 10, y + 18, `\u03c1 ${r.rho.toFixed(2)}`, palette.soft, 10.5, 400, "end");
    const bar = (x0, w, col, op) => {
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", x0); rect.setAttribute("y", y - 11);
      rect.setAttribute("width", Math.max(w, 0)); rect.setAttribute("height", 22);
      rect.setAttribute("fill", col); rect.setAttribute("fill-opacity", op);
      rect.setAttribute("rx", 3);
      svg.appendChild(rect);
    };
    const wE = xOf(Math.max(r.eci_part, 0)) - PADL;
    bar(PADL, wE, palette.mintDeep, 0.75);
    if (r.orth > 0.005) bar(PADL + wE + 1, xOf(r.orth) - PADL, "#7c4dbe", 0.7);
    else if (r.orth < -0.005) bar(PADL + wE + 1 - (xOf(-r.orth) - PADL), xOf(-r.orth) - PADL, "#7c4dbe", 0.3);
    txt(PADL + wE + (r.orth > 0.005 ? xOf(r.orth) - PADL : 0) + 8, y + 4,
        `+${Math.round(r.total * 100)}pp`, palette.muted, 11.5, 600);
    const sl = r.orth_slope * 100;
    txt(W - PADR + 12, y + 4, `${sl >= 0 ? "+" : ""}${sl.toFixed(0)}pp/yr`,
        Math.abs(sl) >= 10 ? "#7c4dbe" : palette.soft, 12, Math.abs(sl) >= 10 ? 650 : 400);
  });
  return frame(svg, { caption, provenance });
}

/* -------------------------------------------------------------- glEdiGrid */
// Small-multiple item-difficulty histograms, one panel per benchmark.
// data: edi_dists.json rows {benchmark, edis[], p0, n}. spec.order picks and
// orders panels; cols sets the grid width.
export function glEdiGrid(_, dists, spec = {}) {
  const { cols = 3, panelW = 390, panelH = 235, eciToday = 162.9,
          xMin = 90, xMax = 230, nBin = 24, order, caption, provenance } = spec;
  const svgNS = "http://www.w3.org/2000/svg";
  const PAD = { l: 14, r: 12, t: 30, b: 30 };
  const rows = (order ?? dists.map((d) => d.benchmark));
  const byName = Object.fromEntries(dists.map((d) => [d.benchmark, d]));

  const grid = document.createElement("div");
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));` +
    `gap:1.2rem 1.6rem;width:100%;font-family:${font};`;

  for (const name of rows) {
    const d = byName[name];
    if (!d) continue;
    const cell = document.createElement("div");
    cell.style.cssText = "min-width:0;";
    const title = document.createElement("div");
    title.textContent = `${name}`;
    title.style.cssText = `font-size:.95rem;font-weight:650;color:${palette.ink};` +
      `margin-bottom:.15rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
    const sub = document.createElement("div");
    sub.textContent = `${d.n} items \u00b7 ${Math.round(d.p0 * 100)}% never solved`;
    sub.style.cssText = `font-size:.75rem;color:${palette.soft};margin-bottom:.25rem;`;
    cell.appendChild(title);
    cell.appendChild(sub);

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${panelW} ${panelH}`);
    svg.style.cssText = "width:100%;height:auto;display:block;";
    cell.appendChild(svg);
    const y0 = panelH - PAD.b;
    const xOf = (v) => PAD.l + ((v - xMin) / (xMax - xMin)) * (panelW - PAD.l - PAD.r);

    const h = new Array(nBin).fill(0);
    for (const v of d.edis) {
      const i = Math.max(0, Math.min(nBin - 1, Math.floor(((v - xMin) / (xMax - xMin)) * nBin)));
      h[i] += (1 - d.p0) / d.edis.length; // fraction of ALL items per bin
    }
    const hMax = Math.max(...h, d.p0) * 1.08;
    const binW = (panelW - PAD.l - PAD.r) / nBin;
    h.forEach((v, i) => {
      if (!v) return;
      const r = document.createElementNS(svgNS, "rect");
      r.setAttribute("x", PAD.l + i * binW + 0.5);
      r.setAttribute("width", binW - 1);
      r.setAttribute("y", y0 - (v / hMax) * (y0 - PAD.t));
      r.setAttribute("height", (v / hMax) * (y0 - PAD.t));
      r.setAttribute("fill", palette.mint); r.setAttribute("fill-opacity", "0.6");
      r.setAttribute("stroke", palette.mintDeep); r.setAttribute("stroke-width", "0.8");
      svg.appendChild(r);
    });
    // never-solved block pinned at the right edge (right-censored mass)
    if (d.p0 > 0.004) {
      const r = document.createElementNS(svgNS, "rect");
      const bw = binW * 1.4;
      r.setAttribute("x", panelW - PAD.r - bw);
      r.setAttribute("y", y0 - (d.p0 / hMax) * (y0 - PAD.t));
      r.setAttribute("width", bw);
      r.setAttribute("height", (d.p0 / hMax) * (y0 - PAD.t));
      r.setAttribute("fill", palette.bad); r.setAttribute("fill-opacity", "0.28");
      r.setAttribute("stroke", palette.bad); r.setAttribute("stroke-width", "0.8");
      svg.appendChild(r);
    }
    // axis + ticks
    const ax = document.createElementNS(svgNS, "line");
    ax.setAttribute("x1", PAD.l); ax.setAttribute("x2", panelW - PAD.r);
    ax.setAttribute("y1", y0); ax.setAttribute("y2", y0);
    ax.setAttribute("stroke", palette.soft); ax.setAttribute("stroke-width", "1");
    svg.appendChild(ax);
    for (let v = 100; v <= 220; v += 40) {
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", xOf(v)); t.setAttribute("y", y0 + 16);
      t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", 10.5);
      t.setAttribute("fill", palette.soft); t.setAttribute("font-family", font);
      t.textContent = v;
      svg.appendChild(t);
    }
    // frontier-today marker
    const fl = document.createElementNS(svgNS, "line");
    fl.setAttribute("x1", xOf(eciToday)); fl.setAttribute("x2", xOf(eciToday));
    fl.setAttribute("y1", PAD.t - 6); fl.setAttribute("y2", y0);
    fl.setAttribute("stroke", palette.ink); fl.setAttribute("stroke-width", "1.1");
    fl.setAttribute("stroke-dasharray", "4,3");
    svg.appendChild(fl);
    const ft = document.createElementNS(svgNS, "text");
    ft.setAttribute("x", xOf(eciToday) + 4); ft.setAttribute("y", PAD.t + 4);
    ft.setAttribute("font-size", 9.5); ft.setAttribute("fill", palette.muted);
    ft.setAttribute("font-family", font);
    ft.textContent = "frontier today";
    svg.appendChild(ft);
    grid.appendChild(cell);
  }
  return frame(grid, { caption, provenance });
}

/* --------------------------------------------------------- glMaturityDist */
// Backtest-by-maturity: a pill slider sets how much of each benchmark's rise
// (+X pp above its starting score) the sigmoids were allowed to see; the
// chart shows HISTOGRAMS of their held-out MAEs (fit in time, in capability)
// against the fixed histogram of full-history in-sample MAEs. Cumulative:
// a benchmark whose curve is fully seen keeps its last held-out MAE, so the
// distributions converge instead of thinning out.
// data: {ref: [...], slices: [{delta, fits: [...]}]} from 25_maturity_backtest.
export function glMaturityDist(_, data, spec = {}) {
  // TWO PANELS, one task: predict the frontier points the fit had not yet
  // seen. Median future error vs maturity (bands = 16th-84th pct), markers
  // riding the lines, RLI-today marker, flat pooled oracle floor. Left:
  // plain least squares. Right: the same fits with the population log-k
  // prior (MAP, one 5pp pseudo-observation). The maturity slider lives
  // under the examples figure and broadcasts gl-maturity-delta.
  const { keep, rliDelta = 0.136, maxDelta = 0.85 } = spec;
  const inKeep = (b) => !keep || keep.includes(b);
  const svgNS = "http://www.w3.org/2000/svg";
  const SERIES = [
    { key: "mae_time", name: "time fit", color: palette.mintDeep },
    { key: "mae_eci", name: "two-step (ECI)", color: "#7c4dbe" },
  ];

  // stage -> per-series json-key suffix. raw = no priors, no offset;
  // mid = steepness prior only (time's final form); full = prior + offset
  const SUFF = {
    raw: { mae_time: "_raw", mae_eci: "_raw" },
    mid: { mae_time: "", mae_eci: "_mid" },
    full: { mae_time: "", mae_eci: "" },
  };
  const ALLKEYS = ["mae_time", "mae_time_raw", "mae_eci", "mae_eci_raw", "mae_eci_mid", "mae_oracle", "mae_ens"];
  const ENS = { key: "mae_ens", name: "ensemble", color: "#1b2a4a" };
  // strictly paired across ALL variants, so every staged panel (and any
  // combination shown in one figure) compares the same benchmark set
  const slices = data.slices.map((sl) => {
    const ok = sl.fits.filter((f) => inKeep(f.benchmark) &&
      ALLKEYS.every((k2) => f[k2] != null));
    const vals = {};
    for (const k2 of ALLKEYS) vals[k2] = ok.map((f) => f[k2]);
    return { delta: sl.delta, vals };
  });
  const STAGES = spec.stages ?? [["raw", "plain least squares"], ["full", "with the steepness prior"]];

  const wrap = document.createElement("div");
  wrap.style.cssText = `font-family:${font};`;
  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:1.4rem;justify-content:center;align-items:flex-start;flex-wrap:wrap;";
  wrap.appendChild(row);
  const FS = 1.3;
  const q = (vals, pq) => {
    if (!vals.length) return null;
    const v = vals.slice().sort((a, b) => a - b);
    return v[Math.min(v.length - 1, Math.floor(pq * v.length))];
  };

  const W2 = 880, H2 = 520, P2 = { l: 84, r: 20, t: 24, b: 60 };
  const YMAXPP = 0.30;
  const x2 = (d) => P2.l + ((d - 0.05) / (maxDelta - 0.05)) * (W2 - P2.l - P2.r);
  const y2 = (v) => P2.t + (1 - Math.min(v, YMAXPP) / YMAXPP) * (H2 - P2.t - P2.b);

  const allMarkers = [];
  function mkPanel(stage, titleText, ghost, ghostLabel, ens) {
    const svg2 = document.createElementNS(svgNS, "svg");
    svg2.setAttribute("viewBox", `0 0 ${W2} ${H2}`);
    svg2.style.cssText = "width:100%;height:auto;display:block;";
    const t2 = (x, y, str, fill, size, anchor2 = "start", weight = 400) => {
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", x); t.setAttribute("y", y);
      t.setAttribute("fill", fill); t.setAttribute("font-size", size * FS);
      t.setAttribute("text-anchor", anchor2); t.setAttribute("font-weight", weight);
      t.setAttribute("font-family", font);
      t.textContent = str;
      svg2.appendChild(t);
    };
    for (const v of [0, 0.1, 0.2, 0.3]) {
      const l = document.createElementNS(svgNS, "line");
      l.setAttribute("x1", P2.l); l.setAttribute("x2", W2 - P2.r);
      l.setAttribute("y1", y2(v)); l.setAttribute("y2", y2(v));
      l.setAttribute("stroke", palette.hairline);
      svg2.appendChild(l);
      t2(P2.l - 6, y2(v) + 4, (v * 100) + "pp", palette.soft, 10.5, "end");
    }
    for (const d of [0.2, 0.4, 0.6, 0.8])
      t2(x2(d), H2 - P2.b + 26, "+" + Math.round(d * 100) + "pp", palette.soft, 10.5, "middle");
    t2((P2.l + W2 - P2.r) / 2, H2 - 8, "amount of curve seen when the fit was made", palette.muted, 11.5, "middle");
    // series legend, top right of the plot area
    const legEntries = SERIES.map((s2) => ({ name: s2.name, color: s2.color, dash: null }));
    if (ens) legEntries.push({ name: ENS.name, color: ENS.color, dash: null });
    if (ghost) legEntries.push({ name: ghostLabel ?? "no prior", color: palette.soft, dash: "6,5" });
    legEntries.forEach((s2, si) => {
      const lx = W2 - P2.r - 12, ly = P2.t + 18 + si * 26;
      const sw = document.createElementNS(svgNS, "line");
      sw.setAttribute("x1", lx - 30); sw.setAttribute("x2", lx - 8);
      sw.setAttribute("y1", ly - 5); sw.setAttribute("y2", ly - 5);
      sw.setAttribute("stroke", s2.color); sw.setAttribute("stroke-width", 3);
      sw.setAttribute("stroke-linecap", "round");
      if (s2.dash) sw.setAttribute("stroke-dasharray", "4,3");
      svg2.appendChild(sw);
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", lx - 38); t.setAttribute("y", ly);
      t.setAttribute("fill", palette.muted); t.setAttribute("font-size", 11.5 * FS);
      t.setAttribute("text-anchor", "end"); t.setAttribute("font-family", font);
      t.textContent = s2.name;
      svg2.appendChild(t);
    });
    if (ghost) SERIES.forEach((s2) => {
      const key = s2.key + SUFF[ghost][s2.key];
      const pts = slices.map((sl2) => ({ d: sl2.delta, md: q(sl2.vals[key], 0.5), n: sl2.vals[key].length }))
        .filter((p2) => p2.md != null && p2.n >= 5);
      if (!pts.length) return;
      const line = pts.map((p2, j) => (j ? "L" : "M") + x2(p2.d).toFixed(1) + "," + y2(p2.md).toFixed(1)).join("");
      const lp = document.createElementNS(svgNS, "path");
      lp.setAttribute("d", line); lp.setAttribute("fill", "none");
      lp.setAttribute("stroke", s2.color); lp.setAttribute("stroke-width", 1.6);
      lp.setAttribute("stroke-dasharray", "6,5"); lp.setAttribute("stroke-opacity", "0.75");
      svg2.appendChild(lp);
    });
    SERIES.forEach((s2) => {
      const key = s2.key + SUFF[stage][s2.key];
      const pts = slices.map((sl2) => ({ d: sl2.delta, lo: q(sl2.vals[key], 0.16),
        md: q(sl2.vals[key], 0.5), hi: q(sl2.vals[key], 0.84), n: sl2.vals[key].length }))
        .filter((p2) => p2.md != null && p2.n >= 5);
      if (!pts.length) { allMarkers.push(null); return; }
      const band = pts.map((p2, j) => (j ? "L" : "M") + x2(p2.d).toFixed(1) + "," + y2(p2.hi).toFixed(1)).join("")
        + pts.slice().reverse().map((p2) => "L" + x2(p2.d).toFixed(1) + "," + y2(p2.lo).toFixed(1)).join("") + "Z";
      const bp = document.createElementNS(svgNS, "path");
      bp.setAttribute("d", band); bp.setAttribute("fill", s2.color);
      bp.setAttribute("fill-opacity", "0.09"); bp.setAttribute("stroke", "none");
      svg2.appendChild(bp);
      const line = pts.map((p2, j) => (j ? "L" : "M") + x2(p2.d).toFixed(1) + "," + y2(p2.md).toFixed(1)).join("");
      const lp = document.createElementNS(svgNS, "path");
      lp.setAttribute("d", line); lp.setAttribute("fill", "none");
      lp.setAttribute("stroke", s2.color); lp.setAttribute("stroke-width", 2.2);
      svg2.appendChild(lp);
    });
    if (ens) {
      const pts = slices.map((sl2) => ({ d: sl2.delta, md: q(sl2.vals[ENS.key], 0.5), n: sl2.vals[ENS.key].length }))
        .filter((p2) => p2.md != null && p2.n >= 5);
      if (pts.length) {
        const line = pts.map((p2, j) => (j ? "L" : "M") + x2(p2.d).toFixed(1) + "," + y2(p2.md).toFixed(1)).join("");
        const lp = document.createElementNS(svgNS, "path");
        lp.setAttribute("d", line); lp.setAttribute("fill", "none");
        lp.setAttribute("stroke", ENS.color); lp.setAttribute("stroke-width", 2.8);
        svg2.appendChild(lp);
      }
    }
    const rl = document.createElementNS(svgNS, "line");
    rl.setAttribute("x1", x2(rliDelta)); rl.setAttribute("x2", x2(rliDelta));
    rl.setAttribute("y1", P2.t); rl.setAttribute("y2", H2 - P2.b);
    rl.setAttribute("stroke", palette.ink); rl.setAttribute("stroke-width", 1.4);
    rl.setAttribute("stroke-dasharray", "4,3");
    svg2.appendChild(rl);
    t2(x2(rliDelta) + 5, H2 - P2.b - 8, "RLI today", palette.ink, 11.5, "start", 650);
    const cell = document.createElement("div");
    cell.style.cssText = STAGES.length > 1
      ? "flex:1 1 340px;min-width:320px;max-width:560px;"
      : "flex:1 1 520px;min-width:320px;max-width:720px;";
    const t = document.createElement("div");
    t.textContent = titleText;
    t.style.cssText = `font-size:.95rem;font-weight:650;color:${palette.ink};text-align:center;margin-bottom:.4rem;`;
    cell.appendChild(t); cell.appendChild(svg2);
    row.appendChild(cell);
  }
  for (const [stage, title, ghost, ghostLabel, ens] of STAGES) mkPanel(stage, title, ghost, ghostLabel, ens);

  function placeMarkers(delta) {
    allMarkers.forEach((mk) => {
      if (!mk) return;
      const P = mk.pts;
      let v;
      if (delta <= P[0].d) v = P[0].md;
      else if (delta >= P[P.length - 1].d) v = P[P.length - 1].md;
      else {
        let i = 1; while (P[i].d < delta) i++;
        const f = (delta - P[i - 1].d) / (P[i].d - P[i - 1].d);
        v = P[i - 1].md + f * (P[i].md - P[i - 1].md);
      }
      const cx = x2(Math.max(0.05, Math.min(maxDelta, delta))).toFixed(1), cy = y2(v).toFixed(1);
      for (const el of [mk.dot, mk.glow]) { el.setAttribute("cx", cx); el.setAttribute("cy", cy); }
    });
  }

  return frame(wrap, { caption: spec.caption, provenance: spec.provenance });
}

/* ----------------------------------------------------------- glRateSlider */
// Wide bar slider: soft mint channel with a mint pill sliding inside it, the
// multiplier written in the pill ("1.3x", one decimal). The pill follows the
// pointer continuously; the value snaps to 0.1 so the chart redraws rarely.
// viewof-compatible: exposes .value and fires "input" events.
export function glRateSlider(_, __, spec = {}) {
  const { min = 0.5, max = 2, value = 1 } = spec;
  const PW = 56;
  // log axis: 1x sits centred between 0.5x and 2x
  const toF = (v) => Math.log(v / min) / Math.log(max / min);
  const toV = (f) => min * Math.pow(max / min, f);
  const MINT = palette.mint, INKMINT = "#06382e";
  const wrap = document.createElement("div");
  wrap.style.cssText = `margin:.5rem 0 .4rem;font-family:${font};`;
  wrap.innerHTML =
    `<div class="glrs-track" style="position:relative;height:38px;border-radius:99px;` +
      `background:color-mix(in srgb, ${MINT} 15%, #fff);` +
      `cursor:ew-resize;touch-action:none;user-select:none;-webkit-user-select:none;">
      <div class="glrs-pill" style="position:absolute;top:50%;transform:translateY(-50%);` +
        `width:${PW}px;height:30px;border-radius:99px;` +
        `background:color-mix(in srgb, ${MINT} 80%, #fff);` +
        `box-shadow:0 1px 4px rgba(0,0,0,.14);` +
        `display:flex;align-items:center;justify-content:center;` +
        `font-size:.92rem;font-weight:650;color:${INKMINT};` +
        `font-variant-numeric:tabular-nums;pointer-events:none;will-change:left;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:.78rem;` +
      `color:${palette.soft};margin-top:.4rem;">
      <span>${min}\u00d7 slower</span><span>${max}\u00d7 faster</span>
    </div>`;
  const track = wrap.querySelector(".glrs-track");
  const pill = wrap.querySelector(".glrs-pill");
  // pale tick lines inside the track at every 0.1x, log-positioned
  for (let n = Math.ceil(min * 10); n <= Math.floor(max * 10); n++) {
    const tv = n / 10;
    const f = toF(tv);
    const tick = document.createElement("div");
    const one = Math.abs(tv - 1) < 1e-9;
    tick.style.cssText = `position:absolute;top:50%;transform:translate(-50%,-50%);` +
      `width:1.5px;height:${one ? 62 : 48}%;border-radius:99px;` +
      `background:${one ? "#fff" : "rgba(255,255,255,.75)"};` +
      `left:calc(${(f * 100).toFixed(2)}% - ${(f * (PW + 8) - 4 - PW / 2).toFixed(1)}px);`;
    track.insertBefore(tick, pill); // ticks sit behind the pill
  }
  let v = value;
  const place = (f) => {
    pill.style.left = `calc(${(f * 100).toFixed(3)}% - ${(f * (PW + 8)).toFixed(2)}px + 4px)`;
  };
  const setFrom = (clientX) => {
    const r = track.getBoundingClientRect();
    let f = (clientX - r.left - PW / 2) / (r.width - PW - 8);
    f = Math.max(0, Math.min(1, f));
    place(f); // pill tracks the pointer exactly
    v = toV(f);
    pill.textContent = `${v.toFixed(1)}\u00d7`;
    wrap.value = v;
    wrap.dispatchEvent(new CustomEvent("input"));
  };
  track.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    document.body.style.userSelect = "none";
    track.setPointerCapture(e.pointerId);
    setFrom(e.clientX);
  });
  track.addEventListener("pointerup", () => { document.body.style.userSelect = ""; });
  track.addEventListener("pointercancel", () => { document.body.style.userSelect = ""; });
  track.addEventListener("pointermove", (e) => {
    if (track.hasPointerCapture?.(e.pointerId)) setFrom(e.clientX);
  });
  wrap.value = v;
  pill.textContent = `${v.toFixed(1)}\u00d7`;
  place(toF(v));
  return wrap;
}

/* ---------------------------------------------------------- glRliScatter */
// The opening RLI scatter, stripped back for the scrolly rail. spec.fits
// draws loss-minimising trend lines; spec.overlays adds external lines.
// An overlay whose pts is a FUNCTION is dynamic: it is drawn as a single
// svg path on top of the (built-once) plot and re-drawn surgically from
// spec.rateInput ("input" events, rAF-throttled) -- the plot, the axes and
// the fitted lines are never rebuilt, so dragging is 60fps.
export function glRliScatter({ Plot }, rows, spec = {}) {
  const {
    x = "date", y = "score", label = "pretty", group = "provider",
    width = 860, height = 540, yFmt = (v) => v, r = 7,
  } = spec;

  const FITSTYLE = {
    linear: { name: "linear fit", color: palette.neutralInk, dash: "6,4" },
    sigmoid: { name: "sigmoid fit", color: palette.mintDeep, dash: null },
  };
  // forecastDate: models after it are held out — the forecast is fit only on
  // data up to it, and later points render as stars that test it live
  const fcut = spec.forecastDate ? +new Date(spec.forecastDate) : Infinity;
  const staticLines = [];
  if (spec.fits?.length) {
    // fits use the frontier (best score to date), not the full point cloud —
    // off-frontier releases say nothing about the capability envelope
    const all = rows.map((d) => ({ t: +d[x], v: +d[y] }))
      .filter((d) => Number.isFinite(d.t) && Number.isFinite(d.v) && d.t <= fcut);
    const pts = glFrontier(all, (d) => d.t, (d) => d.v);
    const tmin = Math.min(...pts.map((d) => d.t));
    const span = Math.max(...pts.map((d) => d.t)) - tmin || 1;
    const X0 = spec.xDomain ? +spec.xDomain[0] : tmin;
    const X1 = spec.xDomain ? +spec.xDomain[1] : tmin + span;
    const grid = [...Array(240)].map((_, i) => X0 + ((X1 - X0) * i) / 239);
    const sse = (f) => pts.reduce((a, d) => a + (f(d.t) - d.v) ** 2, 0);
    if (spec.fits.includes("linear")) {
      const n = pts.length;
      const mx = pts.reduce((a, d) => a + d.t, 0) / n;
      const my = pts.reduce((a, d) => a + d.v, 0) / n;
      const b = pts.reduce((a, d) => a + (d.t - mx) * (d.v - my), 0) /
                pts.reduce((a, d) => a + (d.t - mx) ** 2, 0);
      staticLines.push({ ...FITSTYLE.linear, pts: grid.map((t) => ({ t, v: my + b * (t - mx) })) });
    }
    if (spec.fits.includes("sigmoid")) {
      const sig = (t, t0, k) => 1 / (1 + Math.exp(-k * (t - t0)));
      let best = null;
      for (let i = 0; i <= 80; i++) {
        for (let j = 0; j <= 80; j++) {
          const t0 = tmin + span * ((i / 80) * 8 - 1);
          const k = (0.03 / span) * Math.pow(4000, j / 80);
          const e = sse((t) => sig(t, t0, k));
          if (!best || e < best.e) best = { t0, k, e };
        }
      }
      for (let it = 0; it < 60; it++) {
        for (const [dt, mk] of [[span * 0.005, 1], [-span * 0.005, 1], [0, 1.03], [0, 1 / 1.03]]) {
          const t0 = best.t0 + dt, k = best.k * mk;
          const e = sse((t) => sig(t, t0, k));
          if (e < best.e) best = { t0, k, e };
        }
      }
      staticLines.push({ ...FITSTYLE.sigmoid, pts: grid.map((t) => ({ t, v: sig(t, best.t0, best.k) })) });
    }
  }
  const dynamic = [];
  for (const o of spec.overlays ?? []) {
    const line = { name: o.name, color: o.color ?? palette.series[2], dash: o.dash ?? null, pts: o.pts };
    (typeof o.pts === "function" ? dynamic : staticLines).push(line);
  }

  const node = Plot.plot({
    width, height, marginBottom: 48, marginLeft: 58,
    style: `font-family:${font};font-size:14px;background:transparent;color:${palette.muted};`,
    x: { label: null, grid: false, domain: spec.xDomain },
    y: { label: null, grid: true, domain: spec.yDomain, tickFormat: yFmt },
    color: { legend: false, domain: spec.colorDomain, range: spec.colorRange },
    marks: [
      // faint analog trajectories (e.g. completed-benchmark shapes shift-fit
      // to the target) drawn behind everything; their spread is the band
      ...(spec.trajectories ?? []).map((cur) => Plot.line(cur,
        { x: (d) => new Date(d.t), y: "v", stroke: palette.neutral,
          strokeWidth: 0.7, strokeOpacity: 0.28, clip: true })),
      ...(Array.isArray(spec.bands2) ? [Plot.areaY(spec.bands2, { x: (d) => new Date(d.t),
        y1: "q16", y2: "q84", fill: spec.band2Color ?? palette.neutral, fillOpacity: 0.14 })] : []),
      ...(Array.isArray(spec.bands) ? [
        ...(spec.bands[0].q025 != null ? [Plot.areaY(spec.bands, { x: (d) => new Date(d.t),
          y1: "q025", y2: "q975", fill: palette.neutral, fillOpacity: 0.12 })] : []),
        Plot.areaY(spec.bands, { x: (d) => new Date(d.t), y1: "q16", y2: "q84",
          fill: spec.bandColor ?? palette.neutral, fillOpacity: 0.16 }),
        ...(spec.bandMedian === false ? [] : [Plot.line(spec.bands, { x: (d) => new Date(d.t),
          y: "q50", stroke: palette.neutralInk, strokeWidth: 2, strokeDasharray: "6,4" })]),
      ] : []),
      ...staticLines.map((f) => Plot.line(f.pts, { x: (d) => new Date(d.t), y: "v",
        stroke: f.color, strokeWidth: 2.4, strokeDasharray: f.dash ?? undefined, clip: true })),
      ...(Number.isFinite(fcut) ? [
        Plot.ruleX([fcut], { x: (d) => new Date(d), stroke: palette.soft,
          strokeWidth: 1, strokeDasharray: "3,4" }),
        Plot.text([fcut], { x: (d) => new Date(d), frameAnchor: "top-right", dx: -4, dy: 4,
          text: () => "forecast made", fontSize: 11, fill: palette.soft }),
      ] : []),
      // models up to the forecast date: filled dots (fit on). After: stars (held out)
      Plot.dot(rows.filter((d) => +d[x] <= fcut), { x, y, fill: group, r, fillOpacity: 0.85 }),
      Plot.dot(rows.filter((d) => +d[x] > fcut), { x, y, fill: group, r: r * 1.8,
        symbol: "star", stroke: palette.ink, strokeWidth: 1 }),
      Plot.ruleY(rows, Plot.pointer({ px: x, py: y, y, maxRadius: 36,
        stroke: palette.ink, strokeWidth: 1, strokeDasharray: "3,3" })),
      Plot.ruleX(rows, Plot.pointer({ px: x, py: y, x, y1: 0, y2: (d) => d[y], maxRadius: 36,
        stroke: palette.ink, strokeWidth: 1, strokeDasharray: "3,3" })),
      Plot.text(rows, Plot.pointer({ x, y, text: (d) => d[label], dy: -14, maxRadius: 36,
        fontSize: 14, fontWeight: 600, fill: palette.ink, stroke: palette.bg, strokeWidth: 5 })),
    ],
  });
  for (const g of node.querySelectorAll('[aria-label$="tick label"]')) {
    g.setAttribute("font-weight", "600");
    g.setAttribute("font-size", "16px");
  }
  // viewBox scaling: the chart shrinks to fit its box (width AND height)
  // instead of overflowing — a rail figure must never grow a scrollbar
  node.setAttribute("viewBox", `0 0 ${width} ${height}`);
  node.removeAttribute("width");
  node.removeAttribute("height");
  node.style.cssText += `width:100%;height:auto;display:block;`;

  // dynamic overlays + bands: svg elements re-drawn in place on rate input, so
  // the uncertainty band tracks the central line as the pace slider moves it
  const dynLabels = new Map(); // overlay -> legend label element
  let lastRate = spec.rateInput?.value ?? 1;
  const dynBands = [
    { fn: spec.bands, color: spec.bandColor ?? palette.neutral, opacity: 0.16 },
    { fn: spec.bands2, color: spec.band2Color ?? palette.neutral, opacity: 0.14 },
  ].filter((b) => typeof b.fn === "function");
  if (dynamic.length || dynBands.length) {
    const X = node.scale("x"), Y = node.scale("y");
    const toD = (pts) => pts.map((p, i) =>
      `${i ? "L" : "M"}${X.apply(new Date(p.t)).toFixed(1)},${Y.apply(p.v).toFixed(1)}`).join("");
    // a band's points -> a closed area polygon (q84 forward, q16 back)
    const toArea = (pts) => {
      const top = pts.map((p, i) =>
        `${i ? "L" : "M"}${X.apply(new Date(p.t)).toFixed(1)},${Y.apply(p.q84).toFixed(1)}`).join("");
      const bot = pts.slice().reverse().map((p) =>
        `L${X.apply(new Date(p.t)).toFixed(1)},${Y.apply(p.q16).toFixed(1)}`).join("");
      return top + bot + "Z";
    };
    // band fills go BEHIND the data marks (prepended) so points stay visible
    const bandPaths = dynBands.map((b) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
      el.setAttribute("fill", b.color);
      el.setAttribute("fill-opacity", String(b.opacity));
      el.setAttribute("stroke", "none");
      el.style.pointerEvents = "none";
      node.prepend(el);
      return el;
    });
    const paths = dynamic.map((o) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
      el.setAttribute("fill", "none");
      el.setAttribute("stroke", o.color);
      el.setAttribute("stroke-width", "2.4");
      if (o.dash) el.setAttribute("stroke-dasharray", o.dash);
      el.style.pointerEvents = "none";
      node.appendChild(el);
      return el;
    });
    const redraw = (rate) => {
      lastRate = rate;
      dynBands.forEach((b, i) => bandPaths[i].setAttribute("d", toArea(b.fn(rate))));
      dynamic.forEach((o, i) => {
        paths[i].setAttribute("d", toD(o.pts(rate)));
        const lab = dynLabels.get(o);
        if (lab) lab.textContent = `${o.name} ${rate.toFixed(1)}\u00d7`;
      });
    };
    const src = spec.rateInput;
    redraw(src?.value ?? 1);
    if (src) {
      let queued = false;
      src.addEventListener("input", () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; redraw(+src.value); });
      });
    }
  }

  const wrap = document.createElement("div");
  wrap.style.position = "relative";
  if (spec.title) {
    const t = document.createElement("div");
    t.style.cssText = `font-family:${font};font-size:1.1rem;font-weight:650;` +
      `color:${palette.ink};margin:0 0 .8rem;text-align:center;`;
    t.textContent = spec.title;
    wrap.appendChild(t);
  }
  // svgBox is sized to exactly the rendered SVG (max-width + centring live
  // here now, not on the node). The legend lives inside it, so a percentage
  // `left` is a percentage of the SVG itself — it tracks the y-axis at any
  // scale with no JS and never drifts relative to the chart.
  const svgBox = document.createElement("div");
  svgBox.style.cssText = `position:relative;width:100%;max-width:${spec.displayW ?? width}px;margin:0 auto;`;
  svgBox.appendChild(node);
  wrap.appendChild(svgBox);
  const leg = document.createElement("div");
  leg.style.cssText = `display:flex;gap:1.5rem;justify-content:center;margin-top:1.1rem;` +
    `font-family:${font};font-size:.92rem;color:${palette.muted};`;
  (spec.colorDomain ?? []).forEach((k, i) => {
    const item = document.createElement("span");
    item.innerHTML = `<span style="display:inline-block;width:10px;height:10px;border-radius:99px;` +
      `background:${(spec.colorRange ?? [])[i]};margin-right:.45rem;"></span>${k}`;
    leg.appendChild(item);
  });
  wrap.appendChild(leg);
  const allLines = [...staticLines, ...dynamic];
  if (spec.bands)
    allLines.push({ name: "68% band (two-step)", color: spec.bandColor ?? palette.neutral, band: true });
  if (spec.bands2)
    allLines.push({ name: "68% band (time fit)", color: spec.band2Color ?? palette.neutral, band: true });
  if (allLines.length) {
    const box = document.createElement("div");
    // Glue the legend to the graph in BOTH axes via percentages of svgBox (which
    // is exactly the SVG box): left tracks the y-axis (marginLeft 58 of the
    // native width) + a small fixed gap; top tracks the same fraction down. Both
    // scale with the graph so the legend never drifts relative to it - but the
    // font is a fixed px, so the TEXT size never changes with the window. Pure
    // CSS, no JS, so nothing to jitter on resize.
    const axisPct = (58 / width * 100).toFixed(3);
    const topPct = (16 / height * 100).toFixed(3);
    box.style.cssText = `position:absolute;left:calc(${axisPct}% + 18px);top:${topPct}%;` +
      `display:flex;flex-direction:column;gap:.2rem;width:max-content;` +
      `font-family:${font};font-size:14px;color:${palette.ink};` +
      `background:color-mix(in srgb, ${palette.bg} 82%, transparent);` +
      `padding:.3rem .55rem;border:1px solid ${palette.hairline};border-radius:5px;`;
    for (const f of allLines) {
      const item = document.createElement("span");
      const isDyn = dynamic.includes(f);
      const text = isDyn ? `${f.name} ${(+lastRate).toFixed(1)}\u00d7` : f.name;
      item.innerHTML = f.band
        ? `<span style="display:inline-block;width:16px;height:9px;vertical-align:middle;` +
          `background:${f.color};opacity:.3;margin-right:.4rem;"></span><span>${text}</span>`
        : `<span style="display:inline-block;width:16px;vertical-align:middle;` +
          `border-top:2px ${f.dash ? "dashed" : "solid"} ${f.color};margin-right:.4rem;"></span>` +
          `<span style="font-variant-numeric:tabular-nums;">${text}</span>`;
      if (isDyn) dynLabels.set(f, item.lastElementChild);
      box.appendChild(item);
    }
    svgBox.appendChild(box);
  }
  return frame(wrap, { caption: spec.caption, provenance: spec.provenance });
}

export function glZoo({ Plot }, rows, spec = {}) {
  const { caption, provenance, cols = 4, panelW = 190, panelH = 120, order } = spec;
  const byB = new Map();
  for (const r of rows) {
    if (!byB.has(r.benchmark)) byB.set(r.benchmark, []);
    byB.get(r.benchmark).push({ ...r, date: new Date(r.date) });
  }
  const benches = order ?? [...byB.keys()].sort(
    (a, b) => Math.min(...byB.get(a).map((d) => +d.date)) - Math.min(...byB.get(b).map((d) => +d.date)));
  const grid = document.createElement("div");
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:.9rem 1rem;width:100%;`;
  for (const b of benches) {
    const pts = byB.get(b).sort((p, q) => +p.date - +q.date);
    const xDomain = [pts[0].date, new Date("2026-09-01")];
    let mx = -Infinity;
    const frontier = pts.filter((p) => (p.score > mx ? ((mx = p.score), true) : false));
    const cell = document.createElement("div");
    cell.style.cssText = `text-align:center;min-width:0;position:relative;`;
    // raise the hovered panel so its (overflowing) tooltip isn't hidden by
    // neighbouring cells
    cell.addEventListener("pointerenter", () => { cell.style.zIndex = "20"; });
    cell.addEventListener("pointerleave", () => { cell.style.zIndex = ""; });
    const title = document.createElement("div");
    title.textContent = b.replace("-2025-02-28-Private", "").replace(" 2024-2025", "");
    title.style.cssText = `font-size:.68rem;font-weight:500;color:${palette.muted};margin-bottom:-4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
    cell.appendChild(title);
    const panel = Plot.plot({
      width: panelW, height: panelH,
      marginLeft: 6, marginBottom: 6, marginTop: 6, marginRight: 6,
      style: { background: "transparent", fontFamily: '"Geist","Inter",sans-serif', fontSize: "9px" },
      x: { domain: xDomain, ticks: [], label: null, axis: null, insetLeft: 5, insetRight: 3 },
      y: { domain: [0, 1], ticks: [], label: null, axis: null, insetTop: 3, insetBottom: 3 },
      marks: [
        Plot.ruleY([0], { stroke: palette.hairline }),
        Plot.ruleY([1], { stroke: palette.hairline, strokeDasharray: "2,3" }),
        Plot.dot(pts, { x: "date", y: "score", r: 1.6, fill: palette.soft, fillOpacity: 0.55 }),
        Plot.line(frontier, { x: "date", y: "score", curve: "step-after",
                              stroke: palette.mintDeep, strokeWidth: 1.8 }),
        Plot.tip(pts, Plot.pointer({ x: "date", y: "score",
          title: (d) => `${d.model}\n${(d.score * 100).toFixed(1)}%  ·  ${d.date.toISOString().slice(0, 10)}` })),
      ],
    });
    panel.setAttribute("viewBox", `0 0 ${panelW} ${panelH}`);
    panel.removeAttribute("width");
    panel.removeAttribute("height");
    panel.style.cssText = "width:100%;height:auto;display:block;overflow:visible;";
    cell.appendChild(panel);
    grid.appendChild(cell);
  }
  return frame(grid, { caption, provenance });
}


// ---- glFrontierCompare: same benchmark, two sources — frontier step lines
// overlaid, faint dots underneath. rows: {benchmark, source, date, score, model}
export function glFrontierCompare({ Plot }, rows, spec = {}) {
  const { caption, provenance, panelW = 340, panelH = 240 } = spec;
  const srcColors = { "Epoch / hub": palette.mintDeep, "Artificial Analysis": "#7c4dbe" };
  const byB = new Map();
  for (const r of rows) {
    if (!byB.has(r.benchmark)) byB.set(r.benchmark, []);
    byB.get(r.benchmark).push({ ...r, date: new Date(r.date) });
  }
  const wrap = document.createElement("div");
  wrap.style.cssText = `display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;width:100%;`;
  for (const [b, pts] of byB) {
    const frontiers = [];
    for (const src of Object.keys(srcColors)) {
      const sp = pts.filter((p) => p.source === src).sort((x, y) => +x.date - +y.date);
      let mx = -Infinity;
      for (const p of sp) if (p.score > mx) { mx = p.score; frontiers.push(p); }
    }
    const cell = document.createElement("div");
    const title = document.createElement("div");
    title.textContent = b;
    title.style.cssText = `font-size:.78rem;font-weight:600;color:${palette.ink};text-align:center;`;
    cell.appendChild(title);
    const panel = Plot.plot({
      width: panelW, height: panelH,
      marginLeft: 34, marginBottom: 24, marginTop: 8, marginRight: 8,
      style: { background: "transparent", fontFamily: '"Geist","Inter",sans-serif', fontSize: "10px" },
      x: { type: "time", label: null },
      y: { domain: [0, 1], label: null, grid: true, tickFormat: (d) => `${d * 100}%` },
      color: { domain: Object.keys(srcColors), range: Object.values(srcColors) },
      marks: [
        Plot.dot(pts, { x: "date", y: "score", r: 1.6, fill: "source", fillOpacity: 0.25 }),
        Plot.line(frontiers, { x: "date", y: "score", z: "source", curve: "step-after",
                               stroke: "source", strokeWidth: 2 }),
        Plot.tip(pts, Plot.pointer({ x: "date", y: "score",
          title: (d) => `${d.model}\n${d.source}\n${(d.score * 100).toFixed(1)}%` })),
      ],
    });
    panel.setAttribute("viewBox", `0 0 ${panelW} ${panelH}`);
    panel.removeAttribute("width"); panel.removeAttribute("height");
    panel.style.cssText = "width:100%;height:auto;display:block;";
    cell.appendChild(panel);
    wrap.appendChild(cell);
  }
  const legend = document.createElement("div");
  legend.style.cssText = `display:flex;gap:1.4rem;justify-content:center;font-size:.78rem;color:${palette.muted};margin-top:.3rem;`;
  for (const [src, col] of Object.entries(srcColors)) {
    const s2 = document.createElement("span");
    s2.innerHTML = `<span style="color:${col}">●</span> ${src}`;
    legend.appendChild(s2);
  }
  const outer = document.createElement("div");
  outer.appendChild(wrap); outer.appendChild(legend);
  return frame(outer, { caption, provenance });
}


// ---- glSpaghetti: every benchmark's frontier as one overlaid chart;
// hover a line to highlight it. rows: {benchmark, date, score, model}
export function glSpaghetti(_, rows, spec = {}) {
  const { caption, provenance, W = 720, H = 420,
          tMin = +new Date("2021-06-01"), tMax = +new Date("2026-09-01") } = spec;
  const PADL = 40, PADR = 12, PADT = 16, PADB = 30;
  const byB = new Map();
  for (const r of rows) {
    if (!byB.has(r.benchmark)) byB.set(r.benchmark, []);
    byB.get(r.benchmark).push({ ...r, date: new Date(r.date) });
  }
  const xOf = (t) => PADL + ((t - tMin) / (tMax - tMin)) * (W - PADL - PADR);
  const yOf = (s) => PADT + (1 - s) * (H - PADT - PADB);

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.cssText = "width:100%;height:auto;display:block;";

  // axes
  for (const f of [0, 0.25, 0.5, 0.75, 1]) {
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", PADL); l.setAttribute("x2", W - PADR);
    l.setAttribute("y1", yOf(f)); l.setAttribute("y2", yOf(f));
    l.setAttribute("stroke", f ? palette.hairline : palette.soft);
    l.setAttribute("stroke-width", 1);
    svg.appendChild(l);
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", PADL - 5); t.setAttribute("y", yOf(f) + 3);
    t.setAttribute("text-anchor", "end"); t.setAttribute("font-size", 10);
    t.setAttribute("fill", palette.soft);
    t.textContent = `${f * 100}%`;
    svg.appendChild(t);
  }
  for (let y = 2022; y <= 2026; y++) {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", xOf(+new Date(`${y}-01-01`))); t.setAttribute("y", H - 12);
    t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", 10);
    t.setAttribute("fill", palette.soft);
    t.textContent = y;
    svg.appendChild(t);
  }

  const label = document.createElementNS(svgNS, "text");
  label.setAttribute("x", PADL + 8); label.setAttribute("y", PADT + 12);
  label.setAttribute("font-size", 13); label.setAttribute("font-weight", 600);
  label.setAttribute("fill", palette.mintDeep);
  svg.appendChild(label);

  const lines = [];
  for (const [b, pts] of byB) {
    const sp = pts.sort((x, y) => +x.date - +y.date);
    let mx = -Infinity;
    const fr = sp.filter((p) => (p.score > mx ? ((mx = p.score), true) : false));
    if (fr.length < 2) continue;
    let d = `M${xOf(+fr[0].date)},${yOf(fr[0].score)}`;
    for (let i = 1; i < fr.length; i++)
      d += `H${xOf(+fr[i].date)}V${yOf(fr[i].score)}`;
    d += `H${xOf(Math.min(tMax, +fr[fr.length-1].date + 90*86400000))}`;
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#cfcdc6");
    path.setAttribute("stroke-width", 1.4);
    const hit = document.createElementNS(svgNS, "path");
    hit.setAttribute("d", d);
    hit.setAttribute("fill", "none");
    hit.setAttribute("stroke", "transparent");
    hit.setAttribute("stroke-width", 9);
    hit.style.cursor = "pointer";
    const on = () => {
      for (const { p } of lines) { p.setAttribute("stroke", "#cfcdc6"); p.setAttribute("stroke-width", 1.4); }
      path.setAttribute("stroke", palette.mintDeep);
      path.setAttribute("stroke-width", 2.6);
      svg.appendChild(path); svg.appendChild(hit);  // raise
      label.textContent = b;
    };
    const off = () => { path.setAttribute("stroke", "#cfcdc6"); path.setAttribute("stroke-width", 1.4); label.textContent = ""; };
    hit.addEventListener("pointerenter", on);
    hit.addEventListener("pointerleave", off);
    svg.appendChild(path);
    lines.push({ p: path, h: hit, b });
  }
  for (const { h } of lines) svg.appendChild(h);   // hit areas on top
  return frame(svg, { caption, provenance });
}


const EPOCH0 = +new Date("2023-01-01");
const sig = (x) => 1 / (1 + Math.exp(-x));

// ---- glSigmoidZoo: all fitted time-sigmoids overlaid, hover to highlight.
export function glSigmoidZoo(_, fits, spec = {}) {
  const { caption, provenance, W = 720, H = 420,
          tMin = +new Date("2023-01-01"), tMax = +new Date("2028-01-01") } = spec;
  const PADL = 40, PADR = 12, PADT = 16, PADB = 30;
  const xOf = (t) => PADL + ((t - tMin) / (tMax - tMin)) * (W - PADL - PADR);
  const yOf = (v) => PADT + (1 - v) * (H - PADT - PADB);
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.cssText = "width:100%;height:auto;display:block;";
  for (const f of [0, 0.5, 1]) {
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", PADL); l.setAttribute("x2", W - PADR);
    l.setAttribute("y1", yOf(f)); l.setAttribute("y2", yOf(f));
    l.setAttribute("stroke", f ? palette.hairline : palette.soft);
    svg.appendChild(l);
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", PADL - 5); t.setAttribute("y", yOf(f) + 3);
    t.setAttribute("text-anchor", "end"); t.setAttribute("font-size", 10);
    t.setAttribute("fill", palette.soft); t.textContent = `${f * 100}%`;
    svg.appendChild(t);
  }
  for (let y = 2023; y <= 2027; y++) {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", xOf(+new Date(`${y}-01-01`))); t.setAttribute("y", H - 12);
    t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", 10);
    t.setAttribute("fill", palette.soft); t.textContent = y;
    svg.appendChild(t);
  }
  const label = document.createElementNS(svgNS, "text");
  label.setAttribute("x", PADL + 8); label.setAttribute("y", PADT + 12);
  label.setAttribute("font-size", 13); label.setAttribute("font-weight", 600);
  label.setAttribute("fill", palette.mintDeep);
  svg.appendChild(label);
  const lines = [];
  for (const f of fits) {
    let d = "";
    for (let px = PADL; px <= W - PADR; px += 4) {
      const t = tMin + ((px - PADL) / (W - PADL - PADR)) * (tMax - tMin);
      const days = (t - EPOCH0) / 86400000;
      const c0 = f.floor ?? 0;
      const v = c0 + (1 - c0) * sig((f.k) * (days - f.t0_days));
      d += (d ? "L" : "M") + px + "," + yOf(v);
    }
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", d); path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#cfcdc6"); path.setAttribute("stroke-width", 1.4);
    const hit = document.createElementNS(svgNS, "path");
    hit.setAttribute("d", d); hit.setAttribute("fill", "none");
    hit.setAttribute("stroke", "transparent"); hit.setAttribute("stroke-width", 9);
    hit.style.cursor = "pointer";
    hit.addEventListener("pointerenter", () => {
      for (const { p } of lines) { p.setAttribute("stroke", "#cfcdc6"); p.setAttribute("stroke-width", 1.4); }
      path.setAttribute("stroke", palette.mintDeep); path.setAttribute("stroke-width", 2.6);
      svg.appendChild(path); svg.appendChild(hit);
      label.textContent = `${f.benchmark} · midpoint ${f.t0_date}, discrimination ${f.k_per_year.toFixed(1)}/yr, floor ${Math.round((f.floor ?? 0) * 100)}%`;
    });
    hit.addEventListener("pointerleave", () => {
      path.setAttribute("stroke", "#cfcdc6"); path.setAttribute("stroke-width", 1.4);
      label.textContent = "";
    });
    svg.appendChild(path); lines.push({ p: path });
    svg.appendChild(hit);
  }
  return frame(svg, { caption, provenance });
}

// ---- glStrip: box-whisker + jittered hoverable dots for one metric across benchmarks.
export function glStrip(_, fits, spec = {}) {
  const { metric = "k_per_year", label: mlabel = "discrimination (per year)",
          log = false, caption, provenance, W = 720, H = 150 } = spec;
  const PADL = 16, PADR = 16, MIDY = 78;
  const vals = fits.map((f) => ({ b: f.benchmark, v: f[metric] })).filter((d) => isFinite(d.v));
  const xs = vals.map((d) => (log ? Math.log(d.v) : d.v)).sort((a, b) => a - b);
  const q = (p) => xs[Math.min(xs.length - 1, Math.floor(p * xs.length))];
  const [lo, q1, med, q3, hi] = [xs[0], q(0.25), q(0.5), q(0.75), xs[xs.length - 1]];
  const xOf = (v) => PADL + ((v - lo) / (hi - lo || 1)) * (W - PADL - PADR);
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.cssText = "width:100%;height:auto;display:block;";
  const box = (x1, x2, y1, y2, fill, stroke) => {
    const r = document.createElementNS(svgNS, "rect");
    r.setAttribute("x", x1); r.setAttribute("y", y1);
    r.setAttribute("width", x2 - x1); r.setAttribute("height", y2 - y1);
    r.setAttribute("fill", fill); if (stroke) r.setAttribute("stroke", stroke);
    svg.appendChild(r); return r;
  };
  const ln = (x1, x2, y1, y2, strk, w=1.4) => {
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", x1); l.setAttribute("x2", x2);
    l.setAttribute("y1", y1); l.setAttribute("y2", y2);
    l.setAttribute("stroke", strk); l.setAttribute("stroke-width", w);
    svg.appendChild(l); return l;
  };
  ln(xOf(lo), xOf(q1), MIDY, MIDY, palette.soft);
  ln(xOf(q3), xOf(hi), MIDY, MIDY, palette.soft);
  box(xOf(q1), xOf(q3), MIDY - 11, MIDY + 11, palette.mint + "33", palette.mintDeep);
  ln(xOf(med), xOf(med), MIDY - 11, MIDY + 11, palette.mintDeep, 2);
  const label = document.createElementNS(svgNS, "text");
  label.setAttribute("x", PADL); label.setAttribute("y", 18);
  label.setAttribute("font-size", 12.5); label.setAttribute("font-weight", 600);
  label.setAttribute("fill", palette.ink);
  svg.appendChild(label);
  vals.forEach((d, i) => {
    const c = document.createElementNS(svgNS, "circle");
    const x = xOf(log ? Math.log(d.v) : d.v);
    const jitter = ((i * 2654435761) % 100) / 100 * 26 - 13;
    c.setAttribute("cx", x); c.setAttribute("cy", MIDY + 30 + jitter);
    c.setAttribute("r", 4); c.setAttribute("fill", palette.mintDeep);
    c.setAttribute("fill-opacity", 0.55); c.style.cursor = "pointer";
    c.addEventListener("pointerenter", () => {
      c.setAttribute("r", 6); c.setAttribute("fill-opacity", 1);
      label.textContent = `${d.b}: ${d.v.toFixed(metric === "mae" ? 3 : 2)}`;
    });
    c.addEventListener("pointerleave", () => {
      c.setAttribute("r", 4); c.setAttribute("fill-opacity", 0.55);
      label.textContent = "";
    });
    svg.appendChild(c);
  });
  // axis ticks
  for (const v of [lo, med, hi]) {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", xOf(v)); t.setAttribute("y", MIDY - 18);
    t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", 10);
    t.setAttribute("fill", palette.soft);
    t.textContent = (log ? Math.exp(v) : v).toFixed(metric === "mae" ? 2 : 1);
    svg.appendChild(t);
  }
  const ttl = document.createElementNS(svgNS, "text");
  ttl.setAttribute("x", W - PADR); ttl.setAttribute("y", 18);
  ttl.setAttribute("text-anchor", "end"); ttl.setAttribute("font-size", 11);
  ttl.setAttribute("fill", palette.muted); ttl.textContent = mlabel;
  svg.appendChild(ttl);
  return frame(svg, { caption, provenance });
}

// ---- glRliWhatIf: RLI points + "what if it tracks like X" borrowed futures.
export function glRliWhatIf(_, { rli, fits }, spec = {}) {
  const { caption, provenance, refs = [], W = 720, H = 380,
          tMin = +new Date("2024-01-01"), tMax = +new Date("2029-07-01") } = spec;
  const PADL = 40, PADR = 12, PADT = 14, PADB = 30;
  const NOW = +new Date("2026-07-01");
  const current = Math.max(...rli.map((d) => d.score));
  const xOf = (t) => PADL + ((t - tMin) / (tMax - tMin)) * (W - PADL - PADR);
  const yOf = (v) => PADT + (1 - v) * (H - PADT - PADB);
  const root = document.createElement("div");
  const btns = document.createElement("div");
  btns.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.6rem;align-items:center;";
  const lab = document.createElement("span");
  lab.textContent = "if the RLI saturates like:";
  lab.style.cssText = `font-size:.78rem;color:#837878;`;
  btns.appendChild(lab);
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.cssText = "width:100%;height:auto;display:block;";
  root.appendChild(btns); root.appendChild(svg);

  const drawBase = () => {
    svg.innerHTML = "";
    for (const f of [0, 0.5, 1]) {
      const l = document.createElementNS(svgNS, "line");
      l.setAttribute("x1", PADL); l.setAttribute("x2", W - PADR);
      l.setAttribute("y1", yOf(f)); l.setAttribute("y2", yOf(f));
      l.setAttribute("stroke", f ? palette.hairline : palette.soft);
      svg.appendChild(l);
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", PADL - 5); t.setAttribute("y", yOf(f) + 3);
      t.setAttribute("text-anchor", "end"); t.setAttribute("font-size", 10);
      t.setAttribute("fill", palette.soft); t.textContent = `${f * 100}%`;
      svg.appendChild(t);
    }
    for (let y = 2024; y <= 2029; y++) {
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", xOf(+new Date(`${y}-01-01`))); t.setAttribute("y", H - 12);
      t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", 10);
      t.setAttribute("fill", palette.soft); t.textContent = y;
      svg.appendChild(t);
    }
    const nowLine = document.createElementNS(svgNS, "line");
    nowLine.setAttribute("x1", xOf(NOW)); nowLine.setAttribute("x2", xOf(NOW));
    nowLine.setAttribute("y1", PADT); nowLine.setAttribute("y2", H - PADB);
    nowLine.setAttribute("stroke", palette.hairline); nowLine.setAttribute("stroke-width", 1.4);
    svg.appendChild(nowLine);
    for (const d of rli) {
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", xOf(+new Date(d.date))); c.setAttribute("cy", yOf(d.score));
      c.setAttribute("r", 4); c.setAttribute("fill", "#1a1919");
      svg.appendChild(c);
    }
  };

  const frPts = (() => {
    const fr = [];
    let mx = -Infinity;
    for (const p of rli.slice().sort((a, b) => +new Date(a.date) - +new Date(b.date)))
      if (p.score > mx) { mx = p.score; fr.push(p); }
    return fr;
  })();
  const daysOf = (t) => (t - +new Date("2023-01-01")) / 86400000;
  const shiftFit = (f) => {
    const sse = (delta) => {
      let s2 = 0;
      for (const p of frPts) {
        const v = sig(f.k * (daysOf(+new Date(p.date)) - delta));
        s2 += (v - p.score) ** 2;
      }
      return s2;
    };
    let lo = daysOf(NOW) - 2200, hi = daysOf(NOW) + 2200;
    for (let it = 0; it < 60; it++) {
      const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3;
      if (sse(a) < sse(b)) hi = b; else lo = a;
    }
    return (lo + hi) / 2;
  };

  const drawEnsemble = () => {
    drawBase();
    const sseOf = (f, delta) => {
      let s2 = 0;
      for (const p of frPts) s2 += (sig(f.k * (daysOf(+new Date(p.date)) - delta)) - p.score) ** 2;
      return s2;
    };
    const n = frPts.length;
    let t0s = fits.map((f) => { const t0fit = shiftFit(f); return { f, t0fit, sse: sseOf(f, t0fit) }; });
    const wraw = t0s.map((d) => Math.pow(Math.max(d.sse, 1e-8), -n / 2));
    const wsum = wraw.reduce((a, b) => a + b, 0);
    t0s = t0s.map((d, i) => ({ ...d, w: wraw[i] / wsum }));
    // faded individual curves
    for (const { f, t0fit } of t0s) {
      let d = "";
      for (let px = PADL; px <= W - PADR; px += 5) {
        const t = tMin + ((px - PADL) / (W - PADL - PADR)) * (tMax - tMin);
        d += (d ? "L" : "M") + px + "," + yOf(sig(f.k * (daysOf(t) - t0fit)));
      }
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", d); path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#cfcdc6"); path.setAttribute("stroke-width", 1);
      path.setAttribute("stroke-opacity", "0.55");
      svg.appendChild(path);
    }
    // pointwise median + 95% band
    const wq = (pairs, p) => {
      const a = pairs.slice().sort((x, y) => x.v - y.v);
      let c = 0;
      for (const d of a) { c += d.w; if (c >= p) return d.v; }
      return a[a.length - 1].v;
    };
    let dMed = "";
    for (let px = PADL; px <= W - PADR; px += 4) {
      const t = tMin + ((px - PADL) / (W - PADL - PADR)) * (tMax - tMin);
      const pairs = t0s.map(({ f, t0fit, w }) => ({ v: sig(f.k * (daysOf(t) - t0fit)), w }));
      dMed += (dMed ? "L" : "M") + px + "," + yOf(wq(pairs, 0.5));
    }
    const loPts = [], hiPts = [];
    for (let px = PADL; px <= W - PADR; px += 4) {
      const t = tMin + ((px - PADL) / (W - PADL - PADR)) * (tMax - tMin);
      const pairs = t0s.map(({ f, t0fit, w }) => ({ v: sig(f.k * (daysOf(t) - t0fit)), w }));
      loPts.push([px, yOf(wq(pairs, 0.025))]);
      hiPts.push([px, yOf(wq(pairs, 0.975))]);
    }
    const poly = document.createElementNS(svgNS, "path");
    poly.setAttribute("d", "M" + loPts.map((p) => p.join(",")).join("L") +
      "L" + hiPts.reverse().map((p) => p.join(",")).join("L") + "Z");
    poly.setAttribute("fill", palette.mint); poly.setAttribute("fill-opacity", "0.14");
    poly.setAttribute("stroke", "none");
    svg.appendChild(poly);
    const med = document.createElementNS(svgNS, "path");
    med.setAttribute("d", dMed); med.setAttribute("fill", "none");
    med.setAttribute("stroke", palette.mintDeep); med.setAttribute("stroke-width", 2.6);
    svg.appendChild(med);
    // re-draw RLI points on top
    for (const d2 of rli) {
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", xOf(+new Date(d2.date))); c.setAttribute("cy", yOf(d2.score));
      c.setAttribute("r", 4); c.setAttribute("fill", "#1a1919");
      svg.appendChild(c);
    }
    // 90%-date distribution
    const t90pairs = t0s.map(({ f, t0fit, w }) => ({ v: t0fit + Math.log(9) / f.k, w }));
    const dToDate = (dd) => new Date(+new Date("2023-01-01") + dd * 86400000);
    const fmt = (dd) => { const D2 = dToDate(dd); return isFinite(+D2) && D2 < new Date("2100-01-01") ? D2.toISOString().slice(0, 7) : ">2100"; };
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", PADL + 8); t.setAttribute("y", PADT + 12);
    t.setAttribute("font-size", 12.5); t.setAttribute("font-weight", 600);
    t.setAttribute("fill", palette.mintDeep);
    t.textContent = `${t0s.length} templates, fit-weighted · 90%: median ${fmt(wq(t90pairs, 0.5))}, 95% CI ${fmt(wq(t90pairs, 0.025))} → ${fmt(wq(t90pairs, 0.975))}`;
    svg.appendChild(t);
  };

  const drawRef = (f) => {
    drawBase();
    const t0fit = shiftFit(f);
    let d = "";
    for (let px = PADL; px <= W - PADR; px += 4) {
      const t = tMin + ((px - PADL) / (W - PADL - PADR)) * (tMax - tMin);
      const v = sig(f.k * (daysOf(t) - t0fit));
      d += (d ? "L" : "M") + px + "," + yOf(v);
    }
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", d); path.setAttribute("fill", "none");
    path.setAttribute("stroke", palette.mintDeep);
    path.setAttribute("stroke-width", 2.4);
    path.setAttribute("stroke-dasharray", "6,4");
    svg.appendChild(path);
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", PADL + 8); t.setAttribute("y", PADT + 12);
    t.setAttribute("font-size", 12.5); t.setAttribute("font-weight", 600);
    t.setAttribute("fill", palette.mintDeep);
    {
      const t90days = t0fit + Math.log(0.9 / 0.1) / f.k;
      const when = new Date(+new Date("2023-01-01") + t90days * 86400000);
      t.textContent = `${f.benchmark}: 90% ≈ ${when.toISOString().slice(0, 7)}`;
    }
    svg.appendChild(t);
  };

  if (spec.ensembleOnly) { btns.style.display = "none"; setTimeout(drawEnsemble, 0); }
  let active = null;
  {
    const b = document.createElement("button");
    b.textContent = "all templates";
    b.style.cssText = `font-size:.78rem;padding:.26rem .66rem;border:1px solid #e6e6e6;border-radius:999px;background:#fff;color:#5b5858;cursor:pointer;`;
    b.onclick = () => {
      if (active) { active.style.background = "#fff"; active.style.color = "#5b5858"; }
      active = b; b.style.background = "#24857a"; b.style.color = "#fff";
      drawEnsemble();
    };
    btns.appendChild(b);
    setTimeout(() => b.click(), 0);
  }
  for (const rb of refs) {
    const f = fits.find((x) => x.benchmark === rb);
    if (!f) continue;
    const b = document.createElement("button");
    b.textContent = rb.replace(" (AA)", "").replace(" 2024-2025", "");
    b.style.cssText = `font-size:.78rem;padding:.26rem .66rem;border:1px solid #e6e6e6;border-radius:999px;background:#fff;color:#5b5858;cursor:pointer;`;
    b.onclick = () => {
      if (active) active.style.background = "#fff", active.style.color = "#5b5858";
      active = b; b.style.background = "#24857a"; b.style.color = "#fff";
      drawRef(f);
    };
    btns.appendChild(b);
  }
  drawBase();
  return frame(root, { caption, provenance });
}


// ---- glZooDual: the small-multiples zoo with a time/capability axis toggle.
// data: {time: rows(date), eci: rows(eci)}
export function glZooDual({ Plot }, data, spec = {}) {
  const { caption, provenance, panelW = 190, panelH = 120 } = spec;
  const outer = document.createElement("div");
  const btns = document.createElement("div");
  btns.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.7rem;align-items:center;justify-content:center;";
  const lab = document.createElement("span");
  lab.textContent = "x-axis:";
  lab.style.cssText = "font-size:.78rem;color:#837878;";
  btns.appendChild(lab);
  const holder = document.createElement("div");
  const build = (mode) => {
    const rows = data[mode];
    const xk = mode === "eci" ? "eci" : "date";
    const byB = new Map();
    for (const r of rows) {
      if (!byB.has(r.benchmark)) byB.set(r.benchmark, []);
      byB.get(r.benchmark).push({ ...r, date: new Date(r.date) });
    }
    const benches = [...byB.keys()].sort(
      (a, b) => Math.min(...byB.get(a).map((d) => +d.date)) - Math.min(...byB.get(b).map((d) => +d.date)));
    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.9rem 1rem;width:100%;";
    for (const b of benches) {
      const key = (p) => mode === "eci" ? p.eci : +p.date;
      const pts = byB.get(b).sort((p, q) => key(p) - key(q));
      let mx = -Infinity;
      const frontier = pts.filter((p) => (p.score > mx ? ((mx = p.score), true) : false));
      const cell = document.createElement("div");
      cell.style.cssText = "text-align:center;min-width:0;";
      const title = document.createElement("div");
      title.textContent = b.replace("-2025-02-28-Private", "").replace(" 2024-2025", "");
      title.style.cssText = "font-size:.68rem;font-weight:500;color:#5b5858;margin-bottom:-4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      cell.appendChild(title);
      const xDomain = mode === "eci" ? [Math.min(...pts.map((p) => p.eci)), 172]
                                     : [pts[0].date, new Date("2026-09-01")];
      const panel = Plot.plot({
        width: panelW, height: panelH,
        marginLeft: 6, marginBottom: 6, marginTop: 6, marginRight: 6,
        style: { background: "transparent", fontFamily: '"Geist","Inter",sans-serif', fontSize: "9px" },
        x: { domain: xDomain, ticks: [], label: null, axis: null },
        y: { domain: [0, 1], ticks: [], label: null, axis: null, grid: true },
        marks: [
          Plot.ruleY([0], { stroke: "#e6e6e6" }),
          Plot.ruleY([1], { stroke: "#e6e6e6", strokeDasharray: "2,3" }),
          Plot.dot(pts, { x: xk, y: "score", r: 1.6, fill: "#837878", fillOpacity: 0.55 }),
          Plot.line(frontier, { x: xk, y: "score", curve: "step-after",
                                stroke: "#24857a", strokeWidth: 1.8 }),
          Plot.tip(pts, Plot.pointer({ x: xk, y: "score",
            title: (d) => `${d.model}\n${(d.score * 100).toFixed(1)}%` +
              (mode === "eci" ? `  ·  ECI ${d.eci}` : `  ·  ${d.date.toISOString().slice(0, 10)}`) })),
        ],
      });
      panel.setAttribute("viewBox", `0 0 ${panelW} ${panelH}`);
      panel.removeAttribute("width"); panel.removeAttribute("height");
      panel.style.cssText = "width:100%;height:auto;display:block;";
      cell.appendChild(panel);
      grid.appendChild(cell);
    }
    return grid;
  };
  let active = null;
  const mk = (label2, mode) => {
    const b = document.createElement("button");
    b.textContent = label2;
    b.style.cssText = "font-size:.78rem;padding:.26rem .66rem;border:1px solid #e6e6e6;border-radius:999px;background:#fff;color:#5b5858;cursor:pointer;";
    b.onclick = () => {
      if (active) { active.style.background = "#fff"; active.style.color = "#5b5858"; }
      active = b; b.style.background = "#24857a"; b.style.color = "#fff";
      holder.innerHTML = ""; holder.appendChild(build(mode));
    };
    btns.appendChild(b);
    return b;
  };
  const bTime = mk("release date", "time");
  mk("capability (ECI)", "eci");
  outer.appendChild(btns); outer.appendChild(holder);
  bTime.click();
  return frame(outer, { caption, provenance });
}


// ---- shared toggle factory + axis configs for time/ECI dual views
function glToggle(builders, labels = ["release date", "capability (ECI)"]) {
  const outer = document.createElement("div");
  const btns = document.createElement("div");
  btns.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.7rem;align-items:center;justify-content:center;";
  const lab = document.createElement("span");
  lab.textContent = "x-axis:";
  lab.style.cssText = "font-size:.78rem;color:#837878;";
  btns.appendChild(lab);
  const holder = document.createElement("div");
  let active = null;
  builders.forEach((build, i) => {
    const b = document.createElement("button");
    b.textContent = labels[i];
    b.style.cssText = "font-size:.78rem;padding:.26rem .66rem;border:1px solid #e6e6e6;border-radius:999px;background:#fff;color:#5b5858;cursor:pointer;";
    b.onclick = () => {
      if (active) { active.style.background = "#fff"; active.style.color = "#5b5858"; }
      active = b; b.style.background = "#24857a"; b.style.color = "#fff";
      holder.innerHTML = ""; holder.appendChild(build());
    };
    btns.appendChild(b);
    if (i === 0) setTimeout(() => b.click(), 0);
  });
  outer.appendChild(btns); outer.appendChild(holder);
  return outer;
}

const AXES = {
  time: { min: +new Date("2023-01-01"), max: +new Date("2026-09-01"),
          ticks: [2023, 2024, 2025, 2026].map((y) => ({ v: +new Date(`${y}-01-01`), label: `${y}` })),
          xval: (r) => +new Date(r.date) },
  eci:  { min: 105, max: 172,
          ticks: [110, 130, 150, 170].map((v) => ({ v, label: `${v}` })),
          xval: (r) => r.eci },
};

function drawOverlay(items, ax, W, H, fs = 1) {
  // items: [{label, frontier?|evalAt}] ; fs scales type for multi-up layouts
  const PADL = 40, PADR = 12, PADT = 16, PADB = 30;
  const xOf = (v) => PADL + ((v - ax.min) / (ax.max - ax.min)) * (W - PADL - PADR);
  const yOf = (v) => PADT + (1 - v) * (H - PADT - PADB);
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.cssText = "width:100%;height:auto;display:block;";
  for (const f of [0, 0.5, 1]) {
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", PADL); l.setAttribute("x2", W - PADR);
    l.setAttribute("y1", yOf(f)); l.setAttribute("y2", yOf(f));
    l.setAttribute("stroke", f ? "#e6e6e6" : "#837878");
    svg.appendChild(l);
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", PADL - 5); t.setAttribute("y", yOf(f) + 3);
    t.setAttribute("text-anchor", "end"); t.setAttribute("font-size", 10 * fs);
    t.setAttribute("fill", "#837878"); t.textContent = `${f * 100}%`;
    svg.appendChild(t);
  }
  for (const tk of ax.ticks) {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", xOf(tk.v)); t.setAttribute("y", H - 12);
    t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", 10 * fs);
    t.setAttribute("fill", "#837878"); t.textContent = tk.label;
    svg.appendChild(t);
  }
  const label = document.createElementNS(svgNS, "text");
  label.setAttribute("x", PADL + 8); label.setAttribute("y", PADT + 12);
  label.setAttribute("font-size", 13 * fs); label.setAttribute("font-weight", 600);
  label.setAttribute("fill", palette.mintDeep);
  svg.appendChild(label);
  const lines = [];
  for (const it of items) {
    let d = "";
    if (it.frontier) {
      const fr = it.frontier.filter((p) => ax.xval(p) >= ax.min && ax.xval(p) <= ax.max);
      if (fr.length < 2) continue;
      d = `M${xOf(ax.xval(fr[0]))},${yOf(fr[0].score)}`;
      for (let i = 1; i < fr.length; i++)
        d += `H${xOf(ax.xval(fr[i]))}V${yOf(fr[i].score)}`;
    } else {
      for (let px = PADL; px <= W - PADR; px += 4) {
        const x = ax.min + ((px - PADL) / (W - PADL - PADR)) * (ax.max - ax.min);
        d += (d ? "L" : "M") + px + "," + yOf(it.evalAt(x));
      }
    }
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", d); path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#cfcdc6"); path.setAttribute("stroke-width", 1.4);
    const hit = document.createElementNS(svgNS, "path");
    hit.setAttribute("d", d); hit.setAttribute("fill", "none");
    hit.setAttribute("stroke", "transparent"); hit.setAttribute("stroke-width", 9);
    hit.style.cursor = "pointer";
    hit.addEventListener("pointerenter", () => {
      for (const q of lines) { q.setAttribute("stroke", "#cfcdc6"); q.setAttribute("stroke-width", 1.4); }
      path.setAttribute("stroke", palette.mintDeep); path.setAttribute("stroke-width", 2.6);
      svg.appendChild(path); svg.appendChild(hit);
      label.textContent = it.label;
    });
    hit.addEventListener("pointerleave", () => {
      path.setAttribute("stroke", "#cfcdc6"); path.setAttribute("stroke-width", 1.4);
      label.textContent = "";
    });
    svg.appendChild(path); lines.push(path); svg.appendChild(hit);
  }
  return svg;
}

// ---- glSpaghettiDual: all frontiers, time/ECI toggle.
export function glSpaghettiDual(_, data, spec = {}) {
  const { caption, provenance, W = 720, H = 420 } = spec;
  const build = (mode) => () => {
    const rows = data[mode];
    const byB = new Map();
    for (const r of rows) {
      if (!byB.has(r.benchmark)) byB.set(r.benchmark, []);
      byB.get(r.benchmark).push(r);
    }
    const ax = AXES[mode];
    const items = [];
    for (const [b, pts] of byB) {
      const sp = pts.slice().sort((x, y) => ax.xval(x) - ax.xval(y));
      let mx = -Infinity;
      const fr = sp.filter((p) => (p.score > mx ? ((mx = p.score), true) : false));
      items.push({ label: b, frontier: fr });
    }
    return drawOverlay(items, ax, W, H);
  };
  const node = glToggle([build("time"), build("eci")]);
  return frame(node, { caption, provenance });
}

// ---- glSigmoidZooDual: fitted 3PLs, time/ECI toggle. data: {time: fits, eci: fits}
export function glSigmoidZooDual(_, data, spec = {}) {
  const { caption, provenance, W = 720, H = 420 } = spec;
  const build = (mode) => () => {
    const ax = mode === "time"
      ? { ...AXES.time, min: +new Date("2022-01-01"), max: +new Date("2028-01-01"),
          ticks: [2022, 2023, 2024, 2025, 2026, 2027].map((y) => ({ v: +new Date(`${y}-01-01`), label: `${y}` })) }
      : { ...AXES.eci, max: 185, ticks: [110, 130, 150, 170].map((v) => ({ v, label: `${v}` })) };
    const items = data[mode].map((f) => {
      const c0 = f.floor ?? 0;
      const evalAt = mode === "time"
        ? (x) => c0 + (1 - c0) * sig(f.k * ((x - EPOCH0) / 86400000 - f.t0_days))
        : (x) => c0 + (1 - c0) * sig(f.alpha * (x - f.D));
      return { label: f.benchmark, evalAt };
    });
    return drawOverlay(items, ax, W, H);
  };
  const node = glToggle([build("time"), build("eci")]);
  return frame(node, { caption, provenance });
}

// ---- glZooOverlayDual: raw frontiers + fitted sigmoids side by side, ONE
// x-axis toggle for both panels. data: {time, eci, sigTime, sigEci}
export function glZooOverlayDual(_, data, spec = {}) {
  const { caption, provenance, W = 560, H = 420 } = spec;
  const FS = 1.35;
  const build = (mode) => () => {
    const axRaw = AXES[mode];
    const byB = new Map();
    for (const r of data[mode]) {
      if (!byB.has(r.benchmark)) byB.set(r.benchmark, []);
      byB.get(r.benchmark).push(r);
    }
    const rawItems = [];
    for (const [b, pts] of byB) {
      const fr = glFrontier(pts, (p) => axRaw.xval(p), (p) => p.score);
      rawItems.push({ label: b, frontier: fr });
    }
    const axSig = mode === "time"
      ? { ...AXES.time, min: +new Date("2022-01-01"), max: +new Date("2028-01-01"),
          ticks: [2022, 2023, 2024, 2025, 2026, 2027].map((y) => ({ v: +new Date(`${y}-01-01`), label: `${y}` })) }
      : { ...AXES.eci, max: 185, ticks: [110, 130, 150, 170].map((v) => ({ v, label: `${v}` })) };
    const sigItems = data[mode === "time" ? "sigTime" : "sigEci"].map((f) => {
      const c0 = f.floor ?? 0;
      const evalAt = mode === "time"
        ? (x) => c0 + (1 - c0) * sig(f.k * ((x - EPOCH0) / 86400000 - f.t0_days))
        : (x) => c0 + (1 - c0) * sig(f.alpha * (x - f.D));
      return { label: f.benchmark, evalAt };
    });
    const row = document.createElement("div");
    row.style.cssText = `display:flex;gap:1.6rem;justify-content:center;align-items:flex-start;` +
      `flex-wrap:wrap;font-family:${font};`;
    const cellFor = (titleText, node) => {
      const cell = document.createElement("div");
      cell.style.cssText = "flex:1 1 320px;min-width:300px;max-width:560px;";
      const t = document.createElement("div");
      t.textContent = titleText;
      t.style.cssText = `font-size:.95rem;font-weight:650;color:${palette.ink};` +
        `text-align:center;margin-bottom:.4rem;`;
      cell.appendChild(t); cell.appendChild(node);
      row.appendChild(cell);
    };
    cellFor("frontier curves", drawOverlay(rawItems, axRaw, W, H, FS));
    cellFor("sigmoid fits", drawOverlay(sigItems, axSig, W, H, FS));
    return row;
  };
  const node = glToggle([build("time"), build("eci")]);
  return frame(node, { caption, provenance });
}

// ---- glStripDual: metric strip with a toggle between two fit sets/metrics.
export function glStripDual(_, data, spec = {}) {
  const { caption, provenance } = spec;
  const build = (i) => () => {
    const cfg = data[i];
    const inner = glStrip(null, cfg.fits, { ...cfg, caption: undefined, provenance: undefined });
    return inner;
  };
  const node = glToggle([build(0), build(1)], data.map((d) => d.toggleLabel));
  return frame(node, { caption, provenance });
}


// ---- glRidgeline: item-EDI distributions, stacked, with frontier-arrival top axis.
export function glRidgeline(_, dists, spec = {}) {
  const { caption, provenance, W = 720, rowH = 78,
          eciMin = 90, eciMax = 200, eciToday = 163, eciPerYear = 14.8,
          t0 = +new Date("2026-07-01") } = spec;
  const PADL = 10, PADR = 46, PADT = 34, PADB = 30;
  const H = PADT + dists.length * rowH + PADB;
  const xOf = (e) => PADL + ((e - eciMin) / (eciMax - eciMin)) * (W - PADL - PADR);
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.cssText = "width:100%;height:auto;display:block;";
  const colors = ["#2a78d6","#1baf7a","#eda100","#4a3aa7","#e34948","#0d9488","#e87ba4"];
  // top date axis
  for (let y = 2024; y <= 2029; y++) {
    const e = eciToday + ((+new Date(`${y}-01-01`) - t0) / (365.25 * 86400000)) * eciPerYear;
    if (e < eciMin || e > eciMax) continue;
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", xOf(e)); l.setAttribute("x2", xOf(e));
    l.setAttribute("y1", PADT - 4); l.setAttribute("y2", H - PADB);
    l.setAttribute("stroke", "#eeede9"); svg.appendChild(l);
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", xOf(e)); t.setAttribute("y", PADT - 10);
    t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", 10);
    t.setAttribute("fill", "#837878"); t.textContent = y;
    svg.appendChild(t);
  }
  // frontier today
  const fl = document.createElementNS(svgNS, "line");
  fl.setAttribute("x1", xOf(eciToday)); fl.setAttribute("x2", xOf(eciToday));
  fl.setAttribute("y1", PADT - 4); fl.setAttribute("y2", H - PADB);
  fl.setAttribute("stroke", "#1a1919"); fl.setAttribute("stroke-dasharray", "4,3");
  fl.setAttribute("stroke-width", 1.2);
  svg.appendChild(fl);
  const stats = document.createElementNS(svgNS, "text");
  stats.setAttribute("x", W - PADR); stats.setAttribute("y", PADT - 10);
  stats.setAttribute("text-anchor", "end"); stats.setAttribute("font-size", 11.5);
  stats.setAttribute("font-weight", 600); stats.setAttribute("fill", "#24857a");
  svg.appendChild(stats);
  dists.forEach((d, i) => {
    const y0 = PADT + (i + 1) * rowH - 8;
    const col = colors[i % colors.length];
    // gaussian KDE
    const xs = [];
    for (let e = eciMin; e <= eciMax; e += 1.2) xs.push(e);
    const bw = 4.5;
    const dens = xs.map((e) => {
      let s2 = 0;
      for (const v of d.edis) s2 += Math.exp(-0.5 * ((e - v) / bw) ** 2);
      return s2;
    });
    const mx = Math.max(...dens);
    const scaleH = (rowH - 16) * (1 - d.p0);
    let path = `M${xOf(xs[0])},${y0}`;
    xs.forEach((e, j) => { path += `L${xOf(e)},${y0 - (dens[j] / mx) * scaleH}`; });
    path += `L${xOf(xs[xs.length - 1])},${y0}Z`;
    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", path); p.setAttribute("fill", col);
    p.setAttribute("fill-opacity", "0.5"); p.setAttribute("stroke", col);
    p.setAttribute("stroke-width", 1.5);
    p.addEventListener("pointerenter", () => {
      p.setAttribute("fill-opacity", "0.8");
      const med = d.edis.slice().sort((a, b) => a - b)[Math.floor(d.edis.length / 2)];
      stats.textContent = `${d.benchmark}: ${d.n} items · median EDI ${med.toFixed(0)} · ${Math.round(d.p0 * 100)}% never solved`;
    });
    p.addEventListener("pointerleave", () => { p.setAttribute("fill-opacity", "0.5"); stats.textContent = ""; });
    svg.appendChild(p);
    // baseline + label + censored block
    const bl = document.createElementNS(svgNS, "line");
    bl.setAttribute("x1", PADL); bl.setAttribute("x2", W - PADR);
    bl.setAttribute("y1", y0); bl.setAttribute("y2", y0);
    bl.setAttribute("stroke", "#e6e6e6"); svg.appendChild(bl);
    const lb = document.createElementNS(svgNS, "text");
    lb.setAttribute("x", PADL + 2); lb.setAttribute("y", y0 - rowH + 24);
    lb.setAttribute("font-size", 11); lb.setAttribute("font-weight", 600);
    lb.setAttribute("fill", col); lb.textContent = d.benchmark;
    svg.appendChild(lb);
    if (d.p0 > 0.001) {
      const bh = Math.min(d.p0 / 0.15, 1) * (rowH - 22);
      const r = document.createElementNS(svgNS, "rect");
      r.setAttribute("x", W - PADR + 8); r.setAttribute("y", y0 - bh);
      r.setAttribute("width", 16); r.setAttribute("height", bh);
      r.setAttribute("fill", col); r.setAttribute("fill-opacity", "0.3");
      r.setAttribute("stroke", col);
      svg.appendChild(r);
      const pt = document.createElementNS(svgNS, "text");
      pt.setAttribute("x", W - PADR + 16); pt.setAttribute("y", y0 - bh - 4);
      pt.setAttribute("text-anchor", "middle"); pt.setAttribute("font-size", 9);
      pt.setAttribute("fill", col); pt.setAttribute("font-weight", 600);
      pt.textContent = `${Math.round(d.p0 * 100)}%`;
      svg.appendChild(pt);
    }
  });
  const xl = document.createElementNS(svgNS, "text");
  xl.setAttribute("x", W / 2); xl.setAttribute("y", H - 8);
  xl.setAttribute("text-anchor", "middle"); xl.setAttribute("font-size", 10.5);
  xl.setAttribute("fill", "#837878");
  xl.textContent = "item difficulty (ECI units) · top axis: frontier arrival year at 14.8 ECI/yr";
  svg.appendChild(xl);
  return frame(svg, { caption, provenance });
}

// ---- glBacktestPicker: dropdown per benchmark — early-half fit vs realized.
export function glBacktestPicker(_, bt, spec = {}) {
  const { caption, provenance, W = 720, H = 380 } = spec;
  const PADL = 40, PADR = 12, PADT = 16, PADB = 30;
  const tMin = +new Date("2023-01-01"), tMax = +new Date("2027-01-01");
  const xOf = (t) => PADL + ((t - tMin) / (tMax - tMin)) * (W - PADL - PADR);
  const yOf = (v) => PADT + (1 - v) * (H - PADT - PADB);
  const daysOf = (t) => (t - +new Date("2023-01-01")) / 86400000;
  const root = document.createElement("div");
  const sel = document.createElement("select");
  sel.style.cssText = "font-size:.8rem;padding:.3rem .7rem;border:1px solid #e6e6e6;border-radius:999px;background:#fff;color:#1a1919;margin:0 auto .7rem;display:block;";
  bt.slice().sort((a, b) => a.benchmark.localeCompare(b.benchmark)).forEach((d) => {
    const o = document.createElement("option");
    o.value = d.benchmark; o.textContent = d.benchmark;
    sel.appendChild(o);
  });
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.cssText = "width:100%;height:auto;display:block;";
  root.appendChild(sel); root.appendChild(svg);
  const draw = (name) => {
    const d = bt.find((x) => x.benchmark === name);
    svg.innerHTML = "";
    for (const f of [0, 0.5, 1]) {
      const l = document.createElementNS(svgNS, "line");
      l.setAttribute("x1", PADL); l.setAttribute("x2", W - PADR);
      l.setAttribute("y1", yOf(f)); l.setAttribute("y2", yOf(f));
      l.setAttribute("stroke", f ? "#e6e6e6" : "#837878"); svg.appendChild(l);
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", PADL - 5); t.setAttribute("y", yOf(f) + 3);
      t.setAttribute("text-anchor", "end"); t.setAttribute("font-size", 10);
      t.setAttribute("fill", "#837878"); t.textContent = `${f * 100}%`;
      svg.appendChild(t);
    }
    for (let y = 2023; y <= 2026; y++) {
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", xOf(+new Date(`${y}-01-01`))); t.setAttribute("y", H - 12);
      t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", 10);
      t.setAttribute("fill", "#837878"); t.textContent = y;
      svg.appendChild(t);
    }
    // cut line
    const cut = +new Date(d.cut_date);
    const cl = document.createElementNS(svgNS, "line");
    cl.setAttribute("x1", xOf(cut)); cl.setAttribute("x2", xOf(cut));
    cl.setAttribute("y1", PADT); cl.setAttribute("y2", H - PADB);
    cl.setAttribute("stroke", "#c3c2b7"); cl.setAttribute("stroke-dasharray", "5,4");
    svg.appendChild(cl);
    const ct = document.createElementNS(svgNS, "text");
    ct.setAttribute("x", xOf(cut) - 5); ct.setAttribute("y", PADT + 12);
    ct.setAttribute("text-anchor", "end"); ct.setAttribute("font-size", 10);
    ct.setAttribute("fill", "#837878"); ct.textContent = "fit on this side";
    svg.appendChild(ct);
    // fitted curve
    let path = "";
    for (let px = PADL; px <= W - PADR; px += 4) {
      const t = tMin + ((px - PADL) / (W - PADL - PADR)) * (tMax - tMin);
      const v = sig(d.k * (daysOf(t) - d.t0_days));
      path += (path ? "L" : "M") + px + "," + yOf(v);
    }
    const pc = document.createElementNS(svgNS, "path");
    pc.setAttribute("d", path); pc.setAttribute("fill", "none");
    pc.setAttribute("stroke", "#24857a"); pc.setAttribute("stroke-width", 2.2);
    pc.setAttribute("stroke-dasharray", "6,4");
    svg.appendChild(pc);
    for (const p of d.train) {
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", xOf(+new Date(p.date))); c.setAttribute("cy", yOf(p.score));
      c.setAttribute("r", 4); c.setAttribute("fill", "#1a1919");
      svg.appendChild(c);
    }
    for (const p of d.test) {
      const c = document.createElementNS(svgNS, "rect");
      const x = xOf(+new Date(p.date)), y = yOf(p.score);
      c.setAttribute("x", x - 4); c.setAttribute("y", y - 4);
      c.setAttribute("width", 8); c.setAttribute("height", 8);
      c.setAttribute("transform", `rotate(45 ${x} ${y})`);
      c.setAttribute("fill", "#d1495b");
      svg.appendChild(c);
    }
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", W - PADR - 4); t.setAttribute("y", PADT + 12);
    t.setAttribute("text-anchor", "end"); t.setAttribute("font-size", 12.5);
    t.setAttribute("font-weight", 600); t.setAttribute("fill", "#1a1919");
    t.textContent = `held-out MAE ${d.mae.toFixed(3)}`;
    svg.appendChild(t);
  };
  sel.onchange = () => draw(sel.value);
  draw(sel.value = bt.slice().sort((a,b) => b.mae - a.mae)[0].benchmark);
  return frame(root, { caption, provenance });
}

// ---- glMethodPairs: paired horizontal dots per benchmark for two error metrics.
export function glMethodPairs(_, rows, spec = {}) {
  const { caption, provenance, W = 720,
          aKey = "mae_time", bKey = "mae_twostep",
          aLabel = "time sigmoid", bLabel = "two-step (date → ECI → score)",
          aColor = "#837878", bColor = "#24857a", xMax } = spec;
  const rowH = 20, PADL = 190, PADR = 20, PADT = 30, PADB = 26;
  const data = rows.slice().sort((a, b) => b[aKey] - a[aKey]);
  const H = PADT + data.length * rowH + PADB;
  const mx = xMax ?? Math.max(...data.map((d) => Math.max(d[aKey], d[bKey]))) * 1.05;
  const xOf = (v) => PADL + (v / mx) * (W - PADL - PADR);
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.cssText = "width:100%;height:auto;display:block;";
  data.forEach((d, i) => {
    const y = PADT + i * rowH + rowH / 2;
    const lb = document.createElementNS(svgNS, "text");
    lb.setAttribute("x", PADL - 8); lb.setAttribute("y", y + 3);
    lb.setAttribute("text-anchor", "end"); lb.setAttribute("font-size", 10);
    lb.setAttribute("fill", "#5b5858");
    lb.textContent = (d.benchmark + (d.vintage ? ` · ${d.vintage}` : "")).slice(0, 34);
    svg.appendChild(lb);
    const ln = document.createElementNS(svgNS, "line");
    ln.setAttribute("x1", xOf(d[aKey])); ln.setAttribute("x2", xOf(d[bKey]));
    ln.setAttribute("y1", y); ln.setAttribute("y2", y);
    ln.setAttribute("stroke", "#c3c2b7"); ln.setAttribute("stroke-width", 1.4);
    svg.appendChild(ln);
    for (const [k, col] of [[aKey, aColor], [bKey, bColor]]) {
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", xOf(d[k])); c.setAttribute("cy", y);
      c.setAttribute("r", 4.5); c.setAttribute("fill", col);
      svg.appendChild(c);
    }
  });
  // legend + axis
  const leg = document.createElementNS(svgNS, "text");
  leg.setAttribute("x", PADL); leg.setAttribute("y", 16);
  leg.setAttribute("font-size", 11); leg.setAttribute("fill", "#5b5858");
  leg.innerHTML = `<tspan fill="${aColor}">●</tspan> ${aLabel}   <tspan fill="${bColor}">●</tspan> ${bLabel}`;
  svg.appendChild(leg);
  for (const v of [0, mx / 2, mx]) {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", xOf(v)); t.setAttribute("y", H - 8);
    t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", 10);
    t.setAttribute("fill", "#837878"); t.textContent = v.toFixed(2);
    svg.appendChild(t);
  }
  return frame(svg, { caption, provenance });
}

// ---- glOneClockMulti: 7 panels — band + median step + realized frontier dots.
export function glOneClockMulti(_, data, spec = {}) {
  const { caption, provenance, panelW = 330, panelH = 210 } = spec;
  const tMin = +new Date("2023-06-01"), tMax = +new Date("2029-12-31");
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem 1.2rem;width:100%;";
  const svgNS = "http://www.w3.org/2000/svg";
  for (const d of data) {
    const PADL = 34, PADR = 8, PADT = 20, PADB = 22;
    const xOf = (t) => PADL + ((t - tMin) / (tMax - tMin)) * (panelW - PADL - PADR);
    const yOf = (v) => PADT + (1 - v) * (panelH - PADT - PADB);
    const cell = document.createElement("div");
    cell.style.cssText = "min-width:0;";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${panelW} ${panelH}`);
    svg.style.cssText = "width:100%;height:auto;display:block;";
    const title = document.createElementNS(svgNS, "text");
    title.setAttribute("x", PADL); title.setAttribute("y", 12);
    title.setAttribute("font-size", 11.5); title.setAttribute("font-weight", 600);
    title.setAttribute("fill", "#1a1919"); title.textContent = d.benchmark;
    svg.appendChild(title);
    for (const f of [0, 0.5, 1]) {
      const l = document.createElementNS(svgNS, "line");
      l.setAttribute("x1", PADL); l.setAttribute("x2", panelW - PADR);
      l.setAttribute("y1", yOf(f)); l.setAttribute("y2", yOf(f));
      l.setAttribute("stroke", f ? "#eeede9" : "#837878"); svg.appendChild(l);
    }
    for (let y = 2024; y <= 2029; y += 2) {
      const t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", xOf(+new Date(`${y}-01-01`))); t.setAttribute("y", panelH - 8);
      t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", 9);
      t.setAttribute("fill", "#837878"); t.textContent = y;
      svg.appendChild(t);
    }
    // band + median
    const lo = [], hi = [];
    let dm = "";
    for (const p of d.series) {
      const x = xOf(+new Date(p.date));
      lo.push([x, yOf(p.lo)]); hi.push([x, yOf(p.hi)]);
      dm += (dm ? "L" : "M") + x + "," + yOf(p.med);
    }
    const poly = document.createElementNS(svgNS, "path");
    poly.setAttribute("d", "M" + lo.map((p) => p.join(",")).join("L") +
      "L" + hi.reverse().map((p) => p.join(",")).join("L") + "Z");
    poly.setAttribute("fill", "#17cfb9"); poly.setAttribute("fill-opacity", "0.16");
    svg.appendChild(poly);
    const med = document.createElementNS(svgNS, "path");
    med.setAttribute("d", dm); med.setAttribute("fill", "none");
    med.setAttribute("stroke", "#24857a"); med.setAttribute("stroke-width", 2);
    svg.appendChild(med);
    const today = document.createElementNS(svgNS, "line");
    today.setAttribute("x1", xOf(+new Date("2026-07-08"))); today.setAttribute("x2", xOf(+new Date("2026-07-08")));
    today.setAttribute("y1", PADT); today.setAttribute("y2", panelH - PADB);
    today.setAttribute("stroke", "#e6e6e6"); today.setAttribute("stroke-width", 1.2);
    svg.appendChild(today);
    for (const p of d.realized) {
      const c = document.createElementNS(svgNS, "circle");
      c.setAttribute("cx", xOf(+new Date(p.date))); c.setAttribute("cy", yOf(p.score));
      c.setAttribute("r", 3.2); c.setAttribute("fill", "#1a1919");
      svg.appendChild(c);
    }
    cell.appendChild(svg);
    wrap.appendChild(cell);
  }
  return frame(wrap, { caption, provenance });
}


// ---- glMethodZoo: the family of RLI futures — one curve per method, hover to
// highlight; table of landmark dates underneath. data: {rli, methods}
export function glMethodZoo(_, data, spec = {}) {
  const { caption, provenance, W = 720, H = 420 } = spec;
  const PADL = 40, PADR = 12, PADT = 16, PADB = 30;
  const tMin = +new Date("2025-04-01"), tMax = +new Date("2029-12-01");
  const xOf = (t) => PADL + ((t - tMin) / (tMax - tMin)) * (W - PADL - PADR);
  const yOf = (v) => PADT + (1 - v) * (H - PADT - PADB);
  const svgNS = "http://www.w3.org/2000/svg";
  const root = document.createElement("div");
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.cssText = "width:100%;height:auto;display:block;";
  root.appendChild(svg);
  for (const f of [0, 0.5, 1]) {
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", PADL); l.setAttribute("x2", W - PADR);
    l.setAttribute("y1", yOf(f)); l.setAttribute("y2", yOf(f));
    l.setAttribute("stroke", f ? "#e6e6e6" : "#837878"); svg.appendChild(l);
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", PADL - 5); t.setAttribute("y", yOf(f) + 3);
    t.setAttribute("text-anchor", "end"); t.setAttribute("font-size", 10);
    t.setAttribute("fill", "#837878"); t.textContent = `${f * 100}%`;
    svg.appendChild(t);
  }
  for (let y = 2026; y <= 2029; y++) {
    const t = document.createElementNS(svgNS, "text");
    t.setAttribute("x", xOf(+new Date(`${y}-01-01`))); t.setAttribute("y", H - 12);
    t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", 10);
    t.setAttribute("fill", "#837878"); t.textContent = y;
    svg.appendChild(t);
  }
  const label = document.createElementNS(svgNS, "text");
  label.setAttribute("x", PADL + 8); label.setAttribute("y", PADT + 12);
  label.setAttribute("font-size", 12.5); label.setAttribute("font-weight", 600);
  label.setAttribute("fill", palette.mintDeep);
  svg.appendChild(label);
  const colors = ["#c3c2b7","#9e9c94","#2a78d6","#7c4dbe","#eda100","#e34948","#24857a"];
  const rows = [];
  data.methods.forEach((m, i) => {
    let d = "";
    for (const p of m.series) {
      const x = xOf(+new Date(p.date));
      if (x < PADL) continue;
      d += (d ? "L" : "M") + x + "," + yOf(p.v);
    }
    const col = colors[i % colors.length];
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", d); path.setAttribute("fill", "none");
    path.setAttribute("stroke", col); path.setAttribute("stroke-width", 1.8);
    path.setAttribute("stroke-opacity", "0.85");
    const hit = document.createElementNS(svgNS, "path");
    hit.setAttribute("d", d); hit.setAttribute("fill", "none");
    hit.setAttribute("stroke", "transparent"); hit.setAttribute("stroke-width", 10);
    hit.style.cursor = "pointer";
    const trRow = { m, col, path };
    hit.addEventListener("pointerenter", () => {
      for (const r of rows) { r.path.setAttribute("stroke-width", 1.8); r.path.setAttribute("stroke-opacity", "0.5"); }
      path.setAttribute("stroke-width", 3.2); path.setAttribute("stroke-opacity", "1");
      svg.appendChild(path); svg.appendChild(hit);
      label.textContent = `${m.label} · 90% ${m.d90} · backtested error at this maturity ±${m.grade ?? "?"}`;
      label.setAttribute("fill", col);
    });
    hit.addEventListener("pointerleave", () => {
      for (const r of rows) { r.path.setAttribute("stroke-width", 1.8); r.path.setAttribute("stroke-opacity", "0.85"); }
      label.textContent = "";
    });
    svg.appendChild(path); svg.appendChild(hit);
    rows.push(trRow);
  });
  for (const p of data.rli) {
    const c = document.createElementNS(svgNS, "circle");
    c.setAttribute("cx", xOf(+new Date(p.date))); c.setAttribute("cy", yOf(p.score));
    c.setAttribute("r", 4); c.setAttribute("fill", "#1a1919");
    svg.appendChild(c);
  }
  // table
  const tbl = document.createElement("table");
  tbl.style.cssText = `width:100%;max-width:44rem;margin:1rem auto 0;border-collapse:collapse;font-size:.8rem;color:#1a1919;`;
  tbl.innerHTML = `<thead><tr style="border-bottom:1px solid #e6e6e6;color:#837878;text-align:left;">
    <th style="padding:.3rem .4rem;">method</th><th>50%</th><th>90%</th>
    <th>mid-2027</th><th>mid-2028</th><th>±err @ this maturity, 12mo</th></tr></thead><tbody>` +
    data.methods.map((m, i) => `<tr style="border-bottom:1px solid #f2f2f2;">
      <td style="padding:.3rem .4rem;"><span style="color:${colors[i % colors.length]}">●</span> ${m.label}</td>
      <td>${m.d50}</td><td>${m.d90}</td>
      <td>${(m.at2027 * 100).toFixed(0)}%</td><td>${(m.at2028 * 100).toFixed(0)}%</td>
      <td>${m.grade != null ? "±" + (m.grade * 100).toFixed(0) + "pp" : "—"}</td></tr>`).join("") +
    `<tr><td style="padding:.3rem .4rem;color:#837878;">Difficulty-CDF ∘ clock (item-level)</td>
     <td colspan="5" style="color:#837878;">N/A: requires per-project results the RLI does not publish</td></tr>` +
    `</tbody>`;
  root.appendChild(tbl);
  return frame(root, { caption, provenance });
}
