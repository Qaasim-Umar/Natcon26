import { NextResponse } from "next/server";

import { ADMIN_ATTENDEE_SELECT, mapAdminAttendee, type PaymentMethod } from "@/lib/admin";
import { getAdminSession } from "@/lib/supabase/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedMethods = new Set<PaymentMethod>(["Bank transfer", "POS", "Cash"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => null) as {
    action?: "payment" | "check-in";
    amountPaid?: number;
    paymentMethod?: PaymentMethod;
    paymentReference?: string;
  } | null;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !body?.action) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  let mutationError: { message: string } | null = null;

  if (body.action === "payment") {
    if (body.amountPaid !== 8000 || !body.paymentMethod || !allowedMethods.has(body.paymentMethod)) {
      return NextResponse.json({ error: "Enter valid payment details." }, { status: 400 });
    }
    const result = await supabase.rpc("record_attendee_payment", {
      p_admin_user_id: admin.userId,
      p_amount_paid: body.amountPaid,
      p_attendee_id: id,
      p_payment_method: body.paymentMethod,
      p_payment_reference: body.paymentReference?.trim() ?? ""
    });
    mutationError = result.error;
  } else if (body.action === "check-in") {
    const result = await supabase.rpc("check_in_attendee", {
      p_admin_user_id: admin.userId,
      p_attendee_id: id
    });
    mutationError = result.error;
  } else {
    return NextResponse.json({ error: "Unknown admin action." }, { status: 400 });
  }

  if (mutationError) {
    return NextResponse.json({ error: mutationError.message }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("attendees")
    .select(ADMIN_ATTENDEE_SELECT)
    .eq("id", id)
    .single();
  if (error || !data) return NextResponse.json({ error: "The updated attendee could not be loaded." }, { status: 503 });

  return NextResponse.json({ attendee: mapAdminAttendee(data as never) }, { headers: { "Cache-Control": "no-store" } });
}
