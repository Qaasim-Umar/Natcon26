import { NextResponse } from "next/server";

import {
  parseRegistrationAttendees,
  STATE_CODES,
  type RegistrationTicket
} from "@/lib/registration";
import { createSupabasePublicClient, registrationEventId } from "@/lib/supabase/public";

export const runtime = "nodejs";

const unavailable = () => NextResponse.json(
  { error: "Registration is temporarily unavailable. Please try again shortly." },
  { status: 503 }
);

// Sajal's HINT codes, in the words the form shows. See sajal_taa
// docs/self_registration.md for what each one means.
const refusals: Record<string, { message: string; status: number }> = {
  "self-registration-disabled": { message: "This event is not taking registrations online. Please register at the venue.", status: 403 },
  "registration-closed": { message: "Registration for this event is closed.", status: 403 },
  "invalid-group": { message: "Register between 1 and 10 attendees at a time.", status: 400 },
  "invalid-name": { message: "Enter the attendee's full name.", status: 400 },
  "invalid-gender": { message: "Choose male or female.", status: 400 },
  "contact-required": { message: "Enter a phone number or an email address.", status: 400 },
  "invalid-field": { message: "One of the details is not valid. Please check and try again.", status: 400 },
  "duplicate-email": { message: "This email address is already registered. Use \"Retrieve ticket\" to find the ticket, or use a different email.", status: 409 },
  "duplicate-phone": { message: "This phone number is already registered. Go to the registration desk with this number, or use a different one.", status: 409 }
};

type GroupRow = {
  attendee_index: number;
  registration_code: string;
  qr_payload: string;
  full_name: string;
};

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "The registration details could not be read." }, { status: 400 });
  }

  const attendees = parseRegistrationAttendees(
    payload && typeof payload === "object" ? (payload as { attendees?: unknown }).attendees : null
  );

  if (!attendees) {
    return NextResponse.json({ error: "Please check the attendee details and try again." }, { status: 400 });
  }

  let supabase;
  let eventId;
  try {
    supabase = createSupabasePublicClient();
    eventId = registrationEventId();
  } catch {
    return unavailable();
  }

  const { data, error } = await supabase.rpc("self_register_group", {
    p_event_id: eventId,
    p_attendees: attendees.map((attendee) => ({
      full_name: attendee.fullName,
      gender: attendee.gender,
      email: attendee.email,
      phone_number: attendee.phone,
      date_of_birth: attendee.dateOfBirth || null,
      institution: attendee.institution || null,
      course: attendee.course || null,
      level: attendee.level,
      state_of_origin: attendee.stateOfOrigin ? STATE_CODES[attendee.stateOfOrigin] : null,
      state_of_residence: STATE_CODES[attendee.stateOfResidence],
      times_attended: attendee.timesAttended
    }))
  });

  if (error) {
    const refusal = error.hint ? refusals[error.hint] : undefined;
    if (!refusal) {
      console.error("Sajal registration failed:", error.message);
      return unavailable();
    }
    const position = /^attendee:(\d+)$/.exec(error.details ?? "")?.[1];
    const message = position && attendees.length > 1
      ? `Attendee ${position}: ${refusal.message}`
      : refusal.message;
    return NextResponse.json(
      { error: message, attendee: position ? Number(position) : undefined },
      { status: refusal.status }
    );
  }

  const rows = (data ?? []) as GroupRow[];
  if (rows.length !== attendees.length) return unavailable();

  const tickets: RegistrationTicket[] = rows
    .sort((a, b) => a.attendee_index - b.attendee_index)
    .map((row) => ({
      fullName: row.full_name,
      level: attendees[row.attendee_index - 1].level,
      reference: row.registration_code,
      qrPayload: row.qr_payload
    }));

  return NextResponse.json({ tickets }, { status: 201 });
}
