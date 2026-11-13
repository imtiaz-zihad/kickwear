// One-time: add 3XL and 4XL to existing club / country / retro jerseys.
// Kids sets and jackets are NOT touched.
//
// Run from the server folder:
//   node scripts/addLargeSizes.js          → preview only (changes nothing)
//   node scripts/addLargeSizes.js --apply  → really updates the database
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../src/models/Product");

const CATEGORIES = ["club-jersey", "country-jersey", "retro"];
const NEW_SIZES = ["3XL", "4XL"];
const apply = process.argv.includes("--apply");

(async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGO_URI (or MONGODB_URI) in server/.env");
  await mongoose.connect(uri);

  // products in those categories that are missing 3XL or 4XL
  const filter = {
    category: { $in: CATEGORIES },
    $or: NEW_SIZES.map((s) => ({ sizes: { $ne: s } })),
  };

  const products = await Product.find(filter).select("name category sizes").lean();

  for (const p of products) {
    console.log(`${p.category.padEnd(15)} ${p.name}   [${(p.sizes || []).join(", ")}]`);
  }
  console.log(`\n${products.length} products will get ${NEW_SIZES.join(" + ")}`);

  if (!apply) {
    console.log("\nPreview only. Run again with --apply to update.");
  } else {
    // $addToSet: adds only what is missing, never duplicates, keeps S..2XL order
    const res = await Product.updateMany(filter, {
      $addToSet: { sizes: { $each: NEW_SIZES } },
    });
    console.log(`\nUpdated ${res.modifiedCount} products.`);
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});