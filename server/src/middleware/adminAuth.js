// src/middleware/adminAuth.js
const crypto = require("crypto");

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const sign = (payload) =>
  crypto
    .createHmac("sha256", process.env.ADMIN_TOKEN_SECRET || "")
    .update(payload)
    .digest("hex");

// token = "<expiry-ms>.<hmac>"
function createToken() {
  const payload = String(Date.now() + TOKEN_TTL_MS);
  return `${payload}.${sign(payload)}`;
}

function isValidToken(token) {
  if (!process.env.ADMIN_TOKEN_SECRET || typeof token !== "string") return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const a = Buffer.from(signature);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  return Number(payload) > Date.now();
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!isValidToken(token)) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

module.exports = { createToken, isValidToken, requireAdmin };