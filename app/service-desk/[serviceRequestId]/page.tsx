import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Badge } from "@/components/ui";
import { getLiveOrganizationData, displayName, type ProfileRow, type ServiceRequestActivityRow } from "@/lib/data/case-repository";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/auth/context";
import { ServiceRequestEditControls } from "@/components/service-request-edit-controls";

export const metadata = { title: "Service Request" };

export default async function Page({ params }: { params: Promise<{ serviceRequestId: string }> }) {
  const [{ serviceRequestId }, data, access] = await Promise.all([params, getLiveOrganizationData(), getAccessContext()]);
  const item = data.serviceRequests.find((request) => request.id === serviceRequestId);
  if (!item) notFound();
  const assignees = data.staff.filter((staff) => ["BUSINESS_OWNER", "BUSINESS_ADMIN", "STAFF_MANAGER", "STAFF_USER"].includes(staff.membership.role)).map((staff) => ({ id: staff.profile.id, name: displayName(staff.profile) }));
  const canAssign = Boolean(access?.isSuperAdmin || ["BUSINESS_OWNER", "BUSINESS_ADMIN", "STAFF_MANAGER"].includes(access?.activeOrganization?.role ?? ""));
  const supabase = await createClient();
  const activityResult = await supabase.from("service_request_activity" as never).select("*").eq("service_request_id", item.id).order("occurred_at", { ascending: false });
  const activities = (activityResult as unknown as { data: ServiceRequestActivityRow[] | null }).data ?? [];
  const actorIds = [...new Set(activities.flatMap((activity) => activity.actor_user_id ? [activity.actor_user_id] : []))];
  const actorResult = actorIds.length ? await supabase.from("profiles").select("*").in("id", actorIds) : { data: [], error: null };
  const actors = new Map(((actorResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  return <>
    <PageHeader eyebrow="Customer Service" title={item.subject} description={item.request_number} action={<div className="detail-badges"><Badge value={item.status} /><Badge value={item.priority} /></div>} />
    <div className="detail-grid">
      <section className="panel detail-section"><h2>Request details</h2><dl className="detail-facts">
        <div><dt>Customer</dt><dd><Link className="case-link" href={`/customers/${item.customer_id}`}>{item.customer?.customer_number} — {item.customer?.name}</Link></dd></div>
        <div><dt>Assigned To</dt><dd>{displayName(item.assigned)}</dd></div>
        <div><dt>Created By</dt><dd>{item.creator ? displayName(item.creator) : "Unknown / Historical"}</dd></div>
        <div><dt>Created</dt><dd>{new Date(item.created_at).toLocaleString()}</dd></div>
        <div><dt>Last Updated</dt><dd>{new Date(item.updated_at).toLocaleString()}</dd></div>
        <div className="full"><dt>Description</dt><dd className="description">{item.description}</dd></div>
      </dl><ServiceRequestEditControls requestId={item.id} initial={{ status: item.status, priority: item.priority, assignedUserId: item.assigned_user_id ?? "" }} assignees={assignees} canAssign={canAssign} /></section>
      <aside className="panel detail-section"><h2>Activity</h2>{activities.length ? <div className="activity-list">{activities.map((activity) => { const actor = activity.actor_user_id ? actors.get(activity.actor_user_id) : null; const actorLabel = actor ? displayName(actor) : activity.actor_user_id ?? "System"; return <article key={activity.id}><span className="activity-dot">•</span><div><p>{activity.event_type.replaceAll("_", " ")}</p><span>{actorLabel} · {new Date(activity.occurred_at).toLocaleString()}</span></div></article>; })}</div> : <p className="muted">No activity recorded yet.</p>}</aside>
    </div><Link className="auth-link" href="/service-desk">← All service requests</Link>
  </>;
}
