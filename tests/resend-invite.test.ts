import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("resend invite reuses canonical invite callback and existing Auth identity",()=>{const action=readFileSync("lib/data/user-invitation-actions.ts","utf8");assert.match(action,/getUserById/);assert.match(action,/inviteUserByEmail/);assert.match(action,/getInvitationRedirect/);assert.match(action,/email_confirmed_at/);});
test("resend invite is role and organization scoped",()=>{const action=readFileSync("lib/data/user-invitation-actions.ts","utf8");assert.match(action,/BUSINESS_OWNER.*BUSINESS_ADMIN/);assert.match(action,/organization_members/);assert.match(action,/not authorized/);});
