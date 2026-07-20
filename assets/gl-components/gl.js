// gl-components — the figure library for generality.org posts.
//
// Conventions
//   Every component has the signature  component(deps, data, spec) → HTMLElement
//     deps  — libraries supplied by the OJS runtime ({ Plot }), or null for
//             components that build raw DOM/SVG. The module itself imports nothing.
//     data  — a plain data contract, usually straight from a FileAttachment.
//     spec  — options. Common keys shared by all components:
//               caption      figcaption text under the figure
//               provenance   small-print line under the caption
//               width        pixel width (defaults fit the 688px prose column)
//             Plot-based components also share:
//               colorDomain / colorRange   explicit color scale (see model-colors.js)
//   House identity (palette, type, tooltip and axis-label behaviour) lives in
//   the helpers below so each component states only what is unique to it.

export const palette = {
  ink: "#1a1919",
  muted: "#5b5858",
  soft: "#837878",
  hairline: "#e6e6e6",
  bg: "#fafafa",
  paper: "#f2f2f2",
  mint: "#17cfb9",
  mintSoft: "#ecf8f5",
  mintEdge: "#c5e8e1",
  mintDeep: "#24857a",
  series: ["#24857a", "#d97757", "#7c4dbe", "#3a5fa8", "#eda100", "#d1495b"],
  good: "#1baf7a",
  warn: "#eda100",
  warnInk: "#b07d00",
  bad: "#d1495b",
  badSoft: "#faeceb",
  neutral: "#7a93ad",
  neutralInk: "#5a748c",
  neutralSoft: "#edf1f5",
  cleanFill: "#9fc3b4",
};

const FONT = `"Geist","Inter",-apple-system,system-ui,sans-serif`;
const SVG_NS = "http://www.w3.org/2000/svg";

/* ---------------------------------------------------------------- helpers */

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;");

/** Create an HTML element with inline css (and optional innerHTML). */
function el(tag, css, html) {
  const node = document.createElement(tag);
  if (css) node.style.cssText = css;
  if (html != null) node.innerHTML = html;
  return node;
}

/** Create an SVG element and set attributes. */
function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/** Inject a stylesheet into the document once per id (components may render
    several times per page; their CSS should not). */
function injectOnce(id, cssText) {
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = cssText;
  document.head.appendChild(style);
}

/** Wrap a rendered node in a <figure> with the shared caption/provenance style. */
function frame(node, { caption, provenance } = {}) {
  const fig = el("figure", `margin:1.5rem 0;font-family:${FONT};`);
  fig.appendChild(node);
  if (caption) {
    const c = document.createElement("figcaption");
    c.style.cssText = `font-size:.82rem;color:${palette.muted};margin-top:.5rem;line-height:1.45;`;
    c.textContent = caption;
    fig.appendChild(c);
  }
  if (provenance) {
    const p = el(
      "div",
      `font-size:.7rem;color:${palette.soft};margin-top:.35rem;font-variant-numeric:tabular-nums;`,
    );
    p.textContent = provenance;
    fig.appendChild(p);
  }
  return fig;
}

/** The house Plot style block. */
const plotStyle = (fontSize = "13px") => ({
  background: "transparent",
  fontFamily: FONT,
  fontSize,
});

/** A centred x-axis config with enough offset to clear two-line tick labels. */
const centredAxis = (label, labelOffset, extra = {}) => ({
  label,
  labelAnchor: "center",
  labelOffset,
  ...extra,
});

/** An HTML x-axis label rendered below the plot (used where Plot's own label
    would collide with tick labels). */
const labelBelow = (text, css) =>
  el(
    "div",
    `text-align:center;font-family:${FONT};margin-top:.2rem;${css}`,
    esc(text),
  );

/** Colour-swatch legend row rendered below a plot (house style: the model
    family legend sits under the graph, never above it). */
function legendRow(domain, range) {
  return el(
    "div",
    `display:flex;flex-wrap:wrap;justify-content:center;gap:.35rem 1.1rem;` +
      `font-family:${FONT};font-size:12px;color:${palette.muted};margin-top:.4rem;`,
    domain
      .map(
        (name, i) =>
          `<span style="display:inline-flex;align-items:center;gap:.35rem">` +
          `<span style="width:10px;height:10px;border-radius:3px;background:${range[i % range.length]};display:inline-block"></span>${esc(name)}</span>`,
      )
      .join(""),
  );
}

/* -------------------------------------------------------------- glStatBar */
// Benchmark fact strip for the top of an audit post: the metrics we track
// across every benchmark (size, frontier score, validated ceiling, ...) in a
// hairline-ruled row. Reusable: pass any label/value/detail items.
//   items: [{ label, value, detail? }]
export function glStatBar(_, items, spec = {}) {
  const { caption, provenance } = spec;
  injectOnce(
    "gl-statbar-css",
    `
    .gl-statbar { display:flex; flex-wrap:wrap;
      border-bottom:2px solid ${palette.hairline};
      font-family:${FONT}; }
    /* sit tight under the post title: lift the whole quarto cell, not the
       bar itself (the OJS output container clips negative child margins) */
    .cell:has(.gl-statbar) { margin-top:-2.5rem; }
    .gl-statbar .gl-stat { flex:0 1 auto; min-width:90px; padding:.1rem 1.8rem .45rem 0; }
    .gl-statbar .gl-stat + .gl-stat { border-left:1px solid ${palette.hairline}; padding-left:1.2rem; }
    .gl-statbar .label { font-family:"Geist Mono",monospace; font-size:9px;
      letter-spacing:.08em; text-transform:uppercase; color:${palette.soft}; }
    .gl-statbar .value { font-size:.95rem; font-weight:600; letter-spacing:-0.01em;
      color:${palette.ink}; font-variant-numeric:tabular-nums; line-height:1.3;
      margin-top:.05rem; }
    .gl-statbar .detail { font-size:10.5px; color:${palette.muted}; margin-top:.05rem;
      line-height:1.3; }
  `,
  );
  const bar = el("div", null);
  bar.className = "gl-statbar";
  for (const it of items) {
    bar.appendChild(
      el(
        "div",
        null,
        `
      <div class="label">${esc(it.label)}</div>
      <div class="value">${esc(it.value)}</div>
      ${it.detail ? `<div class="detail">${esc(it.detail)}</div>` : ""}
    `,
      ),
    ).className = "gl-stat";
  }
  return frame(bar, { caption, provenance });
}

