// src/services/abandonedNotifier.js
// Tells the owner on Telegram about checkouts that were started but not finished.
//
// Every minute it looks for leads that went quiet for WAIT_MIN minutes and
// where the same phone has not ordered since. Each lead is announced once, and
// a phone is announced at most once a day. Only leads active in the last
// LOOKBACK_H hours are considered, so old data never floods Telegram, and a
// server restart (Render wakes up from sleep) does not lose a fresh lead.
const AbandonedCheckout = require("../models/AbandonedCheckout");
const Order = require("../models/Order");
const { telegramReady, sendAbandoned } = require("./notify");

const WAIT_MIN = 3; // quiet for this long = abandoned
const LOOKBACK_H = 3; // ignore leads older than this
const EVERY_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

let running = false;

async function sweep() {
  if (running) return;
  running = true;
  try {
    if (typeof telegramReady !== "function" || !telegramReady("abandoned")) {
      console.log("Abandoned sweep: Telegram bot/chat id not set, skipping");
      return;
    }

    const now = Date.now();
    const leads = await AbandonedCheckout.find({
      notifiedAt: null,
      lastSeenAt: {
        $lte: new Date(now - WAIT_MIN * 60 * 1000),
        $gte: new Date(now - LOOKBACK_H * 60 * 60 * 1000),
      },
    })
      .sort({ lastSeenAt: 1 })
      .limit(20)
      .lean();

    if (leads.length) console.log(`Abandoned sweep: ${leads.length} lead(s) to check`);

    for (const lead of leads) {
      const tag = String(lead._id).slice(-6);

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
      if (ordered) {
        console.log(`Abandoned lead ${tag}: skipped, this phone ordered afterwards`);
        continue;
      }

      const already = await AbandonedCheckout.exists({
        _id: { $ne: lead._id },
        phone: lead.phone,
        notifiedAt: { $gte: new Date(Date.now() - DAY_MS) },
      });
      if (already) {
        console.log(`Abandoned lead ${tag}: skipped, this phone was already announced today`);
        continue;
      }

      const sent = await sendAbandoned(lead);
      console.log(`Abandoned lead ${tag}: Telegram sent to ${sent} chat(s)`);
    }
  } catch (err) {
    console.error("Abandoned sweep failed:", err.message);
  } finally {
    running = false;
  }
}

function start() {
  console.log(`Abandoned notifier on: ${WAIT_MIN} min quiet, checked every ${EVERY_MS / 1000}s`);
  const timer = setInterval(sweep, EVERY_MS);
  timer.unref();
}

module.exports = { start, sweep };