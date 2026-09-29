"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

import { formatAttendeeNumber, type RegistrationTicket } from "@/lib/registration";

const PRICE_PER_ATTENDEE = 8000;
const MAX_ATTENDEES = 10;
const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara"
] as const;

type Theme = "dark" | "light";
type Attendee = {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  category: string;
  institution: string;
  state: string;
};
type StoredTicket = RegistrationTicket;
type Errors = Record<string, string>;

const emptyAttendee = (): Attendee => ({
  fullName: "", email: "", phone: "", gender: "", category: "", institution: "", state: ""
});

const formatNaira = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 })
    .format(value)
    .replace("NGN", "₦");

const categoryLabel = (value: string) => ({
  "school-leaver": "Secondary school leaver",
  undergraduate: "Undergraduate",
  postgraduate: "Postgraduate student",
  other: "Other"
}[value] ?? value);

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function TicketIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v10H4z" /><path d="M8 7V5h8v2M8 12h8" /></svg>;
}

function ThemeIcon({ theme }: { theme: Theme }) {
  return theme === "dark" ? (
    <svg className="sun-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></svg>
  ) : (
    <svg className="moon-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.4A8.5 8.5 0 0 1 8.6 4 8.5 8.5 0 1 0 20 15.4Z" /></svg>
  );
}

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a className={`brand${footer ? " brand-footer" : ""}`} href="#top" aria-label="NATCON 2026 home">
      <span className="brand-mark" aria-hidden="true">7</span>
      <span className="brand-copy"><strong>NATCON</strong><small>Reformation 2026</small></span>
    </a>
  );
}

function MockQr({ seed }: { seed: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ticketUrl = new URL("/admin", window.location.origin);
    ticketUrl.searchParams.set("ticket", seed);

    QRCode.toCanvas(canvas, ticketUrl.toString(), {
      width: 192,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#07154f", light: "#ffffff" }
    }).catch(() => {
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#07154f";
      context.font = "700 12px sans-serif";
      context.textAlign = "center";
      context.fillText("QR unavailable", canvas.width / 2, canvas.height / 2);
    });
  }, [seed]);

  return <canvas ref={canvasRef} width="192" height="192" role="img" aria-label="Ticket QR code that opens the admin attendee lookup" />;
}

