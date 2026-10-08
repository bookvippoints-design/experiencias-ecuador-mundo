import { createClient } from "@/lib/supabase/server";
import { unsplashUrl, NATIONAL_DESTINATIONS, INTERNATIONAL_INSPIRATION, HOTEL_PHOTOS } from "@/lib/destinations";
import type { EntitlementRow } from "@/lib/format";
import type { BoardItem } from "@/app/cuenta/experiencias/ExperienceBoard";

function photoFor(e: EntitlementRow): string {
  if (e.kind === "national") {
    const d = NATIONAL_DESTINATIONS.find((x) => x.name === e.destination) ?? NATIONAL_DESTINATIONS[(e.code.length + 3) % NATIONAL_DESTINATIONS.length];
    return unsplashUrl(d.imageId, 700, 300);
  }
  if (e.kind === "international") {
    return unsplashUrl(INTERNATIONAL_INSPIRATION[e.code.length % INTERNATIONAL_INSPIRATION.length].imageId, 700, 300);
  }
  return unsplashUrl(HOTEL_PHOTOS[e.code.length % HOTEL_PHOTOS.length], 700, 300);
}

/** Beneficios del usuario actual con foto, origen del regalo y nombre del paquete. */
export async function loadMyExperiences(): Promise<BoardItem[]> {
  const supabase = await createClient();
  const [{ data: ents }, { data: senders }] = await Promise.all([
    supabase.from("entitlements").select("*").order("created_at", { ascending: false }),
    supabase.rpc("my_gift_senders"),
  ]);
  const senderByGift = new Map(((senders ?? []) as { gift_id: string; sender_name: string }[]).map((s) => [s.gift_id, s.sender_name]));

  return ((ents ?? []) as (EntitlementRow & { product_name: string | null })[]).map((e) => ({
    ...e,
    photo: photoFor(e),
    giftFrom: e.gift_id ? senderByGift.get(e.gift_id) ?? null : null,
    productName: e.product_name ?? "",
  }));
}
