// src/controllers/abandonedController.js
const mongoose = require("mongoose");
const AbandonedCheckout = require("../models/AbandonedCheckout");
const Order = require("../models/Order");

const BD_PHONE = /^01[3-9]\d{8}$/;
const SESSION_ID = /^[A-Za-z0-9_-]{10,64}$/;
const clip = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");

// POST /api/abandoned  (public, called from the checkout page)
// Upserts one record per browser session. Always answers 200 so the
// checkout page never sees an error because of this feature.
exports.capture = async (req, res) => {
  try {
    const b = req.body || {};
    const phone = typeof b.phone === "string" ? b.phone.replace(/\D/g, "") : "";

    if (!SESSION_ID.test(b.sessionId || "") || !BD_PHONE.test(phone)) {
      return res.json({ ok: true, skipped: true });
    }

    const qty = Math.min(10, Math.max(1, Math.floor(Number(b.quantity)) || 1));

    await AbandonedCheckout.findOneAndUpdate(
      { sessionId: b.sessionId },
      {
        $set: {
          phone,
          customerName: clip(b.customerName, 100),
          address: clip(b.address, 500),
          deliveryArea: b.deliveryArea === "outside" ? "outside" : "dhaka",
          productId: clip(b.productId, 40),
          productName: clip(b.productName, 200),
          size: clip(b.size, 20) || null,
          quantity: qty,
          lastSeenAt: new Date(),
        },
      },
      { upsert: true },
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Abandoned capture failed:", err.message);
    res.json({ ok: true });
  }
};

// GET /api/abandoned  (admin) — newest first, each flagged `converted`
// when the same phone placed an order after the checkout was started.
exports.list = async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit) || 100);
    const docs = await AbandonedCheckout.find()
      .sort({ lastSeenAt: -1 })
      .limit(limit)
      .lean();

    if (docs.length === 0) return res.json([]);

    const oldest = docs.reduce(
      (min, d) => (d.createdAt < min ? d.createdAt : min),
      docs[0].createdAt,
    );
    const orders = await Order.find({
      phone: { $in: [...new Set(docs.map((d) => d.phone))] },
      createdAt: { $gte: oldest },
    })
      .select("phone createdAt")
      .lean();

    res.json(
      docs.map((d) => ({
        ...d,
        converted: orders.some(
          (o) => o.phone === d.phone && o.createdAt >= d.createdAt,
        ),
      })),
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/abandoned/:id  { contacted?, note? }
exports.update = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }
    const set = {};
    if (typeof req.body.contacted === "boolean") set.contacted = req.body.contacted;
    if (typeof req.body.note === "string") set.note = clip(req.body.note, 500);

    const doc = await AbandonedCheckout.findByIdAndUpdate(
      req.params.id,
      { $set: set },
      { new: true },
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/abandoned/:id
exports.remove = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid id" });
    }
    await AbandonedCheckout.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
