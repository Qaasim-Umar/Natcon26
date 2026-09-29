export type AdminRole = "admin" | "check_in" | "payment";
export type PaymentMethod = "Bank transfer" | "POS" | "Cash";

export type AdminAttendee = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  category: string;
  institution: string;
  state: string;
  reference: string;
  paymentStatus: "Paid" | "Pending" | "Refunded";
  amountPaid?: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentConfirmedAt?: string;
  paymentConfirmedBy?: string;
  checkedIn: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
};

export type AdminProfile = {
  userId: string;
  fullName: string;
  role: AdminRole;
};

export const ADMIN_ATTENDEE_SELECT = `
  id, full_name, email, phone, gender, category, institution, state, ticket_reference,
  payment_status, amount_paid, payment_method, payment_reference, payment_confirmed_at, checked_in_at,
  payment_admin:admin_profiles!attendees_payment_confirmed_by_fkey(full_name),
  checkin_admin:admin_profiles!attendees_checked_in_by_fkey(full_name)
`;

type AttendeeRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  category: string;
  institution: string | null;
  state: string;
  ticket_reference: string;
  payment_status: "pending" | "paid" | "refunded";
  amount_paid: number | null;
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  payment_confirmed_at: string | null;
  checked_in_at: string | null;
  payment_admin?: { full_name: string } | Array<{ full_name: string }> | null;
  checkin_admin?: { full_name: string } | Array<{ full_name: string }> | null;
};

const relationName = (value: AttendeeRow["payment_admin"]) =>
  Array.isArray(value) ? value[0]?.full_name : value?.full_name;

const categoryLabel = (value: string) => ({
  "school-leaver": "Secondary school leaver",
  undergraduate: "Undergraduate",
  postgraduate: "Postgraduate student",
  other: "Other"
}[value] ?? value);

const formatTimestamp = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-NG", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(value))
  : undefined;

export function mapAdminAttendee(row: AttendeeRow): AdminAttendee {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    gender: row.gender,
    category: categoryLabel(row.category),
    institution: row.institution ?? "",
    state: row.state,
    reference: row.ticket_reference,
    paymentStatus: row.payment_status === "paid" ? "Paid" : row.payment_status === "refunded" ? "Refunded" : "Pending",
    amountPaid: row.amount_paid ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    paymentReference: row.payment_reference ?? undefined,
    paymentConfirmedAt: formatTimestamp(row.payment_confirmed_at),
    paymentConfirmedBy: relationName(row.payment_admin),
    checkedIn: Boolean(row.checked_in_at),
    checkedInAt: formatTimestamp(row.checked_in_at),
    checkedInBy: relationName(row.checkin_admin)
  };
}
