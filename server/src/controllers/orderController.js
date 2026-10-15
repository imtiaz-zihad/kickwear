// src/controllers/orderController.js
const Order = require("../models/Order");
const { getCache, setCache, invalidateCache } = require("../utils/cache");
const { sendSMS, SMS_MESSAGES } = require("../services/smsService");

const CACHE_TTL = {
  ORDER_LIST: 100,
  TRACK_ORDER: 30,
};

// ✅ Create order
exports.createOrder = async (req, res) => {
  try {
    const {
      customerName,
      phone,
      address,
      items,
      totalPrice,
      deliveryCharge,
      size,
    } = req.body;

    if (!customerName || !phone || !address || !items || !totalPrice) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!/^01[3-9]\d{8}$/.test(phone)) {
      return res
        .status(400)
        .json({ message: "Invalid Bangladeshi phone number" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Order must have at least one item" });
    }

    const order = await Order.create({
      customerName,
      phone,
      address,
      items,
      totalPrice,
      deliveryCharge: deliveryCharge || 0,
      size: size || null,
    });

    invalidateCache("orders:");
    invalidateCache(`track:${phone}`);

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update order status + send SMS on Confirmed
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["Pending", "Confirmed", "Shipped", "Delivered"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    invalidateCache("orders:");
    invalidateCache(`track:${order.phone}`);

    // ✅ Send SMS only when Confirmed
    if (SMS_MESSAGES[status]) {
      const message = SMS_MESSAGES[status](
        order.customerName,
        order.totalPrice, // ✅ total
        order.phone, // ✅ phone for track link
      );
      sendSMS(order.phone, message);
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Track order by phone
exports.trackOrder = async (req, res) => {
  try {
    const { phone } = req.params;

    if (!/^01[3-9]\d{8}$/.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    const cacheKey = `track:${phone}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const orders = await Order.find({ phone }).sort({ createdAt: -1 }).lean();

    setCache(cacheKey, orders, CACHE_TTL.TRACK_ORDER);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get all orders (admin)
exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const noCache = req.query.noCache === "true";

    const cacheKey = `orders:${JSON.stringify(req.query)}`;

    if (!noCache) {
      const cached = getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    const query = status ? { status } : {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query),
    ]);

    const result = { total, page: parseInt(page), data };
    setCache(cacheKey, result, CACHE_TTL.ORDER_LIST);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
