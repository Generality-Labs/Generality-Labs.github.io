// gl-anchor — pure anchoring core for gl-comments. No DOM: operates on an
// ordered array of block texts (paragraphs/headings/list items), so it runs
// identically in the browser and in node tests.
//
// Anchor format (v2):
//   { quote, prefix, suffix, offset, block_i, block_hash }
//   · block_i     index of the block the selection was made in
//   · block_hash  content hash of that block's text at creation time
//   · offset      character offset of the quote WITHIN the block
//   · prefix/suffix  up to CTX chars of in-block context either side
//
// Legacy anchors (v1, no block fields) carried offsets into a whole-page
// text index that included dynamically rendered figure text — worthless
// across loads. They are resolved by exact-context search only, and return
// null (→ orphan strip) rather than guess when ambiguous.

export const CTX = 24;

// djb2, base36 — stable, tiny, collision-safe at paragraph scale
export function hashText(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function makeAnchor(blocks, blockI, offset, quote) {
  const text = blocks[blockI] ?? "";
  return {
    quote,
    prefix: text.slice(Math.max(0, offset - CTX), offset),
    suffix: text.slice(offset + quote.length, offset + quote.length + CTX),
    offset,
    block_i: blockI,
    block_hash: hashText(text),
  };
}

function occurrences(text, quote) {
  const out = [];
  for (let i = text.indexOf(quote); i !== -1; i = text.indexOf(quote, i + 1)) out.push(i);
  return out;
}

// Score a candidate occurrence of the quote inside one block.
function occScore(text, i, { quote, prefix, suffix, offset }) {
  let s = 0;
  if (prefix && text.slice(Math.max(0, i - prefix.length), i) === prefix) s += 2;
  if (suffix && text.slice(i + quote.length, i + quote.length + suffix.length) === suffix) s += 2;
  if (Number.isFinite(offset)) s -= Math.abs(i - offset) / Math.max(1, text.length);
  return s;
}

function bestInBlock(text, anchor) {
  const occ = occurrences(text, anchor.quote);
  if (!occ.length) return null;
  let best = occ[0], bs = -Infinity;
  for (const i of occ) {
    const s = occScore(text, i, anchor);
    if (s > bs) { bs = s; best = i; }
  }
  return { start: best, end: best + anchor.quote.length, score: bs };
}

// resolveAnchor(blocks, anchor) -> {block, start, end} | null
export function resolveAnchor(blocks, anchor) {
  if (!anchor?.quote) return null;

  if (anchor.block_hash) {
    // 1. exact block by content hash (nearest to the stored index if the
    //    same paragraph text somehow appears twice)
    const hashed = [];
    blocks.forEach((t, i) => { if (hashText(t) === anchor.block_hash) hashed.push(i); });
    if (hashed.length) {
      const i = hashed.reduce((a, b) =>
        Math.abs(a - anchor.block_i) <= Math.abs(b - anchor.block_i) ? a : b);
      const hit = bestInBlock(blocks[i], anchor);
      if (hit) return { block: i, start: hit.start, end: hit.end };
    }
    // 2. block was edited: same position, quote still present
    const at = blocks[anchor.block_i];
    if (at !== undefined) {
      const hit = bestInBlock(at, anchor);
      if (hit) return { block: anchor.block_i, start: hit.start, end: hit.end };
    }
    // 3. block moved AND edited: any block still containing quote + context
    return contextSearch(blocks, anchor);
  }
  // legacy v1 anchor: context search only, never offset-guessing
  return contextSearch(blocks, anchor, true);
}

// Search every block for the quote; accept only an unambiguous winner.
// Legacy offsets pointed into a polluted whole-page index, so for v1
// anchors the offset tiebreak is ignored entirely.
function contextSearch(blocks, anchor, legacy = false) {
  const cands = [];
  blocks.forEach((text, bi) => {
    for (const i of occurrences(text, anchor.quote)) {
      let s = 0;
      // legacy context was sliced from the polluted index but is still the
      // literal text around the selection; match loosely (ends of prefix,
      // starts of suffix) so a context that crossed a block border still helps
      const pre = (anchor.prefix || "").slice(-12);
      const suf = (anchor.suffix || "").slice(0, 12);
      if (pre && text.slice(Math.max(0, i - pre.length), i) === pre) s += 2;
      if (suf && text.slice(i + anchor.quote.length, i + anchor.quote.length + suf.length) === suf) s += 2;
      if (!legacy && Number.isFinite(anchor.offset))
        s -= Math.abs(i - anchor.offset) / Math.max(1, text.length);
      cands.push({ block: bi, start: i, score: s });
    }
  });
  if (!cands.length) return null;
  cands.sort((a, b) => b.score - a.score);
  // require a clear winner: unique top score, and for context-free legacy
  // quotes a single occurrence in the whole document
  if (cands.length > 1 && cands[0].score === cands[1].score) return null;
  if (legacy && cands[0].score <= 0 && cands.length > 1) return null;
  return { block: cands[0].block, start: cands[0].start, end: cands[0].start + anchor.quote.length };
}
