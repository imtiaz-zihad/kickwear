// src/models/PageVisitor.js
const mongoose = require("mongoose");

// one document per (page, visitor) for life
const pageVisitorSchema = new mongoose.Schema({
  path: { type: String, required: true },
  vid: { type: String, required: true }, // random browser id, no personal data
  firstDate: { type: String, required: true }, // YYYY-MM-DD (Asia/Dhaka)
  lastDate: { type: String, required: true },
});

pageVisitorSchema.index({ path: 1, vid: 1 }, { unique: true });

module.exports = mongoose.model("PageVisitor", pageVisitorSchema);