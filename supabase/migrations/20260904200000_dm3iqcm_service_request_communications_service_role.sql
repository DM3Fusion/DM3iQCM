grant select, insert, update
on public.service_request_communications
to service_role;

comment on table public.service_request_communications is
  'Internal communication and notification delivery history; authenticated internal reads remain RLS-scoped while trusted server-side communication services use service_role for persistence.';
