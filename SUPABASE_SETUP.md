# Supabase registration setup

The registration frontend now talks to server-only Next.js API routes. The Supabase secret is never sent to the browser.

## 1. Create the database tables

Open your Supabase project, go to **SQL Editor**, and run:

`supabase/migrations/20260929060754_registration_schema.sql`

This creates the `registrations` and `attendees` tables, enables Row Level Security, blocks browser roles from reading them directly, and adds the atomic registration function used by the API.

## 2. Add the server environment variables

Copy `.env.example` to `.env.local`, then replace the placeholders with the values from the Supabase project **Connect** dialog:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your_server_key
```

Do not rename the secret to a `NEXT_PUBLIC_` variable and do not commit `.env.local`.

## 3. Restart the app

Restart the Next.js development server after adding the environment variables. New registrations will then be stored in Supabase, and ticket retrieval will search the stored attendee records.

The admin dashboard is intentionally not connected to these tables yet.
