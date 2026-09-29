import type { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminLogin } from "@/components/AdminLogin";
import { getAdminSession } from "@/lib/supabase/admin-auth";

export const metadata: Metadata = {
  title: "NATCON 2026 — Admin Check-in",
  description: "NATCON 2026 attendee management and event check-in."
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getAdminSession();
  return admin ? <AdminDashboard admin={admin} /> : <AdminLogin />;
}
