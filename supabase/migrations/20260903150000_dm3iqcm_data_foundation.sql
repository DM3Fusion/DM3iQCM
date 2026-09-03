-- DM3iQCM-02: permanent multi-tenant case-management foundation.
create extension if not exists pgcrypto with schema extensions;

create type public.application_role as enum ('SUPER_ADMIN','BUSINESS_ADMIN','BUSINESS_OWNER','STAFF_MANAGER','STAFF_USER','PUBLIC_USER');
create type public.organization_status as enum ('ACTIVE','SUSPENDED','ARCHIVED');
create type public.customer_type as enum ('INDIVIDUAL','BUSINESS','ORGANIZATION');
create type public.customer_status as enum ('ACTIVE','INACTIVE','ARCHIVED');
create type public.case_status as enum ('NEW','UNASSIGNED','ASSIGNED','IN_PROGRESS','WAITING','REVIEW','COMPLETED','CLOSED','CANCELLED');
create type public.priority_level as enum ('LOW','NORMAL','HIGH','URGENT');
create type public.assignment_role as enum ('MANAGER','STAFF');
create type public.case_task_status as enum ('NOT_STARTED','IN_PROGRESS','BLOCKED','COMPLETED','NOT_APPLICABLE');
create type public.service_request_status as enum ('NEW','OPEN','PENDING_CUSTOMER','PENDING_STAFF','RESOLVED','CLOSED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, first_name text, last_name text, display_name text, phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index profiles_email_lower_uidx on public.profiles(lower(email)) where email is not null;

create table public.platform_user_roles (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  role public.application_role not null check (role = 'SUPER_ADMIN'), is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, role)
);
-- A partial unique index is concurrency-safe and permits historical inactive assignments.
create unique index one_active_super_admin_uidx on public.platform_user_roles(role) where is_active and role = 'SUPER_ADMIN';

create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) > 0),
  slug text not null check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status public.organization_status not null default 'ACTIVE', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(slug)
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, role public.application_role not null check (role in ('BUSINESS_ADMIN','BUSINESS_OWNER','STAFF_MANAGER','STAFF_USER')),
  is_active boolean not null default true, joined_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,user_id), unique(organization_id,user_id,role)
);
create index organization_members_user_idx on public.organization_members(user_id) where is_active;

create or replace function public.enforce_constrained_role_limit() returns trigger language plpgsql set search_path = '' as $$
declare active_count integer;
begin
  if new.is_active and new.role in ('BUSINESS_ADMIN','BUSINESS_OWNER') then
    -- Serialize allocations for one organization/role, including when no rows exist yet.
    perform pg_advisory_xact_lock(hashtextextended(new.organization_id::text || ':' || new.role::text, 0));
    select count(*) into active_count from public.organization_members m
      where m.organization_id=new.organization_id and m.role=new.role and m.is_active and m.id<>new.id;
    if active_count >= 2 then raise exception 'maximum active % memberships reached for organization', new.role using errcode='23514'; end if;
  end if;
  return new;
end $$;
create trigger organization_member_role_limit before insert or update of organization_id,role,is_active on public.organization_members for each row execute function public.enforce_constrained_role_limit();

create table public.customers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_number text not null, type public.customer_type not null, name text not null check(length(trim(name))>0), email text, phone text,
  status public.customer_status not null default 'ACTIVE', notes text, created_by_user_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,customer_number), unique(organization_id,id),
  foreign key(organization_id,created_by_user_id) references public.organization_members(organization_id,user_id)
);

create table public.customer_portal_users (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, customer_id uuid not null, user_id uuid not null references public.profiles(id) on delete cascade,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,customer_id,user_id), foreign key(organization_id,customer_id) references public.customers(organization_id,id) on delete cascade
);
create index customer_portal_users_user_idx on public.customer_portal_users(user_id) where is_active;

