import { NextResponse } from "next/server";

import type { RegistrationTicket } from "@/lib/registration";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ticketColumns = "registration_id, attendee_number, full_name, email, phone, gender, category, institution, state, ticket_reference, position";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type TicketRow = {
  registration_id: string;
  attendee_number: number;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  category: string;
  institution: string | null;
  state: string;
  ticket_reference: string;
  position: number;
};

const toTicket = (row: TicketRow): RegistrationTicket => ({
  attendeeNumber: row.attendee_number,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  gender: row.gender,
  category: row.category,
  institution: row.institution ?? "",
  state: row.state,
  reference: row.ticket_reference
});

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (!emailPattern.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid registration email address." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch {
    return NextResponse.json({ error: "Ticket retrieval is temporarily unavailable." }, { status: 503 });
  }

  const [ownTicketResult, registrationsResult] = await Promise.all([
    supabase.from("attendees").select(ticketColumns).eq("email", email),
    supabase.from("registrations").select("id").eq("primary_email", email)
  ]);

  if (ownTicketResult.error || registrationsResult.error) {
    console.error("Supabase ticket lookup failed:", ownTicketResult.error?.message ?? registrationsResult.error?.message);
    return NextResponse.json({ error: "Ticket retrieval is temporarily unavailable." }, { status: 503 });
  }

  const registrationIds = (registrationsResult.data ?? []).map((row) => row.id);
  let groupRows: TicketRow[] = [];

  if (registrationIds.length) {
    const groupResult = await supabase
      .from("attendees")
      .select(ticketColumns)
      .in("registration_id", registrationIds)
      .order("position", { ascending: true });

    if (groupResult.error) {
      console.error("Supabase group ticket lookup failed:", groupResult.error.message);
      return NextResponse.json({ error: "Ticket retrieval is temporarily unavailable." }, { status: 503 });
    }
    groupRows = (groupResult.data ?? []) as TicketRow[];
  }

  const rows = [...((ownTicketResult.data ?? []) as TicketRow[]), ...groupRows];
  const unique = [...new Map(rows.map((row) => [row.ticket_reference, row])).values()];

  return NextResponse.json(
    { tickets: unique.map(toTicket) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
