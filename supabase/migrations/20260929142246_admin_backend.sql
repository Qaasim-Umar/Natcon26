create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'check_in' check (role in ('admin', 'check_in', 'payment')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.attendees
  add column payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'refunded')),
  add column amount_paid integer check (amount_paid is null or amount_paid >= 0),
  add column payment_method text check (payment_method is null or payment_method in ('Bank transfer', 'POS', 'Cash')),
  add column payment_reference text,
  add column payment_confirmed_at timestamptz,
  add column payment_confirmed_by uuid references public.admin_profiles(user_id),
  add column checked_in_at timestamptz,
  add column checked_in_by uuid references public.admin_profiles(user_id);

create table public.admin_actions (
  id bigint generated always as identity primary key,
  attendee_id uuid not null references public.attendees(id) on delete cascade,
  admin_user_id uuid not null references public.admin_profiles(user_id),
  action text not null check (action in ('payment_confirmed', 'checked_in')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index attendees_payment_status_idx on public.attendees(payment_status);
create index attendees_checked_in_at_idx on public.attendees(checked_in_at);
create index admin_actions_attendee_id_idx on public.admin_actions(attendee_id);
create index admin_actions_admin_user_id_idx on public.admin_actions(admin_user_id);

alter table public.admin_profiles enable row level security;
alter table public.admin_actions enable row level security;

revoke all on table public.admin_profiles from anon, authenticated;
revoke all on table public.admin_actions from anon, authenticated;
revoke all on table public.attendees from anon, authenticated;
grant select, insert, update, delete on table public.admin_profiles to service_role;
grant select, insert, update, delete on table public.admin_actions to service_role;
grant select, insert, update, delete on table public.attendees to service_role;
grant usage, select on sequence public.admin_actions_id_seq to service_role;

create or replace function public.record_attendee_payment(
  p_attendee_id uuid,
  p_admin_user_id uuid,
  p_amount_paid integer,
  p_payment_method text,
  p_payment_reference text
)
returns public.attendees
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_attendee public.attendees;
begin
  if not exists (
    select 1 from public.admin_profiles
    where user_id = p_admin_user_id and active = true and role in ('admin', 'payment')
  ) then
    raise exception 'Admin is not authorized to record payments';
  end if;

  if p_amount_paid <> 8000 then raise exception 'Payment amount must be 8000'; end if;
  if p_payment_method not in ('Bank transfer', 'POS', 'Cash') then raise exception 'Invalid payment method'; end if;
  if p_payment_method <> 'Cash' and nullif(trim(p_payment_reference), '') is null then
    raise exception 'A transaction reference is required';
  end if;

  update public.attendees
  set payment_status = 'paid',
      amount_paid = p_amount_paid,
      payment_method = p_payment_method,
      payment_reference = nullif(trim(p_payment_reference), ''),
      payment_confirmed_at = now(),
      payment_confirmed_by = p_admin_user_id
  where id = p_attendee_id and payment_status = 'pending'
  returning * into v_attendee;

  if v_attendee.id is null then raise exception 'Attendee is missing or payment is already recorded'; end if;

  insert into public.admin_actions(attendee_id, admin_user_id, action, details)
  values (p_attendee_id, p_admin_user_id, 'payment_confirmed', jsonb_build_object(
    'amount', p_amount_paid, 'method', p_payment_method, 'reference', p_payment_reference
  ));

  return v_attendee;
end;
$$;

create or replace function public.check_in_attendee(
  p_attendee_id uuid,
  p_admin_user_id uuid
)
returns public.attendees
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_attendee public.attendees;
begin
  if not exists (
    select 1 from public.admin_profiles
    where user_id = p_admin_user_id and active = true and role in ('admin', 'check_in')
  ) then
    raise exception 'Admin is not authorized to check in attendees';
  end if;

  update public.attendees
  set checked_in_at = now(), checked_in_by = p_admin_user_id
  where id = p_attendee_id and payment_status = 'paid' and checked_in_at is null
  returning * into v_attendee;

  if v_attendee.id is null then raise exception 'Attendee is unpaid, missing, or already checked in'; end if;

  insert into public.admin_actions(attendee_id, admin_user_id, action)
  values (p_attendee_id, p_admin_user_id, 'checked_in');

  return v_attendee;
end;
$$;

revoke all on function public.record_attendee_payment(uuid, uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.check_in_attendee(uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_attendee_payment(uuid, uuid, integer, text, text) to service_role;
grant execute on function public.check_in_attendee(uuid, uuid) to service_role;