function Ticket({ ticket }: { ticket: StoredTicket }) {
  const initials = ticket.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const attendeeId = formatAttendeeNumber(ticket.attendeeNumber);
  const ticketRef = useRef<HTMLElement>(null);

  const downloadTicket = () => {
    const qrSource = ticketRef.current?.querySelector("canvas");
    if (!qrSource) return;

    const output = document.createElement("canvas");
    output.width = 720;
    output.height = 1080;
    const context = output.getContext("2d");
    if (!context) return;

    const roundedBox = (x: number, y: number, width: number, height: number, radius: number, color: string) => {
      context.beginPath();
      context.roundRect(x, y, width, height, radius);
      context.fillStyle = color;
      context.fill();
    };

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, output.width, output.height);
    context.fillStyle = "#07154f";
    context.fillRect(0, 0, output.width, 170);
    context.fillStyle = "#123895";
    context.fillRect(0, 0, 14, output.height);

    context.fillStyle = "#9fd7f6";
    context.font = "800 27px Arial";
    context.fillText("7", 52, 73);
    context.fillStyle = "#ffffff";
    context.font = "800 31px Arial";
    context.fillText("NATCON 2026", 104, 69);
    context.font = "700 15px Arial";
    context.fillStyle = "rgba(255,255,255,.7)";
    context.fillText("REFORMATION · ATTENDEE PASS", 104, 99);

    roundedBox(52, 212, 116, 116, 28, "#123895");
    context.fillStyle = "#ffffff";
    context.font = "800 39px Arial";
    context.textAlign = "center";
    context.fillText(initials, 110, 282);
    context.textAlign = "left";

    context.fillStyle = "#7c8494";
    context.font = "800 14px Arial";
    context.fillText("ATTENDEE", 194, 232);
    context.fillStyle = "#07154f";
    context.font = "800 40px Arial";
    let nameSize = 40;
    while (context.measureText(ticket.fullName).width > 470 && nameSize > 25) {
      nameSize -= 1;
      context.font = `800 ${nameSize}px Arial`;
    }
    context.fillText(ticket.fullName, 194, 277);
    context.fillStyle = "#123895";
    context.font = "800 20px Arial";
    context.fillText(categoryLabel(ticket.category), 194, 312);

    context.fillStyle = "#5d6678";
    context.font = "700 19px Arial";
    context.fillText("KNOWLEDGE WITH PURPOSE", 52, 386);

    context.fillStyle = "#8a92a2";
    context.font = "800 14px Arial";
    context.fillText("DATE", 52, 438);
    context.fillText("VENUE", 360, 438);
    context.fillStyle = "#263047";
    context.font = "700 22px Arial";
    context.fillText("1–4 October 2026", 52, 474);
    context.fillText("Iwo, Osun State", 360, 474);

    context.strokeStyle = "#dfe3eb";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(52, 518);
    context.lineTo(668, 518);
    context.stroke();
    context.fillStyle = "#8a92a2";
    context.font = "800 14px Arial";
    context.fillText("ATTENDEE ID", 52, 556);
    context.fillStyle = "#0b2472";
    context.font = "800 22px Arial";
    context.fillText(attendeeId, 52, 590);

    roundedBox(108, 628, 504, 344, 28, "#07154f");
    context.fillStyle = "#9fd7f6";
    context.font = "800 16px Arial";
    context.textAlign = "center";
    context.fillText("SCAN FOR EVENT ENTRY", 360, 663);
    roundedBox(222, 685, 276, 276, 12, "#ffffff");
    context.imageSmoothingEnabled = false;
    context.drawImage(qrSource, 232, 695, 256, 256);

    context.fillStyle = "#07154f";
    context.fillRect(0, 1008, 720, 72);
    context.fillStyle = "#ffffff";
    context.font = "800 17px Arial";
    context.fillText(`ATTENDEE ${attendeeId}`, 360, 1042);
    context.font = "700 12px Arial";
    context.fillStyle = "rgba(255,255,255,.68)";
    context.fillText("PRESENT THIS PASS AT THE ENTRANCE", 360, 1064);

    output.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = ticket.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      link.href = url;
      link.download = `natcon-2026-${safeName || ticket.reference}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <div className="ticket-download-item">
    <article ref={ticketRef} className="mock-ticket" aria-label={`Attendee ID and event ticket for ${ticket.fullName}`}>
      <div className="ticket-info">
        <div className="ticket-brand-row">
          <div className="ticket-mini-brand"><span aria-hidden="true">7</span><div><strong>NATCON 2026</strong><small>Reformation</small></div></div>
          <span className="ticket-pass-label">Attendee pass</span>
        </div>
        <div className="ticket-identity">
          <div className="ticket-avatar" aria-hidden="true">{initials}</div>
          <div><span>Attendee</span><h3>{ticket.fullName}</h3><p>{categoryLabel(ticket.category)}</p></div>
        </div>
        <p className="ticket-theme">Knowledge with purpose</p>
        <div className="ticket-meta">
          <div><span>Date</span><strong>1–4 Oct 2026</strong></div>
          <div><span>Venue</span><strong>Iwo, Osun</strong></div>
        </div>
        <div className="ticket-attendee-id"><span>Attendee ID</span><strong>{attendeeId}</strong></div>
      </div>
      <div className="ticket-code">
        <span className="ticket-scan-label">Scan for entry</span>
        <MockQr seed={ticket.reference} />
        <strong>Attendee {attendeeId}</strong>
        <span>Present at entrance</span>
      </div>
    </article>
    <button className="ticket-download-button" type="button" onClick={downloadTicket} aria-label={`Download ticket for ${ticket.fullName}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 20h14" /></svg> Download ticket</button>
    </div>
  );
}

