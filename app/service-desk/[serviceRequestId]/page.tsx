import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Badge } from "@/components/ui";
import { getLiveOrganizationData, displayName, type ServiceRequestActivityRow } from "@/lib/data/case-repository";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/auth/context";
import { ServiceRequestEditControls } from "@/components/service-request-edit-controls";
import { serviceRequestLabel } from "@/lib/service-request-format";
import { createInternalServiceRequestMessageAction } from "@/lib/data/service-request-actions";

export const metadata = { title: "Service Request" };

const storedValue = (value: unknown) => typeof value === "string" ? value : value == null ? null : String(value);
const transitionText = (activity: ServiceRequestActivityRow & { actor_display_name: string | null; actor_email: string | null }, staffById: Map<string, string>) => {
  if (!["STATUS_CHANGED", "PRIORITY_CHANGED", "ASSIGNMENT_CHANGED"].includes(activity.event_type)) return null;
  const previous = storedValue(activity.previous_value);
  const next = storedValue(activity.new_value);
  if (activity.event_type === "ASSIGNMENT_CHANGED") return `${previous ? staffById.get(previous) ?? "Unknown" : "Unassigned"} → ${next ? staffById.get(next) ?? "Unknown" : "Unassigned"}`;
  return `${previous ? serviceRequestLabel(previous) : "Unknown"} → ${next ? serviceRequestLabel(next) : "Unknown"}`;
};

export default async function Page({ params, searchParams }: { params: Promise<{ serviceRequestId: string }>; searchParams?: Promise<{ error?: string }> }) {
  const [{ serviceRequestId }, data, access, query] = await Promise.all([params, getLiveOrganizationData(), getAccessContext(), searchParams ?? Promise.resolve({ error: undefined as string | undefined })]);
  const item = data.serviceRequests.find((request) => request.id === serviceRequestId);
  if (!item) notFound();
  const assignees = data.staff.filter((staff) => ["BUSINESS_OWNER", "BUSINESS_ADMIN", "STAFF_MANAGER", "STAFF_USER"].includes(staff.membership.role)).map((staff) => ({ id: staff.profile.id, name: displayName(staff.profile) }));
  const staffById = new Map(data.staff.map((staff) => [staff.profile.id, displayName(staff.profile)]));
  const assignmentRoles = ["BUSINESS_OWNER", "BUSINESS_ADMIN", "STAFF_MANAGER"];
  const canAssign = Boolean(access?.isSuperAdmin || assignmentRoles.includes(access?.activeOrganization?.role ?? "") || data.staff.some((staff) => staff.profile.id === access?.user.id && assignmentRoles.includes(staff.membership.role)));
  const supabase = await createClient();
  const { data: messages } = await supabase.from("service_request_messages" as never).select("id,author_user_id,author_type,body,created_at").eq("organization_id", item.organization_id).eq("service_request_id", item.id).order("created_at", { ascending: true }).order("id", { ascending: true });
  const canReply = Boolean(access?.isSuperAdmin || assignmentRoles.includes(access?.activeOrganization?.role ?? "") || data.staff.some((staff) => staff.profile.id === access?.user.id && (staff.membership.role === "STAFF_USER" ? staff.profile.id === item.assigned_user_id : assignmentRoles.includes(staff.membership.role))));
  const activityResult = await supabase.rpc("get_service_request_detail_activity" as never, { target_service_request_id: item.id } as never);
  const activityRows = (activityResult as unknown as { data: Array<ServiceRequestActivityRow & { created_by_user_id: string | null; creator_display_name: string | null; creator_email: string | null; actor_display_name: string | null; actor_email: string | null; activity_id: string | null }> | null }).data ?? [];
  const creator = activityRows[0];
  const activities = activityRows.filter((activity) => activity.activity_id).map((activity) => ({ ...activity, id: activity.activity_id as string }));
  const conversationMessages = (messages as unknown as Array<{ id:string; author_user_id:string|null; author_type:string; body:string; created_at:string }> | null) ?? [];
  const { error: replyError } = query;
  return <>
    <PageHeader eyebrow="Customer Service" title={item.subject} description={item.request_number} action={<div className="detail-badges"><Badge value={item.status} /><Badge value={item.priority} /></div>} />
    <section className="panel detail-section service-request-conversation"><h2>Conversation</h2><article className="service-request-message service-request-message-customer"><div className="service-request-message-meta"><strong>{item.customer?.name ?? "Customer"}</strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></div><p>{item.description}</p></article>{conversationMessages.map((message) => <article className={`service-request-message service-request-message-${message.author_type.toLowerCase()}`} key={message.id}><div className="service-request-message-meta"><strong>{message.author_type === "CUSTOMER" ? item.customer?.name ?? "Customer" : staffById.get(message.author_user_id ?? "") ?? "Organization staff"}</strong><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time>{message.author_type === "STAFF" && <span>Staff</span>}</div><p>{message.body}</p></article>)}{canReply && <form action={createInternalServiceRequestMessageAction} className="service-request-reply entity-form"><input type="hidden" name="serviceRequestId" value={item.id}/>{replyError && <div className="form-alert" role="alert">{replyError}</div>}<label><span>Reply to customer</span><textarea name="body" rows={5} required maxLength={4000} placeholder="Write a response to the customer…"/></label><button className="primary-button" type="submit">Send Reply</button></form>}</section>
    <div className="detail-grid">
      <section className="panel detail-section"><h2>Request details</h2><dl className="detail-facts">
        <div><dt>Customer</dt><dd><Link className="case-link" href={`/customers/${item.customer_id}`}>{item.customer?.customer_number} — {item.customer?.name}</Link></dd></div>
        <div><dt>Assigned To</dt><dd>{displayName(item.assigned)}</dd></div>
        <div><dt>Created By</dt><dd>{creator?.creator_display_name || creator?.creator_email || creator?.created_by_user_id || "Unknown / Historical"}</dd></div>
        <div><dt>Created</dt><dd>{new Date(item.created_at).toLocaleString()}</dd></div>
        <div><dt>Last Updated</dt><dd>{new Date(item.updated_at).toLocaleString()}</dd></div>
        <div className="full"><dt>Description</dt><dd className="description">{item.description}</dd></div>
      </dl><ServiceRequestEditControls requestId={item.id} initial={{ status: item.status, priority: item.priority, assignedUserId: item.assigned_user_id ?? "" }} assignees={assignees} canAssign={canAssign} /></section>
      <aside className="panel detail-section"><h2>Activity</h2>{activities.length ? <div className="activity-list">{activities.map((activity) => { const actorLabel = activity.actor_display_name || activity.actor_email || activity.actor_user_id || "System"; const transition = transitionText(activity, staffById); return <article key={activity.id}><span className="activity-dot">•</span><div><p>{activity.event_type.replaceAll("_", " ")}</p><span>{actorLabel} · {new Date(activity.occurred_at).toLocaleString()}</span>{transition && <small className="activity-transition">{transition}</small>}</div></article>; })}</div> : <p className="muted">No activity recorded yet.</p>}</aside>
    </div><Link className="auth-link" href="/service-desk">← All service requests</Link>
  </>;
}
