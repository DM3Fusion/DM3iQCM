create or replace function public.create_customer_service_request(target_portal_access_id uuid,target_subject text,target_description text)
returns public.service_requests language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); link public.customer_portal_users; customer public.customers; created public.service_requests; request_number text;
begin
  if actor is null then raise exception 'not authorized' using errcode='42501'; end if;
  select * into link from public.customer_portal_users where id=target_portal_access_id and user_id=actor and is_active;
  if not found then raise exception 'not authorized' using errcode='42501'; end if;
  select c.* into customer from public.customers c join public.organizations o on o.id=c.organization_id where c.id=link.customer_id and c.organization_id=link.organization_id and c.status='ACTIVE' and o.status='ACTIVE';
  if not found then raise exception 'customer portal access is inactive' using errcode='42501'; end if;
  if target_subject is null or length(trim(target_subject))=0 or target_description is null or length(trim(target_description))=0 then raise exception 'subject and description are required' using errcode='22023'; end if;
  request_number:=public.allocate_service_request_number(link.organization_id);
  insert into public.service_requests(organization_id,request_number,customer_id,requester_user_id,created_by_user_id,subject,description,status,priority,assigned_user_id,created_at,updated_at)
    values(link.organization_id,request_number,link.customer_id,actor,actor,trim(target_subject),trim(target_description),'NEW','NORMAL',null,now(),now()) returning * into created;
  insert into public.service_request_activity(organization_id,service_request_id,event_type,actor_user_id,new_value,metadata)
    values(created.organization_id,created.id,'CREATED',actor,jsonb_build_object('status','NEW','priority','NORMAL'),jsonb_build_object('request_number',created.request_number));
  return created;
end $$;
revoke all on function public.create_customer_service_request(uuid,text,text) from public,anon;
grant execute on function public.create_customer_service_request(uuid,text,text) to authenticated;
drop policy if exists requests_portal_select on public.service_requests;
create policy requests_portal_select on public.service_requests for select to authenticated using(public.is_customer_portal_user(organization_id,customer_id));
