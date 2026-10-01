import "server-only";

import { createClient } from "@supabase/supabase-js";

// Sajal's registration functions are open to the publishable key by design,
// and nothing else is: this client cannot read or change any table. It still
// runs only on the server so the event id and keys stay out of the bundle.
export function createSupabasePublicClient() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
}

export function registrationEventId() {
  const id = process.env.SAJAL_EVENT_ID?.trim();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error("SAJAL_EVENT_ID is not configured.");
  }
  return id;
}
