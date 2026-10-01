import { NextResponse } from "next/server";

import type { RegistrationTicket } from "@/lib/registration";
import { createSupabasePublicClient, registrationEventId } from "@/lib/supabase/public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type TicketRow = {
  registration_code: string;
  qr_payload: string;
  full_name: string;
  level: string | null;
};

const unavailable = () =>
  NextResponse.json({ error: "Ticket retrieval is temporarily unavailable." }, { status: 503 });

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (!emailPattern.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid registration email address." }, { status: 400 });
  }

  let supabase;
  let eventId;
  try {
    supabase = createSupabasePublicClient();
    eventId = registrationEventId();
  } catch {
    return unavailable();
  }

  const { data, error } = await supabase.rpc("self_registration_tickets", {
    p_event_id: eventId,
    p_email: email
  });

  if (error) {
    if (error.hint === "invalid-email") {
      return NextResponse.json({ error: "Enter a valid registration email address." }, { status: 400 });
    }
    console.error("Sajal ticket lookup failed:", error.message);
    return unavailable();
  }

  const tickets: RegistrationTicket[] = ((data ?? []) as TicketRow[]).map((row) => ({
    fullName: row.full_name,
    level: row.level ?? "",
    reference: row.registration_code,
    qrPayload: row.qr_payload
  }));

  return NextResponse.json({ tickets }, { headers: { "Cache-Control": "no-store" } });
}
