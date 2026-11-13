// src/routes/pushRoutes.js
// Admin phone notifications (Web Push). Every route needs the admin token.
const router = require("express").Router();
const PushSubscription = require("../models/PushSubscription");
const { requireAdmin } = require("../middleware/adminAuth");
const { isPushReady, sendToAll } = require("../services/notify");

router.use(requireAdmin);

// public VAPID key the browser needs to subscribe
router.get("/key", (_req, res) => {
  if (!isPushReady()) {
    return res.status(503).json({ message: "Push is not configured on the server" });
  }
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

// save (or refresh) this phone's subscription
router.post("/subscribe", async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("https://") ||
    !keys?.p256dh ||
    !keys?.auth
  ) {
    return res.status(400).json({ message: "Invalid subscription" });
  }

  await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      userAgent: String(req.headers["user-agent"] || "").slice(0, 200),
    },
    { upsert: true, returnDocument: "after" },
  );
  res.json({ ok: true });
});

router.post("/unsubscribe", async (req, res) => {
  const { endpoint } = req.body || {};
  if (typeof endpoint === "string") {
    await PushSubscription.deleteOne({ endpoint });
  }
  res.json({ ok: true });
});

// "Send test" button
router.post("/test", async (_req, res) => {
  const sent = await sendToAll({
    title: "🔔 Kickwear test",
    body: "Notification thik moto kaj korche.",
    url: "/admin/orders",
    tag: "kw-test",
  });
  res.json({ ok: true, sent });
});

module.exports = router;