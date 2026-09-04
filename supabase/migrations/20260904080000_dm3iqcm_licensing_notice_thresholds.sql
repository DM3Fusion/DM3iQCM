alter table public.organization_licenses
  add column notification_thresholds integer[] not null default array[60,30,14,7,3,1]::integer[],
  add constraint organization_licenses_notification_thresholds_check check (notification_thresholds <@ array[60,30,14,7,3,1]::integer[] and cardinality(notification_thresholds) > 0);
