import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export interface PlatformSummary {
  organizations: number;
  activeOrganizations: number;
  platformAdministrators: number;
}

export async function getPlatformSummary(): Promise<PlatformSummary> {
  const access = await getAccessContext();
  if (!access?.isSuperAdmin) redirect("/account/unprovisioned");

  const supabase = await createClient();
  const [organizations, activeOrganizations, platformAdministrators] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from("platform_user_roles").select("id", { count: "exact", head: true }).eq("role", "SUPER_ADMIN").eq("is_active", true),
  ]);
  const error = organizations.error ?? activeOrganizations.error ?? platformAdministrators.error;
  if (error) {
    console.error("Platform summary query failed", { code: error.code, message: error.message });
    throw new Error("Platform administration data is temporarily unavailable.");
  }
  return {
    organizations: organizations.count ?? 0,
    activeOrganizations: activeOrganizations.count ?? 0,
    platformAdministrators: platformAdministrators.count ?? 0,
  };
}
