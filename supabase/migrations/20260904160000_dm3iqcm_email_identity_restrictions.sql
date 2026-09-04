-- Identity category invariant: an Auth UUID is either INTERNAL or CUSTOMER_PORTAL (or neither).
create or replace function public.enforce_exclusive_identity_category()
returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; active boolean; role_name text;
begin
  if tg_table_name='customer_portal_users' then target:=new.user_id; active:=new.is_active;
  elsif tg_table_name='organization_members' then target:=new.user_id; active:=new.is_active;
  else target:=new.user_id; active:=new.is_active; role_name:=new.role::text; end if;
  if not active then return new; end if;
  if tg_table_name='customer_portal_users' then
    if exists(select 1 from public.organization_members m where m.user_id=target and m.is_active)
      or exists(select 1 from public.platform_user_roles r where r.user_id=target and r.role='SUPER_ADMIN' and r.is_active)
    then raise exception 'identity already has active internal access' using errcode='23514'; end if;
  elsif tg_table_name='organization_members' then
    if exists(select 1 from public.customer_portal_users p where p.user_id=target and p.is_active)
    then raise exception 'identity already has active customer portal access' using errcode='23514'; end if;
  elsif role_name='SUPER_ADMIN' and exists(select 1 from public.customer_portal_users p where p.user_id=target and p.is_active)
    then raise exception 'identity already has active customer portal access' using errcode='23514'; end if;
  return new;
end $$;
drop trigger if exists customer_portal_identity_category_trigger on public.customer_portal_users;
create trigger customer_portal_identity_category_trigger before insert or update of user_id,is_active on public.customer_portal_users for each row execute function public.enforce_exclusive_identity_category();
drop trigger if exists organization_members_identity_category_trigger on public.organization_members;
create trigger organization_members_identity_category_trigger before insert or update of user_id,is_active on public.organization_members for each row execute function public.enforce_exclusive_identity_category();
drop trigger if exists platform_roles_identity_category_trigger on public.platform_user_roles;
create trigger platform_roles_identity_category_trigger before insert or update of user_id,role,is_active on public.platform_user_roles for each row execute function public.enforce_exclusive_identity_category();
revoke all on function public.enforce_exclusive_identity_category() from public,anon,authenticated;

-- Read-only conflict diagnostic for SQL Editor review:
-- select p.id,p.email from public.profiles p where (exists(select 1 from public.organization_members m where m.user_id=p.id and m.is_active) or exists(select 1 from public.platform_user_roles r where r.user_id=p.id and r.role='SUPER_ADMIN' and r.is_active)) and exists(select 1 from public.customer_portal_users c where c.user_id=p.id and c.is_active);
