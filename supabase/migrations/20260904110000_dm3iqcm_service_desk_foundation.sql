-- DM3iQCM-07A: authoritative internal Service Request workflow.
-- Historical requests, request numbers, requester identity, and PENDING_STAFF
-- values are preserved; new internal requests use the RPCs below.

do $$ begin
  alter type public.service_request_status add value if not exists 'ON_HOLD';
exception when duplicate_object then null;
end $$;

alter table public.service_requests
  add column if not exists created_by_user_id uuid null;

alter table public.service_requests
  add constraint service_requests_created_by_user_id_fkey
  foreign key (created_by_user_id) references public.profiles(id);

-- Required by the tenant-preserving composite foreign key on activity rows.
alter table public.service_requests
  add constraint service_requests_organization_id_id_key
  unique (organization_id, id);

create table if not exists public.organization_service_request_annual_number_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  calendar_year integer not null check (calendar_year between 1 and 9999),
  last_number integer not null default 0 check (last_number between 0 and 9999),
  primary key (organization_id, calendar_year)
);

create table if not exists public.service_request_activity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  service_request_id uuid not null,
  event_type text not null check (event_type in ('CREATED','STATUS_CHANGED','PRIORITY_CHANGED','ASSIGNMENT_CHANGED')),
  actor_user_id uuid null references public.profiles(id),
  occurred_at timestamptz not null default now(),
  previous_value jsonb null,
  new_value jsonb null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  foreign key (organization_id, service_request_id)
    references public.service_requests(organization_id, id) on delete cascade
);

create index if not exists service_requests_status_idx
  on public.service_requests(organization_id, status, updated_at desc);
create index if not exists service_requests_assigned_idx
  on public.service_requests(organization_id, assigned_user_id, updated_at desc);
create index if not exists service_requests_priority_idx
  on public.service_requests(organization_id, priority, updated_at desc);
create index if not exists service_request_activity_request_idx
  on public.service_request_activity(service_request_id, occurred_at desc);
create index if not exists service_request_activity_org_idx
  on public.service_request_activity(organization_id, occurred_at desc);

create or replace function public.guard_service_request_identity()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op = 'UPDATE' and (new.organization_id is distinct from old.organization_id
    or new.request_number is distinct from old.request_number
    or new.created_at is distinct from old.created_at
    or (old.created_by_user_id is not null and new.created_by_user_id is distinct from old.created_by_user_id)) then
    raise exception 'service request identity fields are immutable' using errcode='42501';
  end if;
  return new;
end $$;

drop trigger if exists service_requests_identity_guard on public.service_requests;
create trigger service_requests_identity_guard
before update of organization_id, request_number, created_by_user_id, created_at
on public.service_requests for each row execute function public.guard_service_request_identity();

create or replace function public.can_access_service_request(
  target_service_request_id uuid,
  target_organization_id uuid,
  target_user_id uuid default auth.uid()
) returns boolean language sql stable security definer set search_path='' as $$
  select public.is_super_admin(target_user_id)
    or exists (
      select 1 from public.service_requests r
      join public.organization_members m on m.organization_id=r.organization_id
        and m.user_id=target_user_id and m.is_active
      where r.id=target_service_request_id and r.organization_id=target_organization_id
        and (m.role in ('BUSINESS_OWNER','BUSINESS_ADMIN','STAFF_MANAGER')
          or (m.role='STAFF_USER' and r.assigned_user_id=target_user_id))
    )
$$;

create or replace function public.can_manage_service_request(
  target_service_request_id uuid,
  target_organization_id uuid,
  target_user_id uuid default auth.uid()
) returns boolean language sql stable security definer set search_path='' as $$
  select public.is_super_admin(target_user_id)
    or public.has_organization_role(target_organization_id,
      array['BUSINESS_OWNER','BUSINESS_ADMIN','STAFF_MANAGER']::public.application_role[], target_user_id)
    or exists (
      select 1 from public.service_requests r
      join public.organization_members m on m.organization_id=r.organization_id
        and m.user_id=target_user_id and m.is_active and m.role='STAFF_USER'
      where r.id=target_service_request_id and r.organization_id=target_organization_id
        and r.assigned_user_id=target_user_id
    )
