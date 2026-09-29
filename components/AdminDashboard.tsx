"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Html5Qrcode } from "html5-qrcode";

type TicketRecord = {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  category: string;
  institution: string;
  state: string;
  reference: string;
};

type AdminAttendee = TicketRecord & {
  paymentStatus: "Paid" | "Pending";
  amountPaid?: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentConfirmedAt?: string;
  paymentConfirmedBy?: string;
  checkedIn: boolean;
  checkedInAt?: string;
};

type PaymentMethod = "Bank transfer" | "POS" | "Cash";

type PaymentConfirmation = {
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  paymentConfirmedAt: string;
  paymentConfirmedBy: string;
};

const REGISTRATION_FEE = 8000;
const CURRENT_ADMIN = "Admin Officer";

const SEED_ATTENDEES: AdminAttendee[] = [
  { fullName: "Aisha Bello", email: "aisha@example.com", phone: "0800 000 0000", gender: "Female", category: "Undergraduate", institution: "University of Ibadan", state: "Oyo", reference: "NAT26-001-8815", paymentStatus: "Paid", checkedIn: false },
  { fullName: "Musa Kareem", email: "musa@example.com", phone: "0811 111 1111", gender: "Male", category: "Postgraduate student", institution: "Obafemi Awolowo University", state: "Osun", reference: "NAT26-002-6942", paymentStatus: "Paid", checkedIn: true, checkedInAt: "08:42" },
  { fullName: "Maryam Lawal", email: "maryam@example.com", phone: "0702 331 9120", gender: "Female", category: "Secondary school leaver", institution: "Al-Hikmah College", state: "Kwara", reference: "NAT26-003-4271", paymentStatus: "Paid", checkedIn: false },
  { fullName: "Ibrahim Sani", email: "ibrahim@example.com", phone: "0906 803 4421", gender: "Male", category: "Undergraduate", institution: "Ahmadu Bello University", state: "Kaduna", reference: "NAT26-004-3108", paymentStatus: "Pending", checkedIn: false },
  { fullName: "Zainab Adeyemi", email: "zainab@example.com", phone: "0814 925 7704", gender: "Female", category: "Undergraduate", institution: "University of Lagos", state: "Lagos", reference: "NAT26-005-5290", paymentStatus: "Paid", checkedIn: true, checkedInAt: "09:07" }
];

const categoryLabel = (value: string) => ({
  "school-leaver": "Secondary school leaver",
  undergraduate: "Undergraduate",
  postgraduate: "Postgraduate student",
  other: "Other"
}[value] ?? value);

function Icon({ name }: { name: "grid" | "scan" | "users" | "search" | "check" | "clock" | "ticket" | "menu" }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M7 12h10" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    ticket: <><path d="M4 7h16v10H4z" /><path d="M8 7V5h8v2M8 12h8" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function adminReference(record: TicketRecord): AdminAttendee {
  return { ...record, category: categoryLabel(record.category), paymentStatus: "Paid", checkedIn: false };
}

