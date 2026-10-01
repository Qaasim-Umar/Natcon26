export const MAX_REGISTRATION_ATTENDEES = 10;

// One attendee as the form sends it. The same details Sajal's app takes at
// the gate, less the house, the notes and the payment, which are the gate's.
export type RegistrationAttendee = {
  fullName: string;
  gender: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  institution: string;
  course: string;
  level: string;
  stateOfOrigin: string;
  stateOfResidence: string;
  timesAttended: number;
};

// What the website shows for one attendee after registering or looking a
// ticket up. `reference` is Sajal's six-character check-in code, and the QR
// encodes `qrPayload` exactly as the database returned it.
export type RegistrationTicket = {
  fullName: string;
  level: string;
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

// Suggestions for the level field; anything else can be typed. The same list
// as the Sajal app's StudyLevels: university years, then a polytechnic's ND
// and HND years, then a college of education's NCE years.
export const LEVELS = [
  "100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "600 Level",
  "ND 1", "ND 2", "HND 1", "HND 2", "NCE 1", "NCE 2", "NCE 3",
  "Pre-degree", "PGD", "Masters", "PhD", "Graduate", "Secondary school", "Secondary school leaver"
] as const;

// Sajal stores states by code. The form shows names.
export const STATE_CODES: Record<string, string> = {
  Abia: "AB", Adamawa: "AD", "Akwa Ibom": "AK", Anambra: "AN", Bauchi: "BA", Bayelsa: "BY",
  Benue: "BE", Borno: "BO", "Cross River": "CR", Delta: "DE", Ebonyi: "EB", Edo: "ED",
  Ekiti: "EK", Enugu: "EN", "FCT Abuja": "FC", Gombe: "GO", Imo: "IM", Jigawa: "JI",
  Kaduna: "KD", Kano: "KN", Katsina: "KT", Kebbi: "KE", Kogi: "KO", Kwara: "KW", Lagos: "LA",
  Nasarawa: "NA", Niger: "NI", Ogun: "OG", Ondo: "ON", Osun: "OS", Oyo: "OY", Plateau: "PL",
  Rivers: "RI", Sokoto: "SO", Taraba: "TA", Yobe: "YO", Zamfara: "ZA"
};

// The order the state lists show, as in the Sajal app: the South West first,
// Oyo then Osun, then the North Central, Kwara first, then the rest by name.
// That is where most attendees come from.
const SOUTH_WEST = ["Oyo", "Osun", "Ekiti", "Lagos", "Ogun", "Ondo"];
const NORTH_CENTRAL = ["Kwara", "Benue", "FCT Abuja", "Kogi", "Nasarawa", "Niger", "Plateau"];
export const STATE_NAMES: readonly string[] = [
  ...SOUTH_WEST,
  ...NORTH_CENTRAL,
  ...Object.keys(STATE_CODES)
    .filter((name) => !SOUTH_WEST.includes(name) && !NORTH_CENTRAL.includes(name))
    .sort((a, b) => a.localeCompare(b))
];

const allowedGenders = new Set(["female", "male"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

// A date of birth is optional; when given it must be a real day, from 1900 to
// today, which is what Sajal accepts.
const validDateOfBirth = (value: string) => {
  if (!value) return true;
  if (!datePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === value
    && value >= "1900-01-01"
    && date.getTime() <= Date.now();
};

const wholeNumber = (value: unknown) => {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  return /^\d{1,3}$/.test(text) ? Number(text) : Number.NaN;
};

export function parseRegistrationAttendees(input: unknown): RegistrationAttendee[] | null {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_REGISTRATION_ATTENDEES) return null;

  const attendees = input.map((value) => {
    if (!value || typeof value !== "object") return null;
    const item = value as Record<string, unknown>;
    const attendee: RegistrationAttendee = {
      fullName: clean(item.fullName, 150),
      gender: clean(item.gender, 24),
      email: clean(item.email, 254).toLowerCase(),
      phone: clean(item.phone, 32),
      dateOfBirth: clean(item.dateOfBirth, 10),
      institution: clean(item.institution, 200),
      course: clean(item.course, 200),
      level: clean(item.level, 50),
      stateOfOrigin: clean(item.stateOfOrigin, 64),
      stateOfResidence: clean(item.stateOfResidence, 64),
      timesAttended: wholeNumber(item.timesAttended ?? 0)
    };

    if (
      attendee.fullName.length < 2 ||
      !allowedGenders.has(attendee.gender) ||
      !emailPattern.test(attendee.email) ||
      attendee.phone.length < 7 ||
      !validDateOfBirth(attendee.dateOfBirth) ||
      !attendee.level ||
      (attendee.stateOfOrigin !== "" && !(attendee.stateOfOrigin in STATE_CODES)) ||
      !(attendee.stateOfResidence in STATE_CODES) ||
      !(attendee.timesAttended >= 0 && attendee.timesAttended <= 100)
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
