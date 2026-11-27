// src/routes/orderRoutes.js
const router = require("express").Router();
const {
  createOrder,
  getOrders,
  customerHistory,
  updateStatus,
  updateOrder,
  mergeOrder,
  updateAdvance,
  trackOrder,
  refreshRisk,
  bookCourier,
  syncCourier,
  inspectRisk,
} = require("../controllers/orderController");
const { requireAdmin } = require("../middleware/adminAuth");

// Admin creates an order by hand (Messenger / WhatsApp / phone orders)
const markAdminCreated = (req, _res, next) => {
  req.adminCreated = true;
  next();
};

router.post("/", createOrder); // public (customers)
router.post("/admin-create", requireAdmin, markAdminCreated, createOrder);
router.get("/", requireAdmin, getOrders);
router.get("/history/:phone", requireAdmin, customerHistory); // past orders of a phone
router.get("/track/:phone", trackOrder); // public (customers)
router.get("/risk/:phone", requireAdmin, inspectRisk); // debug: raw Steadfast answer
router.post("/:id/risk", requireAdmin, refreshRisk); // re-check one order
router.post("/:id/courier", requireAdmin, bookCourier); // send to Steadfast
router.post("/:id/courier/sync", requireAdmin, syncCourier); // read courier status
router.patch("/:id/status", requireAdmin, updateStatus);
router.patch("/:id/advance", requireAdmin, updateAdvance);
router.post("/:id/merge", requireAdmin, mergeOrder); // move another order into this one
router.patch("/:id", requireAdmin, updateOrder);

module.exports = router;