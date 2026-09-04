-- DM3iQCM-05D prerequisite
-- Permit the trusted server-only Supabase service role to provision
-- application profiles for Auth users.

grant select, insert, update
on table public.profiles
to service_role;

comment on table public.profiles is
  'Application identity profile. Authenticated access remains RLS-controlled; trusted server-side service_role access supports user provisioning.';