export function AdminDashboard() {
  const [attendees, setAttendees] = useState<AdminAttendee[]>(SEED_ATTENDEES);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | "Checked in" | "Not checked in" | "Pending">("All");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannerMessage, setScannerMessage] = useState("");
  const [selected, setSelected] = useState<AdminAttendee | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerCloseButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const registrations = JSON.parse(sessionStorage.getItem("natconTickets") || "[]") as TicketRecord[];
      const storedCheckins = JSON.parse(sessionStorage.getItem("natconCheckins") || "{}") as Record<string, string>;
      const storedPayments = JSON.parse(sessionStorage.getItem("natconPayments") || "{}") as Record<string, PaymentConfirmation>;
      setAttendees((current) => {
        const byReference = new Map(current.map((attendee) => {
          const payment = storedPayments[attendee.reference];
          return [attendee.reference, {
            ...attendee,
            ...(payment ? { ...payment, paymentStatus: "Paid" as const } : {}),
            checkedIn: attendee.checkedIn || Boolean(storedCheckins[attendee.reference]),
            checkedInAt: storedCheckins[attendee.reference] || attendee.checkedInAt
          }];
        }));
        registrations.forEach((record) => byReference.set(record.reference, {
          ...adminReference(record),
          ...(storedPayments[record.reference] ? { ...storedPayments[record.reference], paymentStatus: "Paid" as const } : {}),
          checkedIn: Boolean(storedCheckins[record.reference]),
          checkedInAt: storedCheckins[record.reference]
        }));
        return [...byReference.values()];
      });
    } catch { /* Session data is optional. */ }
  }, []);

  useEffect(() => () => {
    scannerRef.current?.stop().catch(() => undefined);
  }, []);

  const filtered = useMemo(() => attendees.filter((attendee) => {
    const matchesQuery = `${attendee.fullName} ${attendee.email} ${attendee.phone} ${attendee.reference}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "All"
      || (filter === "Checked in" && attendee.checkedIn)
      || (filter === "Not checked in" && !attendee.checkedIn && attendee.paymentStatus === "Paid")
      || (filter === "Pending" && attendee.paymentStatus === "Pending");
    return matchesQuery && matchesFilter;
  }), [attendees, filter, query]);

  const paid = attendees.filter((attendee) => attendee.paymentStatus === "Paid").length;
  const checkedIn = attendees.filter((attendee) => attendee.checkedIn).length;
  const pending = attendees.length - paid;

  const resolveScan = (decodedText: string) => {
    const reference = decodedText.startsWith("NATCON-2026:") ? decodedText.slice("NATCON-2026:".length) : decodedText;
    const match = attendees.find((attendee) => attendee.reference === reference.trim());
    if (!match) {
      setSelected(null);
      setScannerMessage("No registration was found for this QR code.");
      return;
    }
    setSelected(match);
    setScannerMessage("");
  };

  const startScanner = async () => {
    setScannerMessage("");
    setSelected(null);
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("admin-qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
            return { width: size, height: size };
          }
        },
        async (decodedText) => {
          resolveScan(decodedText);
          await scanner.stop().catch(() => undefined);
          setScanning(false);
        },
        () => undefined
      );
    } catch {
      setScannerMessage("Camera access was unavailable. Search by name or ticket reference instead.");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    await scannerRef.current?.stop().catch(() => undefined);
    setScanning(false);
  };

  const closeScanner = async () => {
    await stopScanner();
    setScannerOpen(false);
    setSelected(null);
    setScannerMessage("");
  };

  useEffect(() => {
    if (!scannerOpen) return;

    document.body.classList.add("admin-scanner-open");
    scannerCloseButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") void closeScanner();
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.classList.remove("admin-scanner-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [scannerOpen]);

  const checkIn = (record: AdminAttendee) => {
    if (record.paymentStatus !== "Paid" || record.checkedIn) return;
    const time = new Intl.DateTimeFormat("en-NG", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    setAttendees((current) => current.map((attendee) => attendee.reference === record.reference ? { ...attendee, checkedIn: true, checkedInAt: time } : attendee));
    setSelected({ ...record, checkedIn: true, checkedInAt: time });
    try {
      const stored = JSON.parse(sessionStorage.getItem("natconCheckins") || "{}") as Record<string, string>;
      sessionStorage.setItem("natconCheckins", JSON.stringify({ ...stored, [record.reference]: time }));
    } catch { /* Check-in persistence is optional. */ }
  };

  const confirmPayment = (record: AdminAttendee, payment: PaymentConfirmation, checkInNow: boolean) => {
    const checkInTime = checkInNow
      ? new Intl.DateTimeFormat("en-NG", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())
      : undefined;
    const updated: AdminAttendee = {
      ...record,
      ...payment,
      paymentStatus: "Paid",
      checkedIn: checkInNow || record.checkedIn,
      checkedInAt: checkInTime || record.checkedInAt
    };

    setAttendees((current) => current.map((attendee) => attendee.reference === record.reference ? updated : attendee));
    setSelected(updated);

    try {
      const payments = JSON.parse(sessionStorage.getItem("natconPayments") || "{}") as Record<string, PaymentConfirmation>;
      sessionStorage.setItem("natconPayments", JSON.stringify({ ...payments, [record.reference]: payment }));
      if (checkInTime) {
        const checkins = JSON.parse(sessionStorage.getItem("natconCheckins") || "{}") as Record<string, string>;
        sessionStorage.setItem("natconCheckins", JSON.stringify({ ...checkins, [record.reference]: checkInTime }));
      }
    } catch { /* Event-day demo persistence is optional. */ }
  };

  const openPaymentDesk = () => {
    setFilter("Pending");
    setSidebarOpen(false);
    requestAnimationFrame(() => document.getElementById("attendees")?.scrollIntoView({ behavior: "smooth" }));
  };

  return (
    <div className="admin-app" aria-hidden={scannerOpen ? "true" : undefined}>
      <aside className={`admin-sidebar${sidebarOpen ? " is-open" : ""}`}>
        <div className="admin-brand"><span>7</span><div><strong>NATCON</strong><small>Admin portal</small></div></div>
        <nav aria-label="Admin navigation">
          <a className="active" href="#overview"><Icon name="grid" /> Overview</a>
          <button type="button" onClick={() => { setScannerOpen(true); setSidebarOpen(false); }}><Icon name="scan" /> Scan ticket</button>
          <button type="button" onClick={openPaymentDesk}><Icon name="clock" /> Payment desk</button>
          <a href="#attendees"><Icon name="users" /> Attendees</a>
        </nav>
        <div className="admin-sidebar-event"><span>Event</span><strong>NATCON 2026</strong><small>1–4 October · Iwo</small></div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <button className="admin-menu" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen((open) => !open)}><Icon name="menu" /></button>
          <div><p>Event operations</p><h1>Good morning, Admin.</h1></div>
          <div className="admin-profile"><span>AO</span><div><strong>Admin Officer</strong><small>Check-in team</small></div></div>
        </header>

        <section id="overview" className="admin-overview">
          <div className="admin-title-row"><div><h2>Registration overview</h2><p>Live event attendance at a glance.</p></div><button className="admin-scan-button" type="button" onClick={() => setScannerOpen(true)}><Icon name="scan" /> Scan ticket</button></div>
          <div className="admin-stat-grid">
            <article><div className="admin-stat-icon blue"><Icon name="users" /></div><span>Total registered</span><strong>{attendees.length}</strong><small>All attendee records</small></article>
            <article><div className="admin-stat-icon green"><Icon name="check" /></div><span>Paid registrations</span><strong>{paid}</strong><small>Ready for check-in</small></article>
            <article><div className="admin-stat-icon navy"><Icon name="scan" /></div><span>Checked in</span><strong>{checkedIn}</strong><small>{paid ? Math.round((checkedIn / paid) * 100) : 0}% of paid attendees</small></article>
            <article><div className="admin-stat-icon amber"><Icon name="clock" /></div><span>Payment pending</span><strong>{pending}</strong><small>Requires confirmation</small></article>
          </div>
        </section>

        <section id="attendees" className="admin-table-card">
          <div className="admin-table-head"><div><h2>Attendees</h2><p>Search registrations and manage entry.</p></div><div className="admin-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or ticket" aria-label="Search attendees" /></div></div>
          <div className="admin-filters" role="group" aria-label="Filter attendees">{(["All", "Checked in", "Not checked in", "Pending"] as const).map((item) => <button className={filter === item ? "active" : ""} type="button" key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
          <div className="admin-table-wrap">
            <table><thead><tr><th>Attendee</th><th>Ticket reference</th><th>Category</th><th>Payment</th><th>Payment recorded by</th><th>Check-in</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{filtered.map((attendee) => <tr key={attendee.reference}><td><div className="attendee-cell"><span>{initials(attendee.fullName)}</span><div><strong>{attendee.fullName}</strong><small>{attendee.email}</small></div></div></td><td><code>{attendee.reference}</code></td><td>{attendee.category}</td><td><Status tone={attendee.paymentStatus === "Paid" ? "success" : "warning"}>{attendee.paymentStatus}</Status></td><td>{attendee.paymentConfirmedBy ? <div className="payment-audit-cell"><strong>{attendee.paymentConfirmedBy}</strong><small>{attendee.paymentMethod} · {attendee.paymentConfirmedAt}</small></div> : <span className="not-checked">{attendee.paymentStatus === "Paid" ? "Pre-event payment" : "Not recorded"}</span>}</td><td>{attendee.checkedIn ? <Status tone="info">Checked in {attendee.checkedInAt}</Status> : <span className="not-checked">Not checked in</span>}</td><td><button className="view-attendee" type="button" onClick={() => { setSelected(attendee); setScannerOpen(true); }}>View</button></td></tr>)}</tbody></table>
            {!filtered.length && <div className="admin-empty">No attendees match this search.</div>}
          </div>
        </section>
      </main>

      {scannerOpen && createPortal(<div className="scanner-modal" role="dialog" aria-modal="true" aria-labelledby="scanner-title"><div className="scanner-panel"><div className="scanner-header"><div><p>Door check-in</p><h2 id="scanner-title">Scan attendee ticket</h2></div><button ref={scannerCloseButtonRef} type="button" onClick={closeScanner} aria-label="Close scanner">×</button></div>{!selected && <><div className={`scanner-viewport${scanning ? " is-scanning" : ""}`}><div id="admin-qr-reader" /><div className="scanner-placeholder"><Icon name="scan" /><strong>{scanning ? "Point the camera at the QR code" : "Ready to scan"}</strong><span>Hold the attendee&apos;s ticket inside the frame.</span></div></div>{scannerMessage && <p className="scanner-message" role="alert">{scannerMessage}</p>}<div className="scanner-actions">{scanning ? <button className="admin-secondary-button" type="button" onClick={stopScanner}>Stop camera</button> : <button className="admin-primary-button" type="button" onClick={startScanner}>Start camera</button>}<button className="admin-text-button" type="button" onClick={closeScanner}>Search attendee instead</button></div></>}{selected && <AttendeeResult attendee={selected} onCheckIn={() => checkIn(selected)} onConfirmPayment={(payment, checkInNow) => confirmPayment(selected, payment, checkInNow)} onScanAnother={() => { setSelected(null); setScannerMessage(""); }} />}</div></div>, document.body)}
    </div>
  );
}

function Status({ tone, children }: { tone: "success" | "warning" | "info"; children: React.ReactNode }) {
  return <span className={`admin-status ${tone}`}>{children}</span>;
}

function AttendeeResult({ attendee, onCheckIn, onConfirmPayment, onScanAnother }: {
  attendee: AdminAttendee;
  onCheckIn: () => void;
  onConfirmPayment: (payment: PaymentConfirmation, checkInNow: boolean) => void;
  onScanAnother: () => void;
}) {
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("Bank transfer");
  const [reference, setReference] = useState("");
  const [checkInNow, setCheckInNow] = useState(true);
  const [paymentError, setPaymentError] = useState("");

  const submitPayment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanedReference = reference.trim();
    if (method !== "Cash" && !cleanedReference) {
      setPaymentError(`Enter the ${method === "POS" ? "POS" : "bank"} transaction reference.`);
      return;
    }

    const confirmedAt = new Intl.DateTimeFormat("en-NG", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date());

    onConfirmPayment({
      amountPaid: REGISTRATION_FEE,
      paymentMethod: method,
      paymentReference: cleanedReference || `CASH-${attendee.reference}`,
      paymentConfirmedAt: confirmedAt,
      paymentConfirmedBy: CURRENT_ADMIN
    }, checkInNow);
    setPaymentFormOpen(false);
  };

  return <div className="scan-result">
    <div className={`scan-result-icon ${attendee.checkedIn ? "done" : attendee.paymentStatus === "Paid" ? "ready" : "pending"}`}><Icon name={attendee.checkedIn ? "check" : "ticket"} /></div>
    <p className="scan-result-label">Attendee found</p>
    <h3>{attendee.fullName}</h3>
    <span className="scan-reference">{attendee.reference}</span>
    <dl>
      <div><dt>Email</dt><dd>{attendee.email}</dd></div><div><dt>Phone</dt><dd>{attendee.phone}</dd></div>
      <div><dt>Gender</dt><dd>{attendee.gender}</dd></div><div><dt>Category</dt><dd>{attendee.category}</dd></div>
      <div><dt>State</dt><dd>{attendee.state}</dd></div><div><dt>Institution</dt><dd>{attendee.institution || "—"}</dd></div>
    </dl>
    <div className="scan-status-row">
      <span>Payment <Status tone={attendee.paymentStatus === "Paid" ? "success" : "warning"}>{attendee.paymentStatus}</Status></span>
      <span>Check-in {attendee.checkedIn ? <Status tone="info">Completed at {attendee.checkedInAt}</Status> : <span className="not-checked">Not checked in</span>}</span>
    </div>

    {attendee.paymentStatus === "Pending" && !paymentFormOpen && <div className="payment-due-card">
      <div><span>Amount due</span><strong>₦{REGISTRATION_FEE.toLocaleString("en-NG")}</strong></div>
      <p>Confirm only after the transfer, POS payment, or cash has been received.</p>
      <button className="admin-primary-button" type="button" onClick={() => setPaymentFormOpen(true)}>Confirm event-day payment</button>
    </div>}

    {attendee.paymentStatus === "Pending" && paymentFormOpen && <form className="event-payment-form" onSubmit={submitPayment}>
      <div className="event-payment-heading"><div><span>Event-day payment</span><strong>₦{REGISTRATION_FEE.toLocaleString("en-NG")}</strong></div><button type="button" onClick={() => { setPaymentFormOpen(false); setPaymentError(""); }}>Cancel</button></div>
      <fieldset><legend>Payment method</legend><div className="payment-methods">{(["Bank transfer", "POS", "Cash"] as PaymentMethod[]).map((item) => <label className={method === item ? "selected" : ""} key={item}><input type="radio" name="payment-method" value={item} checked={method === item} onChange={() => { setMethod(item); setPaymentError(""); }} /><span>{item}</span></label>)}</div></fieldset>
      {method !== "Cash" && <label className="payment-reference-field"><span>{method === "POS" ? "POS" : "Bank"} transaction reference</span><input value={reference} onChange={(event) => { setReference(event.target.value); setPaymentError(""); }} placeholder={method === "POS" ? "e.g. 784291" : "e.g. NIP-38492017"} autoFocus /></label>}
      {paymentError && <p className="payment-form-error" role="alert">{paymentError}</p>}
      <label className="payment-checkin-option"><input type="checkbox" checked={checkInNow} onChange={(event) => setCheckInNow(event.target.checked)} /><span><strong>Check attendee in immediately</strong><small>Use this when payment and entry happen at the same desk.</small></span></label>
      <button className="admin-primary-button" type="submit"><Icon name="check" /> {checkInNow ? "Confirm payment & check in" : "Confirm payment"}</button>
    </form>}

    {attendee.paymentStatus === "Paid" && attendee.paymentMethod && <section className="payment-audit-record" aria-label="Payment record">
      <header><Icon name="check" /><div><span>Payment record</span><strong>Event-day payment confirmed</strong></div></header>
      <div className="payment-audit-grid">
        <div><span>Recorded by</span><strong>{attendee.paymentConfirmedBy}</strong></div>
        <div><span>Method</span><strong>{attendee.paymentMethod}</strong></div>
        <div><span>Amount</span><strong>₦{attendee.amountPaid?.toLocaleString("en-NG")}</strong></div>
        <div><span>Recorded at</span><strong>{attendee.paymentConfirmedAt}</strong></div>
        <div className="payment-audit-reference"><span>Transaction reference</span><strong>{attendee.paymentReference}</strong></div>
      </div>
    </section>}

    {attendee.paymentStatus === "Paid" && (attendee.checkedIn
      ? <div className="scan-complete"><Icon name="check" /> This attendee has already checked in.</div>
      : <button className="admin-primary-button" type="button" onClick={onCheckIn}><Icon name="check" /> Confirm check-in</button>)}
    <button className="admin-secondary-button" type="button" onClick={onScanAnother}>Scan another ticket</button>
  </div>;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
