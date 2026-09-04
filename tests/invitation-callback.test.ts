import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("invitation redirect is explicitly marked and callback replaces stale local session", () => {
  const admin = readFileSync("lib/supabase/admin.ts", "utf8");
  const callback = readFileSync("app/auth/callback/route.ts", "utf8");
  assert.match(admin, /auth\/callback\?flow=invite/);
  assert.match(callback, /flow.*invite/);
  assert.match(callback, /createServerClient/);
  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /getUser/);
  assert.match(callback, /ACTIVE_ORGANIZATION_COOKIE/);
});
test("invitation errors use clean user-facing messaging", () => {
  const callback = readFileSync("app/auth/callback/route.ts", "utf8");
  assert.match(callback, /Invitation%20link%20expired%20or%20is%20invalid/);
  assert.doesNotMatch(callback, /access_token|refresh_token/);
});