/* ------------------------------------------------------------- glScatter */
// Model scatter with optional CI whiskers and living-figure vintage marks.
//   rows: {x, y, label, group, lo?, hi?}
//   spec: x/y/label/group key names, xLabel/yLabel, xDomain/yDomain,
//         lo/hi (CI keys), xFmt/yFmt (tooltip formats),
//         vintage + dateKey — rows dated after `vintage` render as hollow mint,
//         frontier — dotted step line through the running maximum, held flat
//         out to the latest x to make stagnation legible.
export function glScatter({ Plot }, rows, spec = {}) {
  const {
    x = "x",
    y = "y",
    label = "label",
    group = "group",
    xLabel = "",
    yLabel = "",
    caption,
    provenance,
    width = 700,
    height = 460,
    xFmt = (v) => v,
    yFmt = (v) => v,
    vintage,
    dateKey = "date",
    lo,
    hi,
  } = spec;
  const cut = vintage ? new Date(vintage) : null;
  const isNew = (d) => cut && new Date(d[dateKey]) > cut;
  const before = cut ? rows.filter((d) => !isNew(d)) : rows;
  const after = cut ? rows.filter(isNew) : [];

  const marks = [];
  const onFrontier = new Set();
  if (spec.frontier) {
    const sorted = [...rows].sort((a, b) => +a[x] - +b[x]);
    const steps = [];
    let best = -Infinity;
    for (const d of sorted) {
      if (d[y] > best) {
        best = d[y];
        onFrontier.add(d);
        steps.push({ _fx: d[x], _fy: best });
      }
    }
    steps.push({ _fx: sorted[sorted.length - 1][x], _fy: best }); // hold flat to latest release
    marks.push(
      Plot.line(steps, {
        x: "_fx",
        y: "_fy",
        curve: "step-after",
        stroke: palette.soft,
        strokeWidth: 1.3,
        strokeDasharray: "2,4",
      }),
    );
  }
  // with a frontier drawn, the field fades slightly so the frontier carries the story
  const dotAlpha = (d) => (!spec.frontier || onFrontier.has(d) ? 0.9 : 0.45);
  const ciAlpha = (d) => (!spec.frontier || onFrontier.has(d) ? 0.5 : 0.28);
  if (lo && hi && rows.some((d) => d[lo] != null)) {
    marks.push(
      Plot.ruleX(rows, {
        x,
        y1: lo,
        y2: hi,
        stroke: group,
        strokeWidth: 1.4,
        strokeOpacity: ciAlpha,
      }),
    );
    // CI end caps: short horizontal segments at lo and hi.
    const xs = rows.map((d) => +d[x]);
    const capW = (Math.max(...xs) - Math.min(...xs)) * 0.006 || 1;
    const caps = rows
      .flatMap((d) => [
        {
          ...d,
          _cy: d[lo],
          _x1: +d[x] - capW,
          _x2: +d[x] + capW,
          _a: ciAlpha(d),
        },
        {
          ...d,
          _cy: d[hi],
          _x1: +d[x] - capW,
          _x2: +d[x] + capW,
          _a: ciAlpha(d),
        },
      ])
      .filter((d) => d._cy != null);
    marks.push(
      Plot.ruleY(caps, {
        y: "_cy",
        x1: (d) => new Date(d._x1),
        x2: (d) => new Date(d._x2),
        stroke: group,
        strokeWidth: 1.4,
        strokeOpacity: (d) => d._a,
      }),
    );
  }
  marks.push(
    Plot.dot(before, { x, y, fill: group, r: 5.5, fillOpacity: dotAlpha }),
  );
  if (after.length)
    marks.push(
      Plot.dot(after, {
        x,
        y,
        stroke: palette.mint,
        strokeWidth: 2.5,
        r: 6.5,
        fill: palette.bg,
      }),
      Plot.dot(after, { x, y, fill: palette.mint, r: 3 }),
    );
  marks.push(
    Plot.tip(
      rows,
      Plot.pointer({
        x,
        y,
        maxRadius: 24,
        title: (d) =>
          `${d[label]}${isNew(d) ? "  (added since publication)" : ""}\n${xFmt(d[x])} · ${yFmt(d[y])}`,
      }),
    ),
  );

  const node = Plot.plot({
    width,
    height,
    marginBottom: 58,
    style: plotStyle(),
    x: centredAxis(xLabel || null, 52, { grid: false, domain: spec.xDomain }),
    y: { label: yLabel || null, grid: true, domain: spec.yDomain },
    color: {
      legend: !spec.legendBelow,
      domain: spec.colorDomain,
      range: spec.colorRange ?? palette.series,
    },
    marks,
  });
  let out = node;
  if (spec.legendBelow && spec.colorDomain) {
    out = el("div");
    out.appendChild(node);
    out.appendChild(
      legendRow(spec.colorDomain, spec.colorRange ?? palette.series),
    );
  }
  const prov = cut
    ? `${provenance || ""}  ·  ● as published ${vintage} · ◉ added since (live-refreshing)`
    : provenance;
  return frame(out, { caption, provenance: prov });
}

/* ----------------------------------------------------------- glHistogram */
// Overlapping (non-stacked) binned histograms with dashed mean lines.
//   rows: {value, series}; spec.thresholds may be a count or bin-edge array.
export function glHistogram({ Plot }, rows, spec = {}) {
  const {
    value = "value",
    series = "series",
    xLabel = "",
    caption,
    provenance,
    width = 688,
    height = 470,
    thresholds = 18,
  } = spec;
  const byValues = {};
  for (const r of rows)
    (byValues[r[series]] = byValues[r[series]] || []).push(r[value]);
  const meanRows = Object.entries(byValues).map(([k, vs]) => ({
    [series]: k,
    m: vs.reduce((a, b) => a + b, 0) / vs.length,
  }));

  const node = Plot.plot({
    width,
    height,
    style: plotStyle(),
    x: { label: null, grid: false },
    y: { label: null, grid: true, insetTop: 16 },
    color: {
      legend: true,
      domain: spec.colorDomain,
      range: spec.colorRange ?? [palette.series[0], palette.series[1]],
    },
    marks: [
      // y2 (not y) so the two distributions overlay instead of stacking.
      Plot.rectY(
        rows,
        Plot.binX(
          { y2: "count" },
          { x: value, fill: series, thresholds, fillOpacity: 0.5, inset: 0.5 },
        ),
      ),
      Plot.ruleX(meanRows, {
        x: "m",
        stroke: series,
        strokeWidth: 2.6,
        strokeDasharray: "5,3",
      }),
    ],
  });
  const wrap = el("div");
  wrap.appendChild(node);
  wrap.appendChild(
    labelBelow(xLabel, `font-size:.95rem;color:${palette.muted};`),
  );
  return frame(wrap, { caption, provenance });
}

/* ---------------------------------------------------------------- glBars */
// Horizontal bars, one per label, coloured by group.
//   rows: {label, value, group}
//   spec.sort (default true) sorts descending; spec.tipName renames the
//   tooltip's value line.
export function glBars({ Plot }, rows, spec = {}) {
  const {
    value = "value",
    label = "label",
    group = "group",
    xLabel = "",
    caption,
    provenance,
    width = 688,
    valueFmt = (v) => v,
    sort = true,
  } = spec;
  const data = sort ? rows.slice().sort((a, b) => b[value] - a[value]) : rows;
  const height = Math.max(160, data.length * 16 + 80);

  const node = Plot.plot({
    width,
    height,
    marginLeft: 210,
    marginBottom: 46,
    style: plotStyle("12px"),
    x: centredAxis(xLabel, 38, { grid: true }),
    y: { label: null, domain: data.map((d) => d[label]) },
    color: {
      legend: false,
      domain: spec.colorDomain,
      range: spec.colorRange ?? palette.series,
    },
    marks: [
      Plot.barX(data, {
        y: label,
        x: value,
        fill: group,
        rx: 2,
        insetTop: 1.5,
        insetBottom: 1.5,
      }),
      // pointerY: hovering anywhere along a bar's row triggers that bar's tip.
      Plot.tip(
        data,
        Plot.pointerY({
          y: label,
          x: value,
          title: (d) =>
            `${d[label]}\n${spec.tipName || xLabel || value}: ${valueFmt(d[value])}`,
        }),
      ),
    ],
  });
  const wrap = el("div");
  wrap.appendChild(node);
  if (spec.colorDomain)
    wrap.appendChild(
      legendRow(spec.colorDomain, spec.colorRange ?? palette.series),
    );
  return frame(wrap, { caption, provenance });
}

