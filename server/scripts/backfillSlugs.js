// One-time: give every existing product a slug.
// Run from the server folder:  node scripts/backfillSlugs.js
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../src/models/Product");
const { baseSlug, uniqueSlug } = require("../src/utils/slug");

(async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGO_URI (or MONGODB_URI) in server/.env");
  await mongoose.connect(uri);

  const products = await Product.find({
    $or: [{ slug: { $exists: false } }, { slug: "" }, { slug: null }],
  }).sort({ createdAt: 1 });

  for (const p of products) {
    const slug = await uniqueSlug(Product, baseSlug(p), p._id);
    await Product.updateOne({ _id: p._id }, { $set: { slug } });
    console.log(`${p.name}  →  ${slug}`);
  }

  console.log(`Done: ${products.length} products`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});