create type public.license_status as enum ('TRIAL','ACTIVE','EXPIRING','EXPIRED','SUSPENDED','CANCELLED');
create type public.commercial_state as enum ('TRIAL','PAID','UNPAID','COMP','INTERNAL');
create type public.license_event_type as enum ('CREATED','TRIAL_STARTED','ACTIVATED','RENEWED','EXTENDED','COMMERCIAL_STATE_CHANGED','PLAN_CHANGED','SUSPENDED','REACTIVATED','CANCELLED','GRACE_CHANGED');
create table public.organization_licenses (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 license_status public.license_status not null, commercial_state public.commercial_state not null,
 plan_code text not null default 'STANDARD', starts_at timestamptz, expires_at timestamptz, grace_ends_at timestamptz,
 notice_days integer not null default 30 check (notice_days >= 0), notes text, is_current boolean not null default true,
 created_at timestamptz not null default now(), created_by uuid references public.profiles(id), updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id),
 check (expires_at is null or starts_at is null or expires_at >= starts_at), check (grace_ends_at is null or expires_at is not null and grace_ends_at >= expires_at)
);
create unique index organization_licenses_one_current on public.organization_licenses(organization_id) where is_current;
create table public.organization_license_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 license_id uuid references public.organization_licenses(id) on delete set null, event_type public.license_event_type not null,
 prior_values jsonb not null default '{}'::jsonb, resulting_values jsonb not null default '{}'::jsonb, reason text,
 actor_user_id uuid references public.profiles(id), created_at timestamptz not null default now()
);
alter table public.organization_licenses enable row level security;
alter table public.organization_license_events enable row level security;
create policy organization_licenses_select on public.organization_licenses for select using (public.is_super_admin() or public.is_internal_member(organization_id));
create policy organization_license_events_select on public.organization_license_events for select using (public.is_super_admin() or public.is_internal_member(organization_id));
create or replace function public.admin_set_organization_license(target_organization_id uuid,target_status public.license_status,target_commercial_state public.commercial_state,target_plan_code text,target_starts_at timestamptz,target_expires_at timestamptz,target_grace_ends_at timestamptz,target_notes text,target_event_type public.license_event_type default 'ACTIVATED') returns public.organization_licenses language plpgsql security definer set search_path='' as $$ declare actor uuid:=auth.uid(); old public.organization_licenses; created public.organization_licenses; begin if not public.is_super_admin(actor) then raise exception 'not authorized'; end if; if target_expires_at is not null and target_starts_at is not null and target_expires_at<target_starts_at then raise exception 'expiration precedes start'; end if; if target_grace_ends_at is not null and (target_expires_at is null or target_grace_ends_at<target_expires_at) then raise exception 'grace precedes expiration'; end if; select * into old from public.organization_licenses where organization_id=target_organization_id and is_current for update; if found then update public.organization_licenses set is_current=false,updated_at=now(),updated_by=actor where id=old.id; end if; insert into public.organization_licenses(organization_id,license_status,commercial_state,plan_code,starts_at,expires_at,grace_ends_at,notes,created_by,updated_by) values(target_organization_id,target_status,target_commercial_state,coalesce(nullif(trim(target_plan_code),''),'STANDARD'),target_starts_at,target_expires_at,target_grace_ends_at,target_notes,actor,actor) returning * into created; insert into public.organization_license_events(organization_id,license_id,event_type,prior_values,resulting_values,reason,actor_user_id) values(target_organization_id,created.id,target_event_type,coalesce(to_jsonb(old),'{}'::jsonb),to_jsonb(created),target_notes,actor); return created; end $$;
revoke all on function public.admin_set_organization_license(uuid,public.license_status,public.commercial_state,text,timestamptz,timestamptz,timestamptz,text,public.license_event_type) from public,authenticated;
grant execute on function public.admin_set_organization_license(uuid,public.license_status,public.commercial_state,text,timestamptz,timestamptz,timestamptz,text,public.license_event_type) to authenticated;
