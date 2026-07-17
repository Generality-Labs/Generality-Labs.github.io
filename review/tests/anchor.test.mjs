// Tests for the pure anchoring core. Run: node --test review/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeAnchor, resolveAnchor, hashText, CTX } from "../../assets/gl-comments/gl-anchor.mjs";

const BLOCKS = [
  "The question",
  "For all their many flaws, benchmarks are one of the best methods we have for tracking the trajectory of AI capabilities.",
  "What if we could do the same for the RLI?",
  "Our first approach is naive: fit a sigmoid to the points, project it out. The simplest possible solution forms our baseline.",
  "Consider a toy benchmark, ToyBench, it consists of 100 tasks, each of which can be modelled as a binary outcome.",
  "To recap, we have shown that most benchmarks saturation can be well modelled, however predicting this sigmoid in advance is difficult, we find that modelling progress makes it appear smoother.",
];

test("exact resolve on unchanged blocks", () => {
  const a = makeAnchor(BLOCKS, 3, BLOCKS[3].indexOf("sigmoid"), "sigmoid");
  const r = resolveAnchor(BLOCKS, a);
  assert.deepEqual(r, { block: 3, start: BLOCKS[3].indexOf("sigmoid"), end: BLOCKS[3].indexOf("sigmoid") + 7 });
});

test("block inserted above: hash rescues the shifted index", () => {
  const a = makeAnchor(BLOCKS, 4, BLOCKS[4].indexOf("ToyBench"), "ToyBench");
  const shifted = [BLOCKS[0], "A brand new paragraph inserted early.", ...BLOCKS.slice(1)];
  const r = resolveAnchor(shifted, a);
  assert.equal(r.block, 5);
  assert.equal(shifted[r.block].slice(r.start, r.end), "ToyBench");
});

test("light edit in the block: position + context rescue the hash miss", () => {
  const a = makeAnchor(BLOCKS, 1, BLOCKS[1].indexOf("benchmarks"), "benchmarks");
  const edited = BLOCKS.slice();
  edited[1] = edited[1].replace("many flaws", "well-documented flaws");
  const r = resolveAnchor(edited, a);
  assert.equal(r.block, 1);
  assert.equal(edited[1].slice(r.start, r.end), "benchmarks");
});

test("repeated token in one block: offset picks the right occurrence", () => {
  const text = BLOCKS[5];
  const commas = [...text.matchAll(/,/g)].map((m) => m.index);
  assert.ok(commas.length >= 3);
  const target = commas[1];
  const a = makeAnchor(BLOCKS, 5, target, ",");
  const r = resolveAnchor(BLOCKS, a);
  assert.equal(r.block, 5);
  assert.equal(r.start, target);
});

test("block deleted entirely: returns null, never guesses", () => {
  const a = makeAnchor(BLOCKS, 4, BLOCKS[4].indexOf("ToyBench"), "ToyBench");
  const cut = BLOCKS.filter((_, i) => i !== 4);
  assert.equal(resolveAnchor(cut, a), null);
});

test("block moved and edited: context search still finds a unique quote", () => {
  const a = makeAnchor(BLOCKS, 2, BLOCKS[2].indexOf("RLI"), "RLI");
  const rearranged = [BLOCKS[0], BLOCKS[3], BLOCKS[4], BLOCKS[1], BLOCKS[5],
    BLOCKS[2].replace("What if", "But what if")];
  const r = resolveAnchor(rearranged, a);
  assert.equal(r.block, 5);
  assert.equal(rearranged[5].slice(r.start, r.end), "RLI");
});

test("legacy anchor with poisoned offset: unique quote+context resolves", () => {
  // v1 anchor: offset points thousands of chars away (figure-text pollution)
  const legacy = {
    quote: "ToyBench",
    prefix: "Consider a toy benchmark, ",
    suffix: ", it consists of 100 task",
    offset: 23858,
  };
  const r = resolveAnchor(BLOCKS, legacy);
  assert.equal(r.block, 4);
  assert.equal(BLOCKS[4].slice(r.start, r.end), "ToyBench");
});

test("legacy anchor, ambiguous quote and dead context: null, not a wrong guess", () => {
  const legacy = { quote: ",", prefix: "text that no longer exists", suffix: "gone too", offset: 26949 };
  assert.equal(resolveAnchor(BLOCKS, legacy), null);
});

test("legacy ambiguous quote with live context: context disambiguates", () => {
  const i = BLOCKS[5].indexOf(", however");
  const legacy = {
    quote: ",",
    prefix: BLOCKS[5].slice(i - 20, i),
    suffix: BLOCKS[5].slice(i + 1, i + 21),
    offset: 99999,
  };
  const r = resolveAnchor(BLOCKS, legacy);
  assert.equal(r.block, 5);
  assert.equal(r.start, i);
});

test("hash is stable and block-text sensitive", () => {
  assert.equal(hashText("abc"), hashText("abc"));
  assert.notEqual(hashText("abc"), hashText("abd"));
});

test("anchor context clamps at block edges", () => {
  const a = makeAnchor(BLOCKS, 0, 0, "The");
  assert.equal(a.prefix, "");
  assert.equal(a.suffix, " question".slice(0, CTX));
});
