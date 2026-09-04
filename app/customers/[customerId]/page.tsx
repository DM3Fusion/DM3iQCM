import { notFound } from "next/navigation";
import { Badge, PageHeader } from "@/components/ui";
import { getAccessContext } from "@/lib/auth/context";
import { hasTenantInternalAccess } from "@/lib/auth/access-routing";
import { createClient } from "@/lib/supabase/server";
import { formatPhone } from "@/lib/format-phone";
import Link from "next/link";

export default async function Page({ params, searchParams }: { params: Promise<{ customerId: string }>; searchParams: Promise<{ message?: string }> }) {
  const [{ customerId }, query, access] = await Promise.all([params, searchParams, getAccessContext()]);
  if (!access || !hasTenantInternalAccess(access) || !access.activeOrganization) notFound();
  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("*").eq("id", customerId).eq("organization_id", access.activeOrganization.id).maybeSingle();
  if (!customer) notFound();
  const [{ data: creator }, { data: cases }] = await Promise.all([
    customer.created_by_user_id ? supabase.from("profiles").select("*").eq("id", customer.created_by_user_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("cases").select("id,status").eq("organization_id", access.activeOrganization.id).eq("customer_id", customer.id),
  ]);
  const openCases = (cases ?? []).filter((item) => !["COMPLETED", "CLOSED", "CANCELLED"].includes(item.status)).length;
  return <><PageHeader eyebrow="Relationships" title={customer.name} description="Customer record and creation history." action={<Link className="primary-button" href={`/customers/${customer.id}/edit`}>Edit Customer</Link>}/>{query.message?<div className="success-alert page-notice">{query.message}</div>:null}<section className="panel detail-section"><div className="section-head"><div><h2>{customer.customer_number}</h2><p>{customer.type}</p></div><Badge value={customer.status}/></div><dl className="detail-facts"><div><dt>Name</dt><dd>{customer.name}</dd></div><div><dt>Email</dt><dd>{customer.email ?? "—"}</dd></div><div><dt>Phone</dt><dd>{formatPhone(customer.phone)}</dd></div>{customer.notes ? <div><dt>Notes</dt><dd>{customer.notes}</dd></div> : null}<div><dt>Open cases</dt><dd>{openCases}</dd></div><div><dt>Last activity</dt><dd>{new Date(customer.updated_at).toLocaleString()}</dd></div><div><dt>Created by</dt><dd>{creator?.display_name || creator?.email || "Unknown user"}</dd></div><div><dt>Created</dt><dd>{new Date(customer.created_at).toLocaleString()}</dd></div></dl></section><Link className="auth-link" href="/customers">← All customers</Link></>;
}
