import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260904110000_dm3iqcm_service_desk_foundation.sql",
  "utf8",
);
const permissionMigration = readFileSync(
  "supabase/migrations/20260904120000_dm3iqcm_fix_service_request_rls_function_permissions.sql",
  "utf8",
);

test("service desk foundation preserves history and adds approved statuses", () => {
  assert.match(migration, /add value if not exists 'ON_HOLD'/);
  assert.match(migration, /PENDING_STAFF/);
  assert.match(migration, /add column if not exists created_by_user_id uuid null/);
  assert.match(migration, /service_request_status[\s\S]*PENDING_STAFF/);
});

test("service request numbering is annual, scoped, atomic, and RPC-owned", () => {
  assert.match(migration, /organization_service_request_annual_number_counters/);
  assert.match(migration, /primary key \(organization_id, calendar_year\)/i);
  assert.match(migration, /on conflict\(organization_id,calendar_year\) do update/i);
  assert.match(migration, /returning last_number into allocated/);
  assert.match(migration, /SR-' \|\| year_value/);
  assert.doesNotMatch(migration, /select max\(/i);
  assert.doesNotMatch(migration, /assign_service_request_number|service_requests_assign_number/);
  assert.match(migration, /request_number:=public\.allocate_service_request_number/);
});

test("activity rows retain a tenant-preserving composite foreign key", () => {
  assert.match(migration, /service_requests_organization_id_id_key[\s\S]*unique \(organization_id, id\)/i);
  assert.match(migration, /foreign key \(organization_id, service_request_id\)[\s\S]*references public\.service_requests\(organization_id, id\)/i);
});

test("service request RPCs enforce identity, tenant, assignment, and activity rules", () => {
  for (const fn of [
    "create_service_request",
    "update_service_request_status",
    "update_service_request_priority",
    "set_service_request_assignment",
  ]) assert.match(migration, new RegExp(`function public\\.${fn}\\(`));
  assert.match(migration, /created_by_user_id,created_at,updated_at/);
  assert.match(migration, /invalid customer/);
  assert.match(migration, /invalid service request assignee/);
  assert.match(migration, /role in \('BUSINESS_OWNER','BUSINESS_ADMIN','STAFF_MANAGER','STAFF_USER'\)/);
  assert.match(migration, /PENDING_STAFF is historical/);
  assert.match(migration, /service_request_activity/);
  assert.match(migration, /STATUS_CHANGED/);
  assert.match(migration, /PRIORITY_CHANGED/);
  assert.match(migration, /ASSIGNMENT_CHANGED/);
});

test("service request direct writes are revoked and RLS mirrors case visibility", () => {
  assert.match(migration, /revoke insert,update,delete on public\.service_requests from authenticated/);
  assert.match(migration, /revoke insert,update,delete on public\.service_request_activity from authenticated/);
  assert.match(migration, /service_requests_select on public\.service_requests/);
  assert.match(migration, /service_request_activity_select/);
  assert.match(migration, /r\.assigned_user_id=target_user_id/);
  assert.match(migration, /service request identity fields are immutable/);
});

test("service request RLS helper grants only authenticated execution", () => {
  assert.match(permissionMigration, /grant execute on function public\.can_access_service_request\(uuid, uuid, uuid\)/i);
  assert.match(permissionMigration, /to authenticated/);
  assert.doesNotMatch(permissionMigration, /to anon|all functions/i);
  assert.match(migration, /service_requests_select[\s\S]*can_access_service_request/);
  assert.match(migration, /revoke insert,update,delete on public\.service_requests from authenticated/);
});

test("service request detail identity RPC is narrowly secured", () => {
  const identityMigration = readFileSync("supabase/migrations/20260904130000_dm3iqcm_service_request_identity_resolution.sql", "utf8");
  assert.match(identityMigration, /get_service_request_detail_activity\(target_service_request_id uuid\)/);
  assert.match(identityMigration, /security definer/);
  assert.match(identityMigration, /set search_path = ''/);
  assert.match(identityMigration, /can_access_service_request\(target_service_request_id, target_organization_id, actor\)/);
  assert.match(identityMigration, /creator_display_name/);
  assert.match(identityMigration, /actor_display_name/);
  assert.match(identityMigration, /previous_value/);
  assert.match(identityMigration, /new_value/);
  assert.match(identityMigration, /occurred_at/);
  assert.match(identityMigration, /revoke all on function public\.get_service_request_detail_activity\(uuid\) from public, anon/);
  assert.match(identityMigration, /grant execute on function public\.get_service_request_detail_activity\(uuid\) to authenticated/);
});
