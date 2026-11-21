// One-time: give every Kids Set product the kids sizes (16, 18 ... 28)
// instead of S / M / L ... Other categories are NOT touched.
//
// Run from the server folder:
//   node scripts/setKidsSizes.js          -> preview only (changes nothing)
//   node scripts/setKidsSizes.js --apply  -> really updates the database
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../src/models/Product");
const { KIDS_SIZES } = require("../src/utils/sizes");

const CATEGORY = "kids-set";
const apply = process.argv.includes("--apply");

(async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGO_URI (or MONGODB_URI) in server/.env");
  await mongoose.connect(uri);

  // kids sets that still have a size which is not a kids size (or no sizes)
  const filter = {
    category: CATEGORY,
    $or: [
      { sizes: { $exists: false } },
      { sizes: { $size: 0 } },
      { sizes: { $elemMatch: { $nin: KIDS_SIZES } } },
    ],
  };

  const products = await Product.find(filter).select("name sizes").lean();

  for (const p of products) {
    console.log(`${p.name}   [${(p.sizes || []).join(", ")}]`);
  }
  console.log(`\n${products.length} kids sets will get sizes: ${KIDS_SIZES.join(", ")}`);

  if (!apply) {
    console.log("\nPreview only. Run again with --apply to update.");
  } else {
    const res = await Product.updateMany(filter, { $set: { sizes: KIDS_SIZES } });
    console.log(`\nUpdated ${res.modifiedCount} products.`);
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});