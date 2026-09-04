-- Licensing tables are RLS-protected, but authenticated also needs table privileges.
grant select on public.organization_licenses, public.organization_license_events to authenticated;
revoke insert, update, delete on public.organization_licenses, public.organization_license_events from authenticated;
