// src/routes/orderRoutes.js
const router = require("express").Router();
const {
  createOrder,
  getOrders,
  updateStatus,
  updateOrder,
  trackOrder,
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
router.get("/track/:phone", trackOrder); // public (customers)
router.patch("/:id/status", requireAdmin, updateStatus);
router.patch("/:id", requireAdmin, updateOrder);

module.exports = router;