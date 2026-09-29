import type { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";

export const metadata: Metadata = {
  title: "NATCON 2026 — Admin Check-in",
  description: "NATCON 2026 attendee management and event check-in."
};

export default function AdminPage() {
  return <AdminDashboard />;
}
