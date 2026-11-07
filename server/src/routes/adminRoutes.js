// src/routes/adminRoutes.js
const router = require("express").Router();
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { createToken } = require("../middleware/adminAuth");

// stop password guessing: 10 tries per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts, try again later." },
});

router.post("/login", loginLimiter, (req, res) => {
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || !process.env.ADMIN_TOKEN_SECRET) {
    console.error("ADMIN_PASSWORD / ADMIN_TOKEN_SECRET is not set");
    return res.status(500).json({ message: "Admin login is not configured" });
  }

  const given = Buffer.from(String(req.body?.password ?? ""));
  const wanted = Buffer.from(expected);

  const ok =
    given.length === wanted.length && crypto.timingSafeEqual(given, wanted);

  if (!ok) return res.status(401).json({ message: "Wrong password" });

  res.json({ token: createToken() });
});

module.exports = router;