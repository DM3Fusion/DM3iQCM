-- DM3iQCM-06A.10A: authoritative customer identity allocation and mutation hardening.

create table public.organization_customer_annual_number_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  calendar_year integer not null check (calendar_year between 2000 and 9999),
  customer_type public.customer_type not null check (customer_type in ('INDIVIDUAL', 'BUSINESS')),
  next_number bigint not null default 1 check (next_number > 0),
  primary key (organization_id, calendar_year, customer_type)
);

alter table public.organization_customer_annual_number_counters enable row level security;
revoke all on public.organization_customer_annual_number_counters from public, anon, authenticated;

comment on table public.organization_customer_annual_number_counters is
  'Private transactional allocator for organization-, UTC calendar-year-, and customer-type-scoped customer numbers.';

create or replace function public.next_customer_number(
  target_organization_id uuid,
  target_type public.customer_type
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  allocation_year integer := extract(year from transaction_timestamp() at time zone 'UTC')::integer;
  allocated bigint;
  prefix text;
begin
  if target_type is null or target_type not in ('INDIVIDUAL', 'BUSINESS') then
    raise exception 'invalid customer type' using errcode = '22023';
  end if;

  insert into public.organization_customer_annual_number_counters (
    organization_id,
    calendar_year,
    customer_type,
    next_number
  ) values (
    target_organization_id,
    allocation_year,
    target_type,
    2
  )
  on conflict (organization_id, calendar_year, customer_type)
  do update set next_number = public.organization_customer_annual_number_counters.next_number + 1
  returning next_number - 1 into allocated;

  if allocated > 999 then
    raise exception 'annual customer number capacity reached' using errcode = '22003';
  end if;

  prefix := case target_type when 'INDIVIDUAL' then 'I' else 'B' end;
  return prefix || allocation_year::text || lpad(allocated::text, 3, '0');
end
$$;

revoke all on function public.next_customer_number(uuid, public.customer_type) from public, anon, authenticated;

create or replace function public.protect_customer_identity_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.customer_number is distinct from old.customer_number
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception 'customer identity fields are immutable' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger customers_protect_identity_fields
before update of organization_id, customer_number, created_by_user_id, created_at
on public.customers
for each row execute function public.protect_customer_identity_fields();

create or replace function public.create_customer_record(
  target_organization_id uuid,
  target_type public.customer_type,
  target_name text,
  target_email text default null,
  target_phone text default null,
  target_notes text default null
) returns public.customers
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_email text := lower(trim(coalesce(target_email, '')));
  phone_source text := trim(coalesce(target_phone, ''));
  normalized_phone text;
  created public.customers;
begin
  if actor is null
    or (not public.is_internal_member(target_organization_id, actor)
      and not public.is_super_admin(actor)) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if target_type is null or target_type not in ('INDIVIDUAL', 'BUSINESS') then
    raise exception 'invalid customer type' using errcode = '22023';
  end if;

  if normalized_email = ''
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid customer email' using errcode = '22023';
  end if;

  if phone_source !~ '^([0-9]{10}|[0-9]{3}[- ][0-9]{3}[- ][0-9]{4}|\([0-9]{3}\)[ -][0-9]{3}[- ][0-9]{4}|\+1[ -][0-9]{3}[- ][0-9]{3}[- ][0-9]{4}|\+1[ -]\([0-9]{3}\)[ -][0-9]{3}[- ][0-9]{4})$' then
    raise exception 'invalid customer phone' using errcode = '22023';
  end if;
  normalized_phone := regexp_replace(phone_source, '[^0-9]', '', 'g');
  if length(normalized_phone) not in (10, 11)
    or (length(normalized_phone) = 11 and left(normalized_phone, 1) <> '1') then
    raise exception 'invalid customer phone' using errcode = '22023';
  end if;

  insert into public.customers (
    organization_id,
    customer_number,
    type,
    name,
    email,
    phone,
    notes,
    created_by_user_id
  ) values (
    target_organization_id,
    public.next_customer_number(target_organization_id, target_type),
    target_type,
    trim(target_name),
    normalized_email,
    normalized_phone,
    nullif(trim(target_notes), ''),
    actor
  ) returning * into created;

  return created;
end
$$;

revoke insert on public.customers from authenticated;
revoke all on function public.create_customer_record(uuid, public.customer_type, text, text, text, text) from public, anon;
grant execute on function public.create_customer_record(uuid, public.customer_type, text, text, text, text) to authenticated;

comment on function public.create_customer_record(uuid, public.customer_type, text, text, text, text) is
  'Creates INDIVIDUAL or BUSINESS customers with validated contact data, immutable identity attribution, and transactional annual numbering.';