create table public.organization_case_number_counters (
  organization_id uuid primary key references public.organizations(id) on delete cascade, next_number bigint not null default 1 check(next_number>0)
);
create or replace function public.next_case_number(target_organization_id uuid) returns text language plpgsql security definer set search_path='' as $$
declare allocated bigint;
begin
  insert into public.organization_case_number_counters(organization_id,next_number) values(target_organization_id,2)
  on conflict(organization_id) do update set next_number=public.organization_case_number_counters.next_number+1
  returning next_number-1 into allocated;
  return 'CASE-' || lpad(allocated::text,6,'0');
end $$;

create table public.cases (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  case_number text, customer_id uuid not null, title text not null check(length(trim(title))>0), description text not null default '', case_type text not null,
  priority public.priority_level not null default 'NORMAL', status public.case_status not null default 'NEW', opened_at timestamptz not null default now(), due_at timestamptz,
  completed_at timestamptz, closed_at timestamptz, manager_user_id uuid, created_by_user_id uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,case_number), unique(organization_id,id),
  foreign key(organization_id,customer_id) references public.customers(organization_id,id),
  foreign key(organization_id,manager_user_id) references public.organization_members(organization_id,user_id),
  foreign key(organization_id,created_by_user_id) references public.organization_members(organization_id,user_id),
  check(completed_at is null or status in ('COMPLETED','CLOSED')), check(closed_at is null or status='CLOSED')
);
create or replace function public.assign_case_number() returns trigger language plpgsql security definer set search_path='' as $$ begin if new.case_number is null or trim(new.case_number)='' then new.case_number=public.next_case_number(new.organization_id); end if; return new; end $$;
create trigger cases_assign_number before insert on public.cases for each row execute function public.assign_case_number();
alter table public.cases alter column case_number set not null;
create index cases_customer_idx on public.cases(organization_id,customer_id);
create index cases_status_due_idx on public.cases(organization_id,status,due_at);

create table public.case_assignments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, case_id uuid not null, user_id uuid not null,
  assignment_role public.assignment_role not null default 'STAFF', is_active boolean not null default true, assigned_at timestamptz not null default now(),
  assigned_by_user_id uuid not null, unassigned_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(organization_id,case_id) references public.cases(organization_id,id) on delete cascade,
  foreign key(organization_id,user_id) references public.organization_members(organization_id,user_id),
  foreign key(organization_id,assigned_by_user_id) references public.organization_members(organization_id,user_id),
  check((is_active and unassigned_at is null) or not is_active)
);
create unique index case_assignments_active_user_uidx on public.case_assignments(case_id,user_id,assignment_role) where is_active;
create unique index case_assignments_one_manager_uidx on public.case_assignments(case_id) where is_active and assignment_role='MANAGER';

create table public.case_tasks (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, case_id uuid not null, title text not null check(length(trim(title))>0), description text not null default '',
  assigned_user_id uuid, status public.case_task_status not null default 'NOT_STARTED', required boolean not null default true, due_at timestamptz,
  completed_at timestamptz, completed_by_user_id uuid, sequence integer not null default 0 check(sequence>=0), created_by_user_id uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,id),
  foreign key(organization_id,case_id) references public.cases(organization_id,id) on delete cascade,
  foreign key(organization_id,assigned_user_id) references public.organization_members(organization_id,user_id),
  foreign key(organization_id,completed_by_user_id) references public.organization_members(organization_id,user_id),
  foreign key(organization_id,created_by_user_id) references public.organization_members(organization_id,user_id),
  check((status='COMPLETED' and completed_at is not null and completed_by_user_id is not null) or (status<>'COMPLETED' and completed_at is null and completed_by_user_id is null))
);
create index case_tasks_case_sequence_idx on public.case_tasks(case_id,sequence);

