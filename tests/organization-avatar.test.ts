import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { organizationInitials, isOwnedOrganizationAvatarPath, isOwnedOrganizationAvatarSourcePath } from "../lib/profile/avatar.ts";

const org = "11111111-1111-4111-8111-111111111111";
test("organization initials are deterministic", () => {
  assert.equal(organizationInitials("Mimms' Tax Service"), "MTS");
  assert.equal(organizationInitials("DM3 Fusion"), "DF");
  assert.equal(organizationInitials(""), "O");
});
test("organization avatar paths are organization scoped and WebP-only", () => {
  assert.equal(isOwnedOrganizationAvatarPath(`${org}/avatar-22222222-2222-4222-8222-222222222222.webp`, org), true);
  assert.equal(isOwnedOrganizationAvatarPath(`${org}/avatar-22222222-2222-4222-8222-222222222222.png`, org), false);
  assert.equal(isOwnedOrganizationAvatarSourcePath(`${org}/source-22222222-2222-4222-8222-222222222222.png`, org), true);
  assert.equal(isOwnedOrganizationAvatarSourcePath(`33333333-3333-4333-8333-333333333333/source-22222222-2222-4222-8222-222222222222.png`, org), false);
});
test("organization avatar flow uses private buckets and role-gated server actions", () => {
  const migration = readFileSync("supabase/migrations/20260904060000_dm3iqcm_organization_avatar_storage.sql", "utf8");
  const action = readFileSync("lib/data/organization-avatar-actions.ts", "utf8");
  assert.match(migration, /organization-avatar-sources/);
  assert.match(migration, /organization-avatars/);
  assert.match(migration, /public\.has_organization_role/);
  assert.match(action, /BUSINESS_OWNER.*BUSINESS_ADMIN/);
  assert.match(action, /image\/webp/);
  assert.doesNotMatch(action, /SERVICE_ROLE_KEY/);
});