/* ------------------------------------------------------------ glSolveDist */
// Solve-count distribution: how many questions were solved by exactly k of
// the leaderboard models. Hover a column for counts.
//   rows: questions.json ({item, question, gold, n_solved, n_models})
export function glSolveDist({ Plot }, rows, spec = {}) {
  const { caption, provenance, width = 688, height = 340 } = spec;
  const nModels = rows[0]?.n_models ?? 49;
  const counts = new Map();
  for (const r of rows)
    counts.set(r.n_solved, (counts.get(r.n_solved) || 0) + 1);
  const bins = Array.from({ length: nModels + 1 }, (_, k) => ({
    k,
    n: counts.get(k) || 0,
  }));

  const node = Plot.plot({
    width,
    height,
    marginBottom: 48,
    style: plotStyle(),
    x: centredAxis(`models solving the question (of ${nModels})`, 40),
    y: { label: "questions", grid: true, insetTop: 14 },
    marks: [
      Plot.rectY(bins, {
        x1: (d) => d.k - 0.45,
        x2: (d) => d.k + 0.45,
        y: "n",
        fill: (d) => (d.k === 0 ? palette.bad : palette.mintDeep),
        fillOpacity: 0.85,
        rx: 1.5,
      }),
      Plot.tip(
        bins,
        Plot.pointerX({
          x: "k",
          y: "n",
          title: (d) =>
            `${d.n} questions solved by exactly ${d.k} model${d.k === 1 ? "" : "s"}`,
        }),
      ),
    ],
  });
  return frame(node, { caption, provenance });
}

/* --------------------------------------------------------- glForcingPairs */
// Two stacked panels of vertical natural/forced bar pairs per model:
// accuracy (with 95% CIs) on top, abstention below. Bars are tinted by
// provider colour (rows carry `hex`): pale = natural, solid = forced.
// Sorted by the forced-minus-natural accuracy difference. Hovering a model's
// column shows both arms at once.
//   rows: {label, hex, nat_score, for_score, nat_se, for_se, nat_abst, for_abst}
export function glForcingPairs({ Plot }, rows, spec = {}) {
  const { caption, provenance, width = 688 } = spec;
  const order = rows
    .slice()
    .sort((a, b) => b.for_score - b.nat_score - (a.for_score - a.nat_score))
    .map((d) => d.label);

  const panel = (aKey, bKey, seA, seB, yLabel, withCI) => {
    const flat = rows.flatMap((d) => [
      {
        label: d.label,
        arm: "natural",
        v: d[aKey],
        se: seA ? d[seA] : null,
        hex: d.hex,
      },
      {
        label: d.label,
        arm: "forced",
        v: d[bKey],
        se: seB ? d[seB] : null,
        hex: d.hex,
      },
    ]);
    const tips = rows.map((d) => ({
      label: d.label,
      a: d[aKey],
      b: d[bKey],
      top: Math.max(d[aKey], d[bKey]),
    }));
    return Plot.plot({
      width,
      height: 330,
      marginBottom: 64,
      marginLeft: 56,
      style: plotStyle("12.5px"),
      fx: {
        label: null,
        domain: order,
        tickRotate: -28,
        padding: 0.25,
        paddingOuter: 0.5,
        align: 0.6,
      },
      x: { axis: null, domain: ["natural", "forced"], padding: 0.12 },
      y: { label: yLabel, grid: true, insetTop: 14 },
      marks: [
        Plot.barY(flat, {
          fx: "label",
          x: "arm",
          y: "v",
          rx: 2,
          fill: (d) => d.hex,
          fillOpacity: (d) => (d.arm === "natural" ? 0.32 : 0.92),
        }),
        ...(withCI
          ? [
              Plot.ruleX(
                flat.filter((d) => d.se),
                {
                  fx: "label",
                  x: "arm",
                  y1: (d) => d.v - 1.96 * d.se,
                  y2: (d) => d.v + 1.96 * d.se,
                  stroke: palette.ink,
                  strokeWidth: 1.3,
                },
              ),
            ]
          : []),
        // one tip per model, anchored between the two bars (dx = half a band)
        Plot.tip(
          tips,
          Plot.pointerX({
            fx: "label",
            x: () => "natural",
            y: "top",
            dx: 15,
            title: (d) =>
              `${d.label}\nnatural: ${(100 * d.a).toFixed(1)}%\nforced: ${(100 * d.b).toFixed(1)}%`,
          }),
        ),
      ],
    });
  };

  const wrap = el("div");
  wrap.appendChild(
    el(
      "div",
      `font-size:.8rem;color:${palette.muted};margin-bottom:.25rem;font-family:${FONT};`,
      "pale = natural &nbsp;·&nbsp; solid = forced answer",
    ),
  );
  wrap.appendChild(
    panel(
      "nat_score",
      "for_score",
      "nat_se",
      "for_se",
      "headline accuracy",
      true,
    ),
  );
  wrap.appendChild(el("div", "height:14px;"));
  wrap.appendChild(
    panel("nat_abst", "for_abst", null, null, "abstention rate", false),
  );
  return frame(wrap, { caption, provenance });
}

/* ------------------------------------------------------- glTripletScatter */
// Several metrics per model on a date axis. Colour = group (provider),
// symbol = metric (first metric is drawn filled), a faint vertical rule ties
// one model's readings together. Dates get a stable per-model jitter so
// same-day releases don't overplot.
//   rows: {x: Date, label, group, <one column per metric>}
export function glTripletScatter({ Plot }, rows, spec = {}) {
  const {
    x = "x",
    label = "label",
    group = "group",
    metrics = [],
    xLabel = "",
    caption,
    provenance,
    width = 688,
    height = 480,
    valueFmt = (v) => v.toFixed(3),
  } = spec;

  const JITTER_DAYS = 1.3,
    DAY_MS = 86400000;
  const jmap = new Map(
    rows.map((r) => {
      const h = [...String(r[label])].reduce((a, c) => a + c.charCodeAt(0), 0);
      return [
        r[label],
        new Date(+r[x] + ((h % 13) - 6) * JITTER_DAYS * DAY_MS),
      ];
    }),
  );
  const jx = (d) => jmap.get(d[label]);

  const flat = [];
  for (const r of rows)
    for (const m of metrics)
      if (r[m] != null) flat.push({ ...r, metric: m, value: r[m] });
  const heads = flat.filter((d) => d.metric === metrics[0]);
  const others = flat.filter((d) => d.metric !== metrics[0]);
  const extent = (d, fn) =>
    fn(...metrics.map((m) => d[m]).filter((v) => v != null));

  const node = Plot.plot({
    width,
    height,
    marginBottom: 46,
    style: plotStyle(),
    x: { label: null, grid: false, domain: spec.xDomain },
    y: { label: null, grid: true, domain: spec.yDomain },
    color: {
      legend: false,
      domain: spec.colorDomain,
      range: spec.colorRange ?? palette.series,
    },
    symbol: {
      legend: false,
      domain: metrics,
      range: ["circle", "diamond2", "times"],
    },
    marks: [
      Plot.ruleX(rows, {
        x: jx,
        y1: (d) => extent(d, Math.min),
        y2: (d) => extent(d, Math.max),
        stroke: group,
        strokeWidth: 1.1,
        strokeOpacity: 0.35,
      }),
      Plot.dot(heads, {
        x: jx,
        y: "value",
        fill: group,
        symbol: "circle",
        r: 4.5,
      }),
      Plot.dot(others, {
        x: jx,
        y: "value",
        stroke: group,
        symbol: "metric",
        r: 4.5,
        strokeWidth: 1.8,
      }),
      Plot.tip(
        flat,
        Plot.pointer({
          x: jx,
          y: "value",
          title: (d) => `${d[label]}\n${d.metric}: ${valueFmt(d.value)}`,
        }),
      ),
    ],
  });
  // metric key drawn inside the plot area (colour carries provider, shape carries metric)
  const GLYPH = ["●", "◇", "✕"];
  const key = el(
    "div",
    `position:absolute;top:10px;left:52px;font-family:${FONT};font-size:12px;` +
      `color:${palette.muted};display:flex;flex-direction:column;gap:.15rem;pointer-events:none;`,
    metrics
      .map(
        (m, i) =>
          `<span><span style="color:${palette.ink};display:inline-block;width:1.1em">${GLYPH[i] ?? "•"}</span>${esc(m)}</span>`,
      )
      .join(""),
  );
  const plotBox = el("div", "position:relative;");
  plotBox.appendChild(node);
  plotBox.appendChild(key);

  const wrap = el("div");
  wrap.appendChild(plotBox);
  wrap.appendChild(
    labelBelow(
      xLabel,
      `font-size:.92rem;font-weight:600;color:${palette.ink};margin-top:.15rem;`,
    ),
  );
  if (spec.colorDomain)
    wrap.appendChild(
      legendRow(spec.colorDomain, spec.colorRange ?? palette.series),
    );
  return frame(wrap, { caption, provenance });
}

