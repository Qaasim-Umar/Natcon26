import "server-only";

import type { AdminProfile } from "@/lib/admin";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAdminSession(): Promise<AdminProfile | null> {
  try {
    const authClient = await createSupabaseAuthServerClient();
    const { data, error } = await authClient.auth.getClaims();
    const userId = data?.claims?.sub;
    if (error || !userId) return null;

    const { data: profile, error: profileError } = await createSupabaseServerClient()
      .from("admin_profiles")
      .select("user_id, full_name, role, active")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle();

    if (profileError || !profile) return null;
    return { userId: profile.user_id, fullName: profile.full_name, role: profile.role } as AdminProfile;
  } catch {
    return null;
  }
}
