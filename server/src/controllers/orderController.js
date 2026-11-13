// src/controllers/orderController.js
const Order = require("../models/Order");
const Product = require("../models/Product");
const { getCache, setCache, invalidateCache } = require("../utils/cache");
const { sendSMS, SMS_MESSAGES } = require("../services/smsService");
const mongoose = require("mongoose");
const { sendPurchase } = require("../services/metaCapi");
const { sizeExtra: extraForSize } = require("../utils/sizes");

const CACHE_TTL = {
  ORDER_LIST: 100,
  TRACK_ORDER: 30,
};

// Channels an admin may tag a manually created order with
const ADMIN_SOURCES = ["messenger", "whatsapp", "instagram", "phone"];

// Used by POST /orders (public) and POST /orders/admin-create (admin).
// The admin route sets req.adminCreated = true.
exports.createOrder = async (req, res) => {
  try {
    const { customerName, phone, address, deliveryArea, items } = req.body;

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
    let preorderCount = 0;
    let preorderNote = "";

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

      // 3. Validate stock (pre-order products can be ordered at any stock)
      const isPreorder = product.availability === "preorder";

      if (isPreorder) {
        preorderCount += 1;
        if (!preorderNote && product.preorderNote) {
          preorderNote = product.preorderNote;
        }
      } else if (quantity > product.stock) {
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

      // 3XL / 4XL cost extra (set in utils/sizes.js)
      const sizeExtra = extraForSize(size);

      const addOnsPrice = patchPrice + printingPrice;
      const finalUnitPrice = basePrice + sizeExtra + addOnsPrice;

      orderItems.push({
        productId: product._id.toString(),
        name: product.name,
        image: product.images?.[0] || null,
        size: size || null,
        quantity,
        basePrice,
        sizeExtra,
        uclPatch,
        customName: wantsPrinting ? customName.trim() : null,
        customNumber: wantsPrinting ? String(customNumber).trim() : null,
        addOnsPrice,
        price: finalUnitPrice,
      });

      itemsTotal += finalUnitPrice * quantity;
    }

    // Pre-order and in-stock jerseys ship at different times: keep them apart
    if (preorderCount > 0 && preorderCount !== orderItems.length) {
      return res.status(400).json({
        message:
          "Pre-order jerseys must be ordered separately from in-stock jerseys",
      });
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
      isPreorder: preorderCount > 0,
      preorderNote: preorderCount > 0 ? preorderNote : "",
      // Only an admin can tag a channel; public orders are always "web"
      source:
        req.adminCreated && ADMIN_SOURCES.includes(req.body.source)
          ? req.body.source
          : "web",
    });

    // 9. Clear relevant caches
    invalidateCache("orders:");
    invalidateCache(`track:${normalizedPhone}`);

    // 10. Send Purchase to Meta (server-side), website orders only.
    //     Admin-created orders would carry the admin's IP/browser and hurt
    //     matching quality. No await: it must never slow or break the order.
    if (!req.adminCreated) {
      try {
        sendPurchase(order, req);
      } catch (e) {
        console.error("Meta CAPI skipped:", e.message);
      }
    }

    return res.status(201).json(order);
  } catch (err) {
    console.error("Create Order Error:", err);

    return res.status(500).json({
      message: "Failed to create order",
    });
  }
};

