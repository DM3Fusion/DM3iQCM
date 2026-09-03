-- DM3iQCM-04: narrow platform-administration RPCs over the existing role model.

-- Inactive organizations cannot confer tenant access, even through direct API use.
create or replace function public.is_internal_member(check_organization_id uuid,check_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organization_members m join public.profiles p on p.id=m.user_id join public.organizations o on o.id=m.organization_id where m.organization_id=check_organization_id and m.user_id=check_user_id and m.is_active and p.is_active and o.status='ACTIVE')
$$;
create or replace function public.has_organization_role(check_organization_id uuid,allowed_roles public.application_role[],check_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organization_members m join public.profiles p on p.id=m.user_id join public.organizations o on o.id=m.organization_id where m.organization_id=check_organization_id and m.user_id=check_user_id and m.role=any(allowed_roles) and m.is_active and p.is_active and o.status='ACTIVE')
$$;

create or replace function public.create_organization(target_name text,target_slug text)
returns public.organizations language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); created public.organizations;
begin
 if actor is null or not public.is_super_admin(actor) then raise exception 'not authorized' using errcode='42501'; end if;
 if length(trim(target_name))=0 then raise exception 'organization name is required' using errcode='22023'; end if;
 if target_slug is null or target_slug<>lower(target_slug) or target_slug!~'^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'invalid organization slug' using errcode='22023'; end if;
 insert into public.organizations(name,slug,status) values(trim(target_name),target_slug,'ACTIVE') returning * into created;
 return created;
exception when unique_violation then raise exception 'organization slug already exists' using errcode='23505';
end $$;

create or replace function public.update_organization(target_organization_id uuid,target_name text,target_slug text,target_status public.organization_status)
returns public.organizations language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); changed public.organizations;
begin
 if actor is null or not public.is_super_admin(actor) then raise exception 'not authorized' using errcode='42501'; end if;
 if length(trim(target_name))=0 then raise exception 'organization name is required' using errcode='22023'; end if;
 if target_slug is null or target_slug<>lower(target_slug) or target_slug!~'^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'invalid organization slug' using errcode='22023'; end if;
 update public.organizations set name=trim(target_name),slug=target_slug,status=target_status where id=target_organization_id returning * into changed;
 if not found then raise exception 'organization not found' using errcode='P0002'; end if;
 return changed;
exception when unique_violation then raise exception 'organization slug already exists' using errcode='23505';
end $$;

create or replace function public.provision_organization_member(target_organization_id uuid,target_email text,target_role public.application_role)
returns public.organization_members language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target_user uuid; membership public.organization_members;
begin
 if actor is null or not public.is_super_admin(actor) then raise exception 'not authorized' using errcode='42501'; end if;
 if target_role not in ('BUSINESS_ADMIN','BUSINESS_OWNER','STAFF_MANAGER','STAFF_USER') then raise exception 'invalid organization role' using errcode='22023'; end if;
 if not exists(select 1 from public.organizations where id=target_organization_id) then raise exception 'organization not found' using errcode='P0002'; end if;
 select id into target_user from public.profiles where lower(email)=lower(trim(target_email)) and is_active;
 if target_user is null then raise exception 'user profile not found' using errcode='P0002'; end if;
 insert into public.organization_members(organization_id,user_id,role,is_active) values(target_organization_id,target_user,target_role,true)
 on conflict(organization_id,user_id) do update set role=excluded.role,is_active=true
 returning * into membership;
 return membership;
end $$;

create or replace function public.update_organization_membership(target_membership_id uuid,target_role public.application_role,target_active boolean)
returns public.organization_members language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); changed public.organization_members;
begin
 if actor is null or not public.is_super_admin(actor) then raise exception 'not authorized' using errcode='42501'; end if;
 if target_role not in ('BUSINESS_ADMIN','BUSINESS_OWNER','STAFF_MANAGER','STAFF_USER') then raise exception 'invalid organization role' using errcode='22023'; end if;
 update public.organization_members set role=target_role,is_active=target_active where id=target_membership_id returning * into changed;
 if not found then raise exception 'membership not found' using errcode='P0002'; end if;
 return changed;
end $$;

revoke execute on function public.create_organization(text,text),public.update_organization(uuid,text,text,public.organization_status),public.provision_organization_member(uuid,text,public.application_role),public.update_organization_membership(uuid,public.application_role,boolean) from public,anon;
grant execute on function public.create_organization(text,text),public.update_organization(uuid,text,text,public.organization_status),public.provision_organization_member(uuid,text,public.application_role),public.update_organization_membership(uuid,public.application_role,boolean) to authenticated;

comment on function public.provision_organization_member(uuid,text,public.application_role) is 'SUPER_ADMIN-only existing-profile provisioning. SUPER_ADMIN and PUBLIC_USER are intentionally rejected as organization roles.';
