import test from "node:test";
import assert from "node:assert/strict";
import { getApplicationVersion } from "../lib/app-version.ts";
import { readFileSync } from "node:fs";

test("application version uses the first seven deployment SHA characters", () => {
  const previous = process.env.VERCEL_GIT_COMMIT_SHA;
  process.env.VERCEL_GIT_COMMIT_SHA = "3693189abcdef";
  assert.equal(getApplicationVersion(), "3693189");
  if (previous === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA; else process.env.VERCEL_GIT_COMMIT_SHA = previous;
});
test("application version falls back to Local", () => {
  const previous = process.env.VERCEL_GIT_COMMIT_SHA;
  delete process.env.VERCEL_GIT_COMMIT_SHA;
  assert.equal(getApplicationVersion(), "Local");
  if (previous !== undefined) process.env.VERCEL_GIT_COMMIT_SHA = previous;
});
test("shell version is plain informational text", () => {
  const shell = readFileSync("components/layout/app-shell.tsx", "utf8");
  assert.match(shell, /Ver\. \{applicationVersion\}/);
  assert.doesNotMatch(shell, /NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA|3693189/);
});
