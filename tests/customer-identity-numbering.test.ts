import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  "supabase/migrations/20260904100000_dm3iqcm_customer_identity_numbering.sql",
  "utf8",
);

test("customer numbering is organization, UTC year, and type scoped", () => {
  assert.match(sql, /primary key \(organization_id, calendar_year, customer_type\)/);
  assert.match(sql, /transaction_timestamp\(\) at time zone 'UTC'/);
  assert.match(sql, /on conflict \(organization_id, calendar_year, customer_type\)/);
  assert.match(sql, /returning next_number - 1 into allocated/);
  assert.match(sql, /when 'INDIVIDUAL' then 'I' else 'B'/);
  assert.match(sql, /lpad\(allocated::text, 3, '0'\)/);
});

test("customer creation validates identity data and owns protected fields", () => {
  assert.match(sql, /target_type is null or target_type not in \('INDIVIDUAL', 'BUSINESS'\)/);
  assert.match(sql, /normalized_email text := lower\(trim/);
  assert.match(sql, /invalid customer email/);
  assert.match(sql, /regexp_replace\(phone_source, '\[\^0-9\]', '', 'g'\)/);
  assert.match(sql, /length\(normalized_phone\) not in \(10, 11\)/);
  assert.match(sql, /actor uuid := auth\.uid\(\)/);
  assert.match(sql, /public\.next_customer_number\(target_organization_id, target_type\)/);
});

test("direct inserts are revoked and customer identity is immutable", () => {
  assert.match(sql, /revoke insert on public\.customers from authenticated/);
  assert.match(sql, /customers_protect_identity_fields/);
  for (const field of ["organization_id", "customer_number", "created_by_user_id", "created_at"])
    assert.match(sql, new RegExp(`new\\.${field} is distinct from old\\.${field}`));
  assert.doesNotMatch(sql, /update public\.customers set customer_number/);
});
