import { NextResponse } from "next/server";

import {
  parseRegistrationAttendees,
  REGISTRATION_PRICE,
  type RegistrationTicket
} from "@/lib/registration";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const unavailable = () => NextResponse.json(
  { error: "Registration is temporarily unavailable. Please try again shortly." },
  { status: 503 }
);

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
  try {
    supabase = createSupabaseServerClient();
  } catch {
    return unavailable();
  }

  const registrationReference = `REG-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const databaseAttendees = attendees.map((attendee, index) => ({
    position: index + 1,
    full_name: attendee.fullName,
    email: attendee.email,
    phone: attendee.phone,
    gender: attendee.gender,
    category: attendee.category,
    institution: attendee.institution || null,
    state: attendee.state,
    ticket_reference: `NAT26-${String(index + 1).padStart(3, "0")}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`
  }));

  const { data, error } = await supabase.rpc("create_registration", {
    p_attendees: databaseAttendees,
    p_primary_email: attendees[0].email,
    p_registration_reference: registrationReference,
    p_unit_price: REGISTRATION_PRICE
  });

  if (error || !data || typeof data !== "object") {
    console.error("Supabase registration insert failed:", error?.message ?? "No data returned");
    return unavailable();
  }

  const result = data as { tickets?: RegistrationTicket[] };
  if (!Array.isArray(result.tickets)) return unavailable();

  return NextResponse.json(data, { status: 201 });
}
