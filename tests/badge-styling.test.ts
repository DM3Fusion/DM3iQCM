import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync("app/globals.css", "utf8");

test("textual badges use compact rounded rectangles", () => {
  assert.match(css, /\.badge\{[^}]*border-radius:6px/);
  assert.match(css, /\.count-pill\{[^}]*border-radius:6px/);
  assert.match(css, /\.required,\.optional\{[^}]*border-radius:6px/);
  assert.match(css, /\.platform-role\{[^}]*border-radius:6px/);
  assert.doesNotMatch(css, /Textual status, role, and informational indicators/);
});

test("avatar and circular identity styling remains circular", () => {
  assert.match(css, /\.user-avatar[^}]*border-radius:50%/);
  assert.match(css, /\.avatar-profile-link[\s\S]*border-radius: 999px/);
});
