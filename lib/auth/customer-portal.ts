import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const ACTIVE_PORTAL_ACCESS_COOKIE = "dm3iqcm-active-portal-access";
// Portal rows are extended by the deployed Supabase schema; keep this guard isolated from generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomerPortalContext = { user: { id: string; email?: string }; access: any; organization: any; customer: any; links: any[]; settings: any };

export async function getCustomerPortalContext(): Promise<CustomerPortalContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: links, error } = await supabase.from("customer_portal_users").select("*").eq("user_id", user.id).eq("is_active", true);
  if (error || !links?.length) return null;
  const selected = (await cookies()).get(ACTIVE_PORTAL_ACCESS_COOKIE)?.value;
  const access = links.find((link) => link.id === selected) ?? (links.length === 1 ? links[0] : null);
  if (!access) return { user, access: null, organization: null, customer: null, links, settings: null };
  const admin = createAdminClient();
  const [{ data: organization }, { data: customer }, { data: settings }] = await Promise.all([
    admin.from("organizations").select("*").eq("id", access.organization_id).eq("status", "ACTIVE").maybeSingle(),
    admin.from("customers").select("*").eq("id", access.customer_id).eq("organization_id", access.organization_id).eq("status", "ACTIVE").maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("organization_settings").select("portal_enabled,portal_submission_enabled,portal_show_priority").eq("organization_id", access.organization_id).maybeSingle(),
  ]);
  if (!organization || !customer || settings?.portal_enabled === false) return { user, access: null, organization: null, customer: null, links, settings };
  return { user, access, organization, customer, links, settings: settings ?? { portal_enabled: true, portal_submission_enabled: true, portal_show_priority: true } };
}

export async function requireCustomerPortalContext(): Promise<CustomerPortalContext> {
  const context = await getCustomerPortalContext();
  if (!context?.access) redirect(context?.links?.length ? "/portal/select-account" : "/account/unprovisioned");
  return context;
}
