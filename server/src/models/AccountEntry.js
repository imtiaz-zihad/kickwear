// src/models/AccountEntry.js
// Partner hisab: one line = money one partner PAID for the business or
// RECEIVED on its behalf (for example a COD payment).
//   balance of a partner = total paid - total received
//   positive -> the business owes him (he will get), negative -> he owes it
const mongoose = require("mongoose");

const PARTNERS = ["imtiaz", "zihad"];
const TYPES = ["paid", "received"];

const schema = new mongoose.Schema(
  {
    partner: { type: String, enum: PARTNERS, required: true },
    type: { type: String, enum: TYPES, required: true },
    amount: { type: Number, required: true, min: 1, max: 100000000 },
    note: { type: String, trim: true, maxlength: 200, default: "" },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

schema.index({ date: -1, createdAt: -1 });

module.exports = mongoose.model("AccountEntry", schema);
module.exports.PARTNERS = PARTNERS;
module.exports.TYPES = TYPES;