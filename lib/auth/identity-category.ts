import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
export type IdentityCategory = "INTERNAL" | "CUSTOMER_PORTAL" | "NONE";
export async function getIdentityCategory(userId: string): Promise<IdentityCategory> {
  const db = createAdminClient();
  const [{ data: platform }, { data: memberships }, { data: portal }] = await Promise.all([
    db.from("platform_user_roles").select("id").eq("user_id", userId).eq("role", "SUPER_ADMIN").eq("is_active", true).limit(1),
    db.from("organization_members").select("id").eq("user_id", userId).eq("is_active", true).limit(1),
    db.from("customer_portal_users").select("id").eq("user_id", userId).eq("is_active", true).limit(1),
  ]);
  if (platform?.length || memberships?.length) return "INTERNAL";
  if (portal?.length) return "CUSTOMER_PORTAL";
  return "NONE";
}
