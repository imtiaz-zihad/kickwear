// src/routes/abandonedRoutes.js
const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { capture, list, update, remove } = require("../controllers/abandonedController");

// The checkout page saves progress a few times per visit; cap abuse per IP
const captureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { ok: true, skipped: true },
});

router.post("/", captureLimiter, capture);
router.get("/", list);
router.patch("/:id", update);
router.delete("/:id", remove);

module.exports = router;
