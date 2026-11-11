// src/controllers/productController.js
const mongoose = require("mongoose");
const Product = require("../models/Product");
const { getCache, setCache, invalidateCache } = require("../utils/cache");
const { baseSlug, uniqueSlug } = require("../utils/slug");

// Cache TTL constants (in seconds)
const CACHE_TTL = {
  PRODUCT_LIST: 120, // 2 minutes for product lists
  SINGLE_PRODUCT: 300, // 5 minutes for single product
};

// ✅ Only these fields can be written from the request body
// (slug is NOT here: it is created once and never edited from the admin)
const ALLOWED_FIELDS = [
  "name",
  "category",
  "subcategory",
  "sleeve",
  "season",
  "sizes",
  "images",
  "originalPrice",
  "discountedPrice",
  "isFeatured",
  "description",
  "stock",
  "addOns",
  "availability",
  "preorderNote",
];

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  "price-asc": { discountedPrice: 1 },
  "price-desc": { discountedPrice: -1 },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const pickAllowed = (body = {}) =>
  Object.fromEntries(
    ALLOWED_FIELDS.filter((key) => body[key] !== undefined).map((key) => [
      key,
      body[key],
    ])
  );

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Turn { addOns: { uclPatch: { enabled } } } into dotted $set paths so a
// partial update never wipes the other add-on fields
const flattenAddOns = (update) => {
  const addOns = update.addOns;
  delete update.addOns;
  if (!addOns || typeof addOns !== "object") return;

  for (const key of ["uclPatch", "customPrint"]) {
    const a = addOns[key];
    if (!a || typeof a !== "object") continue;
    if (a.enabled !== undefined) update[`addOns.${key}.enabled`] = Boolean(a.enabled);
    if (a.price !== undefined) update[`addOns.${key}.price`] = Number(a.price);
  }
};

// Pre-order note only makes sense on pre-order products
const normalizeAvailability = (data) => {
  if (data.preorderNote !== undefined) {
    data.preorderNote = String(data.preorderNote).trim().slice(0, 100);
  }
  if (data.availability === "in-stock") data.preorderNote = "";
};

const toInt = (value, fallback, min = 1, max = Infinity) => {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};

const calcDiscount = (original, discounted) =>
  original > 0 ? Math.round(((original - discounted) / original) * 100) : 0;

// Returns an error message, or null if prices are valid
const checkPrices = (original, discounted) => {
  if (!(original > 0) || !(discounted > 0)) {
    return "Regular price and discount price must be greater than 0";
  }
  if (discounted > original) {
    return "Discount price cannot be higher than regular price";
  }
  return null;
};

const sendError = (res, err) => {
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({ message });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid id" });
  }
  console.error("Product controller error:", err);
  res.status(500).json({ message: "Internal server error" });
};

// ─── Get all products (filter + search + sort + pagination) ─────────────────
// Query params:
//   category=club-jersey   subcategory=barcelona   sleeve=half|full
//   size=XL   featured=true   search=barca   sort=newest|price-asc|price-desc
//   availability=in-stock|preorder
//   page=1   limit=10
exports.getProducts = async (req, res) => {
  try {
    const { category, subcategory, sleeve, size, search, featured, sort, availability } =
      req.query;

    const page = toInt(req.query.page, 1);
    const limit = toInt(req.query.limit, 100, 1, 100); // hard cap at 100

    const cacheKey = `products:${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const query = {};

    if (category) query.category = String(category).toLowerCase();
    if (subcategory) query.subcategory = String(subcategory).toLowerCase();
    if (sleeve) query.sleeve = String(sleeve).toLowerCase();
    if (size) query.sizes = String(size).toUpperCase(); // matches array element
    if (featured === "true") query.isFeatured = true;

    if (availability === "preorder") {
      query.availability = "preorder";
    } else if (availability === "in-stock") {
      // old products have no availability field, so they count as in-stock
      query.availability = { $ne: "preorder" };
    }

    // Partial, case-insensitive name match ("barca" finds "Barcelona Home")
    if (search) {
      query.name = { $regex: escapeRegex(String(search)), $options: "i" };
    }

    const sortBy = SORTS[sort] || SORTS.newest;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query).sort(sortBy).skip(skip).limit(limit).lean(),
      Product.countDocuments(query),
    ]);

    const result = {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: products,
    };

    setCache(cacheKey, result, CACHE_TTL.PRODUCT_LIST);
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
};

// ─── Get single product (by ID or by slug) ──────────────────────────────────
exports.getSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const cacheKey = `product:${id}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const data = mongoose.isValidObjectId(id)
      ? await Product.findById(id).lean()
      : await Product.findOne({ slug: String(id).toLowerCase() }).lean();
    if (!data) return res.status(404).json({ message: "Product not found" });

    setCache(cacheKey, data, CACHE_TTL.SINGLE_PRODUCT);
    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
};

// ─── Add product ────────────────────────────────────────────────────────────
exports.addProduct = async (req, res) => {
  try {
    const data = pickAllowed(req.body);
    normalizeAvailability(data);

    const original = Number(data.originalPrice);
    const discounted = Number(data.discountedPrice);

    const priceError = checkPrices(original, discounted);
    if (priceError) return res.status(400).json({ message: priceError });

    // Clean URL: created once, never changes when the product is renamed
    const slug = await uniqueSlug(Product, baseSlug(data));

    const product = await Product.create({
      ...data,
      slug,
      originalPrice: original,
      discountedPrice: discounted,
      discountPercentage: calcDiscount(original, discounted),
    });

    invalidateCache("products:");

    res.status(201).json(product);
  } catch (err) {
    sendError(res, err);
  }
};

// ─── Update product ─────────────────────────────────────────────────────────
exports.updateProduct = async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id)
      .select("originalPrice discountedPrice slug name sleeve")
      .lean();
    if (!existing) return res.status(404).json({ message: "Product not found" });

    const update = pickAllowed(req.body);
    flattenAddOns(update);
    normalizeAvailability(update);

    // Product from before slugs existed: give it one now
    if (!existing.slug) {
      update.slug = await uniqueSlug(
        Product,
        baseSlug({
          name: update.name ?? existing.name,
          sleeve: update.sleeve ?? existing.sleeve,
        }),
        existing._id
      );
    }

    // Re-validate and recalculate discount if either price changes
    if (update.originalPrice !== undefined || update.discountedPrice !== undefined) {
      const original = Number(update.originalPrice ?? existing.originalPrice);
      const discounted = Number(
        update.discountedPrice ?? existing.discountedPrice
      );

      const priceError = checkPrices(original, discounted);
      if (priceError) return res.status(400).json({ message: priceError });

      update.originalPrice = original;
      update.discountedPrice = discounted;
      update.discountPercentage = calcDiscount(original, discounted);
    }

    const data = await Product.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).lean();

    // The product is cached under both its ID and its slug
    invalidateCache(`product:${req.params.id}`);
    if (data?.slug) invalidateCache(`product:${data.slug}`);
    invalidateCache("products:");

    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
};

// ─── Delete product ─────────────────────────────────────────────────────────
exports.deleteProduct = async (req, res) => {
  try {
    const data = await Product.findByIdAndDelete(req.params.id).lean();
    if (!data) return res.status(404).json({ message: "Product not found" });

    invalidateCache(`product:${req.params.id}`);
    if (data.slug) invalidateCache(`product:${data.slug}`);
    invalidateCache("products:");

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    sendError(res, err);
  }
};