-- DM3iQCM-07A corrective permission repair.
-- RLS policies execute this SECURITY DEFINER helper as the querying role.
grant execute on function public.can_access_service_request(uuid, uuid, uuid)
to authenticated;
