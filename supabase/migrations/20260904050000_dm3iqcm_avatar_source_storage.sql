-- DM3iQCM-05E: private temporary source objects for server-authoritative avatars.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-avatar-sources',
  'user-avatar-sources',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy user_avatar_sources_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'user-avatar-sources'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy user_avatar_sources_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'user-avatar-sources'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and lower(coalesce(metadata->>'mimetype', '')) in ('image/jpeg', 'image/png', 'image/webp')
);

create policy user_avatar_sources_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'user-avatar-sources'
  and (storage.foldername(name))[1] = auth.uid()::text
);
