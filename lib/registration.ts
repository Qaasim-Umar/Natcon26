export const MAX_REGISTRATION_ATTENDEES = 10;

export type RegistrationAttendee = {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  category: string;
  institution: string;
  state: string;
};

// What the website shows for one attendee after registering or looking a
// ticket up. `reference` is Sajal's six-character check-in code, and the QR
// encodes `qrPayload` exactly as the database returned it.
export type RegistrationTicket = {
  fullName: string;
  category: string;
  reference: string;
  qrPayload: string;
};

// The event the website registers people for, as Sajal describes it.
export type RegistrationEvent = {
  id: string;
  name: string;
  feeNaira: number;
  registrationOpen: boolean;
};

// Used by the admin portal, which still reads the old project's attendee numbers.
export const formatAttendeeNumber = (value: number) =>
  Number.isFinite(value) && value > 0 ? String(value).padStart(3, "0") : "---";

// `K7Q4MZ` as `K7Q 4MZ`, which is easier to read out at the desk.
export const formatCheckInCode = (value: string) =>
  value.length === 6 ? `${value.slice(0, 3)} ${value.slice(3)}` : value;

export const CATEGORY_LABELS: Record<string, string> = {
  "school-leaver": "Secondary school leaver",
  undergraduate: "Undergraduate",
  postgraduate: "Postgraduate student",
  other: "Other"
};

export const categoryLabel = (value: string) => CATEGORY_LABELS[value] ?? value;

// Sajal stores states by code. The form shows names.
export const STATE_CODES: Record<string, string> = {
  Abia: "AB", Adamawa: "AD", "Akwa Ibom": "AK", Anambra: "AN", Bauchi: "BA", Bayelsa: "BY",
  Benue: "BE", Borno: "BO", "Cross River": "CR", Delta: "DE", Ebonyi: "EB", Edo: "ED",
  Ekiti: "EK", Enugu: "EN", "FCT Abuja": "FC", Gombe: "GO", Imo: "IM", Jigawa: "JI",
  Kaduna: "KD", Kano: "KN", Katsina: "KT", Kebbi: "KE", Kogi: "KO", Kwara: "KW", Lagos: "LA",
  Nasarawa: "NA", Niger: "NI", Ogun: "OG", Ondo: "ON", Osun: "OS", Oyo: "OY", Plateau: "PL",
  Rivers: "RI", Sokoto: "SO", Taraba: "TA", Yobe: "YO", Zamfara: "ZA"
};

const allowedGenders = new Set(["female", "male"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export function parseRegistrationAttendees(input: unknown): RegistrationAttendee[] | null {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_REGISTRATION_ATTENDEES) return null;

  const attendees = input.map((value) => {
    if (!value || typeof value !== "object") return null;
    const item = value as Record<string, unknown>;
    const attendee: RegistrationAttendee = {
      fullName: clean(item.fullName, 120),
      email: clean(item.email, 254).toLowerCase(),
      phone: clean(item.phone, 32),
      gender: clean(item.gender, 24),
      category: clean(item.category, 32),
      institution: clean(item.institution, 160),
      state: clean(item.state, 64)
    };

    if (
      attendee.fullName.length < 2 ||
      !emailPattern.test(attendee.email) ||
      attendee.phone.length < 7 ||
      !allowedGenders.has(attendee.gender) ||
      !(attendee.category in CATEGORY_LABELS) ||
      !(attendee.state in STATE_CODES)
    ) return null;

    return attendee;
  });

  return attendees.every((attendee): attendee is RegistrationAttendee => attendee !== null)
    ? attendees
    : null;
}

// Sajal refuses a second registration with the same email or phone in an
// event, so two attendees on one form cannot share either. Returns the
// 0-based index and field of the first repeat.
export function findSharedContact(attendees: Pick<RegistrationAttendee, "email" | "phone">[]) {
  const seen = { email: new Set<string>(), phone: new Set<string>() };
  for (const [index, attendee] of attendees.entries()) {
    const email = attendee.email.trim().toLowerCase();
    const phone = attendee.phone.replace(/\D/g, "").slice(-10);
    if (email && seen.email.has(email)) return { index, field: "email" as const };
    if (phone && seen.phone.has(phone)) return { index, field: "phone" as const };
    if (email) seen.email.add(email);
    if (phone) seen.phone.add(phone);
  }
  return null;
}