/* --------------------------------------------------------------- glRadar */
// Overlaid radar polygons, one per model, axes = knowledge areas.
//   data: {axes: [...], rows: [{model, axis, acc, n}]}
//   spec: colors {model: hex}, rMin/rMax (radial domain), legend: false to
//   suppress the built-in legend (e.g. when two radars share one).
export function glRadar(_, data, spec = {}) {
  const {
    caption,
    provenance,
    width = 560,
    rMin = 0.4,
    rMax = 0.85,
    colors = {},
  } = spec;
  const RING_VALUES = [0.5, 0.6, 0.7, 0.8];
  const LABEL_OVERHANG = 0.11; // axis labels sit just past rMax
  const R_MARGIN = 58; // svg edge to polygon edge

  const axes = data.axes;
  const models = [...new Set(data.rows.map((r) => r.model))];
  const size = width,
    cx = size / 2,
    cy = size / 2 + 6,
    R = size / 2 - R_MARGIN;
  const ang = (i) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;
  const rr = (v) => R * Math.max(0, Math.min(1, (v - rMin) / (rMax - rMin)));
  const pt = (i, v) => [
    cx + rr(v) * Math.cos(ang(i)),
    cy + rr(v) * Math.sin(ang(i)),
  ];

  const svg = svgEl("svg", { viewBox: `0 0 ${size} ${size + 10}` });
  svg.style.cssText = `width:100%;max-width:${size}px;height:auto;font-family:${FONT};display:block;margin:0 auto;`;

  for (const g of RING_VALUES) {
    svg.appendChild(
      svgEl("polygon", {
        points: axes.map((_, i) => pt(i, g).join(",")).join(" "),
        fill: "none",
        stroke: palette.hairline,
      }),
    );
    const [x, y] = pt(0, g);
    const t = svgEl("text", {
      x: x + 4,
      y: y + 3,
      style: `font-size:9.5px;fill:${palette.soft};`,
    });
    t.textContent = g.toFixed(1);
    svg.appendChild(t);
  }
  axes.forEach((a, i) => {
    const [x1, y1] = pt(i, rMin),
      [x2, y2] = pt(i, rMax);
    svg.appendChild(
      svgEl("line", { x1, y1, x2, y2, stroke: palette.hairline }),
    );
    const [lx, ly] = pt(i, rMax + (rMax - rMin) * LABEL_OVERHANG);
    const anchor =
      Math.abs(Math.cos(ang(i))) < 0.35
        ? "middle"
        : Math.cos(ang(i)) > 0
          ? "start"
          : "end";
    const t = svgEl("text", {
      x: lx,
      y: ly + 4,
      "text-anchor": anchor,
      style: `font-size:11px;fill:${palette.muted};`,
    });
    t.textContent = a;
    svg.appendChild(t);
  });

  const byModel = {};
  for (const r of data.rows)
    (byModel[r.model] = byModel[r.model] || {})[r.axis] = r;
  models.forEach((mName, mi) => {
    const col = colors[mName] || palette.series[mi];
    const pts = axes.map((a, i) => pt(i, byModel[mName][a]?.acc ?? rMin));
    svg.appendChild(
      svgEl("polygon", {
        points: pts.map((p) => p.join(",")).join(" "),
        fill: col,
        "fill-opacity": "0.13",
        stroke: col,
        "stroke-width": "2.2",
        "stroke-linejoin": "round",
      }),
    );
    pts.forEach(([x, y], i) => {
      const c = svgEl("circle", { cx: x, cy: y, r: 3.6, fill: col });
      const r = byModel[mName][axes[i]];
      const title = svgEl("title");
      title.textContent = `${mName} · ${axes[i]}: ${(100 * r.acc).toFixed(1)}% (n=${r.n})`;
      c.appendChild(title);
      svg.appendChild(c);
    });
  });

  const wrap = el("div");
  wrap.appendChild(svg);
  if (spec.legend !== false) {
    wrap.appendChild(
      el(
        "div",
        `display:flex;gap:1.2rem;justify-content:center;font-size:.85rem;color:${palette.muted};font-family:${FONT};margin-top:.2rem;`,
        models
          .map(
            (mName, mi) =>
              `<span><span style="color:${colors[mName] || palette.series[mi]}">●</span> ${mName}</span>`,
          )
          .join(""),
      ),
    );
  }
  return frame(wrap, { caption, provenance });
}

/* ------------------------------------------------------------ glInfScale */
// Serial vs parallel inference scaling on one shared token axis.
// Colour = model, symbol = arm (× serial, ○ parallel); parallel lines dashed.
//   data: {series: [{name, arm, points: [{x, y, k?, budget?}]}]}
//   The model name is everything in `name` before " serial"/" parallel".
export function glInfScale({ Plot }, data, spec = {}) {
  const { caption, width = 688, height = 440, colors = {} } = spec;
  const flat = [];
  for (const s of data.series) {
    const model = s.name.replace(/ (serial|parallel).*$/, "");
    for (const p of s.points)
      flat.push({ ...p, model, arm: s.arm, series: s.name });
  }
  const tipTitle = (d) => {
    const detail = d.k
      ? ` (k=${d.k})`
      : d.budget != null && d.arm === "serial"
        ? ` (budget ${d.budget || "off"})`
        : "";
    return `${d.model} · ${d.arm}${detail}\n~${d.x} tokens · ${(100 * d.y).toFixed(1)}%`;
  };
  const node = Plot.plot({
    width,
    height,
    marginBottom: 48,
    style: plotStyle(),
    x: centredAxis("median generated tokens per question", 40, {
      type: spec.xType ?? "linear",
      grid: false,
      domain: spec.xDomain,
    }),
    y: { label: "accuracy", grid: true, domain: [0, 0.85] },
    color: {
      legend: true,
      domain: Object.keys(colors),
      range: Object.values(colors),
    },
    symbol: {
      legend: true,
      domain: ["serial", "parallel"],
      range: ["times", "circle"],
    },
    marks: [
      Plot.line(flat, {
        x: "x",
        y: "y",
        z: "series",
        stroke: "model",
        strokeWidth: 2,
        strokeDasharray: (d) => (d.arm === "parallel" ? "5,4" : null),
      }),
      Plot.dot(
        flat.filter((d) => d.arm === "serial"),
        {
          x: "x",
          y: "y",
          stroke: "model",
          symbol: "times",
          r: 5.5,
          strokeWidth: 2.2,
        },
      ),
      Plot.dot(
        flat.filter((d) => d.arm === "parallel"),
        {
          x: "x",
          y: "y",
          stroke: "model",
          symbol: "circle",
          r: 5,
          strokeWidth: 2,
        },
      ),
      Plot.tip(
        flat,
        Plot.pointer({ x: "x", y: "y", maxRadius: 26, title: tipTitle }),
      ),
    ],
  });
  return frame(node, { caption });
}

