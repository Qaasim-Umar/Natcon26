# Supabase setup

The website registers people into **Sajal**, the TAA event app, and shares its Supabase project.
The schema lives in the Sajal repository (`supabase/migrations`); this repository has none of its
own. The full contract is Sajal's `docs/self_registration.md`.

## How it works

- The browser only talks to this site's API routes. The routes call Sajal's public registration
  functions with the **publishable key**, which can do nothing else: it cannot read or change any
  table.
- `POST /api/registrations` calls `self_register_group`, which registers every attendee on the
  form or none of them. Each attendee comes back with a six-character check-in code and the text
  to encode in their QR.
- `GET /api/tickets?email=` calls `self_registration_tickets` to show a ticket again.
- The fee and whether registration is open come from the event in Sajal, read on every page view
  through `self_registration_events`.
- At the venue, officers scan the QR (or type the code, or the phone number) in the Sajal app,
  take payment and check the person in.

Each attendee needs their own email address and phone number: Sajal refuses a second
registration with either in the same event.

## 1. Prepare the event in Sajal

The event must be `active`, have `self_registration_enabled = true`, and have its registration
window open. Its fee (`fee_kobo`, plus any early bird) is what the website charges.

## 2. Environment variables

Copy `.env.example` to `.env.local` (or set them on the host):

```env
SUPABASE_URL=https://<sajal project ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SAJAL_EVENT_ID=<the event's id>
```

Restart the app after changing them.

## The admin portal

`/admin` and `/api/admin/*` were built for the website's previous Supabase project and are not
connected to Sajal yet. The footer link to it is hidden. Officers use the Sajal app.
