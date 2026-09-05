import { getCustomerPortalContext } from "@/lib/auth/customer-portal";
import { redirect } from "next/navigation";
import PortalNav from "@/components/portal-nav";
import type { Viewport } from "next";

export const viewport: Viewport = { viewportFit: "cover" };

function PortalHeader({ hasMultipleAccounts, enabled = true }: { hasMultipleAccounts: boolean; enabled?: boolean }) {
  return <header className="portal-header"><div><strong>DM3iQ™</strong><small>Customer Portal</small></div><PortalNav hasMultipleAccounts={hasMultipleAccounts} enabled={enabled} /></header>;
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const context = await getCustomerPortalContext();
  if (!context?.links?.length || context.reason === "NO_ACTIVE_PORTAL_ACCESS") redirect("/account/unprovisioned");
  if (context.reason === "ACCOUNT_SELECTION_REQUIRED") redirect("/portal/select-account");
  if (!context.access) return <><PortalHeader hasMultipleAccounts={false} enabled={false} /><main className="portal-main"><section className="portal-panel"><h1>{context.reason === "PORTAL_DISABLED" ? "Portal unavailable" : "Portal temporarily unavailable"}</h1><p>This customer portal is currently unavailable for the selected organization.</p></section></main></>;
  return <><PortalHeader hasMultipleAccounts={context.links.length > 1} /><main className="portal-main">{children}</main></>;
}
