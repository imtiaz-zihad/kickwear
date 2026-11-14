// src/services/notify.js
// Phone notification (Web Push) for new website orders, so the owner sees
// them even when the admin panel is closed.
//
// Needs 3 env variables on the server (Render):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY   (npx web-push generate-vapid-keys)
//   VAPID_SUBJECT                         (mailto:you@example.com)
// If they are missing, this does nothing.
const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");

const money = (n) => `৳${Number(n || 0).toLocaleString("en-US")}`;

let ready = false;
function isPushReady() {
  if (ready) return true;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  ready = true;
  return true;
}

// payload = { title, body, url, tag }. Returns how many phones got it.
async function sendToAll(payload) {
  if (!isPushReady()) return 0;

  const subs = await PushSubscription.find().lean();
  const body = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys },
          body,
          { TTL: 60 * 60 * 12, urgency: "high" },
        );
        sent++;
      } catch (err) {
        // 404/410 = phone unsubscribed or app data cleared -> forget it
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: s._id }).catch(() => {});
        } else {
          console.error("Push failed:", err.statusCode || err.message);
        }
      }
    }),
  );
  return sent;
}

// One short line about the customer's Steadfast record
function riskLine(risk) {
  if (!risk) return "";
  if (risk.level === "new") return "🆕 New customer (no Steadfast history)";
  const icon = risk.level === "high" ? "🔴" : risk.level === "medium" ? "🟠" : "🟢";
  const reports = risk.reports > 0 ? ` · ${risk.reports} report(s)` : "";
  return `${icon} Risk ${risk.percent}% (${risk.level})${reports}`;
}

function orderPayload(order, risk) {
  const id = String(order._id).slice(-6).toUpperCase();
  const items = order.items || [];
  const first = items[0];
  const more = items.length > 1 ? ` +${items.length - 1} more` : "";
  const danger = risk && risk.level === "high" ? "⚠️ " : "";

  return {
    title: `${danger}🛒 New order #${id}${order.isPreorder ? " · PRE-ORDER" : ""}`,
    body: [
      `${order.customerName} · ${money(order.totalPrice)}`,
      first ? `${first.name} × ${first.quantity}${more}` : "",
      riskLine(risk),
    ]
      .filter(Boolean)
      .join("\n"),
    url: "/admin/orders",
    tag: `order-${id}`,
  };
}

// Never throws and is never awaited by the order flow
function notifyNewOrder(order, risk = null) {
  try {
    const payload = orderPayload(order, risk);
    sendToAll(payload)
      .then((n) => console.log(`Push ${payload.tag}: sent to ${n} device(s)`))
      .catch((err) => console.error("Notify failed:", err.message));
  } catch (err) {
    console.error("Notify skipped:", err.message);
  }
}

module.exports = { notifyNewOrder, sendToAll, isPushReady };