/* ----------------------------------------------------------- glConfusion */
// Paired 3×3 grade-confusion matrices (original judge vs regrade), diagonal
// in mint, off-diagonal heat in red scaled by row share.
//   data: {flash: {labels, counts, n_runs}, mini: {...}}
export function glConfusion(_, data, spec = {}) {
  const {
    caption,
    titles = {
      flash: "Flash-era runs, regraded by mini",
      mini: "mini-era runs, regraded by mini (noise floor)",
    },
  } = spec;
  const CELL = { w: 74, h: 52 };
  const HEAT_GAIN = 14; // off-diagonal share → red opacity

  const wrap = el(
    "div",
    `display:flex;gap:2rem;flex-wrap:wrap;justify-content:center;font-family:${FONT};`,
  );
  for (const key of ["flash", "mini"]) {
    const d = data[key];
    const G = d.labels;
    const rowTot = d.counts.map((r) => r.reduce((a, b) => a + b, 0));

    const box = el("div");
    box.appendChild(
      el(
        "div",
        `font-size:.85rem;color:${palette.muted};margin-bottom:.45rem;text-align:center;`,
        esc(titles[key]),
      ),
    );

    const tbl = el("table", "border-collapse:separate;border-spacing:3px;");
    tbl.appendChild(
      el(
        "tr",
        null,
        `<td></td>` +
          G.map(
            (g) =>
              `<td style="text-align:center;font-size:.75rem;color:${palette.soft};padding:2px 6px;">→ ${g}</td>`,
          ).join(""),
      ),
    );
    d.counts.forEach((row, i) => {
      const cells = row
        .map((v, j) => {
          const share = rowTot[i] ? v / rowTot[i] : 0;
          const diag = i === j;
          const bg = diag
            ? `rgba(23,207,185,${0.1 + 0.5 * share})`
            : `rgba(209,73,91,${Math.min(0.85, share * HEAT_GAIN)})`;
          const ink = !diag && share * HEAT_GAIN > 0.45 ? "#fff" : palette.ink;
          return (
            `<td style="width:${CELL.w}px;height:${CELL.h}px;text-align:center;border-radius:5px;background:${bg};color:${ink};">` +
            `<div style="font-size:1rem;font-weight:600;font-variant-numeric:tabular-nums;">${v.toLocaleString()}</div>` +
            `<div style="font-size:.68rem;opacity:.75;">${(100 * share).toFixed(1)}%</div></td>`
          );
        })
        .join("");
      tbl.appendChild(
        el(
          "tr",
          null,
          `<td style="font-size:.75rem;color:${palette.soft};padding:2px 6px;text-align:right;">${G[i]}</td>` +
            cells,
        ),
      );
    });
    box.appendChild(tbl);
    box.appendChild(
      el(
        "div",
        `font-size:.7rem;color:${palette.soft};margin-top:.3rem;text-align:center;`,
        `rows: original grade · ${d.n_runs} runs`,
      ),
    );
    wrap.appendChild(box);
  }
  return frame(wrap, { caption });
}

