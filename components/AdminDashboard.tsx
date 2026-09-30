"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Html5Qrcode } from "html5-qrcode";

import type { AdminAttendee, AdminProfile, PaymentMethod } from "@/lib/admin";
import { formatAttendeeNumber } from "@/lib/registration";

type PaymentConfirmation = {
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentReference: string;
};

const REGISTRATION_FEE = 8000;

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

export function AdminDashboard({ admin }: { admin: AdminProfile }) {
  const [attendees, setAttendees] = useState<AdminAttendee[]>([]);
  const [dataError, setDataError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | "Checked in" | "Not checked in" | "Pending">("All");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannerMessage, setScannerMessage] = useState("");
  const [selected, setSelected] = useState<AdminAttendee | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerHintTimerRef = useRef<number | null>(null);
  const scannerCloseButtonRef = useRef<HTMLButtonElement>(null);

  const loadAttendees = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/admin/attendees", { cache: "no-store" });
      const result = await response.json() as { attendees?: AdminAttendee[]; error?: string };
      if (response.status === 401) { window.location.reload(); return; }
      if (!response.ok || !result.attendees) throw new Error(result.error || "Attendees could not be loaded.");
      setAttendees(result.attendees);
      setSelected((current) => current
        ? result.attendees?.find((attendee) => attendee.id === current.id) ?? current
        : null);
      setDataError("");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Attendees could not be loaded.");
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    void loadAttendees();
    const interval = window.setInterval(() => void loadAttendees(true), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => () => {
    if (scannerHintTimerRef.current) window.clearTimeout(scannerHintTimerRef.current);
    scannerRef.current?.stop().catch(() => undefined);
  }, []);

  const filtered = useMemo(() => attendees.filter((attendee) => {
    const matchesQuery = `${attendee.fullName} ${attendee.email} ${attendee.phone} ${attendee.reference} ${formatAttendeeNumber(attendee.attendeeNumber)}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "All"
      || (filter === "Checked in" && attendee.checkedIn)
      || (filter === "Not checked in" && !attendee.checkedIn && attendee.paymentStatus === "Paid")
      || (filter === "Pending" && attendee.paymentStatus === "Pending");
    return matchesQuery && matchesFilter;
  }), [attendees, filter, query]);

  const paid = attendees.filter((attendee) => attendee.paymentStatus === "Paid").length;
  const checkedIn = attendees.filter((attendee) => attendee.checkedIn).length;
  const pending = attendees.length - paid;

  const referenceFromQr = (decodedText: string) => {
    const value = decodedText.trim();
    try {
      const url = new URL(value);
      const ticket = url.searchParams.get("ticket");
      if (ticket) return ticket.trim();
    } catch { /* Older tickets contain a plain reference rather than a URL. */ }
    return value.startsWith("NATCON-2026:") ? value.slice("NATCON-2026:".length).trim() : value;
  };

  const resolveScan = (decodedText: string) => {
    const reference = referenceFromQr(decodedText);
    const match = attendees.find((attendee) => attendee.reference === reference.trim());
    if (!match) {
      setSelected(null);
      setScannerMessage("No registration was found for this QR code.");
      return;
    }
    setSelected(match);
    setScannerMessage("");
  };

  useEffect(() => {
    if (loading || !attendees.length) return;
    const url = new URL(window.location.href);
    const ticket = url.searchParams.get("ticket");
    if (!ticket) return;
    resolveScan(ticket);
    setScannerOpen(true);
    url.searchParams.delete("ticket");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [attendees, loading]);

  const startScanner = async () => {
    if (scannerHintTimerRef.current) window.clearTimeout(scannerHintTimerRef.current);
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
          disableFlip: false
        },
        async (decodedText) => {
          if (scannerHintTimerRef.current) window.clearTimeout(scannerHintTimerRef.current);
          resolveScan(decodedText);
          await scanner.stop().catch(() => undefined);
          scannerRef.current = null;
          setScanning(false);
        },
        () => undefined
      );
      scannerHintTimerRef.current = window.setTimeout(() => {
        if (scannerRef.current !== scanner || !scanner.isScanning) return;
        setScannerMessage("No QR code detected yet. Fill most of the camera view with the square QR code, hold the phone steady, and avoid glare.");
      }, 7000);
    } catch (error) {
      scannerRef.current = null;
      setScannerMessage(error instanceof Error
        ? `The scanner could not start: ${error.message}`
        : "The scanner could not start. Search by name or attendee ID instead.");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerHintTimerRef.current) {
      window.clearTimeout(scannerHintTimerRef.current);
      scannerHintTimerRef.current = null;
    }
    await scannerRef.current?.stop().catch(() => undefined);
    scannerRef.current = null;
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

  const runAttendeeAction = async (record: AdminAttendee, body: object) => {
    const response = await fetch(`/api/admin/attendees/${record.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const result = await response.json() as { attendee?: AdminAttendee; error?: string };
    if (response.status === 401) { window.location.reload(); throw new Error("Your session has expired."); }
    if (!response.ok || !result.attendee) throw new Error(result.error || "The attendee could not be updated.");
    setAttendees((current) => current.map((attendee) => attendee.id === result.attendee?.id ? result.attendee : attendee));
    setSelected(result.attendee);
    return result.attendee;
  };

  const checkIn = async (record: AdminAttendee) => {
    if (record.paymentStatus !== "Paid" || record.checkedIn || actionLoading) return;
    setActionLoading(true);
    setActionError("");
    try {
      await runAttendeeAction(record, { action: "check-in" });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Check-in failed.");
      await loadAttendees(true);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmPayment = async (record: AdminAttendee, payment: PaymentConfirmation, checkInNow: boolean) => {
    if (actionLoading) return;
    setActionLoading(true);
    setActionError("");
    try {
      const paidAttendee = await runAttendeeAction(record, { action: "payment", ...payment });
      if (checkInNow) await runAttendeeAction(paidAttendee, { action: "check-in" });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Payment confirmation failed.");
      await loadAttendees(true);
    } finally {
      setActionLoading(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.reload();
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
          <div><p>Event operations</p><h1>Welcome, {admin.fullName.split(" ")[0]}.</h1></div>
          <div className="admin-profile"><span>{initials(admin.fullName)}</span><div><strong>{admin.fullName}</strong><small>{roleLabel(admin.role)}</small></div><button type="button" onClick={signOut}>Sign out</button></div>
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
          <div className="admin-table-head"><div><h2>Attendees</h2><p>Search registrations and manage entry.</p></div><div className="admin-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or attendee ID" aria-label="Search attendees" /></div></div>
          <div className="admin-filters" role="group" aria-label="Filter attendees">{(["All", "Checked in", "Not checked in", "Pending"] as const).map((item) => <button className={filter === item ? "active" : ""} type="button" key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
          {dataError && <p className="admin-data-error" role="alert">{dataError} <button type="button" onClick={() => void loadAttendees()}>Try again</button></p>}
          <div className="admin-table-wrap">
            <table><thead><tr><th>Attendee</th><th>Attendee ID</th><th>Category</th><th>Payment</th><th>Payment recorded by</th><th>Check-in</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{filtered.map((attendee) => <tr key={attendee.reference}><td><div className="attendee-cell"><span>{initials(attendee.fullName)}</span><div><strong>{attendee.fullName}</strong><small>{attendee.email}</small></div></div></td><td><code>{formatAttendeeNumber(attendee.attendeeNumber)}</code></td><td>{attendee.category}</td><td><Status tone={attendee.paymentStatus === "Paid" ? "success" : "warning"}>{attendee.paymentStatus}</Status></td><td>{attendee.paymentConfirmedBy ? <div className="payment-audit-cell"><strong>{attendee.paymentConfirmedBy}</strong><small>{attendee.paymentMethod} · {attendee.paymentConfirmedAt}</small></div> : <span className="not-checked">{attendee.paymentStatus === "Paid" ? "Pre-event payment" : "Not recorded"}</span>}</td><td>{attendee.checkedIn ? <div className="payment-audit-cell"><strong>{attendee.checkedInBy || "Recorded"}</strong><small>{attendee.checkedInAt}</small></div> : <span className="not-checked">Not checked in</span>}</td><td><button className="view-attendee" type="button" onClick={() => { setSelected(attendee); setScannerOpen(true); }}>View</button></td></tr>)}</tbody></table>
            {loading ? <div className="admin-empty">Loading attendees…</div> : !filtered.length && <div className="admin-empty">No attendees match this search.</div>}
          </div>
        </section>
      </main>

      {scannerOpen && createPortal(<div className="scanner-modal" role="dialog" aria-modal="true" aria-labelledby="scanner-title"><div className="scanner-panel"><div className="scanner-header"><div><p>Door check-in</p><h2 id="scanner-title">Scan attendee ticket</h2></div><button ref={scannerCloseButtonRef} type="button" onClick={closeScanner} aria-label="Close scanner">×</button></div>{!selected && <><div className={`scanner-viewport${scanning ? " is-scanning" : ""}`}><div id="admin-qr-reader" /><div className="scanner-placeholder"><Icon name="scan" /><strong>{scanning ? "Point the camera at the QR code" : "Ready to scan"}</strong><span>Hold the attendee&apos;s ticket inside the frame.</span></div></div>{scannerMessage && <p className="scanner-message" role="alert">{scannerMessage}</p>}<div className="scanner-actions">{scanning ? <button className="admin-secondary-button" type="button" onClick={stopScanner}>Stop camera</button> : <button className="admin-primary-button" type="button" onClick={startScanner}>Start camera</button>}<button className="admin-text-button" type="button" onClick={closeScanner}>Search attendee instead</button></div></>}{selected && <AttendeeResult attendee={selected} canTakePayments={admin.role === "admin" || admin.role === "payment"} canCheckIn={admin.role === "admin" || admin.role === "check_in"} busy={actionLoading} actionError={actionError} onCheckIn={() => void checkIn(selected)} onConfirmPayment={(payment, checkInNow) => void confirmPayment(selected, payment, checkInNow)} onScanAnother={() => { setSelected(null); setScannerMessage(""); setActionError(""); }} />}</div></div>, document.body)}
    </div>
  );
}

function Status({ tone, children }: { tone: "success" | "warning" | "info"; children: React.ReactNode }) {
  return <span className={`admin-status ${tone}`}>{children}</span>;
}

function AttendeeResult({ attendee, canTakePayments, canCheckIn, busy, actionError, onCheckIn, onConfirmPayment, onScanAnother }: {
  attendee: AdminAttendee;
  canTakePayments: boolean;
  canCheckIn: boolean;
  busy: boolean;
  actionError: string;
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

    onConfirmPayment({
      amountPaid: REGISTRATION_FEE,
      paymentMethod: method,
      paymentReference: cleanedReference || `CASH-${attendee.reference}`
    }, checkInNow && canCheckIn);
  };

  return <div className="scan-result">
    <div className={`scan-result-icon ${attendee.checkedIn ? "done" : attendee.paymentStatus === "Paid" ? "ready" : "pending"}`}><Icon name={attendee.checkedIn ? "check" : "ticket"} /></div>
    <p className="scan-result-label">Attendee found</p>
    <h3>{attendee.fullName}</h3>
    <span className="scan-reference">Attendee ID {formatAttendeeNumber(attendee.attendeeNumber)}</span>
    <dl>
      <div><dt>Email</dt><dd>{attendee.email}</dd></div><div><dt>Phone</dt><dd>{attendee.phone}</dd></div>
      <div><dt>Gender</dt><dd>{attendee.gender}</dd></div><div><dt>Category</dt><dd>{attendee.category}</dd></div>
      <div><dt>State</dt><dd>{attendee.state}</dd></div><div><dt>Institution</dt><dd>{attendee.institution || "—"}</dd></div>
    </dl>
    <div className="scan-status-row">
      <span>Payment <Status tone={attendee.paymentStatus === "Paid" ? "success" : "warning"}>{attendee.paymentStatus}</Status></span>
      <span>Check-in {attendee.checkedIn ? <Status tone="info">{attendee.checkedInBy ? `${attendee.checkedInBy} · ` : ""}{attendee.checkedInAt}</Status> : <span className="not-checked">Not checked in</span>}</span>
    </div>

    {actionError && <p className="payment-form-error" role="alert">{actionError}</p>}

    {attendee.paymentStatus === "Pending" && !paymentFormOpen && canTakePayments && <div className="payment-due-card">
      <div><span>Amount due</span><strong>₦{REGISTRATION_FEE.toLocaleString("en-NG")}</strong></div>
      <p>Confirm only after the transfer, POS payment, or cash has been received.</p>
      <button className="admin-primary-button" type="button" onClick={() => setPaymentFormOpen(true)}>Confirm event-day payment</button>
    </div>}

    {attendee.paymentStatus === "Pending" && !canTakePayments && <div className="payment-due-card"><p>Payment must be confirmed by an admin assigned to the payment desk.</p></div>}

    {attendee.paymentStatus === "Pending" && paymentFormOpen && canTakePayments && <form className="event-payment-form" onSubmit={submitPayment}>
      <div className="event-payment-heading"><div><span>Event-day payment</span><strong>₦{REGISTRATION_FEE.toLocaleString("en-NG")}</strong></div><button type="button" onClick={() => { setPaymentFormOpen(false); setPaymentError(""); }}>Cancel</button></div>
      <fieldset><legend>Payment method</legend><div className="payment-methods">{(["Bank transfer", "POS", "Cash"] as PaymentMethod[]).map((item) => <label className={method === item ? "selected" : ""} key={item}><input type="radio" name="payment-method" value={item} checked={method === item} onChange={() => { setMethod(item); setPaymentError(""); }} /><span>{item}</span></label>)}</div></fieldset>
      {method !== "Cash" && <label className="payment-reference-field"><span>{method === "POS" ? "POS" : "Bank"} transaction reference</span><input value={reference} onChange={(event) => { setReference(event.target.value); setPaymentError(""); }} placeholder={method === "POS" ? "e.g. 784291" : "e.g. NIP-38492017"} autoFocus /></label>}
      {paymentError && <p className="payment-form-error" role="alert">{paymentError}</p>}
      {canCheckIn && <label className="payment-checkin-option"><input type="checkbox" checked={checkInNow} onChange={(event) => setCheckInNow(event.target.checked)} /><span><strong>Check attendee in immediately</strong><small>Use this when payment and entry happen at the same desk.</small></span></label>}
      <button className="admin-primary-button" type="submit" disabled={busy}><Icon name="check" /> {busy ? "Saving…" : checkInNow && canCheckIn ? "Confirm payment & check in" : "Confirm payment"}</button>
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

    {attendee.paymentStatus === "Paid" && canCheckIn && (attendee.checkedIn
      ? <div className="scan-complete"><Icon name="check" /> This attendee has already checked in.</div>
      : <button className="admin-primary-button" type="button" onClick={onCheckIn} disabled={busy}><Icon name="check" /> {busy ? "Saving…" : "Confirm check-in"}</button>)}
    {attendee.paymentStatus === "Paid" && !attendee.checkedIn && !canCheckIn && <div className="payment-due-card"><p>Check-in must be completed by an admin assigned to the entrance desk.</p></div>}
    <button className="admin-secondary-button" type="button" onClick={onScanAnother}>Scan another ticket</button>
  </div>;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function roleLabel(role: AdminProfile["role"]) {
  if (role === "admin") return "Full administrator";
  if (role === "payment") return "Payment desk";
  return "Check-in team";
}
