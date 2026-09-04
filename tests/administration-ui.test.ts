import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
test("administration cards are full-surface links without nested anchors",()=>{const page=readFileSync("app/administration/page.tsx","utf8");const css=readFileSync("app/globals.css","utf8");assert.match(page,/className=\"panel admin-config-card\"/);assert.match(page,/href=\{`\/administration\/\$\{slug\}`\}/);assert.match(page,/className=\"admin-card-action\"/);assert.doesNotMatch(page,/admin-config-card[^>]*>[\s\S]*<Link/);assert.match(css,/admin-config-card:focus-visible/);assert.match(css,/cursor:pointer/);});
