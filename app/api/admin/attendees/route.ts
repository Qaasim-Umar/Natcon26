import { NextResponse } from "next/server";

import { ADMIN_ATTENDEE_SELECT, mapAdminAttendee } from "@/lib/admin";
import { getAdminSession } from "@/lib/supabase/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await createSupabaseServerClient()
    .from("attendees")
    .select(ADMIN_ATTENDEE_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin attendee list failed:", error.message);
    return NextResponse.json({ error: "Attendee records could not be loaded." }, { status: 503 });
  }

  return NextResponse.json(
    { admin, attendees: (data ?? []).map((row) => mapAdminAttendee(row as never)) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
