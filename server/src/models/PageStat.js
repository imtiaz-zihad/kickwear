// src/models/PageStat.js
const mongoose = require("mongoose");

const pageStatSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD (Asia/Dhaka)
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);

pageStatSchema.index({ path: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("PageStat", pageStatSchema);