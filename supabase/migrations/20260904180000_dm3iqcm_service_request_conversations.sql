-- DM3iQCM-07E: durable Service Request conversation messages.
-- The original request description remains the opening customer communication;
-- only subsequent replies are stored in this table.

create table if not exists public.service_request_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  service_request_id uuid not null,
  author_user_id uuid not null references public.profiles(id),
  author_type text not null check (author_type in ('CUSTOMER', 'STAFF')),
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  foreign key (organization_id, service_request_id)
    references public.service_requests(organization_id, id) on delete cascade
);

create index if not exists service_request_messages_timeline_idx
  on public.service_request_messages(service_request_id, created_at asc, id asc);
create index if not exists service_request_messages_org_idx
  on public.service_request_messages(organization_id, created_at asc, id asc);

create or replace function public.can_read_service_request_messages(
  target_service_request_id uuid,
  target_organization_id uuid
) returns boolean language sql stable security definer set search_path='' as $$
  select public.can_access_service_request(
      target_service_request_id,
      target_organization_id,
      auth.uid()
    )
    or exists (
      select 1
      from public.service_requests r
      where r.id = target_service_request_id
        and r.organization_id = target_organization_id
        and public.is_customer_portal_user(
          r.organization_id,
          r.customer_id,
          auth.uid()
        )
    )
$$;

create or replace function public.guard_service_request_message_immutability()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'service request messages are immutable' using errcode = '42501';
  end if;

  if new.organization_id is distinct from old.organization_id
    or new.service_request_id is distinct from old.service_request_id
    or new.author_user_id is distinct from old.author_user_id
    or new.author_type is distinct from old.author_type
    or new.body is distinct from old.body
    or new.created_at is distinct from old.created_at then
    raise exception 'service request messages are immutable' using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists service_request_messages_immutability_guard on public.service_request_messages;
create trigger service_request_messages_immutability_guard
before update or delete on public.service_request_messages
for each row execute function public.guard_service_request_message_immutability();

create or replace function public.create_customer_service_request_message(
  target_service_request_id uuid,
  target_body text
) returns public.service_request_messages language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  item public.service_requests;
  created public.service_request_messages;
begin
  if actor is null or target_body is null or length(trim(target_body)) = 0
    or length(trim(target_body)) > 4000 then
    raise exception 'message is required and must be 4000 characters or fewer' using errcode = '22023';
  end if;
  select r.* into item
    from public.service_requests r
    join public.organizations o on o.id = r.organization_id and o.status = 'ACTIVE'
    join public.customers c on c.id = r.customer_id and c.organization_id = r.organization_id and c.status = 'ACTIVE'
    where r.id = target_service_request_id;
  if not found or not public.is_customer_portal_user(item.organization_id, item.customer_id, actor) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  insert into public.service_request_messages(organization_id, service_request_id, author_user_id, author_type, body)
  values (item.organization_id, item.id, actor, 'CUSTOMER', trim(target_body))
  returning * into created;
  return created;
end $$;

create or replace function public.create_internal_service_request_message(
  target_service_request_id uuid,
  target_body text
) returns public.service_request_messages language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  item public.service_requests;
  created public.service_request_messages;
begin
  if actor is null or target_body is null or length(trim(target_body)) = 0
    or length(trim(target_body)) > 4000 then
    raise exception 'message is required and must be 4000 characters or fewer' using errcode = '22023';
  end if;
  select * into item from public.service_requests where id = target_service_request_id;
  if not found or not public.can_manage_service_request(item.id, item.organization_id, actor) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  insert into public.service_request_messages(organization_id, service_request_id, author_user_id, author_type, body)
  values (item.organization_id, item.id, actor, 'STAFF', trim(target_body))
  returning * into created;
  return created;
end $$;

alter table public.service_request_messages enable row level security;
drop policy if exists service_request_messages_select on public.service_request_messages;
create policy service_request_messages_select on public.service_request_messages
  for select to authenticated
  using (public.can_read_service_request_messages(service_request_id, organization_id));

revoke all on public.service_request_messages from public, anon, authenticated;
grant select on public.service_request_messages to authenticated;
revoke all on function public.can_read_service_request_messages(uuid, uuid) from public, anon;
grant execute on function public.can_read_service_request_messages(uuid, uuid) to authenticated;
revoke all on function public.create_customer_service_request_message(uuid, text) from public, anon;
grant execute on function public.create_customer_service_request_message(uuid, text) to authenticated;
revoke all on function public.create_internal_service_request_message(uuid, text) from public, anon;
grant execute on function public.create_internal_service_request_message(uuid, text) to authenticated;

comment on table public.service_request_messages is 'Immutable customer/staff conversation messages. The initial request description remains the opening communication.';
comment on column public.service_request_messages.author_type is 'Trusted RPC-derived context: CUSTOMER or STAFF; never supplied by the browser.';
