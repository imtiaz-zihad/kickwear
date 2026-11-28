// src/services/abandonedNotifier.js
// Tells the owner on Telegram about checkouts that were started but not finished.
//
// Every few minutes it looks for leads that went quiet for WAIT_MIN minutes and
// where the same phone has not ordered since. Each lead is announced once, and
// a phone is announced at most once a day. Leads that already existed when the
// server started are ignored, so a deploy never floods Telegram.
const AbandonedCheckout = require("../models/AbandonedCheckout");
const Order = require("../models/Order");
const { telegramReady, sendAbandoned } = require("./notify");

const WAIT_MIN = 10; // quiet for this long = abandoned
const EVERY_MS = 2 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const startedAt = new Date();
let running = false;

async function sweep() {
  if (running || !telegramReady("abandoned")) return;
  running = true;
  try {
    const quietBefore = new Date(Date.now() - WAIT_MIN * 60 * 1000);
    const leads = await AbandonedCheckout.find({
      notifiedAt: null,
      lastSeenAt: { $lte: quietBefore, $gte: startedAt },
    })
      .sort({ lastSeenAt: 1 })
      .limit(20)
      .lean();

    for (const lead of leads) {
      // take it first, so two servers (or two sweeps) never send it twice
      const claimed = await AbandonedCheckout.findOneAndUpdate(
        { _id: lead._id, notifiedAt: null },
        { $set: { notifiedAt: new Date() } },
      );
      if (!claimed) continue;

      const ordered = await Order.exists({
        phone: lead.phone,
        createdAt: { $gte: lead.createdAt },
      });
      if (ordered) continue;

      const already = await AbandonedCheckout.exists({
        _id: { $ne: lead._id },
        phone: lead.phone,
        notifiedAt: { $gte: new Date(Date.now() - DAY_MS) },
      });
      if (already) continue;

      const sent = await sendAbandoned(lead);
      console.log(
        `Abandoned lead ${String(lead._id).slice(-6)}: Telegram sent to ${sent} chat(s)`,
      );
    }
  } catch (err) {
    console.error("Abandoned sweep failed:", err.message);
  } finally {
    running = false;
  }
}

function start() {
  const timer = setInterval(sweep, EVERY_MS);
  timer.unref();
}

module.exports = { start, sweep };
