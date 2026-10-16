// src/controllers/orderController.js
const Order = require("../models/Order");
const Product = require("../models/Product");
const { getCache, setCache, invalidateCache } = require("../utils/cache");
const { sendSMS, SMS_MESSAGES } = require("../services/smsService");
const mongoose = require("mongoose");

const CACHE_TTL = {
  ORDER_LIST: 100,
  TRACK_ORDER: 30,
};

// ✅ Create order
// exports.createOrder = async (req, res) => {
//   try {
//     const {
//       customerName,
//       phone,
//       address,
//       items,
//       totalPrice,
//       deliveryCharge,
//       size,
//     } = req.body;

//     if (!customerName || !phone || !address || !items || !totalPrice) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     if (!/^01[3-9]\d{8}$/.test(phone)) {
//       return res
//         .status(400)
//         .json({ message: "Invalid Bangladeshi phone number" });
//     }

//     if (!Array.isArray(items) || items.length === 0) {
//       return res
//         .status(400)
//         .json({ message: "Order must have at least one item" });
//     }

//     const order = await Order.create({
//       customerName,
//       phone,
//       address,
//       items,
//       totalPrice,
//       deliveryCharge: deliveryCharge || 0,
//       size: size || null,
//     });

//     invalidateCache("orders:");
//     invalidateCache(`track:${phone}`);

//     res.status(201).json(order);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


exports.createOrder = async (req, res) => {
  try {
    const {
      customerName,
      phone,
      address,
      deliveryArea,
      items,
    } = req.body;

    // 1. Validate required fields
    if (
      !customerName?.trim() ||
      !phone?.trim() ||
      !address?.trim() ||
      !deliveryArea ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const normalizedPhone = phone.trim();

    if (!/^01[3-9]\d{8}$/.test(normalizedPhone)) {
      return res.status(400).json({
        message: "Invalid Bangladeshi phone number",
      });
    }

    if (!["dhaka", "outside"].includes(deliveryArea)) {
      return res.status(400).json({
        message: "Invalid delivery area",
      });
    }

    // 2. Calculate each item using database prices
    const orderItems = [];
    let itemsTotal = 0;

    for (const item of items) {
      const {
        productId,
        quantity,
        size,
        uclPatch = false,
        customName,
        customNumber,
      } = item;

      if (
        !productId ||
        !mongoose.isValidObjectId(productId) ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        typeof uclPatch !== "boolean"
      ) {
        return res.status(400).json({
          message: "Invalid product or quantity",
        });
      }

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          message: "A product in your order was not found",
        });
      }

      // 3. Validate stock
      if (quantity > product.stock) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`,
        });
      }

      // 4. Validate size
      if (
        size &&
        Array.isArray(product.sizes) &&
        !product.sizes.includes(size)
      ) {
        return res.status(400).json({
          message: `Invalid size for ${product.name}`,
        });
      }

      // 5. Validate optional add-ons
      const patch = product.addOns?.uclPatch;
      const printing = product.addOns?.customPrint;

      if (uclPatch && !patch?.enabled) {
        return res.status(400).json({
          message: `UCL patch is unavailable for ${product.name}`,
        });
      }

      const hasCustomName =
        typeof customName === "string" && customName.trim() !== "";
      const hasCustomNumber =
        customNumber !== null &&
        customNumber !== undefined &&
        String(customNumber).trim() !== "";

      if (hasCustomName !== hasCustomNumber) {
        return res.status(400).json({
          message: "Custom name and number must be provided together",
        });
      }

      const wantsPrinting = hasCustomName && hasCustomNumber;

      if (wantsPrinting && !printing?.enabled) {
        return res.status(400).json({
          message: `Custom printing is unavailable for ${product.name}`,
        });
      }

      // 6. Use the current selling price from the database
      const basePrice = product.discountedPrice;

      const patchPrice = uclPatch ? patch.price : 0;
      const printingPrice = wantsPrinting ? printing.price : 0;

      const addOnsPrice = patchPrice + printingPrice;
      const finalUnitPrice = basePrice + addOnsPrice;

      orderItems.push({
        productId: product._id.toString(),
        name: product.name,
        image: product.images?.[0] || null,
        size: size || null,
        quantity,
        basePrice,
        uclPatch,
        customName: wantsPrinting ? customName.trim() : null,
        customNumber: wantsPrinting
          ? String(customNumber).trim()
          : null,
        addOnsPrice,
        price: finalUnitPrice,
      });

      itemsTotal += finalUnitPrice * quantity;
    }

    // 7. Calculate delivery and final total on the server
    const deliveryCharge = deliveryArea === "dhaka" ? 70 : 130;
    const totalPrice = itemsTotal + deliveryCharge;

    // 8. Save the order
    const order = await Order.create({
      customerName: customerName.trim(),
      phone: normalizedPhone,
      address: address.trim(),
      deliveryArea,
      items: orderItems,
      deliveryCharge,
      totalPrice,
    });

    // 9. Clear relevant caches
    invalidateCache("orders:");
    invalidateCache(`track:${normalizedPhone}`);

    // 10. Send Purchase to Meta (server-side). No await: it must never slow or break the order.
    sendPurchase(order, req);

    return res.status(201).json(order);
  } catch (err) {
    console.error("Create Order Error:", err);

    return res.status(500).json({
      message: "Failed to create order",
    });
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
