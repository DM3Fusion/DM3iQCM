create table if not exists public.organization_settings(
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  portal_enabled boolean not null default true,
  portal_submission_enabled boolean not null default true,
  portal_show_priority boolean not null default true,
  portal_support_label text,
  portal_welcome_message text,
  default_priority public.priority_level not null default 'NORMAL',
  timezone text not null default 'UTC',
  updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id)
);
create table if not exists public.organization_case_types(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null, description text, is_active boolean not null default true, sort_order integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,name)
);
create table if not exists public.organization_lifecycle_statuses(
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status public.case_status not null, display_label text not null, description text, is_active boolean not null default true, sort_order integer not null default 0,
  updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id), primary key (organization_id,status)
);
alter table public.organization_settings enable row level security; alter table public.organization_case_types enable row level security; alter table public.organization_lifecycle_statuses enable row level security;
create policy organization_settings_access on public.organization_settings for all to authenticated using(public.is_super_admin() or public.has_organization_role(organization_id,array['BUSINESS_OWNER','BUSINESS_ADMIN']::public.application_role[])) with check(public.is_super_admin() or public.has_organization_role(organization_id,array['BUSINESS_OWNER','BUSINESS_ADMIN']::public.application_role[]));
create policy organization_case_types_access on public.organization_case_types for all to authenticated using(public.is_super_admin() or public.has_organization_role(organization_id,array['BUSINESS_OWNER','BUSINESS_ADMIN']::public.application_role[])) with check(public.is_super_admin() or public.has_organization_role(organization_id,array['BUSINESS_OWNER','BUSINESS_ADMIN']::public.application_role[]));
create policy organization_lifecycle_access on public.organization_lifecycle_statuses for all to authenticated using(public.is_super_admin() or public.has_organization_role(organization_id,array['BUSINESS_OWNER','BUSINESS_ADMIN']::public.application_role[])) with check(public.is_super_admin() or public.has_organization_role(organization_id,array['BUSINESS_OWNER','BUSINESS_ADMIN']::public.application_role[]));
grant select,insert,update,delete on public.organization_settings,public.organization_case_types,public.organization_lifecycle_statuses to authenticated;
create or replace function public.create_customer_service_request(target_portal_access_id uuid,target_subject text,target_description text)
returns public.service_requests language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); link public.customer_portal_users; customer public.customers; created public.service_requests; request_number text; settings_row public.organization_settings;
begin
 if actor is null then raise exception 'not authorized' using errcode='42501'; end if;
 select * into link from public.customer_portal_users where id=target_portal_access_id and user_id=actor and is_active;
 if not found then raise exception 'not authorized' using errcode='42501'; end if;
 select * into settings_row from public.organization_settings where organization_id=link.organization_id;
 if coalesce(settings_row.portal_enabled,true)=false then raise exception 'customer portal is unavailable' using errcode='42501'; end if;
 if coalesce(settings_row.portal_submission_enabled,true)=false then raise exception 'customer portal submissions are disabled' using errcode='42501'; end if;
 select c.* into customer from public.customers c join public.organizations o on o.id=c.organization_id where c.id=link.customer_id and c.organization_id=link.organization_id and c.status='ACTIVE' and o.status='ACTIVE';
 if not found then raise exception 'customer portal access is inactive' using errcode='42501'; end if;
 if target_subject is null or length(trim(target_subject))=0 or target_description is null or length(trim(target_description))=0 then raise exception 'subject and description are required' using errcode='22023'; end if;
 request_number:=public.allocate_service_request_number(link.organization_id);
 insert into public.service_requests(organization_id,request_number,customer_id,requester_user_id,created_by_user_id,subject,description,status,priority,assigned_user_id,created_at,updated_at) values(link.organization_id,request_number,link.customer_id,actor,actor,trim(target_subject),trim(target_description),'NEW','NORMAL',null,now(),now()) returning * into created;
 insert into public.service_request_activity(organization_id,service_request_id,event_type,actor_user_id,new_value,metadata) values(created.organization_id,created.id,'CREATED',actor,jsonb_build_object('status','NEW','priority','NORMAL'),jsonb_build_object('request_number',created.request_number));
 return created;
end $$;
revoke all on function public.create_customer_service_request(uuid,text,text) from public,anon;
grant execute on function public.create_customer_service_request(uuid,text,text) to authenticated;
