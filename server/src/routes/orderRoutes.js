// src/routes/orderRoutes.js
const router = require("express").Router();
const {
  createOrder,
  getOrders,
  updateStatus,
  trackOrder,
} = require("../controllers/orderController");

router.post("/", createOrder);
router.get("/", getOrders);
router.get("/track/:phone", trackOrder);
router.patch("/:id/status", updateStatus);

module.exports = router;