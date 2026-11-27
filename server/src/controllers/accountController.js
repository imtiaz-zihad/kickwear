// src/controllers/accountController.js
// Partner hisab (Imtiaz / Zihad): add, edit, delete and the balance of each.
const mongoose = require("mongoose");
const AccountEntry = require("../models/AccountEntry");
const { getBalance } = require("../services/steadfast");

const { PARTNERS, TYPES } = AccountEntry;

// Validates the body of a create / update. Returns { value } or { error }.
function readBody(body = {}) {
  const partner = String(body.partner || "");
  if (!PARTNERS.includes(partner)) return { error: "Select Imtiaz or Zihad" };

  const type = String(body.type || "");
  if (!TYPES.includes(type)) return { error: "Select Paid or Received" };

  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount < 1 || amount > 100000000) {
    return { error: "Enter a whole amount of ৳1 or more" };
  }

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : "";

  let date = new Date();
  if (body.date) {
    date = new Date(body.date);
    if (Number.isNaN(date.getTime())) return { error: "Invalid date" };
    // not more than a day in the future (time zone slack)
    if (date.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
      return { error: "Date cannot be in the future" };
    }
  }

  return { value: { partner, type, amount, note, date } };
}

// Balance of both partners, always over ALL entries (never filtered)
async function getSummary() {
  const rows = await AccountEntry.aggregate([
    {
      $group: {
        _id: { partner: "$partner", type: "$type" },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {};
  for (const p of PARTNERS) summary[p] = { paid: 0, received: 0, balance: 0, count: 0 };

  for (const r of rows) {
    const s = summary[r._id.partner];
    if (!s) continue;
    s[r._id.type] = r.total;
    s.count += r.count;
  }
  for (const p of PARTNERS) summary[p].balance = summary[p].paid - summary[p].received;

  return summary;
}

// GET /api/accounts?partner=imtiaz|zihad   -> { summary, entries }
exports.list = async (req, res) => {
  try {
    const query = {};
    if (PARTNERS.includes(req.query.partner)) query.partner = req.query.partner;

    const [summary, entries] = await Promise.all([
      getSummary(),
      AccountEntry.find(query).sort({ date: -1, createdAt: -1 }).limit(500).lean(),
    ]);

    res.json({ summary, entries });
  } catch (err) {
    console.error("Accounts list error:", err);
    res.status(500).json({ message: "Failed to load accounts" });
  }
};

// POST /api/accounts
exports.create = async (req, res) => {
  try {
    const { value, error } = readBody(req.body);
    if (error) return res.status(400).json({ message: error });

    const entry = await AccountEntry.create(value);
    res.status(201).json({ entry, summary: await getSummary() });
  } catch (err) {
    console.error("Accounts create error:", err);
    res.status(500).json({ message: "Failed to save entry" });
  }
};

// PATCH /api/accounts/:id
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid entry id" });
    }

    const { value, error } = readBody(req.body);
    if (error) return res.status(400).json({ message: error });

    const entry = await AccountEntry.findByIdAndUpdate(id, value, {
      returnDocument: "after",
      runValidators: true,
    }).lean();
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    res.json({ entry, summary: await getSummary() });
  } catch (err) {
    console.error("Accounts update error:", err);
    res.status(500).json({ message: "Failed to update entry" });
  }
};

// DELETE /api/accounts/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid entry id" });
    }

    const entry = await AccountEntry.findByIdAndDelete(id).lean();
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    res.json({ ok: true, summary: await getSummary() });
  } catch (err) {
    console.error("Accounts delete error:", err);
    res.status(500).json({ message: "Failed to delete entry" });
  }
};

// GET /api/accounts/courier-balance  -> { balance }  (Steadfast wallet)
exports.courierBalance = async (req, res) => {
  try {
    res.json({ balance: await getBalance() });
  } catch (err) {
    res.status(err.status || 502).json({ message: err.message || "Could not load courier balance" });
  }
};