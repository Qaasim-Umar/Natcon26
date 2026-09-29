"use client";

import { FormEvent, useState } from "react";

export function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Sign-in failed.");
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
      setLoading(false);
    }
  };

  return <main className="admin-login-page"><section className="admin-login-card"><div className="admin-login-brand"><span>7</span><div><strong>NATCON</strong><small>Admin portal</small></div></div><p className="kicker">Event operations</p><h1>Admin sign in</h1><p>Use your assigned admin account to manage payments and attendee check-ins.</p><form onSubmit={submit}><label><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label><p className="admin-login-error" role="alert">{error}</p><button className="admin-primary-button" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button></form></section></main>;
}
