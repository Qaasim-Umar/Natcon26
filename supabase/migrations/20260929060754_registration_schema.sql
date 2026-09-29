create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  registration_reference text not null unique,
  primary_email text not null,
  attendee_count smallint not null check (attendee_count between 1 and 10),
  unit_price integer not null default 8000 check (unit_price > 0),
  total_amount integer not null check (total_amount > 0),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'refunded')),
  created_at timestamptz not null default now()
);

create table if not exists public.attendees (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  position smallint not null check (position between 1 and 10),
  full_name text not null,
  email text not null,
  phone text not null,
  gender text not null check (gender in ('female', 'male', 'prefer-not-to-say')),
  category text not null check (category in ('school-leaver', 'undergraduate', 'postgraduate', 'other')),
  institution text,
  state text not null,
  ticket_reference text not null unique,
  created_at timestamptz not null default now(),
  unique (registration_id, position)
);

create index if not exists registrations_primary_email_idx on public.registrations (lower(primary_email));
create index if not exists attendees_email_idx on public.attendees (lower(email));
create index if not exists attendees_registration_id_idx on public.attendees (registration_id);

alter table public.registrations enable row level security;
alter table public.attendees enable row level security;

revoke all on table public.registrations from anon, authenticated;
revoke all on table public.attendees from anon, authenticated;
grant select, insert, update, delete on table public.registrations to service_role;
grant select, insert, update, delete on table public.attendees to service_role;

create or replace function public.create_registration(
  p_registration_reference text,
  p_primary_email text,
  p_unit_price integer,
  p_attendees jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_registration_id uuid;
  v_attendee_count integer;
  v_tickets jsonb;
begin
  if jsonb_typeof(p_attendees) <> 'array' then
    raise exception 'Attendees must be a JSON array';
  end if;

  v_attendee_count := jsonb_array_length(p_attendees);
  if v_attendee_count < 1 or v_attendee_count > 10 then
    raise exception 'Attendee count must be between 1 and 10';
  end if;

  insert into public.registrations (
    registration_reference,
    primary_email,
    attendee_count,
    unit_price,
    total_amount
  ) values (
    p_registration_reference,
    lower(trim(p_primary_email)),
    v_attendee_count,
    p_unit_price,
    p_unit_price * v_attendee_count
  ) returning id into v_registration_id;

  insert into public.attendees (
    registration_id,
    position,
    full_name,
    email,
    phone,
    gender,
    category,
    institution,
    state,
    ticket_reference
  )
  select
    v_registration_id,
    item.position,
    item.full_name,
    lower(trim(item.email)),
    item.phone,
    item.gender,
    item.category,
    item.institution,
    item.state,
    item.ticket_reference
  from jsonb_to_recordset(p_attendees) as item(
    position smallint,
    full_name text,
    email text,
    phone text,
    gender text,
    category text,
    institution text,
    state text,
    ticket_reference text
  );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'fullName', attendee.full_name,
        'email', attendee.email,
        'phone', attendee.phone,
        'gender', attendee.gender,
        'category', attendee.category,
        'institution', coalesce(attendee.institution, ''),
        'state', attendee.state,
        'reference', attendee.ticket_reference
      ) order by attendee.position
    ),
    '[]'::jsonb
  ) into v_tickets
  from public.attendees as attendee
  where attendee.registration_id = v_registration_id;

  return jsonb_build_object(
    'registrationReference', p_registration_reference,
    'paymentStatus', 'pending',
    'totalAmount', p_unit_price * v_attendee_count,
    'tickets', v_tickets
  );
end;
$$;

revoke all on function public.create_registration(text, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.create_registration(text, text, integer, jsonb) to service_role;
