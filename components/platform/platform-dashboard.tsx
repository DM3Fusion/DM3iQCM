import { Building2, Building, ShieldCheck } from "lucide-react";
import type { PlatformSummary } from "@/lib/data/platform-repository";

export function PlatformDashboard({ summary }: { summary: PlatformSummary }) {
  const metrics = [
    { label: "Organizations", value: summary.organizations, icon: Building2, tone: "blue" },
    { label: "Active Organizations", value: summary.activeOrganizations, icon: Building, tone: "green" },
    { label: "Platform Administrators", value: summary.platformAdministrators, icon: ShieldCheck, tone: "violet" },
  ];
  return <>
    <div className="platform-role"><ShieldCheck aria-hidden/><span>SUPER ADMIN</span></div>
    <div className="metric-grid platform-metrics">{metrics.map(({ label, value, icon: Icon, tone }) => <article className={`metric tone-${tone}`} key={label}><div><span>{label}</span><strong>{value}</strong></div><span className="metric-icon"><Icon aria-hidden/></span><small>Live platform data</small></article>)}</div>
    {summary.organizations === 0 ? <section className="panel empty platform-empty"><span className="empty-icon"><Building2 aria-hidden/></span><h2>No organizations yet</h2><p>Create or provision the first business organization to begin organization-level case management.</p><span className="foundation-tag">Organization provisioning is not yet available in this milestone</span></section> : <section className="panel platform-ready"><div className="section-head"><div><h2>Organization workspaces</h2><p>Select an active organization from the platform context control to enter its operational workspace.</p></div></div></section>}
  </>;
}
