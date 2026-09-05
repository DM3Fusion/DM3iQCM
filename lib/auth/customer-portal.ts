import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const ACTIVE_PORTAL_ACCESS_COOKIE = "dm3iqcm-active-portal-access";
// Portal rows are extended by the deployed Supabase schema; keep this guard isolated from generated types.
export type PortalContextReason = "VALID" | "NO_ACTIVE_PORTAL_ACCESS" | "ACCOUNT_SELECTION_REQUIRED" | "INVALID_SELECTED_ACCESS" | "ORGANIZATION_NOT_FOUND" | "ORGANIZATION_INACTIVE" | "CUSTOMER_NOT_FOUND" | "CUSTOMER_INACTIVE" | "PORTAL_DISABLED" | "SETTINGS_LOOKUP_FAILED";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomerPortalContext = { user: { id: string; email?: string }; access: any; organization: any; customer: any; links: any[]; settings: any; reason: PortalContextReason };

export async function getCustomerPortalContext(): Promise<CustomerPortalContext | null> {
  const trace = (payload: Record<string, unknown>) => console.info("[DM3IQCM_PORTAL_CONTEXT]", payload);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: links, error } = await supabase.from("customer_portal_users").select("*").eq("user_id", user.id).eq("is_active", true);
  const activeLinks = links ?? [];
  if (error || !activeLinks.length) { trace({ userId: user.id, activeLinkCount: activeLinks.length, selectedPortalAccessId: null, resolvedAccessId: null, finalReason: "NO_ACTIVE_PORTAL_ACCESS" }); return { user, access: null, organization: null, customer: null, links: [], settings: null, reason: "NO_ACTIVE_PORTAL_ACCESS" }; }
  const selected = (await cookies()).get(ACTIVE_PORTAL_ACCESS_COOKIE)?.value;
  const access = activeLinks.find((link) => link.id === selected) ?? (activeLinks.length === 1 ? activeLinks[0] : null);
  trace({ userId: user.id, activeLinkCount: activeLinks.length, selectedPortalAccessId: selected ?? null, resolvedAccessId: access?.id ?? null, resolvedOrganizationId: access?.organization_id ?? null, resolvedCustomerId: access?.customer_id ?? null });
  if (!access) { trace({ userId: user.id, activeLinkCount: activeLinks.length, selectedPortalAccessId: selected ?? null, resolvedAccessId: null, finalReason: "ACCOUNT_SELECTION_REQUIRED" }); return { user, access: null, organization: null, customer: null, links: activeLinks, settings: null, reason: "ACCOUNT_SELECTION_REQUIRED" }; }
  const admin = createAdminClient();
  const [{ data: organization, error: organizationError }, { data: customer, error: customerError }, { data: settings, error: settingsError }] = await Promise.all([
    admin.from("organizations").select("*").eq("id", access.organization_id).eq("status", "ACTIVE").maybeSingle(),
    admin.from("customers").select("*").eq("id", access.customer_id).eq("organization_id", access.organization_id).eq("status", "ACTIVE").maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("organization_settings").select("portal_enabled,portal_submission_enabled,portal_show_priority").eq("organization_id", access.organization_id).maybeSingle(),
  ]);
  const base = { userId: user.id, activeLinkCount: activeLinks.length, selectedPortalAccessId: selected ?? null, resolvedAccessId: access.id, resolvedOrganizationId: access.organization_id, resolvedCustomerId: access.customer_id, organizationError: Boolean(organizationError), organizationErrorCode: organizationError?.code ?? null, organizationErrorMessage: organizationError?.message ?? null, organizationErrorDetails: organizationError?.details ?? null, organizationErrorHint: organizationError?.hint ?? null, organizationFound: Boolean(organization), organizationStatus: organization?.status ?? null, customerError: Boolean(customerError), customerErrorCode: customerError?.code ?? null, customerErrorMessage: customerError?.message ?? null, customerErrorDetails: customerError?.details ?? null, customerErrorHint: customerError?.hint ?? null, customerFound: Boolean(customer), customerStatus: customer?.status ?? null, settingsError: Boolean(settingsError), settingsErrorCode: settingsError?.code ?? null, settingsErrorMessage: settingsError?.message ?? null, settingsErrorDetails: settingsError?.details ?? null, settingsErrorHint: settingsError?.hint ?? null, settingsFound: Boolean(settings), rawPortalEnabled: settings?.portal_enabled ?? null, rawPortalSubmissionEnabled: settings?.portal_submission_enabled ?? null, rawPortalShowPriority: settings?.portal_show_priority ?? null };
  if (organizationError || !organization) { trace({ ...base, finalReason: "ORGANIZATION_NOT_FOUND" }); return { user, access: null, organization: null, customer: null, links: activeLinks, settings: null, reason: "ORGANIZATION_NOT_FOUND" }; }
  if (organization.status !== "ACTIVE") { trace({ ...base, finalReason: "ORGANIZATION_INACTIVE" }); return { user, access: null, organization, customer: null, links: activeLinks, settings: null, reason: "ORGANIZATION_INACTIVE" }; }
  if (customerError || !customer) { trace({ ...base, finalReason: "CUSTOMER_NOT_FOUND" }); return { user, access: null, organization, customer: null, links: activeLinks, settings: null, reason: "CUSTOMER_NOT_FOUND" }; }
  if (customer.status !== "ACTIVE") { trace({ ...base, finalReason: "CUSTOMER_INACTIVE" }); return { user, access: null, organization, customer, links: activeLinks, settings: null, reason: "CUSTOMER_INACTIVE" }; }
  if (settingsError) { trace({ ...base, finalReason: "SETTINGS_LOOKUP_FAILED" }); return { user, access: null, organization, customer, links: activeLinks, settings: null, reason: "SETTINGS_LOOKUP_FAILED" }; }
  const effectiveSettings = settings ?? { portal_enabled: true, portal_submission_enabled: true, portal_show_priority: true };
  if (effectiveSettings.portal_enabled === false) { trace({ ...base, effectivePortalEnabled: effectiveSettings.portal_enabled, finalReason: "PORTAL_DISABLED" }); return { user, access: null, organization, customer, links: activeLinks, settings: effectiveSettings, reason: "PORTAL_DISABLED" }; }
  trace({ ...base, effectivePortalEnabled: effectiveSettings.portal_enabled, finalReason: "VALID" });
  return { user, access, organization, customer, links: activeLinks, settings: effectiveSettings, reason: "VALID" };
}

export async function requireCustomerPortalContext(): Promise<CustomerPortalContext> {
  const context = await getCustomerPortalContext();
  if (!context?.access) redirect(context?.reason === "ACCOUNT_SELECTION_REQUIRED" ? "/portal/select-account" : "/account/unprovisioned");
  return context;
}
