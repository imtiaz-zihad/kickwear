// src/models/Order.js
const mongoose = require("mongoose");

const STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered"];
const DELIVERY_AREAS = ["dhaka", "outside"];

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: null },
    size: { type: String, default: null },
    quantity: { type: Number, required: true, min: 1 },

    basePrice: { type: Number, required: true, min: 0 }, // product price per unit
    uclPatch: { type: Boolean, default: false },
    customName: { type: String, default: null },
    customNumber: { type: String, default: null },
    addOnsPrice: { type: Number, default: 0, min: 0 }, // add-ons per unit
    price: { type: Number, required: true, min: 0 }, // final price per unit
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

    size: { type: String, default: null }, // legacy (old orders)
  },
  { timestamps: true },
);

// Indexes for admin list, tracking by phone, and status filter
orderSchema.index({ createdAt: -1 });
orderSchema.index({ phone: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
module.exports.STATUSES = STATUSES;
module.exports.DELIVERY_AREAS = DELIVERY_AREAS;