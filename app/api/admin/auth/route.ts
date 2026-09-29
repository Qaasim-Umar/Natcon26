import { NextResponse } from "next/server";

import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseAuthServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });
    const { data: profile } = await createSupabaseServerClient()
      .from("admin_profiles")
      .select("user_id")
      .eq("user_id", data.user.id)
      .eq("active", true)
      .maybeSingle();
    if (!profile) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "This account does not have admin access." }, { status: 403 });
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Admin sign-in is not configured yet." }, { status: 503 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createSupabaseAuthServerClient();
    await supabase.auth.signOut();
  } catch { /* Expired sessions can still be cleared by the browser response. */ }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
