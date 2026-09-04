alter table public.organizations
  add column avatar_path text,
  add column avatar_updated_at timestamptz,
  add constraint organizations_avatar_path_owned_check check (
    avatar_path is null or avatar_path ~ ('^' || id::text || '/avatar-[0-9a-f-]{36}[.]webp$')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('organization-avatar-sources', 'organization-avatar-sources', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('organization-avatars', 'organization-avatars', false, 1048576, array['image/webp'])
on conflict (id) do nothing;

create policy organization_avatar_sources_select on storage.objects for select using (
  bucket_id = 'organization-avatar-sources' and (public.is_super_admin() or public.has_organization_role(((storage.foldername(name))[1])::uuid, array['BUSINESS_OWNER','BUSINESS_ADMIN']::public.application_role[]))
);
create policy organization_avatar_sources_insert on storage.objects for insert with check (
  bucket_id = 'organization-avatar-sources' and (public.is_super_admin() or public.has_organization_role(((storage.foldername(name))[1])::uuid, array['BUSINESS_OWNER','BUSINESS_ADMIN']::public.application_role[])) and lower((storage.extension(name))) in ('jpg','jpeg','png','webp') and (metadata->>'mimetype') in ('image/jpeg','image/png','image/webp')
);
create policy organization_avatar_sources_delete on storage.objects for delete using (
  bucket_id = 'organization-avatar-sources' and (public.is_super_admin() or public.has_organization_role(((storage.foldername(name))[1])::uuid, array['BUSINESS_OWNER','BUSINESS_ADMIN']::public.application_role[]))
);
create policy organization_avatars_select on storage.objects for select using (
  bucket_id = 'organization-avatars' and (public.is_super_admin() or public.is_internal_member(((storage.foldername(name))[1])::uuid))
);
create policy organization_avatars_insert on storage.objects for insert with check (
  bucket_id = 'organization-avatars' and (public.is_super_admin() or public.has_organization_role(((storage.foldername(name))[1])::uuid, array['BUSINESS_OWNER','BUSINESS_ADMIN']::public.application_role[])) and lower((storage.extension(name))) = 'webp' and (metadata->>'mimetype') = 'image/webp'
);
create policy organization_avatars_delete on storage.objects for delete using (
  bucket_id = 'organization-avatars' and (public.is_super_admin() or public.has_organization_role(((storage.foldername(name))[1])::uuid, array['BUSINESS_OWNER','BUSINESS_ADMIN']::public.application_role[]))
);