$$;

create or replace function public.allocate_service_request_number(target_organization_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare allocated integer; year_value integer := extract(year from (now() at time zone 'UTC'))::integer;
begin
  insert into public.organization_service_request_annual_number_counters(organization_id,calendar_year,last_number)
  values(target_organization_id,year_value,1)
  on conflict(organization_id,calendar_year) do update
    set last_number=least(public.organization_service_request_annual_number_counters.last_number+1,9999)
  returning last_number into allocated;
  if allocated > 9999 then raise exception 'service request number limit reached for organization and year' using errcode='22003'; end if;
  return 'SR-' || year_value::text || '-' || lpad(allocated::text,4,'0');
end $$;

create or replace function public.create_service_request(
  target_organization_id uuid,
  target_customer_id uuid,
  target_subject text,
  target_description text,
  target_priority public.priority_level default 'NORMAL',
  target_assigned_user_id uuid default null
) returns public.service_requests language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); created public.service_requests; request_number text;
begin
  if actor is null or (not public.is_super_admin(actor) and not public.is_internal_member(target_organization_id,actor)) then
    raise exception 'not authorized' using errcode='42501';
  end if;
  if not exists(select 1 from public.customers c where c.id=target_customer_id and c.organization_id=target_organization_id) then
    raise exception 'invalid customer' using errcode='23503';
  end if;
  if target_subject is null or length(trim(target_subject))=0 or length(trim(target_subject))>240 then
    raise exception 'subject is required and must be 240 characters or fewer' using errcode='22023';
  end if;
  if target_description is null or length(trim(target_description))=0 then
    raise exception 'description is required' using errcode='22023';
  end if;
  if target_assigned_user_id is not null and not exists(
    select 1 from public.organization_members m where m.organization_id=target_organization_id
      and m.user_id=target_assigned_user_id and m.is_active
      and m.role in ('BUSINESS_OWNER','BUSINESS_ADMIN','STAFF_MANAGER','STAFF_USER')) then
    raise exception 'invalid service request assignee' using errcode='23514';
  end if;
  request_number:=public.allocate_service_request_number(target_organization_id);
  insert into public.service_requests(organization_id,request_number,customer_id,subject,description,status,priority,assigned_user_id,created_by_user_id,created_at,updated_at)
  values(target_organization_id,request_number,target_customer_id,trim(target_subject),trim(target_description),'NEW',target_priority,target_assigned_user_id,actor,now(),now())
  returning * into created;
  insert into public.service_request_activity(organization_id,service_request_id,event_type,actor_user_id,new_value,metadata)
  values(created.organization_id,created.id,'CREATED',actor,jsonb_build_object('status',created.status,'priority',created.priority),jsonb_build_object('request_number',created.request_number));
  return created;
end $$;

create or replace function public.update_service_request_status(
  target_service_request_id uuid, target_status public.service_request_status
) returns public.service_requests language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); item public.service_requests; previous public.service_request_status;
begin
  select * into item from public.service_requests where id=target_service_request_id for update;
  if not found then raise exception 'service request not found' using errcode='P0002'; end if;
  if target_status='PENDING_STAFF' then raise exception 'PENDING_STAFF is historical and cannot be selected' using errcode='22023'; end if;
  if target_status not in ('NEW','OPEN','PENDING_CUSTOMER','ON_HOLD','RESOLVED','CLOSED') then raise exception 'invalid service request status' using errcode='22023'; end if;
  if not public.can_manage_service_request(item.id,item.organization_id,actor) then raise exception 'not authorized' using errcode='42501'; end if;
  previous:=item.status; if previous=target_status then return item; end if;
  update public.service_requests set status=target_status where id=item.id returning * into item;
  insert into public.service_request_activity(organization_id,service_request_id,event_type,actor_user_id,previous_value,new_value)
  values(item.organization_id,item.id,'STATUS_CHANGED',actor,to_jsonb(previous),to_jsonb(target_status));
  return item;
end $$;

