// Regression test on REAL production data: the 21 review comments left with
// the broken v1 anchoring (whole-page offsets polluted by figure text),
// replayed through the new resolver against the post's actual prose blocks.
//
// The contract for legacy anchors: resolve to the RIGHT block, or to null
// (orphan strip) — never to a wrong block. Expectations were derived by
// hand-auditing each comment against the post text.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveAnchor } from "../../assets/gl-comments/gl-anchor.mjs";

const here = new URL(".", import.meta.url).pathname;
const blocks = JSON.parse(readFileSync(here + "fixtures_blocks.json", "utf8"));
const { comments } = JSON.parse(readFileSync(here + "fixtures_comments.json", "utf8"));

// expected substring of the block each comment belongs in (null = orphan ok)
const EXPECT = {
  "In addition to allowing us t": "For all their many flaws",
  "long running": "For all their many flaws",
  "50% of the time and by proje": "For all their many flaws",
  "we opt for the ECI": "Our next approach aligns",
  "Experiment with the slider b": "Baked into this fit",
  "This can be considered ": "Aggregating and normalising",
  "saturate, we": "This gives us the range of ways",
  "Explore below, the": "This gives us the range of ways",
  "This need not be the case, h": "This brings us to the limit",
  "This idea can be explored be": "Consider a toy benchmark",
  "gaussian": "One interesting thing to note",
  "gaussian shaped": "One interesting thing to note",
  "It should be clear how this ": "It should be clear",
  "models": "The pipeline is as follows",
  "fit a sigmoid to the points,": "Our first approach is naive",
  "time": "For all their many flaws",
};

for (const c of comments.filter((c) => c.quote)) {
  const key = c.quote.slice(0, 28);
  test(`legacy comment by ${c.name}: "${key}"`, () => {
    const r = resolveAnchor(blocks, c);
    const expected = Object.entries(EXPECT).find(([k]) => k === key)?.[1];
    if (r === null) {
      // orphaning is acceptable — wrong placement is not
      return;
    }
    const blockText = blocks[r.block];
    assert.equal(blockText.slice(r.start, r.end), c.quote, "highlight covers the quote");
    if (expected)
      assert.ok(
        blockText.includes(expected),
        `resolved into wrong block: "${blockText.slice(0, 60)}" (expected block containing "${expected}")`
      );
  });
}

test("resolution summary: most legacy comments recover", () => {
  const rs = comments.filter((c) => c.quote).map((c) => resolveAnchor(blocks, c));
  const resolved = rs.filter(Boolean).length;
  assert.ok(resolved >= 14, `only ${resolved} of ${rs.length} resolved`);
});
