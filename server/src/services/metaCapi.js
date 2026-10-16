// server/src/services/metaCapi.js  — Meta Conversions API (server-side Purchase)
const crypto = require("crypto");

const PIXEL_ID = process.env.META_PIXEL_ID;
const TOKEN = process.env.META_CAPI_TOKEN;
const TEST_CODE = process.env.META_TEST_EVENT_CODE; // only while testing
const VERSION = process.env.META_GRAPH_VERSION || "v23.0";

const sha = (v) =>
  v ? crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex") : undefined;

// 01712345678 -> 8801712345678
const normPhone = (p) => "88" + String(p).replace(/\D/g, "");

// Fire-and-forget: never throws, never blocks the order response
exports.sendPurchase = async (order, req) => {
  if (!PIXEL_ID || !TOKEN) return;
  try {
    const meta = req.body?.meta && typeof req.body.meta === "object" ? req.body.meta : {};
    const [first, ...rest] = String(order.customerName).trim().split(/\s+/);

    const event = {
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: String(order._id), // same id as the browser Purchase → Meta de-duplicates
      action_source: "website",
      event_source_url:
        typeof meta.sourceUrl === "string" ? meta.sourceUrl.slice(0, 500) : "https://www.kickwear.shop/checkout",
      user_data: {
        ph: [sha(normPhone(order.phone))],
        fn: [sha(first)],
        ...(rest.length && { ln: [sha(rest.join(" "))] }),
        country: [sha("bd")],
        client_ip_address: req.ip,
        client_user_agent: req.get("user-agent"),
        ...(typeof meta.fbp === "string" && { fbp: meta.fbp.slice(0, 200) }),
        ...(typeof meta.fbc === "string" && { fbc: meta.fbc.slice(0, 200) }),
      },
      custom_data: {
        currency: "BDT",
        value: order.totalPrice,
        content_type: "product",
        content_ids: order.items.map((i) => i.productId),
        num_items: order.items.reduce((s, i) => s + i.quantity, 0),
      },
    };

    const res = await fetch(`https://graph.facebook.com/${VERSION}/${PIXEL_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ data: [event], ...(TEST_CODE && { test_event_code: TEST_CODE }) }),
    });
    if (!res.ok) console.error("Meta CAPI error:", res.status, await res.text());
  } catch (err) {
    console.error("Meta CAPI failed:", err.message);
  }
};
