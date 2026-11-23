// src/controllers/orderController.js
const Order = require("../models/Order");
const Product = require("../models/Product");
const { getCache, setCache, invalidateCache } = require("../utils/cache");
const { sendSMS, SMS_MESSAGES } = require("../services/smsService");
const mongoose = require("mongoose");
const { sendPurchase } = require("../services/metaCapi");
const { sizeExtra: extraForSize } = require("../utils/sizes");
const { notifyNewOrder } = require("../services/notify");
const { checkCustomer, inspectCustomer, isConfigured } = require("../services/steadfast");

const CACHE_TTL = {
  ORDER_LIST: 100,
  TRACK_ORDER: 30,
};

// Looks up the customer on Steadfast and saves the result on the order.
// Returns the risk, or null if it could not be checked.
async function attachRisk(order) {
  const risk = await checkCustomer(order.phone);
  if (!risk) return null;
  await Order.updateOne({ _id: order._id }, { $set: { risk } });
  invalidateCache("orders:");
  return risk;
}

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

    // 11. Check the customer's delivery record (Steadfast), then tell the owner
    //     by phone notification (website orders only). Runs after the response,
    //     so the order never waits for it.
    attachRisk(order)
      .catch(() => null)
      .then((risk) => {
        if (!req.adminCreated) notifyNewOrder(order, risk);
      });

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
    const { page = 1, limit = 50, status, preorder, since } = req.query;
    const noCache = req.query.noCache === "true";

    const cacheKey = `orders:${JSON.stringify(req.query)}`;

    if (!noCache) {
      const cached = getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    const query = {};
    if (status) query.status = status;
    // since=<ISO date> → only orders created after it (new-order badge)
    if (since) {
      const d = new Date(String(since));
      if (!Number.isNaN(d.getTime())) query.createdAt = { $gt: d };
    }
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

// Builds one order item from a product + the admin's choices, with the same
// checks and DB prices as createOrder. Returns { item, isPreorder } or
// { status, error }.
async function buildItem(input) {
  const {
    productId,
    quantity,
    size,
    uclPatch = false,
    customName,
    customNumber,
  } = input || {};

  if (
    !productId ||
    !mongoose.isValidObjectId(productId) ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 20 ||
    typeof uclPatch !== "boolean"
  ) {
    return { status: 400, error: "Invalid product or quantity" };
  }

  const product = await Product.findById(productId);
  if (!product) return { status: 404, error: "Product not found" };

  const isPreorder = product.availability === "preorder";
  if (!isPreorder && quantity > product.stock) {
    return { status: 400, error: `Insufficient stock for ${product.name}` };
  }

  if (size && Array.isArray(product.sizes) && !product.sizes.includes(size)) {
    return { status: 400, error: `Invalid size for ${product.name}` };
  }

  const patch = product.addOns?.uclPatch;
  const printing = product.addOns?.customPrint;

  if (uclPatch && !patch?.enabled) {
    return { status: 400, error: `UCL patch is unavailable for ${product.name}` };
  }

  const hasName = typeof customName === "string" && customName.trim() !== "";
  const hasNumber =
    customNumber !== null &&
    customNumber !== undefined &&
    String(customNumber).trim() !== "";
  if (hasName !== hasNumber) {
    return { status: 400, error: "Custom name and number must be provided together" };
  }
  const wantsPrinting = hasName && hasNumber;
  if (wantsPrinting && !printing?.enabled) {
    return {
      status: 400,
      error: `Custom printing is unavailable for ${product.name}`,
    };
  }

  const basePrice = product.discountedPrice;
  const sizeExtra = extraForSize(size);
  const addOnsPrice = (uclPatch ? patch.price : 0) + (wantsPrinting ? printing.price : 0);

  return {
    isPreorder,
    item: {
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
      price: basePrice + sizeExtra + addOnsPrice,
    },
  };
}

// ✅ Admin edit: size / quantity / unit price / delivery charge, and add more
// jerseys (addItems). Only before it goes to the courier (Pending, Confirmed
// or Collecting)
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!["Pending", "Confirmed", "Collecting"].includes(order.status)) {
      return res
        .status(409)
        .json({ message: `A ${order.status} order cannot be edited` });
    }

    const { items, deliveryCharge, addItems } = req.body || {};

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

    // add more jerseys to this order (same prices + checks as a new order)
    if (addItems !== undefined) {
      if (!Array.isArray(addItems) || addItems.length === 0 || addItems.length > 10) {
        return res.status(400).json({ message: "Invalid jerseys to add" });
      }
      for (const input of addItems) {
        const built = await buildItem(input);
        if (built.error) {
          return res.status(built.status).json({ message: built.error });
        }
        if (built.isPreorder !== !!order.isPreorder) {
          return res.status(409).json({
            message:
              "Pre-order and in-stock jerseys must be in separate orders",
          });
        }
        order.items.push(built.item);
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

// ✅ Admin: move every jersey of another order (same phone) into this one,
// then cancel the other order. For "the customer ordered twice by mistake".
// Body: { fromId }
exports.mergeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { fromId } = req.body || {};

    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(fromId) ||
      String(fromId) === String(id)
    ) {
      return res.status(400).json({ message: "Invalid order" });
    }

    const [target, source] = await Promise.all([
      Order.findById(id),
      Order.findById(fromId),
    ]);
    if (!target || !source) {
      return res.status(404).json({ message: "Order not found" });
    }

    const EDITABLE = ["Pending", "Confirmed", "Collecting"];
    if (!EDITABLE.includes(target.status) || !EDITABLE.includes(source.status)) {
      return res.status(409).json({
        message: "Only Pending, Confirmed or Collecting orders can be merged",
      });
    }
    if (target.phone !== source.phone) {
      return res
        .status(400)
        .json({ message: "Both orders must have the same phone number" });
    }
    if (!!target.isPreorder !== !!source.isPreorder) {
      return res.status(409).json({
        message: "A pre-order cannot be merged with an in-stock order",
      });
    }
    if ((source.advancePaid || 0) > 0) {
      return res.status(409).json({
        message: `That order has an advance of ৳${source.advancePaid}. Move the advance first, then merge.`,
      });
    }

    for (const it of source.items) target.items.push(it.toObject());

    if (target.originalTotal == null) target.originalTotal = target.totalPrice;
    target.totalPrice =
      target.items.reduce((sum, it) => sum + it.price * it.quantity, 0) +
      target.deliveryCharge;
    target.edited = true;
    await target.save();

    source.status = "Cancelled";
    await source.save();

    invalidateCache("orders:");
    invalidateCache(`track:${target.phone}`);

    res.json({ order: target, cancelled: source });
  } catch (err) {
    console.error("Merge Order Error:", err);
    res.status(500).json({ message: "Failed to merge orders" });
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

// ✅ Admin: re-check one order's customer on Steadfast (and save the result)
exports.refreshRisk = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }
    if (!isConfigured()) {
      return res.status(503).json({ message: "Steadfast keys are not set on the server" });
    }

    const order = await Order.findById(id).select("phone").lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    const risk = await checkCustomer(order.phone, { force: true });
    if (!risk) {
      return res
        .status(502)
        .json({ message: "Steadfast check failed. Try again in a few minutes." });
    }

    const updated = await Order.findByIdAndUpdate(
      id,
      { $set: { risk } },
      { returnDocument: "after" },
    ).lean();
    invalidateCache("orders:");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Admin debug: the real Steadfast answer for any phone + how we read it
exports.inspectRisk = async (req, res) => {
  const { phone } = req.params;
  if (!/^01[3-9]\d{8}$/.test(phone)) {
    return res.status(400).json({ message: "Invalid phone number" });
  }
  try {
    res.json(await inspectCustomer(phone));
  } catch (err) {
    res.status(err.status || err.response?.status || 502).json({
      message: err.message,
      steadfast: err.response?.data ?? null,
    });
  }
};