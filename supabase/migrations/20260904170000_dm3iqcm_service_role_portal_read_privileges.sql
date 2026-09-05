-- Server-only portal context reads use service_role after UUID-scoped portal-link validation.
grant select on public.organizations, public.customers, public.organization_settings to service_role;
