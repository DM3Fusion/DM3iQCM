-- DM3iQCM-05C: user-owned profile avatars in private Supabase Storage.
alter table public.profiles
  add column avatar_path text,
  add column avatar_updated_at timestamptz,
  add constraint profiles_avatar_path_owned_check check (
    avatar_path is null or avatar_path ~ (
      '^' || id::text || '/avatar-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.webp$'
    )
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'user-avatars',
  'user-avatars',
  false,
  1048576,
  array['image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy user_avatars_authenticated_read
on storage.objects for select to authenticated
using (bucket_id = 'user-avatars');

create policy user_avatars_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) = 'webp'
);

create policy user_avatars_owner_update
on storage.objects for update to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) = 'webp'
);

create policy user_avatars_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

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
  if target_avatar_path is not null and target_avatar_path !~ (
    '^' || auth.uid()::text || '/avatar-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.webp$'
  ) then
    raise exception 'avatar path must belong to the authenticated user' using errcode = '42501';
  end if;
  update public.profiles
  set avatar_path = target_avatar_path,
      avatar_updated_at = case when target_avatar_path is null then null else now() end
  where id = auth.uid()
  returning * into updated_profile;
  if updated_profile.id is null then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  return updated_profile;
end;
$$;

revoke all on function public.set_own_avatar_path(text) from public, anon;
grant execute on function public.set_own_avatar_path(text) to authenticated;

comment on column public.profiles.avatar_path is
  'Private Storage path in user-avatars. The first folder segment is the profile user ID.';
comment on function public.set_own_avatar_path(text) is
  'Updates only the authenticated user profile and enforces a user-owned versioned avatar path.';
