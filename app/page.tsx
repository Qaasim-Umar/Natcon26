import { EventRegistration } from "@/components/EventRegistration";
import { getRegistrationEvent } from "@/lib/event";

// The fee and whether registration is open come from Sajal on every visit.
export const dynamic = "force-dynamic";

export default async function Page() {
  const event = await getRegistrationEvent();
  return <EventRegistration event={event} />;
}
