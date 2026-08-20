import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/v11-page.tsx", import.meta.url), "utf8");

test("homepage hero keeps its message concise", () => {
  const match = source.match(/<p><strong>Keep the relationship moving forward\.<\/strong> ([^<]+)<\/p>/);

  assert.ok(match, "expected the homepage hero paragraph");
  const words = `Keep the relationship moving forward. ${match[1]}`.trim().split(/\s+/);

  assert.ok(words.length <= 32, `expected no more than 32 words, found ${words.length}`);
  assert.match(match[1], /check, build, and dispute credit/);
  assert.match(match[1], /approved progress/);
  assert.match(match[1], /never the private report/);
});
