import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/v11-page.tsx", import.meta.url), "utf8");

// The hero says what the product is for, in one breath. If this test fails, the message
// either grew past a breath or drifted away from the thesis: declines → a stage → a way back.
test("homepage hero keeps its message concise and on thesis", () => {
  const match = source.match(/<p><strong>Stop losing not-ready borrowers\.<\/strong> ([^<]+)<\/p>/);

  assert.ok(match, "expected the homepage hero paragraph");
  const words = `Stop losing not-ready borrowers. ${match[1]}`.trim().split(/\s+/);

  assert.ok(words.length <= 32, `expected no more than 32 words, found ${words.length}`);
  assert.match(match[1], /readiness stage/);
  assert.match(match[1], /Credit-repair partners work the file/);
  assert.match(match[1], /ready to review/);
});

test("homepage headline is the positioning line, and the hero leads with a stage, not a score", () => {
  assert.match(source, /<h1>Turn declines into a <em>managed pipeline\.<\/em><\/h1>/);
  assert.match(source, /lo-hero-stage/, "the hero window shows a stage card");
  assert.doesNotMatch(source, /lo-hero-scores/, "the three-score block no longer leads the hero");
  assert.match(source, /never the number you act on/);
});