// ✅ Update order status + send SMS (only for statuses that have a message)
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!Order.STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    invalidateCache("orders:");
    invalidateCache(`track:${order.phone}`);

    // SMS only when a message exists for that status (Cancelled: no SMS)
    if (SMS_MESSAGES[status]) {
      const message = SMS_MESSAGES[status](
        order.customerName,
        order.totalPrice,
        order.phone,
        order.advancePaid || 0,
      );
      sendSMS(order.phone, message);
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Track order by phone (public)
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
// Query: page, limit, status, preorder=true|false
exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, preorder } = req.query;
    const noCache = req.query.noCache === "true";

    const cacheKey = `orders:${JSON.stringify(req.query)}`;

    if (!noCache) {
      const cached = getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    const query = {};
    if (status) query.status = status;
    if (preorder === "true") query.isPreorder = true;
    else if (preorder === "false") query.isPreorder = { $ne: true };

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

// ✅ Admin edit: size / quantity / unit price / delivery charge
// Only while the order is Pending or Confirmed (before it goes to the courier)
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!["Pending", "Confirmed"].includes(order.status)) {
      return res
        .status(409)
        .json({ message: `A ${order.status} order cannot be edited` });
    }

    const { items, deliveryCharge } = req.body || {};

    if (items !== undefined) {
      if (!Array.isArray(items) || items.length !== order.items.length) {
        return res.status(400).json({ message: "Items do not match this order" });
      }

      for (let i = 0; i < items.length; i++) {
        const patch = items[i] || {};
        const item = order.items[i];

        if (patch.size !== undefined) {
          const size =
            typeof patch.size === "string" && patch.size.trim()
              ? patch.size.trim()
              : null;
          if (size) {
            const product = mongoose.isValidObjectId(item.productId)
              ? await Product.findById(item.productId).select("sizes name").lean()
              : null;
            if (product?.sizes?.length && !product.sizes.includes(size)) {
              return res.status(400).json({
                message: `Size ${size} is not available for ${product.name}`,
              });
            }
          }
          item.size = size;

          // moving to / from 3XL or 4XL changes the price (unless the admin
          // sends an explicit price below)
          const newExtra = extraForSize(size);
          const oldExtra = item.sizeExtra || 0;
          if (newExtra !== oldExtra) {
            item.sizeExtra = newExtra;
            if (patch.price === undefined) {
              item.price = Math.max(0, item.price + newExtra - oldExtra);
            }
          }
        }

        if (patch.quantity !== undefined) {
          const q = Number(patch.quantity);
          if (!Number.isInteger(q) || q < 1 || q > 20) {
            return res.status(400).json({ message: "Quantity must be 1–20" });
          }
          item.quantity = q;
        }

        if (patch.price !== undefined) {
          const p = Number(patch.price);
          if (!Number.isFinite(p) || p < 0 || p > 100000) {
            return res.status(400).json({ message: "Invalid price" });
          }
          item.price = p;
          item.basePrice = Math.max(
            0,
            p - (item.addOnsPrice || 0) - (item.sizeExtra || 0),
          );
        }
      }
    }

    if (deliveryCharge !== undefined) {
      const d = Number(deliveryCharge);
      if (!Number.isFinite(d) || d < 0 || d > 1000) {
        return res.status(400).json({ message: "Invalid delivery charge" });
      }
      order.deliveryCharge = d;
    }

    // remember the original total once, for discount tracking
    if (order.originalTotal == null) order.originalTotal = order.totalPrice;

    const itemsTotal = order.items.reduce((s, it) => s + it.price * it.quantity, 0);
    order.totalPrice = itemsTotal + order.deliveryCharge;

    // the customer already paid part of it: the total cannot drop below that
    if ((order.advancePaid || 0) > order.totalPrice) {
      return res.status(409).json({
        message: `Total cannot be lower than the advance already paid (৳${order.advancePaid}). Lower the advance first.`,
      });
    }

    order.edited = true;

    await order.save();

    invalidateCache("orders:");
    invalidateCache(`track:${order.phone}`);

    res.json(order);
  } catch (err) {
    console.error("Update Order Error:", err);
    res.status(500).json({ message: "Failed to update order" });
  }
};

// ✅ Admin: record / change the advance payment on an order
// Body: { amount, method?, trxId? }   amount 0 clears it
// Allowed in any status (an advance can arrive after the order is confirmed)
exports.updateAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const amount = Math.round(Number(req.body?.amount));
    if (!Number.isFinite(amount) || amount < 0 || amount > order.totalPrice) {
      return res.status(400).json({
        message: `Advance must be between ৳0 and ৳${order.totalPrice}`,
      });
    }

    const method = String(req.body?.method || "");
    if (method && !Order.ADVANCE_METHODS.includes(method)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    order.advancePaid = amount;
    // clearing the amount clears the details too
    order.advanceMethod = amount > 0 ? method : "";
    order.advanceTrxId =
      amount > 0 ? String(req.body?.trxId || "").trim().slice(0, 40) : "";

    await order.save();

    invalidateCache("orders:");
    invalidateCache(`track:${order.phone}`);

    res.json(order);
  } catch (err) {
    console.error("Update Advance Error:", err);
    res.status(500).json({ message: "Failed to update advance" });
  }
};