create or replace function public.get_case_progress(target_case_id uuid)
returns table(percentage integer,completed_required_tasks bigint,total_required_tasks bigint,remaining_required_tasks bigint)
language sql stable security invoker set search_path='' as $$
  select case when count(*) filter(where required and status<>'NOT_APPLICABLE')=0 then 0 else round(100.0*count(*) filter(where required and status='COMPLETED')/count(*) filter(where required and status<>'NOT_APPLICABLE'))::integer end,
  count(*) filter(where required and status='COMPLETED'), count(*) filter(where required and status<>'NOT_APPLICABLE'),
  count(*) filter(where required and status<>'NOT_APPLICABLE')-count(*) filter(where required and status='COMPLETED')
  from public.case_tasks where case_id=target_case_id
$$;

create view public.case_progress with (security_invoker=true) as
select c.organization_id,c.id case_id,p.percentage,p.completed_required_tasks,p.total_required_tasks,p.remaining_required_tasks
from public.cases c cross join lateral public.get_case_progress(c.id) p;

create view public.case_operational_status with (security_invoker=true) as
select c.*, (c.due_at < now() and c.status not in ('COMPLETED','CLOSED','CANCELLED')) is_overdue from public.cases c;

create table public.case_activity (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, case_id uuid not null, actor_user_id uuid,
  event_type text not null check(event_type in ('CASE_CREATED','CASE_ASSIGNED','CASE_UNASSIGNED','STATUS_CHANGED','PRIORITY_CHANGED','DUE_DATE_CHANGED','TASK_CREATED','TASK_ASSIGNED','TASK_STARTED','TASK_COMPLETED','CUSTOMER_RESPONSE_RECEIVED','CASE_MOVED_TO_REVIEW','CASE_COMPLETED','CASE_REOPENED')),
  event_data jsonb not null default '{}'::jsonb check(jsonb_typeof(event_data)='object'), created_at timestamptz not null default now(),
  foreign key(organization_id,case_id) references public.cases(organization_id,id) on delete restrict,
  foreign key(organization_id,actor_user_id) references public.organization_members(organization_id,user_id)
);
create index case_activity_timeline_idx on public.case_activity(case_id,created_at desc);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, request_number text not null, customer_id uuid not null, requester_user_id uuid,
  case_id uuid, subject text not null check(length(trim(subject))>0), description text not null default '', status public.service_request_status not null default 'NEW',
  priority public.priority_level not null default 'NORMAL', assigned_user_id uuid, opened_at timestamptz not null default now(), resolved_at timestamptz, closed_at timestamptz,
  last_activity_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,request_number),
  foreign key(organization_id,customer_id) references public.customers(organization_id,id),
  foreign key(organization_id,case_id) references public.cases(organization_id,id),
  foreign key(organization_id,assigned_user_id) references public.organization_members(organization_id,user_id),
  foreign key(organization_id,customer_id,requester_user_id) references public.customer_portal_users(organization_id,customer_id,user_id),
  check(resolved_at is null or status in ('RESOLVED','CLOSED')), check(closed_at is null or status='CLOSED')
);
create index service_requests_customer_idx on public.service_requests(organization_id,customer_id,last_activity_at desc);

-- Profile bootstrap copies identity presentation only; it never provisions a role or tenant.
create or replace function public.handle_new_auth_user() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,email,first_name,last_name,display_name)
values(new.id,new.email,new.raw_user_meta_data->>'first_name',new.raw_user_meta_data->>'last_name',coalesce(new.raw_user_meta_data->>'display_name',new.email))
on conflict(id) do update set email=excluded.email,updated_at=now(); return new; end $$;
create trigger auth_user_profile_bootstrap after insert or update of email on auth.users for each row execute function public.handle_new_auth_user();
insert into public.profiles(id,email,display_name,created_at,updated_at)
select id,email,coalesce(raw_user_meta_data->>'display_name',email),created_at,now() from auth.users on conflict(id) do update set email=excluded.email,updated_at=now();

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare table_name text; begin foreach table_name in array array['profiles','platform_user_roles','organizations','organization_members','customers','customer_portal_users','case_assignments','case_tasks','service_requests'] loop
  execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',table_name||'_updated_at',table_name);
end loop; end $$;

