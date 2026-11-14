// src/models/Order.js
const mongoose = require("mongoose");

const STATUSES = ["Pending", "Confirmed","Collecting", "Shipped", "Delivered", "Cancelled"];
const DELIVERY_AREAS = ["dhaka", "outside"];
const SOURCES = ["web", "messenger", "whatsapp", "instagram", "phone"];
const ADVANCE_METHODS = ["bkash", "nagad", "rocket", "bank", "cash"];

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: null },
    size: { type: String, default: null },
    quantity: { type: Number, required: true, min: 1 },

    basePrice: { type: Number, required: true, min: 0 }, // product price per unit
    sizeExtra: { type: Number, default: 0, min: 0 }, // extra for 3XL / 4XL per unit
    uclPatch: { type: Boolean, default: false },
    customName: { type: String, default: null },
    customNumber: { type: String, default: null },
    addOnsPrice: { type: Number, default: 0, min: 0 }, // add-ons per unit
    price: { type: Number, required: true, min: 0 }, // final price per unit (base + size extra + add-ons)
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    deliveryArea: { type: String, enum: DELIVERY_AREAS, required: true },

    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "Order must have at least one item",
      },
    },

    deliveryCharge: { type: Number, default: 0, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 }, // items + delivery

    status: { type: String, enum: STATUSES, default: "Pending" },

    // where the order came from (web = website checkout)
    source: { type: String, enum: SOURCES, default: "web" },

    // pre-order: the product is not in stock yet (all items in the order are pre-order)
    isPreorder: { type: Boolean, default: false },
    // snapshot of the product's note at order time, e.g. "Delivery 20-25 Nov"
    preorderNote: { type: String, default: "" },

    // advance payment taken before delivery (the rest is Cash on Delivery)
    advancePaid: { type: Number, default: 0, min: 0 },
    advanceMethod: {
      type: String,
      enum: [...ADVANCE_METHODS, ""],
      default: "",
    },
    advanceTrxId: { type: String, trim: true, maxlength: 40, default: "" },

    size: { type: String, default: null }, // legacy (old orders)

    // set when an admin edits the order
    edited: { type: Boolean, default: false },
    originalTotal: { type: Number, default: null },
  },
  { timestamps: true },
);

// Indexes for admin list, tracking by phone, and status filter
orderSchema.index({ createdAt: -1 });
orderSchema.index({ phone: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ isPreorder: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
module.exports.STATUSES = STATUSES;
module.exports.DELIVERY_AREAS = DELIVERY_AREAS;
module.exports.SOURCES = SOURCES;
module.exports.ADVANCE_METHODS = ADVANCE_METHODS;
