import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("admin invitations use the dedicated implicit-flow acceptance route",()=>{const admin=readFileSync("lib/supabase/admin.ts","utf8");assert.match(admin,/auth\/invite/);assert.doesNotMatch(admin,/flow=invite/);});
test("invite page consumes fragment credentials, verifies identity, and sanitizes URL",()=>{const page=readFileSync("app/auth/invite/page.tsx","utf8");assert.match(page,/window\.location\.hash/);assert.match(page,/setSession/);assert.match(page,/getUser/);assert.match(page,/established\.data\.user\.id/);assert.match(page,/history\.replaceState/);assert.doesNotMatch(page,/console\.(log|error)/);});
test("server completion verifies SSR identity and clears stale organization context",()=>{const route=readFileSync("app/auth/invite/complete/route.ts","utf8");assert.match(route,/getUser/);assert.match(route,/ACTIVE_ORGANIZATION_COOKIE/);assert.match(route,/cookies\.delete/);});
test("expired implicit invite errors are sanitized",()=>{const page=readFileSync("app/auth/invite/page.tsx","utf8");assert.match(page,/Invitation link expired or is invalid/);assert.match(page,/Return to Sign In/);});