/* -------------------------------------------------------------- glSankey */
// Three-step audit flow with hover highlighting: hovered band widens (never
// grows vertically, so slivers cannot overlap) and its ribbons deepen. The
// final step splits ambiguous + wrong by whether the label error actually
// costs models points, driven by each verdict row's `bites` flag.
//   verdicts: audit_verdicts.json ({final, bites, ...} per flagged item)
export function glSankey(_, verdicts, spec = {}) {
  const { caption, provenance, width = 688, height = 500, total = 1000 } = spec;

  // Layout constants.
  const BAR = 13; // band thickness
  const GAP = 15; // vertical gap between bands
  const MIN_BAND = 2.5; // slivers stay visible
  const HIT_MIN = 30,
    HIT_PAD = 10; // invisible hover target size
  const COL = { c1: 0.38, c2: 0.7 }; // column positions as width fractions
  const M = { t: 18, b: 18, l: 142, r: 138 }; // l fits "1000 questions" even at hover font size

  const count = (k) => verdicts.filter((v) => v.final === k).length;
  const bitesOf = (k) =>
    verdicts.filter((v) => v.final === k && v.bites === true).length;
  const FLAG = verdicts.length,
    NON = total - FLAG;
  const terminals = [
    {
      id: "fine",
      name: "fine",
      n: count("ACTUALLY_FINE"),
      color: palette.good,
      side: "right",
    },
    {
      id: "unv",
      name: "unverifiable",
      n: count("UNVERIFIABLE"),
      color: palette.neutral,
      side: "right",
    },
    {
      id: "amb",
      name: "ambiguous",
      n: count("CONFIRMED_AMBIGUOUS"),
      color: palette.warn,
      side: "left",
    },
    {
      id: "wrong",
      name: "wrong",
      n: count("CONFIRMED_BAD"),
      color: palette.bad,
      side: "left",
    },
  ];
  const ambB = bitesOf("CONFIRMED_AMBIGUOUS"),
    ambH = count("CONFIRMED_AMBIGUOUS") - ambB;
  const wrB = bitesOf("CONFIRMED_BAD"),
    wrH = count("CONFIRMED_BAD") - wrB;
  const nCosts = ambB + wrB,
    nHarm = ambH + wrH;

  const W = width - M.l - M.r,
    H = height - M.t - M.b;
  const sc = (v) => (v / total) * (H - 6 * GAP);
  const x0 = M.l,
    x1 = M.l + W * COL.c1,
    x2 = M.l + W * COL.c2,
    x3 = M.l + W;

  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}` });
  svg.style.cssText = `width:100%;height:auto;font-family:${FONT};`;
  const style = svgEl("style");
  style.textContent = `
    .gl-band rect.viz { transition: transform .18s ease; transform-box: fill-box; transform-origin: center; }
    .gl-band text { transition: font-size .18s ease; font-size: 13px; fill: ${palette.muted}; }
    .gl-band .num { font-variant-numeric: tabular-nums; }
    .gl-band.hot rect.viz { transform: scaleX(1.45); }
    .gl-band.hot text { font-size: 14.5px; font-weight: 600; fill: ${palette.ink}; }
    .gl-band rect.hit { fill: transparent; pointer-events: all; }
    .gl-ribbon { transition: fill-opacity .18s ease; fill-opacity: .32; }
    .gl-ribbon.hot { fill-opacity: .58; }
  `;
  svg.appendChild(style);

  const ribbonPath = (xa, xb, a0, a1, b0, b1) => {
    const mx = (xa + xb) / 2;
    return `M${xa},${a0} C${mx},${a0} ${mx},${b0} ${xb},${b0} L${xb},${b1} C${mx},${b1} ${mx},${a1} ${xa},${a1} Z`;
  };

  const groups = {},
    ribbons = {};
  function band(id, x, y, h, color, name, n, side) {
    const g = svgEl("g", { class: "gl-band" });
    g.dataset.id = id;
    const bandH = Math.max(h, MIN_BAND);
    const hitH = Math.max(bandH + HIT_PAD, HIT_MIN);
    g.appendChild(
      svgEl("rect", {
        class: "hit",
        x: x - 6,
        y: y + bandH / 2 - hitH / 2,
        width: BAR + 12,
        height: hitH,
      }),
    );
    g.appendChild(
      svgEl("rect", {
        class: "viz",
        x,
        y,
        width: BAR,
        height: bandH,
        rx: 2,
        fill: color,
      }),
    );
    const t = svgEl("text", {
      y: y + bandH / 2 + 4.5,
      x: side === "left" ? x - 10 : x + BAR + 10,
      "text-anchor": side === "left" ? "end" : "start",
    });
    t.innerHTML = n === "" ? name : `${name} <tspan class="num">${n}</tspan>`;
    g.appendChild(t);
    svg.appendChild(g);
    groups[id] = g;
  }
  function ribbon(id, xa, xb, a0, a1, b0, b1, color) {
    const p = svgEl("path", {
      class: "gl-ribbon",
      d: ribbonPath(xa, xb, a0, a1, b0, b1),
      fill: color,
    });
    p.dataset.id = id;
    svg.insertBefore(p, svg.firstChild.nextSibling); // ribbons under bands
    (ribbons[id] = ribbons[id] || []).push(p);
  }

  // Column 0: source.
  band(
    "src",
    x0 - BAR,
    M.t,
    sc(total) + GAP,
    palette.soft,
    "1000 questions",
    "",
    "left",
  );
  // Column 1: not flagged on top, flagged below.
  const nY = M.t,
    nH = sc(NON);
  const fY = nY + nH + GAP,
    fH = sc(FLAG);
  band("non", x1, nY, nH, palette.good, "not flagged", NON, "right");
  band("flag", x1, fY, fH, palette.soft, "flagged", FLAG, "left");
  ribbon("non", x0, x1, M.t, M.t + nH, nY, nY + nH, palette.good);
  ribbon("flag", x0, x1, M.t + nH, M.t + nH + fH, fY, fY + fH, palette.soft);
  // Column 2: verdicts from flagged; ambiguous + wrong continue to column 3.
  let ySrc = fY,
    yDst = fY;
  const pos = {};
  for (const t of terminals) {
    const h = Math.max(sc(t.n), MIN_BAND);
    band(t.id, x2, yDst, sc(t.n), t.color, t.name, t.n, t.side);
    ribbon(t.id, x1 + BAR, x2, ySrc, ySrc + sc(t.n), yDst, yDst + h, t.color);
    pos[t.id] = { y: yDst, h };
    ySrc += sc(t.n);
    yDst += h + GAP;
  }
  // Column 3: harmless above, costs-points below.
  const hY = pos.amb.y - 2;
  const cY = hY + Math.max(sc(nHarm), MIN_BAND) + GAP * 1.6;
  band(
    "harmless",
    x3,
    hY,
    sc(nHarm),
    palette.cleanFill,
    "harmless",
    nHarm,
    "right",
  );
  band(
    "costs",
    x3,
    cY,
    sc(nCosts),
    palette.bad,
    "costs points",
    nCosts,
    "right",
  );
  ribbon(
    "harmless",
    x2 + BAR,
    x3,
    pos.amb.y,
    pos.amb.y + sc(ambH),
    hY,
    hY + sc(ambH),
    palette.warn,
  );
  ribbon(
    "harmless",
    x2 + BAR,
    x3,
    pos.wrong.y,
    pos.wrong.y + sc(wrH),
    hY + sc(ambH),
    hY + sc(ambH) + sc(wrH),
    palette.bad,
  );
  ribbon(
    "costs",
    x2 + BAR,
    x3,
    pos.amb.y + sc(ambH),
    pos.amb.y + sc(ambH) + sc(ambB),
    cY,
    cY + sc(ambB),
    palette.warn,
  );
  ribbon(
    "costs",
    x2 + BAR,
    x3,
    pos.wrong.y + sc(wrH),
    pos.wrong.y + sc(wrH) + sc(wrB),
    cY + sc(ambB),
    cY + sc(ambB) + sc(wrB),
    palette.bad,
  );

  // Hover wiring: a band and its ribbons heat together, from either side.
  const setHot = (id, hot) => {
    groups[id]?.classList.toggle("hot", hot);
    (ribbons[id] || []).forEach((r) => r.classList.toggle("hot", hot));
  };
  for (const [id, g] of Object.entries(groups)) {
    g.addEventListener("mouseenter", () => setHot(id, true));
    g.addEventListener("mouseleave", () => setHot(id, false));
  }
  for (const [id, rs] of Object.entries(ribbons))
    rs.forEach((r) => {
      r.addEventListener("mouseenter", () => setHot(id, true));
      r.addEventListener("mouseleave", () => setHot(id, false));
    });

  const wrap = el("div");
  wrap.appendChild(svg);
  return frame(wrap, { caption, provenance });
}

/* ----------------------------------------------------------- glAuditCard */
// A random flagged question with the verifier's verdict and reasoning,
// coloured by verdict class; refresh to resample.
//   verdicts: audit_verdicts.json rows
export function glAuditCard(_, verdicts, spec = {}) {
  const { caption } = spec;
  const CLASSES = {
    CONFIRMED_BAD: { name: "wrong", color: palette.bad, bg: palette.badSoft },
    CONFIRMED_AMBIGUOUS: {
      name: "ambiguous",
      color: palette.warnInk,
      bg: "#faf3e0",
    },
    UNVERIFIABLE: {
      name: "unverifiable",
      color: palette.neutralInk,
      bg: palette.neutralSoft,
    },
  };
  const pool = verdicts.filter((v) => CLASSES[v.final]);

  const card = el(
    "div",
    `border-radius:6px;padding:.85rem 1.1rem;font-family:${FONT};` +
      `font-size:.93rem;line-height:1.55;transition:opacity .25s ease, background .25s ease, border-color .25s ease;` +
      `border-left:3px solid;min-height:11em;`,
  );
  const render = () => {
    const v = pool[Math.floor(Math.random() * pool.length)];
    const c = CLASSES[v.final];
    card.style.borderLeftColor = c.color;
    card.style.background = c.bg;
    card.innerHTML =
      `<span style="display:inline-block;font-size:.7rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;` +
      `color:#fff;background:${c.color};border-radius:999px;padding:.14rem .6rem;margin-bottom:.5rem;">${c.name}</span>` +
      `<div>“${esc(v.question)}” <span style="color:${palette.soft}">— gold: <strong>${esc(v.gold)}</strong></span></div>` +
      (v.correct_answer
        ? `<div style="margin-top:.4rem;color:${c.color};">verifier's answer: <strong>${esc(v.correct_answer)}</strong></div>`
        : "") +
      `<div style="margin-top:.45rem;color:${palette.muted};font-size:.85rem;">${esc(v.reason)}</div>` +
      (v.source_url
        ? `<div style="margin-top:.35rem;font-size:.78rem;"><a href="${esc(v.source_url)}" target="_blank" rel="noopener" ` +
          `style="color:${palette.mintDeep};border-bottom:1px solid ${palette.mintEdge};">source</a></div>`
        : "");
  };
  render();

  const btn = el(
    "button",
    `background:transparent;color:${palette.mintDeep};border:1px solid ${palette.mintEdge};` +
      `border-radius:999px;padding:.45rem 1.05rem;font-family:${FONT};font-size:.85rem;cursor:pointer;`,
  );
  btn.textContent = "↻ show another flagged question";
  btn.onclick = () => {
    card.style.opacity = 0;
    setTimeout(() => {
      render();
      card.style.opacity = 1;
    }, 180);
  };
  const btnRow = el(
    "div",
    "display:flex;justify-content:center;margin-top:.8rem;",
  );
  btnRow.appendChild(btn);

  const wrap = el("div");
  wrap.appendChild(card);
  wrap.appendChild(btnRow);
  return frame(wrap, { caption });
}

