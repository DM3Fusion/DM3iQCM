grant select
on public.service_requests,
   public.customer_portal_users,
   public.organization_members
to service_role;

drop policy if exists service_request_communications_select
on public.service_request_communications;

create policy service_request_communications_select
on public.service_request_communications
for select
to authenticated
using (
  public.can_access_service_request(
    service_request_id,
    organization_id,
    auth.uid()
  )
);

comment on table public.service_request_communications is
  'Internal communication and notification delivery history; authenticated internal reads follow service-request access while trusted server-side notification services use service_role for recipient resolution and persistence.';
