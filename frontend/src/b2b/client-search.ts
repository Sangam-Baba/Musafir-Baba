// B2B dashboard search (Stage 12 part A): the website search pieces called as the signed-in member, so the API
// answers with the client's B2B prices, its category's hotels and its own selling price.
import { b2b, refreshBusinessSession } from "./api";
import { useBusinessSession } from "./session-store";
import type { HotelsCall } from "./website/hotels";

export const businessCall: HotelsCall = (path, body) => (body === undefined ? b2b(path) : b2b(path, { method: "POST", body }));

/** A token for the live-updates stream (renewed when refused; never during view-as). */
export async function businessStreamToken(expired: boolean): Promise<string | null> {
  const viewing = useBusinessSession.getState().viewAs;
  if (!expired) return useBusinessSession.getState().accessToken;
  return viewing ? null : refreshBusinessSession();
}