create or replace function public.update_service_request_priority(
  target_service_request_id uuid, target_priority public.priority_level
) returns public.service_requests language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); item public.service_requests; previous public.priority_level;
begin
  select * into item from public.service_requests where id=target_service_request_id for update;
  if not found then raise exception 'service request not found' using errcode='P0002'; end if;
  if not public.can_manage_service_request(item.id,item.organization_id,actor) then raise exception 'not authorized' using errcode='42501'; end if;
  previous:=item.priority; if previous=target_priority then return item; end if;
  update public.service_requests set priority=target_priority where id=item.id returning * into item;
  insert into public.service_request_activity(organization_id,service_request_id,event_type,actor_user_id,previous_value,new_value)
  values(item.organization_id,item.id,'PRIORITY_CHANGED',actor,to_jsonb(previous),to_jsonb(target_priority));
  return item;
end $$;

create or replace function public.set_service_request_assignment(
  target_service_request_id uuid, target_assigned_user_id uuid default null
) returns public.service_requests language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); item public.service_requests; previous uuid;
begin
  select * into item from public.service_requests where id=target_service_request_id for update;
  if not found then raise exception 'service request not found' using errcode='P0002'; end if;
  if not public.is_super_admin(actor) and not public.has_organization_role(item.organization_id,array['BUSINESS_OWNER','BUSINESS_ADMIN','STAFF_MANAGER']::public.application_role[],actor) then raise exception 'not authorized' using errcode='42501'; end if;
  if target_assigned_user_id is not null and not exists(select 1 from public.organization_members m where m.organization_id=item.organization_id and m.user_id=target_assigned_user_id and m.is_active and m.role in ('BUSINESS_OWNER','BUSINESS_ADMIN','STAFF_MANAGER','STAFF_USER')) then raise exception 'invalid service request assignee' using errcode='23514'; end if;
  previous:=item.assigned_user_id; if previous is not distinct from target_assigned_user_id then return item; end if;
  update public.service_requests set assigned_user_id=target_assigned_user_id where id=item.id returning * into item;
  insert into public.service_request_activity(organization_id,service_request_id,event_type,actor_user_id,previous_value,new_value)
  values(item.organization_id,item.id,'ASSIGNMENT_CHANGED',actor,to_jsonb(previous),to_jsonb(target_assigned_user_id));
  return item;
end $$;

alter table public.service_request_activity enable row level security;
drop policy if exists requests_portal_select on public.service_requests;
drop policy if exists requests_internal_write on public.service_requests;
drop policy if exists requests_internal_select on public.service_requests;
create policy service_requests_select on public.service_requests for select to authenticated
  using (public.can_access_service_request(id,organization_id));
create policy service_request_activity_select on public.service_request_activity for select to authenticated
  using (public.can_access_service_request(service_request_id,organization_id));

revoke insert,update,delete on public.service_requests from authenticated;
revoke insert,update,delete on public.service_request_activity from authenticated;
revoke all on public.organization_service_request_annual_number_counters from authenticated,anon;
revoke execute on function public.allocate_service_request_number(uuid) from public,anon,authenticated;
revoke execute on function public.can_access_service_request(uuid,uuid,uuid),public.can_manage_service_request(uuid,uuid,uuid) from public,anon,authenticated;
revoke execute on function public.create_service_request(uuid,uuid,text,text,public.priority_level,uuid),public.update_service_request_status(uuid,public.service_request_status),public.update_service_request_priority(uuid,public.priority_level),public.set_service_request_assignment(uuid,uuid) from public,anon;
grant select on public.service_requests,public.service_request_activity to authenticated;
grant execute on function public.create_service_request(uuid,uuid,text,text,public.priority_level,uuid),public.update_service_request_status(uuid,public.service_request_status),public.update_service_request_priority(uuid,public.priority_level),public.set_service_request_assignment(uuid,uuid) to authenticated;

grant select on public.organization_service_request_annual_number_counters to service_role;

comment on table public.service_requests is 'Tenant Service Requests. Historical requester records are preserved; new internal records use create_service_request.';
comment on table public.service_request_activity is 'RPC-authored Service Request activity history; direct authenticated mutation is disabled.';
comment on column public.service_requests.created_by_user_id is 'Canonical creator for new requests; NULL is preserved for historical rows without trustworthy provenance.';
