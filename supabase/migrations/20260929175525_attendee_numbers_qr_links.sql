alter table public.attendees
  add column attendee_number bigint generated always as identity;

alter table public.attendees
  add constraint attendees_attendee_number_key unique (attendee_number);

grant usage, select on sequence public.attendees_attendee_number_seq to service_role;

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
        'attendeeNumber', attendee.attendee_number,
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