create or replace function public.is_super_admin(check_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.platform_user_roles r where r.user_id=check_user_id and r.role='SUPER_ADMIN' and r.is_active)
$$;
create or replace function public.is_internal_member(check_organization_id uuid,check_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organization_members m join public.profiles p on p.id=m.user_id where m.organization_id=check_organization_id and m.user_id=check_user_id and m.is_active and p.is_active)
$$;
create or replace function public.has_organization_role(check_organization_id uuid,allowed_roles public.application_role[],check_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organization_members m join public.profiles p on p.id=m.user_id where m.organization_id=check_organization_id and m.user_id=check_user_id and m.role=any(allowed_roles) and m.is_active and p.is_active)
$$;
create or replace function public.is_customer_portal_user(check_organization_id uuid,check_customer_id uuid,check_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.customer_portal_users x join public.profiles p on p.id=x.user_id where x.organization_id=check_organization_id and x.customer_id=check_customer_id and x.user_id=check_user_id and x.is_active and p.is_active)
$$;
create or replace function public.can_access_case(check_case_id uuid,check_organization_id uuid,check_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_super_admin(check_user_id) or public.has_organization_role(check_organization_id,array['BUSINESS_ADMIN','BUSINESS_OWNER','STAFF_MANAGER']::public.application_role[],check_user_id)
 or exists(select 1 from public.case_assignments a where a.case_id=check_case_id and a.organization_id=check_organization_id and a.user_id=check_user_id and a.is_active)
$$;

alter table public.profiles enable row level security; alter table public.platform_user_roles enable row level security;
alter table public.organizations enable row level security; alter table public.organization_members enable row level security;
alter table public.customers enable row level security; alter table public.customer_portal_users enable row level security;
alter table public.organization_case_number_counters enable row level security; alter table public.cases enable row level security;
alter table public.case_assignments enable row level security; alter table public.case_tasks enable row level security;
alter table public.case_activity enable row level security; alter table public.service_requests enable row level security;

create policy profiles_select on public.profiles for select to authenticated using(id=auth.uid() or public.is_super_admin() or exists(select 1 from public.organization_members me join public.organization_members them on them.organization_id=me.organization_id where me.user_id=auth.uid() and me.is_active and them.user_id=profiles.id and them.is_active));
create policy profiles_update_self on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy platform_roles_super_admin on public.platform_user_roles for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy organizations_select on public.organizations for select to authenticated using(public.is_super_admin() or public.is_internal_member(id));
create policy organizations_super_admin_insert on public.organizations for insert to authenticated with check(public.is_super_admin());
create policy organizations_admin_write on public.organizations for update to authenticated using(public.is_super_admin() or public.has_organization_role(id,array['BUSINESS_ADMIN','BUSINESS_OWNER']::public.application_role[])) with check(public.is_super_admin() or public.has_organization_role(id,array['BUSINESS_ADMIN','BUSINESS_OWNER']::public.application_role[]));
create policy members_select on public.organization_members for select to authenticated using(public.is_super_admin() or public.is_internal_member(organization_id));
create policy members_admin_insert on public.organization_members for insert to authenticated with check(public.is_super_admin() or public.has_organization_role(organization_id,array['BUSINESS_ADMIN','BUSINESS_OWNER']::public.application_role[]));
create policy members_admin_update on public.organization_members for update to authenticated using(public.is_super_admin() or public.has_organization_role(organization_id,array['BUSINESS_ADMIN','BUSINESS_OWNER']::public.application_role[])) with check(public.is_super_admin() or public.has_organization_role(organization_id,array['BUSINESS_ADMIN','BUSINESS_OWNER']::public.application_role[]));
create policy customers_internal_select on public.customers for select to authenticated using(public.is_super_admin() or public.is_internal_member(organization_id));
create policy customers_portal_select on public.customers for select to authenticated using(public.is_customer_portal_user(organization_id,id));
create policy customers_internal_write on public.customers for all to authenticated using(public.is_super_admin() or public.is_internal_member(organization_id)) with check(public.is_super_admin() or public.is_internal_member(organization_id));
create policy portal_links_self_select on public.customer_portal_users for select to authenticated using(user_id=auth.uid() or public.is_super_admin() or public.has_organization_role(organization_id,array['BUSINESS_ADMIN','BUSINESS_OWNER']::public.application_role[]));
create policy portal_links_admin_write on public.customer_portal_users for all to authenticated using(public.is_super_admin() or public.has_organization_role(organization_id,array['BUSINESS_ADMIN','BUSINESS_OWNER']::public.application_role[])) with check(public.is_super_admin() or public.has_organization_role(organization_id,array['BUSINESS_ADMIN','BUSINESS_OWNER']::public.application_role[]));
create policy cases_select on public.cases for select to authenticated using(public.can_access_case(id,organization_id));
create policy cases_manager_insert on public.cases for insert to authenticated with check(public.is_super_admin() or public.has_organization_role(organization_id,array['BUSINESS_ADMIN','BUSINESS_OWNER','STAFF_MANAGER']::public.application_role[]));
create policy cases_operational_update on public.cases for update to authenticated using(public.can_access_case(id,organization_id)) with check(public.can_access_case(id,organization_id));
create policy assignments_select on public.case_assignments for select to authenticated using(public.can_access_case(case_id,organization_id));
create policy assignments_manager_write on public.case_assignments for all to authenticated using(public.is_super_admin() or public.has_organization_role(organization_id,array['BUSINESS_ADMIN','BUSINESS_OWNER','STAFF_MANAGER']::public.application_role[])) with check(public.is_super_admin() or public.has_organization_role(organization_id,array['BUSINESS_ADMIN','BUSINESS_OWNER','STAFF_MANAGER']::public.application_role[]));
create policy tasks_select on public.case_tasks for select to authenticated using(public.can_access_case(case_id,organization_id));
create policy tasks_operational_write on public.case_tasks for all to authenticated using(public.can_access_case(case_id,organization_id)) with check(public.can_access_case(case_id,organization_id));
create policy activity_select on public.case_activity for select to authenticated using(public.can_access_case(case_id,organization_id));
create policy activity_append on public.case_activity for insert to authenticated with check(public.can_access_case(case_id,organization_id));
create policy requests_internal_select on public.service_requests for select to authenticated using(public.is_super_admin() or public.is_internal_member(organization_id));
create policy requests_portal_select on public.service_requests for select to authenticated using(public.is_customer_portal_user(organization_id,customer_id));
create policy requests_internal_write on public.service_requests for all to authenticated using(public.is_super_admin() or public.is_internal_member(organization_id)) with check(public.is_super_admin() or public.is_internal_member(organization_id));

revoke all on all tables in schema public from anon; revoke execute on all functions in schema public from public,anon;
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated; grant update(first_name,last_name,display_name,phone) on public.profiles to authenticated;
grant select,insert,update,delete on public.platform_user_roles,public.organizations,public.organization_members,public.customers,public.customer_portal_users,public.cases,public.case_assignments,public.case_tasks,public.service_requests to authenticated;
grant select,insert on public.case_activity to authenticated; grant select on public.case_progress,public.case_operational_status to authenticated;
grant execute on function public.get_case_progress(uuid),public.is_super_admin(uuid),public.is_internal_member(uuid,uuid),public.has_organization_role(uuid,public.application_role[],uuid),public.is_customer_portal_user(uuid,uuid,uuid),public.can_access_case(uuid,uuid,uuid) to authenticated;
revoke all on public.organization_case_number_counters from authenticated,anon;

comment on table public.customer_portal_users is 'External authenticated identity linkage; never an internal organization membership.';
comment on table public.case_activity is 'Append-oriented operational history. Authenticated clients have no UPDATE or DELETE grant/policy.';
comment on function public.enforce_constrained_role_limit() is 'Advisory transaction locking makes the two-active-member cap safe under concurrency.';
