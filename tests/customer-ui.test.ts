import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatPhone } from "../lib/format-phone.ts";

test("customer phone display formatting is safe and presentation-only", () => {
  assert.equal(formatPhone("2401234321"), "(240) 123-4321");
  assert.equal(formatPhone("13015551212"), "+1 (301) 555-1212");
  assert.equal(formatPhone(null), "—");
  assert.equal(formatPhone("legacy phone"), "legacy phone");
});

test("customer creation exposes only valid types and required contact fields", () => {
  const page = readFileSync("app/customers/new/page.tsx", "utf8");
  const form = readFileSync("components/customer-form.tsx", "utf8");
  const action = readFileSync("lib/data/case-actions.ts", "utf8");
  assert.match(form, /INDIVIDUAL/);
  assert.match(form, /BUSINESS/);
  assert.doesNotMatch(form, /ORGANIZATION/);
  assert.match(form, /name=\{key\} type=\{type\} required/);
  assert.match(form, /field\("email","Email","email"\)/);
  assert.match(form, /field\("phone","Phone","tel"\)/);
  assert.match(page, /CustomerForm/);
  assert.match(action, /type!=="INDIVIDUAL"&&type!=="BUSINESS"/);
  assert.match(action, /emailPattern/);
  assert.match(action, /normalizePhone/);
  assert.match(action, /supabase\.rpc\("create_customer_record"/);
  assert.doesNotMatch(action, /target_customer_number/);
  assert.doesNotMatch(action, /target_created_by_user_id/);
});

test("customer register uses full-row navigation and detail preserves historical identity", () => {
  const register = readFileSync("app/customers/page.tsx", "utf8");
  const detail = readFileSync("app/customers/[customerId]/page.tsx", "utf8");
  assert.match(register, /NavigableRow/);
  assert.match(register, /`\/customers\/\$\{customer\.id\}`/);
  assert.match(detail, /customer\.customer_number/);
  assert.match(detail, /customer\.type/);
  assert.match(detail, /customer\.created_at/);
  assert.match(detail, /created_by_user_id/);
  assert.match(detail, /Unknown user/);
  assert.match(detail, /customer\.updated_at/);
});
