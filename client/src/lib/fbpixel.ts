// client/src/lib/fbpixel.ts
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function track(event: string, data?: Record<string, unknown>, eventId?: string) {
  if (typeof window === "undefined") return;

  const fire = () => {
    if (!window.fbq) return false;
    if (eventId) window.fbq("track", event, data ?? {}, { eventID: eventId });
    else window.fbq("track", event, data ?? {});
    return true;
  };

  if (fire()) return;

  // The pixel script loads after hydration. If this runs first (e.g. ViewContent
  // on a landing page), retry for up to 5 seconds instead of dropping the event.
  let tries = 0;
  const timer = setInterval(() => {
    if (fire() || ++tries >= 50) clearInterval(timer);
  }, 100);
}

type P = { _id: string; name: string; discountedPrice: number };

export const productData = (p: P, qty = 1, value?: number) => ({
  content_ids: [p._id],
  content_name: p.name,
  content_type: "product",
  value: value ?? p.discountedPrice * qty,
  currency: "BDT",
  num_items: qty,
});

const getCookie = (name: string) =>
  typeof document === "undefined"
    ? undefined
    : document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];

// Sent with the order so the server (Conversions API) can match the same user
export function getMetaIds() {
  let fbc = getCookie("_fbc");
  if (!fbc && typeof window !== "undefined") {
    const fbclid = new URLSearchParams(window.location.search).get("fbclid");
    if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
  }
  return { fbp: getCookie("_fbp"), fbc, sourceUrl: typeof window !== "undefined" ? window.location.href : undefined };
}