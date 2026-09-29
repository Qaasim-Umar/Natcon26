export const REGISTRATION_PRICE = 8_000;
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

export type RegistrationTicket = RegistrationAttendee & {
  attendeeNumber: number;
  reference: string;
};

export const formatAttendeeNumber = (value: number) =>
  Number.isFinite(value) && value > 0 ? String(value).padStart(3, "0") : "---";

const allowedGenders = new Set(["female", "male", "prefer-not-to-say"]);
const allowedCategories = new Set(["school-leaver", "undergraduate", "postgraduate", "other"]);
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
      !allowedCategories.has(attendee.category) ||
      !attendee.state
    ) return null;

    return attendee;
  });

  return attendees.every((attendee): attendee is RegistrationAttendee => attendee !== null)
    ? attendees
    : null;
}