export function EventRegistration() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [attendees, setAttendees] = useState<Attendee[]>([emptyAttendee()]);
  const [errors, setErrors] = useState<Errors>({});
  const [reviewMode, setReviewMode] = useState<"review" | "tickets">("review");
  const [retrieveMode, setRetrieveMode] = useState<"search" | "result">("search");
  const [retrieveEmail, setRetrieveEmail] = useState("");
  const [retrieveError, setRetrieveError] = useState("");
  const [retrievedTickets, setRetrievedTickets] = useState<StoredTicket[]>([]);
  const [tickets, setTickets] = useState<StoredTicket[]>([]);
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const retrieveDialog = useRef<HTMLDialogElement>(null);

  const total = attendees.length * PRICE_PER_ATTENDEE;

  useEffect(() => {
    try {
      if (localStorage.getItem("natconTheme") === "light") setTheme("light");
    } catch { /* Storage is optional. */ }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f7f5ed" : "#07154f");
  }, [theme]);

  const switchTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try { localStorage.setItem("natconTheme", next); } catch { /* Storage is optional. */ }
  };

  const setCount = (count: number) => {
    const safe = Math.min(MAX_ATTENDEES, Math.max(1, count || 1));
    setAttendees((current) => Array.from({ length: safe }, (_, index) => current[index] ?? emptyAttendee()));
  };

  const updateAttendee = (index: number, field: keyof Attendee, value: string) => {
    setAttendees((current) => current.map((attendee, attendeeIndex) => attendeeIndex === index ? { ...attendee, [field]: value } : attendee));
    setErrors((current) => {
      const next = { ...current };
      delete next[`${index}.${field}`];
      return next;
    });
  };

  const validate = () => {
    const next: Errors = {};
    attendees.forEach((attendee, index) => {
      (["fullName", "email", "phone", "gender", "category", "state"] as const).forEach((field) => {
        if (!attendee[field].trim()) next[`${index}.${field}`] = "Please complete this field.";
      });
      if (attendee.email && !/^\S+@\S+\.\S+$/.test(attendee.email)) next[`${index}.email`] = "Enter a valid email address.";
    });
    setErrors(next);
    if (Object.keys(next).length) {
      const [index, field] = Object.keys(next)[0].split(".");
      document.getElementById(`${field}-${Number(index) + 1}`)?.focus();
      return false;
    }
    return true;
  };

  const openReview = (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmissionError("");
    setReviewMode("review");
    reviewDialog.current?.showModal();
    document.body.classList.add("dialog-open");
  };

  const generateTickets = async () => {
    setIsSubmitting(true);
    setSubmissionError("");

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendees })
      });
      const result = await response.json() as { error?: string; tickets?: StoredTicket[] };
      if (!response.ok || !Array.isArray(result.tickets)) {
        throw new Error(result.error || "Registration could not be completed.");
      }

      setTickets(result.tickets);
      const existing = JSON.parse(sessionStorage.getItem("natconTickets") || "[]") as StoredTicket[];
      const references = new Set(result.tickets.map((ticket) => ticket.reference));
      sessionStorage.setItem("natconTickets", JSON.stringify([...existing.filter((ticket) => !references.has(ticket.reference)), ...result.tickets]));
      setReviewMode("tickets");
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Registration could not be completed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRetrieval = () => {
    setRetrieveMode("search");
    setRetrieveEmail("");
    setRetrieveError("");
    retrieveDialog.current?.showModal();
    document.body.classList.add("dialog-open");
  };

  const retrieve = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(retrieveEmail)) {
      setRetrieveError("Enter a valid registration email address.");
      return;
    }
    setIsRetrieving(true);
    setRetrieveError("");
    try {
      const response = await fetch(`/api/tickets?email=${encodeURIComponent(retrieveEmail.trim())}`, { cache: "no-store" });
      const result = await response.json() as { error?: string; tickets?: StoredTicket[] };
      if (!response.ok) throw new Error(result.error || "Ticket retrieval is temporarily unavailable.");
      if (!result.tickets?.length) throw new Error("No ticket was found for this email address.");
      setRetrievedTickets(result.tickets);
      setRetrieveMode("result");
    } catch (error) {
      setRetrieveError(error instanceof Error ? error.message : "Ticket retrieval is temporarily unavailable.");
    } finally {
      setIsRetrieving(false);
    }
  };

  const closeDialog = (dialog: React.RefObject<HTMLDialogElement | null>) => {
    dialog.current?.close();
    document.body.classList.remove("dialog-open");
  };

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header" aria-label="Primary navigation">
        <div className="container nav-wrap">
          <Brand />
          <button className="theme-toggle" type="button" aria-pressed={theme === "light"} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} onClick={switchTheme}>
            <ThemeIcon theme={theme} /><span>{theme === "light" ? "Dark" : "Light"} theme</span>
          </button>
        </div>
      </header>

      <main id="main-content">
        <section className="hero" id="top">
          <div className="hero-orb hero-orb-one" aria-hidden="true" /><div className="hero-orb hero-orb-two" aria-hidden="true" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow"><span /> NATCON 2026 registration</p>
              <h1>Register for <em>NATCON.</em></h1>
              <p className="hero-lead">Reserve a place for yourself or register a group for the 7th Annual National Conference.</p>
              <div className="hero-actions">
                <a className="button button-primary" href="#register">Start registration <ArrowIcon /></a>
                <button className="button button-outline" type="button" onClick={openRetrieval}><TicketIcon /> Retrieve ticket</button>
              </div>
              <div className="hero-assurance"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg><span>Takes about 3 minutes · One form per attendee</span></div>
              <div className="mobile-event-summary" aria-label="Event details">
                <div><span>Date</span><strong>1–4 October 2026</strong></div><div><span>Venue</span><strong>Central Mosque, Iwo</strong></div>
              </div>
            </div>
            <aside className="event-card" aria-label="Event date and venue">
              <div className="event-card-top"><span className="event-label">Save the date</span><span className="event-year">2026</span></div>
              <div className="date-display"><strong>01</strong><div><span>October</span><small>Thursday</small></div><span className="date-arrow" aria-hidden="true">—</span><strong>04</strong><div><span>October</span><small>Sunday</small></div></div>
              <div className="event-card-divider" />
              <div className="event-detail"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg><p><span>Venue</span>Shaykh Idrees Fazazi Mogaji Central Mosque, Iwo, Osun State</p></div>
              <div className="event-detail"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg><p><span>Programme</span>Daily sessions &amp; activities</p></div>
              <div className="event-card-note">Hosted by The Achiever Ambassadors Islamic Foundation</div>
            </aside>
          </div>
        </section>

        <section className="registration section" id="register">
          <div className="container registration-shell">
            <div className="registration-heading"><p className="kicker">Registration</p><h2>Who are you registering?</h2><p>Complete one short form for each attendee. You can register yourself, someone else, or a group.</p></div>
            <form onSubmit={openReview} noValidate>
              <div className="attendee-picker">
                <div><label htmlFor="attendee-count">How many people are you registering?</label><p>Select between 1 and 10 attendees.</p></div>
                <div className="stepper" role="group" aria-label="Number of attendees">
                  <button type="button" onClick={() => setCount(attendees.length - 1)} disabled={attendees.length === 1} aria-label="Decrease attendee count">−</button>
                  <input id="attendee-count" type="number" min="1" max="10" value={attendees.length} onChange={(event) => setCount(Number(event.target.value))} inputMode="numeric" />
                  <button type="button" onClick={() => setCount(attendees.length + 1)} disabled={attendees.length === MAX_ATTENDEES} aria-label="Increase attendee count">+</button>
                </div>
              </div>

              <div className="attendee-forms">
                {attendees.map((attendee, index) => <AttendeeForm key={index} attendee={attendee} index={index} errors={errors} update={updateAttendee} />)}
              </div>
              <div className="checkout-card">
                <div className="checkout-total"><span>Total registration fee</span><strong>{formatNaira(total)}</strong><small>{attendees.length} {attendees.length === 1 ? "attendee" : "attendees"} × {formatNaira(PRICE_PER_ATTENDEE)}</small></div>
                <button className="button button-primary button-submit" type="submit">Review registration <ArrowIcon /></button>
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer"><div className="container footer-grid"><div><Brand footer /><p>Raising responsible Muslim leaders.</p></div><div><h3>Enquiries &amp; sponsorship</h3><a href="tel:+2349152677650">0915 267 7650</a><a href="tel:+2348132444849">0813 244 4849</a><a href="tel:+2348136436127">0813 643 6127</a></div><div><h3>Event team</h3><a href="/admin">Admin portal</a></div></div><div className="container footer-bottom"><span>© 2026 The Achiever Ambassadors Islamic Foundation</span></div></footer>

      <dialog ref={reviewDialog} aria-labelledby="dialog-title" onClose={() => document.body.classList.remove("dialog-open")}>
        {reviewMode === "review" ? (
          <section><div className="dialog-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg></div><p className="kicker">Review registration</p><h2 id="dialog-title">Check the details before submitting.</h2><p>You are registering {attendees.length} {attendees.length === 1 ? "attendee" : "attendees"} for {formatNaira(total)}.</p><div className="review-attendees">{attendees.map((attendee, index) => <div className="review-attendee" key={index}><div><strong>{attendee.fullName}</strong><span>{categoryLabel(attendee.category)} · {attendee.email} · {attendee.phone}</span></div><small>Attendee {index + 1}</small></div>)}</div><div className="review-total"><span>Total</span><strong>{formatNaira(total)}</strong></div><p className="dialog-submit-error" role="alert">{submissionError}</p><div className="dialog-actions"><button className="button button-secondary" type="button" onClick={() => closeDialog(reviewDialog)} disabled={isSubmitting}>Edit details</button><button className="button button-primary" type="button" onClick={generateTickets} disabled={isSubmitting}>{isSubmitting ? "Submitting…" : "Submit & generate ticket"}</button></div></section>
        ) : (
          <section><div className="dialog-icon ticket-success-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg></div><p className="kicker">Registration complete</p><h2 id="dialog-title">Your tickets are ready.</h2><p>Keep each attendee&apos;s ticket available for the event.</p><div className="ticket-list">{tickets.map((ticket) => <Ticket key={ticket.reference} ticket={ticket} />)}</div><div className="dialog-actions"><button className="button button-secondary" type="button" onClick={() => setReviewMode("review")}>Back to review</button><button className="button button-primary" type="button" onClick={() => closeDialog(reviewDialog)}>Done</button></div></section>
        )}
      </dialog>

      <dialog ref={retrieveDialog} aria-labelledby="retrieve-title" onClose={() => document.body.classList.remove("dialog-open")}>
        <button className="dialog-close" type="button" aria-label="Close ticket retrieval" onClick={() => closeDialog(retrieveDialog)}>×</button>
        {retrieveMode === "search" ? (
          <section><p className="kicker">Ticket retrieval</p><h2 id="retrieve-title">Find your ticket.</h2><p>Enter the same email address used during registration.</p><form className="retrieve-form" onSubmit={retrieve} noValidate><div className="field"><label htmlFor="retrieve-email">Registration email <span className="required" aria-hidden="true">*</span></label><input id="retrieve-email" type="email" autoComplete="email" placeholder="you@example.com" value={retrieveEmail} onChange={(event) => { setRetrieveEmail(event.target.value); setRetrieveError(""); }} aria-invalid={Boolean(retrieveError)} aria-describedby="retrieve-message" /><p className="error-message" id="retrieve-message" aria-live="polite">{retrieveError}</p></div><button className="button button-primary" type="submit" disabled={isRetrieving}>{isRetrieving ? "Searching…" : "Retrieve ticket"}</button></form></section>
        ) : (
          <section><p className="kicker">Ticket found</p><h2 id="retrieve-title">Here&apos;s your ticket.</h2><div className="ticket-list">{retrievedTickets.map((ticket) => <Ticket key={ticket.reference} ticket={ticket} />)}</div><div className="dialog-actions retrieve-actions"><button className="button button-secondary" type="button" onClick={() => setRetrieveMode("search")}>Use another email</button><button className="button button-primary" type="button" onClick={() => closeDialog(retrieveDialog)}>Done</button></div></section>
        )}
      </dialog>
    </>
  );
}

