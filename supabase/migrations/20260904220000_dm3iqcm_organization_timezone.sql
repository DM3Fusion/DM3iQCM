-- Organization-local time configuration. Timestamps remain UTC/timestamptz.
alter table public.organizations add column if not exists business_postal_code text;
alter table public.organization_settings add column if not exists timezone_source text not null default 'DEFAULT' check (timezone_source in ('ZIP','MANUAL','DEFAULT'));
alter table public.organization_settings add column if not exists timezone_resolved_from_postal_code text;
comment on column public.organization_settings.timezone is 'Effective IANA timezone; presentation only, never a storage timezone.';
comment on column public.organization_settings.timezone_source is 'ZIP for automatic resolution, MANUAL for explicit override, DEFAULT when no valid ZIP is available.';
