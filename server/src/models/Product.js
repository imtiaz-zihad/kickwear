const mongoose = require("mongoose");

const SIZES = ["S", "M", "L", "XL", "2XL"];
const SLEEVES = ["half", "full"];

const productSchema = new mongoose.Schema(
  {
    // "Barcelona Home 26/27"
    name: { type: String, required: true, trim: true },

    // slug: "club-jersey" | "country-jersey" | "retro" | "jacket"
    category: { type: String, required: true, lowercase: true, trim: true },

    // team / country slug: "barcelona", "real-madrid", "argentina"
    subcategory: { type: String, lowercase: true, trim: true },

    // "half" | "full" (optional, e.g. not needed for jackets)
    sleeve: { type: String, enum: SLEEVES },

    // "26/27"
    season: { type: String, trim: true },

    // available sizes for this product
    sizes: { type: [{ type: String, enum: SIZES }], default: SIZES },

    // optional paid extras (price is per jersey)
    addOns: {
      uclPatch: {
        enabled: { type: Boolean, default: false },
        price: { type: Number, default: 200, min: 0 },
      },
      customPrint: {
        enabled: { type: Boolean, default: false }, // name + number printing
        price: { type: Number, default: 200, min: 0 },
      },
    },

    images: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one image is required",
      },
    },

    originalPrice: { type: Number, required: true, min: 1 }, // regular price
    discountedPrice: { type: Number, required: true, min: 1 }, // selling price
    discountPercentage: { type: Number, default: 0 },

    isFeatured: { type: Boolean, default: false },
    description: String,
    stock: { type: Number, default: 1 },
  },
  { timestamps: true } // createdAt / updatedAt → "newest first" sorting
);

// ✅ Indexes for fast filtering
productSchema.index({ category: 1, subcategory: 1 }); // category page + team filter
productSchema.index({ isFeatured: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);
module.exports.SIZES = SIZES;
module.exports.SLEEVES = SLEEVES;