function AttendeeForm({ attendee, index, errors, update }: { attendee: Attendee; index: number; errors: Errors; update: (index: number, field: keyof Attendee, value: string) => void }) {
  const suffix = index + 1;
  const error = (field: keyof Attendee) => errors[`${index}.${field}`] ?? "";
  const common = (field: keyof Attendee) => ({
    value: attendee[field],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => update(index, field, event.target.value),
    "aria-invalid": Boolean(error(field)),
    "aria-describedby": `${field}-error-${suffix}`
  });
  return (
    <section className="attendee-form" aria-labelledby={`attendee-title-${suffix}`}>
      <div className="attendee-title"><h3 id={`attendee-title-${suffix}`}>Attendee {suffix}</h3><span>{index === 0 ? "Primary attendee" : "Additional attendee"}</span></div>
      <div className="form-grid">
        <Field label="Full name" id={`fullName-${suffix}`} error={error("fullName")}><input id={`fullName-${suffix}`} type="text" placeholder="e.g. Aisha Bello" autoComplete="name" {...common("fullName")} /></Field>
        <Field label="Email address" id={`email-${suffix}`} error={error("email")}><input id={`email-${suffix}`} type="email" placeholder="aisha@example.com" autoComplete="email" {...common("email")} /></Field>
        <Field label="Phone number" id={`phone-${suffix}`} error={error("phone")}><input id={`phone-${suffix}`} type="tel" placeholder="0800 000 0000" autoComplete="tel" {...common("phone")} /></Field>
        <Field label="Gender" id={`gender-${suffix}`} error={error("gender")}><select id={`gender-${suffix}`} {...common("gender")}><option value="">Select gender</option><option value="female">Female</option><option value="male">Male</option><option value="prefer-not-to-say">Prefer not to say</option></select></Field>
        <Field label="Attendee category" id={`category-${suffix}`} error={error("category")}><select id={`category-${suffix}`} {...common("category")}><option value="">Select category</option><option value="school-leaver">Secondary school leaver</option><option value="undergraduate">Undergraduate</option><option value="postgraduate">Postgraduate student</option><option value="other">Other</option></select></Field>
        <Field label="School or organisation" id={`institution-${suffix}`} error="" required={false}><input id={`institution-${suffix}`} type="text" placeholder="Optional" autoComplete="organization" {...common("institution")} /></Field>
        <Field label="State of residence" id={`state-${suffix}`} error={error("state")} wide><select id={`state-${suffix}`} autoComplete="address-level1" {...common("state")}><option value="">Select state</option>{NIGERIAN_STATES.map((state) => <option value={state} key={state}>{state}</option>)}</select></Field>
      </div>
    </section>
  );
}

function Field({ label, id, error, required = true, wide = false, children }: { label: string; id: string; error: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return <div className={`field${wide ? " field-wide" : ""}`}><label htmlFor={id}>{label}{required && <span className="required" aria-hidden="true"> *</span>}</label>{children}<p className="error-message" id={`${id.split("-")[0]}-error-${id.split("-").at(-1)}`} aria-live="polite">{error}</p></div>;
}
