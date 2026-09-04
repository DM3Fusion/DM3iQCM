-- DM3iQCM-05C corrective migration
-- Fix the user-owned avatar path constraint.
-- [.] is used for a literal period to avoid regex escaping ambiguity.

alter table public.profiles
drop constraint if exists profiles_avatar_path_owned_check;

alter table public.profiles
add constraint profiles_avatar_path_owned_check
check (
  avatar_path is null
  or avatar_path ~ (
    '^'
    || id::text
    || '/avatar-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$'
  )
);

-- Keep the RPC validation identical to the table constraint.

create or replace function public.set_own_avatar_path(target_avatar_path text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if target_avatar_path is not null
     and target_avatar_path !~ (
       '^'
       || auth.uid()::text
       || '/avatar-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$'
     )
  then
    raise exception
      'avatar path must belong to the authenticated user'
      using errcode = '42501';
  end if;

  update public.profiles
  set
    avatar_path = target_avatar_path,
    avatar_updated_at =
      case
        when target_avatar_path is null then null
        else now()
      end
  where id = auth.uid()
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  return updated_profile;
end;
$$;

revoke all
on function public.set_own_avatar_path(text)
from public, anon;

grant execute
on function public.set_own_avatar_path(text)
to authenticated;
