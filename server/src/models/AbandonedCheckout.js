// src/models/AbandonedCheckout.js
// Checkout details a visitor typed in but never submitted as an order.
const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },

    phone: { type: String, required: true, trim: true },
    customerName: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    deliveryArea: { type: String, enum: ["dhaka", "outside"], default: "dhaka" },

    productId: { type: String, default: "" },
    productName: { type: String, default: "" },
    size: { type: String, default: null },
    quantity: { type: Number, default: 1, min: 1, max: 10 },

    // Admin follow-up
    contacted: { type: Boolean, default: false },
    note: { type: String, default: "", trim: true },

    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Auto-delete after 30 days (we only keep leads long enough to follow up)
schema.index({ lastSeenAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model("AbandonedCheckout", schema);