/* ------------------------------------------------------ glQuestionTriplet */
// Example-question card(s) with a refresh button. Refresh crossfades to a new
// random question; cards are fixed-height so the button never moves.
//   rows: questions.json; spec.seedItems pins the initial cards by item id;
//   spec.count — how many cards (default 1).
const TRIPLET_CSS = `
  @keyframes gl-fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes gl-fade-in {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
  /* sit close under the preceding prose: cancel the stacked cell+figure margins */
  .cell:has(.gl-qcard) { margin-top: -2.2rem; }
  .gl-qcard { border-left: 3px solid ${palette.mint}; background: ${palette.mintSoft};
    padding: .7rem 1.05rem; border-radius: 0 6px 6px 0; margin: .85rem 0;
    font-family: ${FONT}; font-size: .97rem; line-height: 1.55;
    height: 6.2em; overflow-y: auto; display: flex; align-items: center; }
  .gl-qcard .inner { width: 100%; }
  .gl-qcard .inner.leaving { animation: gl-fade-out .16s ease both; }
  .gl-qcard .inner.entering { animation: gl-fade-in .3s ease both; }
  .gl-qcard .meta { font-size: .74rem; color: ${palette.soft}; margin-top: .3rem; font-variant-numeric: tabular-nums; }
  .gl-qrefresh { background: transparent; color: ${palette.mintDeep}; border: 1px solid ${palette.mintEdge};
    border-radius: 999px; padding: .45rem 1.05rem; font-family: ${FONT}; font-size: .85rem;
    cursor: pointer; transition: background .15s, border-color .15s; }
  .gl-qrefresh:hover { background: ${palette.mintSoft}; border-color: ${palette.mintDeep}; }
`;

export function glQuestionTriplet(_, rows, spec = {}) {
  const { seedItems = [], caption, count = 1 } = spec;
  injectOnce("gl-question-triplet-css", TRIPLET_CSS);

  const byItem = new Map(rows.map((r) => [r.item, r]));
  const current = seedItems
    .map((i) => byItem.get(i))
    .filter(Boolean)
    .slice(0, count);
  while (current.length < count)
    current.push(rows[Math.floor(Math.random() * rows.length)]);

  const wrap = el("div");
  const render = (card, q) => {
    card.querySelector(".inner").innerHTML =
      `“${esc(q.question)}”` +
      `<div class="meta">solved by ${q.n_solved} of ${q.n_models} leaderboard models</div>`;
  };
  const cards = current.map((q) => {
    const card = el("div", null, `<div class="inner"></div>`);
    card.className = "gl-qcard";
    wrap.appendChild(card);
    render(card, q);
    return card;
  });

  const btn = el("button");
  btn.className = "gl-qrefresh";
  btn.textContent = count === 1 ? "↻ show me another" : "↻ show me more";
  btn.onclick = () => {
    for (const card of cards) {
      const inner = card.querySelector(".inner");
      inner.classList.add("leaving");
      inner.addEventListener(
        "animationend",
        () => {
          inner.classList.remove("leaving");
          render(card, rows[Math.floor(Math.random() * rows.length)]);
          inner.classList.add("entering");
          inner.addEventListener(
            "animationend",
            () => inner.classList.remove("entering"),
            { once: true },
          );
        },
        { once: true },
      );
    }
  };
  const btnRow = el(
    "div",
    "display:flex;justify-content:center;margin-top:.9rem;",
  );
  btnRow.appendChild(btn);
  wrap.appendChild(btnRow);
  return frame(wrap, { caption });
}

/* ------------------------------------------------------------ glHfSamples */
// Hugging-Face-dataset-viewer-style table of sample rows with a refresh
// button that draws a fresh random window from the dataset. Two live modes:
//   · unpinned (default): the datasets-server /rows API — always the CURRENT
//     revision, no way to pin (the API has no revision parameter).
//   · pinned: spec.pin reads the parquet export at a fixed commit of the
//     refs/convert/parquet branch via HTTP range requests — the exact
//     audited snapshot forever, no server. Requires the hyparquet dep:
//     glHfSamples({ hyparquet }, seeds, { …, pin: { revision, file } })
//     with hyparquet imported from /assets/vendor/hyparquet.mjs.
// Seeds render immediately and deterministically (offline-safe); the live
// fetch happens only on refresh, or on load when no seeds are given. The
// footer reports the served slice and revision (X-Revision header when
// unpinned, the pinned sha otherwise).
//   seedRows: rows shown on load and used as fallback when the fetch fails.
//   spec: { dataset, config, split,  — HF ids, e.g. "mandarjoshi/trivia_qa"
//           count = 3,               — rows per draw
//           columns,                 — subset/order of columns (default: all)
//           format = {},             — per-column value -> display string
//           pin,                     — { revision: <sha of refs/convert/parquet>,
//                                        file: "cfg/split/0000.parquet" }
//           caption }
const HFS_API = "https://datasets-server.huggingface.co";
const HFS_SIZES = new Map(); // "ds|cfg|split" -> promise of split row count
const HFS_PINS = new Map(); // pinned parquet url -> promise of {file, metadata, total}

const HFS_CSS = `
  .gl-hfs { border: 1px solid ${palette.hairline}; border-radius: 12px; background: #fff;
    font-family: ${FONT}; overflow: hidden; }
  .gl-hfs-bar { display: flex; justify-content: space-between; align-items: center; gap: .8rem;
    padding: .6rem .95rem; border-bottom: 1px solid ${palette.hairline}; background: ${palette.paper}; }
  .gl-hfs-id { font-family: "Geist Mono", monospace; font-size: .74rem; color: ${palette.muted}; }
  .gl-hfs-id a { color: ${palette.mintDeep}; text-decoration: none;
    border-bottom: 1px solid ${palette.mintEdge}; }
  .gl-hfs-scroll { overflow-x: auto; }
  .gl-hfs table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: .86rem; }
  .gl-hfs th { text-align: left; font-weight: 600; font-size: .74rem; color: ${palette.ink};
    padding: .5rem .75rem; border-bottom: 1px solid ${palette.hairline}; }
  .gl-hfs th .t { display: block; font-family: "Geist Mono", monospace; font-weight: 400;
    font-size: .64rem; color: ${palette.soft}; }
  .gl-hfs td { padding: .55rem .75rem; border-bottom: 1px solid #f0f0f0; vertical-align: top;
    color: ${palette.ink}; line-height: 1.45; overflow-wrap: break-word; }
  .gl-hfs td > div { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
    overflow: hidden; height: 4.35em; }
  .gl-hfs .idx { width: 5.6em; padding-left: .4rem; padding-right: .6rem; text-align: right;
    font-family: "Geist Mono", monospace; font-size: .68rem; color: ${palette.soft};
    white-space: nowrap; overflow-wrap: normal; }
  .gl-hfs tbody { transition: opacity .18s ease; }
  .gl-hfs tbody tr:hover { background: ${palette.bg}; }
  .gl-hfs tbody tr:last-child td { border-bottom: none; }
  .gl-hfs-hd { display: flex; flex-direction: column; gap: .1rem; min-width: 0; }
  .gl-hfs-status { display: block; font-family: "Geist Mono", monospace; font-size: .68rem;
    color: ${palette.soft}; line-height: 1.5; min-height: 1.5em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gl-hfs-status.err { color: #b4443c; }
  .gl-hfs-btn { background: transparent; color: ${palette.mintDeep};
    border: 1px solid ${palette.mintEdge}; border-radius: 999px; padding: .4rem .95rem;
    font-family: ${FONT}; font-size: .8rem; cursor: pointer; white-space: nowrap;
    transition: background .15s, border-color .15s; }
  .gl-hfs-btn:hover { background: ${palette.mintSoft}; border-color: ${palette.mintDeep}; }
  .gl-hfs-btn:disabled { opacity: .45; cursor: default; }
`;

