import "server-only";

import type { RegistrationEvent } from "@/lib/registration";
import { createSupabasePublicClient, registrationEventId } from "@/lib/supabase/public";

type EventRow = {
  id: string;
  name: string;
  current_fee_kobo: number;
  registration_open: boolean;
};

// The event this deployment registers people for, with its fee and whether
// the registration window is open right now. Null when the event is missing,
// not opted in to website registration, or Supabase cannot be reached.
export async function getRegistrationEvent(): Promise<RegistrationEvent | null> {
  try {
    const eventId = registrationEventId();
    const { data, error } = await createSupabasePublicClient().rpc("self_registration_events");
    if (error) {
      console.error("Sajal event lookup failed:", error.message);
      return null;
    }

    const event = ((data ?? []) as EventRow[]).find((row) => row.id === eventId);
    if (!event) return null;

    return {
      id: event.id,
      name: event.name,
      feeNaira: Math.round(event.current_fee_kobo / 100),
      registrationOpen: event.registration_open
    };
  } catch (error) {
    console.error("Sajal event lookup failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
