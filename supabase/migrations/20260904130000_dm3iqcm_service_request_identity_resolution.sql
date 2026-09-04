-- Return only the safe creator and activity identity fields needed by Service Request detail.
create or replace function public.get_service_request_detail_activity(target_service_request_id uuid)
returns table(
  created_by_user_id uuid,
  creator_display_name text,
  creator_email text,
  activity_id uuid,
  event_type text,
  actor_user_id uuid,
  actor_display_name text,
  actor_email text,
  occurred_at timestamptz,
  previous_value jsonb,
  new_value jsonb,
  metadata jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_organization_id uuid;
begin
  if actor is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select r.organization_id into target_organization_id
    from public.service_requests r
    where r.id = target_service_request_id;
  if target_organization_id is null
    or not public.can_access_service_request(target_service_request_id, target_organization_id, actor) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select r.created_by_user_id,
      nullif(trim(creator.display_name), ''), creator.email,
      a.id, a.event_type, a.actor_user_id,
      nullif(trim(event_actor.display_name), ''), event_actor.email,
      a.occurred_at, a.previous_value, a.new_value, a.metadata
    from public.service_requests r
    left join public.profiles creator on creator.id = r.created_by_user_id
    left join public.service_request_activity a on a.service_request_id = r.id
    left join public.profiles event_actor on event_actor.id = a.actor_user_id
    where r.id = target_service_request_id
    order by a.occurred_at desc nulls last;
end;
$$;

revoke all on function public.get_service_request_detail_activity(uuid) from public, anon;
grant execute on function public.get_service_request_detail_activity(uuid) to authenticated;