export function glHfSamples(deps, seedRows, spec = {}) {
  const {
    dataset,
    config,
    split,
    count = 3,
    columns,
    format = {},
    caption,
    pin,
  } = spec;
  const hyparquet = deps?.hyparquet;
  injectOnce("gl-hfs-css", HFS_CSS);
  const seeds = (seedRows ?? []).slice();
  let cols =
    columns ??
    (seeds.length ? Object.keys(seeds[0]).filter((k) => k !== "row_idx") : []);
  let types = {}; // column -> dtype label, learned from the API's features

  const card = el("div");
  card.className = "gl-hfs";
  const hfUrl = `https://huggingface.co/datasets/${dataset}`;
  card.innerHTML = `
    <div class="gl-hfs-bar">
      <div class="gl-hfs-hd">
        <span class="gl-hfs-id">${
          dataset
            ? `<a href="${hfUrl}" target="_blank" rel="noopener">${esc(dataset)}</a>
        · ${esc(config)} · ${esc(split)}`
            : "committed sample"
        }</span>
        <span class="gl-hfs-status" data-role="status"></span>
      </div>
      <button class="gl-hfs-btn">↻ ${dataset ? (pin ? "sample the pinned dataset" : "sample the live dataset") : "shuffle"}</button>
    </div>
    <div class="gl-hfs-scroll"><table>
      <thead><tr></tr></thead><tbody></tbody>
    </table></div>`;
  const [thead, tbody, status, btn] = [
    card.querySelector("thead tr"),
    card.querySelector("tbody"),
    card.querySelector('[data-role="status"]'),
    card.querySelector(".gl-hfs-btn"),
  ];

  const fmt = (c, v) =>
    format[c]
      ? format[c](v)
      : typeof v === "string"
        ? v
        : v == null
          ? ""
          : JSON.stringify(v);
  // JS-value fallback for the header dtype sublabels — used for seed rows and
  // pinned parquet rows; the unpinned API path overrides with real dtypes.
  const typeLabel = (v) =>
    typeof v === "string"
      ? "string"
      : typeof v === "number"
        ? "double"
        : typeof v === "bigint"
          ? "int64"
          : Array.isArray(v)
            ? "list"
            : v && typeof v === "object"
              ? "struct"
              : "";
  const head = () => {
    thead.innerHTML =
      `<th class="idx">#</th>` +
      cols
        .map(
          (c) =>
            `<th>${esc(c)}<span class="t">${esc(types[c] ?? "")}</span></th>`,
        )
        .join("");
  };
  const body = (entries) => {
    tbody.innerHTML = entries
      .map(
        ({ idx, row }) => `<tr>
    <td class="idx">${idx}</td>
    ${cols.map((c) => `<td><div>${esc(String(fmt(c, row[c])).slice(0, 600))}</div></td>`).join("")}
  </tr>`,
      )
      .join("");
  };
  const set = (s, err = false) => {
    status.textContent = s;
    status.classList.toggle("err", err);
  };

  const showSeeds = (label) => {
    const rows =
      seeds.length > count
        ? seeds
            .slice()
            .sort(() => Math.random() - 0.5)
            .slice(0, count)
        : seeds;
    for (const c of cols)
      if (types[c] == null) types[c] = typeLabel(rows[0]?.[c]);
    head();
    body(rows.map((row) => ({ idx: row.row_idx ?? "—", row })));
    console.log("[glHfSamples] seed rows:", rows);
    set(label);
  };

  const sizeOf = () => {
    const key = `${dataset}|${config}|${split}`;
    if (!HFS_SIZES.has(key))
      HFS_SIZES.set(
        key,
        fetch(
          `${HFS_API}/size?dataset=${encodeURIComponent(dataset)}&config=${config}&split=${split}`,
        )
          .then((r) => r.json())
          .then((d) => d.size.splits.find((s) => s.split === split).num_rows),
      );
    return HFS_SIZES.get(key);
  };

  // Pinned mode: lazily open the parquet file at the pinned revision (footer
  // metadata is fetched once per url and shared across instances); each draw
  // then range-reads only the row group covering the random window.
  const pinnedSource = () => {
    const url = `https://huggingface.co/datasets/${dataset}/resolve/${pin.revision}/${pin.file}`;
    if (!HFS_PINS.has(url))
      HFS_PINS.set(
        url,
        (async () => {
          const file = await hyparquet.asyncBufferFromUrl({ url });
          const metadata = await hyparquet.parquetMetadataAsync(file);
          return { file, metadata, total: Number(metadata.num_rows) };
        })(),
      );
    return HFS_PINS.get(url);
  };

  async function drawPinned() {
    btn.disabled = true;
    tbody.style.opacity = ".35";
    set("reading pinned parquet…");
    try {
      const { file, metadata, total } = await pinnedSource();
      const offset = Math.floor(Math.random() * Math.max(1, total - count));
      const rows = await hyparquet.parquetReadObjects({
        file,
        metadata,
        columns: cols.length ? cols : undefined,
        rowStart: offset,
        rowEnd: offset + count,
      });
      console.log(
        `[glHfSamples] ${dataset} ${pin.file} rows ${offset}–${offset + count - 1}` +
          ` of ${total} rev=${pin.revision.slice(0, 7)} (pinned) — raw rows:`,
        rows,
      );
      if (!cols.length) cols = Object.keys(rows[0] ?? {});
      types = Object.fromEntries(cols.map((c) => [c, typeLabel(rows[0]?.[c])]));
      head();
      body(rows.map((row, i) => ({ idx: offset + i, row })));
      set(
        `rows ${offset.toLocaleString()}–${(offset + count - 1).toLocaleString()}` +
          ` of ${total.toLocaleString()} · rev ${pin.revision.slice(0, 7)} (pinned)`,
      );
    } catch (e) {
      console.warn("[glHfSamples] pinned read failed:", e);
      if (seeds.length)
        showSeeds("pinned read failed — committed sample shown");
      else set(`pinned read failed (${e.message}) — try again`, true);
    } finally {
      btn.disabled = false;
      tbody.style.opacity = "1";
    }
  }

  async function draw() {
    if (!dataset) return showSeeds("committed sample · shuffled");
    if (pin) {
      if (!hyparquet)
        return set(
          "spec.pin needs the hyparquet dep: glHfSamples({ hyparquet }, …)",
          true,
        );
      return drawPinned();
    }
    btn.disabled = true;
    tbody.style.opacity = ".35";
    set("fetching…");
    try {
      const total = await sizeOf();
      const offset = Math.floor(Math.random() * Math.max(1, total - count));
      const res = await fetch(
        `${HFS_API}/rows?dataset=${encodeURIComponent(dataset)}` +
          `&config=${config}&split=${split}&offset=${offset}&length=${count}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rev = (res.headers.get("x-revision") || "").slice(0, 7);
      const data = await res.json();
      console.log(
        `[glHfSamples] ${dataset} ${config}/${split} ` +
          `offset=${offset} of ${total} rev=${rev || "?"} — raw response:`,
        data,
      );
      if (!cols.length) cols = data.features.map((f) => f.name);
      types = Object.fromEntries(
        data.features.map((f) => [
          f.name,
          f.type?.dtype ?? f.type?._type ?? (f.type ? "struct" : ""),
        ]),
      );
      head();
      body(data.rows.map((r) => ({ idx: r.row_idx, row: r.row })));
      set(
        `rows ${offset.toLocaleString()}–${(offset + count - 1).toLocaleString()}` +
          ` of ${total.toLocaleString()}${rev ? ` · rev ${rev}` : ""}`,
      );
    } catch (e) {
      console.warn("[glHfSamples] live fetch failed:", e);
      if (seeds.length) showSeeds("live fetch failed — committed sample shown");
      else set(`live fetch failed (${e.message}) — try again`, true);
    } finally {
      btn.disabled = false;
      tbody.style.opacity = "1";
    }
  }

  btn.onclick = draw;
  if (seeds.length) showSeeds("");
  else draw();
  return frame(card, { caption });
}
