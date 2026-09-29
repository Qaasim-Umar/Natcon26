# Supabase setup

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
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_public_key
```

Do not rename the secret to a `NEXT_PUBLIC_` variable and do not commit `.env.local`.

## 3. Restart the app

Restart the Next.js development server after adding the environment variables. New registrations will then be stored in Supabase, and ticket retrieval will search the stored attendee records.

## 4. Enable the admin portal

Open **SQL Editor** and run:

`supabase/migrations/20260929142246_admin_backend.sql`

This adds admin roles, attendee payment/check-in fields, and an audit log. It also adds transactional database functions so two admins cannot confirm the same payment or check in the same attendee at the same time.

## 5. Create an admin account

In Supabase, open **Authentication → Users → Add user**, enter the admin's email and password, and enable automatic email confirmation. Copy the new user's UUID.

Then run this in **SQL Editor**, replacing the sample values:

```sql
insert into public.admin_profiles (user_id, full_name, role)
values ('AUTH-USER-UUID', 'Admin Full Name', 'admin');
```

Available roles are:

- `admin`: payments and check-in
- `payment`: payments only
- `check_in`: check-in only

Create a separate Auth user and profile row for each event worker. The dashboard records which worker confirmed each payment and check-in.

After restarting the app, visit `/admin` and sign in with the assigned admin account.

## 6. Add sequential attendee IDs and scannable ticket links

Run this migration after the registration and admin migrations:

`supabase/migrations/20260929175525_attendee_numbers_qr_links.sql`

It assigns every existing and future attendee a unique sequential number (`001`, `002`, `003`, and so on). Ticket QR codes use a normal HTTPS admin lookup link, so phone camera apps recognize them and signed-in admins can open the attendee record directly.
