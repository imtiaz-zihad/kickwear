// src/models/PageEvent.js
const mongoose = require("mongoose");

// One row per page view, only to show "today's visits with time"
// and traffic sources. Auto-deleted after 14 days (TTL).
const pageEventSchema = new mongoose.Schema({
  path: { type: String, required: true },
  v: { type: String, default: null }, // last 6 chars of the visitor id (not personal)
  device: { type: String, default: "Desktop" },
  src: { type: String, default: null }, // traffic source: msgr, facebook, google, direct...
  landing: { type: Boolean, default: false }, // true = first page of a visit (session)
  at: {
    type: Date,
    default: Date.now,
    index: { expireAfterSeconds: 14 * 24 * 60 * 60 },
  },
});

module.exports = mongoose.model("PageEvent", pageEventSchema);