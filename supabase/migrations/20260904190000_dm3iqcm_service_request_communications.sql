create table if not exists public.service_request_communications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  service_request_id uuid not null,
  communication_type text not null check (communication_type in ('PORTAL_MESSAGE','EMAIL_NOTIFICATION')),
  channel text not null check (channel in ('PORTAL','EMAIL')),
  direction text not null check (direction in ('INBOUND','OUTBOUND')),
  actor_user_id uuid null references public.profiles(id),
  recipient_user_id uuid null references public.profiles(id),
  recipient_email text null,
  subject text null,
  status text not null check (status in ('RECORDED','PENDING','SENT','FAILED')),
  related_message_id uuid null references public.service_request_messages(id),
  error_code text null,
  error_summary text null,
  created_at timestamptz not null default now(),
  delivered_at timestamptz null,
  constraint service_request_communications_request_fk foreign key (organization_id, service_request_id) references public.service_requests(organization_id, id) on delete cascade
);
create unique index if not exists service_request_communications_portal_message_key on public.service_request_communications(related_message_id, communication_type) where related_message_id is not null and communication_type = 'PORTAL_MESSAGE';
create unique index if not exists service_request_communications_email_recipient_key on public.service_request_communications(related_message_id, communication_type, lower(recipient_email)) where related_message_id is not null and communication_type = 'EMAIL_NOTIFICATION' and recipient_email is not null;
create index if not exists service_request_communications_request_idx on public.service_request_communications(organization_id, service_request_id, created_at asc, id asc);
alter table public.service_request_communications enable row level security;
create policy service_request_communications_select on public.service_request_communications for select to authenticated using (public.can_manage_service_request(service_request_id, organization_id, auth.uid()));
revoke all on public.service_request_communications from public, anon, authenticated;
grant select on public.service_request_communications to authenticated;
comment on table public.service_request_communications is 'Internal communication and notification delivery history; customer portal users cannot read this table.';
