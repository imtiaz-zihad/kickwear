// One-time: give products a default description.
// Retro and kids-set are SKIPPED (they keep their own / no description).
//
// Run from the server folder:
//   node scripts/setDescriptions.js                      → preview only
//   node scripts/setDescriptions.js --apply              → fills ONLY empty descriptions
//   node scripts/setDescriptions.js --apply --overwrite  → replaces ALL descriptions
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../src/models/Product");

const SKIP_CATEGORIES = ["retro", "kids-set"];

const JERSEY_TEXT = [
  "Player Edition Imported Jersey from our latest collection.",
  "",
  "• Player Edition: the same style and cut worn by the players on the pitch.",
  "• Imported: direct imported jersey, not a local copy.",
  "• Fit: Player Edition fits a little closer than a regular fan jersey. If you like it loose, order one size up.",
  "• Size: check the Size Chart before ordering (S to 4XL available on most jerseys).",
  "• Customize: name & number printing and UCL patch are available on selected jerseys.",
  "• Delivery: Cash on Delivery all over Bangladesh.",
].join("\n");

const GENERAL_TEXT = [
  "From our latest collection.",
  "",
  "• Size: pick your size from the Size Chart before ordering.",
  "• Delivery: Cash on Delivery all over Bangladesh.",
].join("\n");

const textFor = (category) =>
  ["club-jersey", "country-jersey"].includes(category) ? JERSEY_TEXT : GENERAL_TEXT;

const apply = process.argv.includes("--apply");
const overwrite = process.argv.includes("--overwrite");

(async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGO_URI (or MONGODB_URI) in server/.env");
  await mongoose.connect(uri);

  const filter = { category: { $nin: SKIP_CATEGORIES } };
  if (!overwrite) {
    filter.$or = [{ description: { $exists: false } }, { description: null }, { description: "" }];
  }

  const products = await Product.find(filter).select("name category description").lean();

  const byCategory = {};
  for (const p of products) {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    if (overwrite && p.description) console.log(`(replaces) ${p.name}`);
  }
  console.log("Products to update, by category:", byCategory);
  console.log(`Total: ${products.length}  (${overwrite ? "overwrite ALL" : "only empty ones"})`);

  if (!apply) {
    console.log("\nPreview only. Add --apply to update.");
  } else {
    let n = 0;
    for (const category of Object.keys(byCategory)) {
      const res = await Product.updateMany(
        { ...filter, category },
        { $set: { description: textFor(category) } },
      );
      n += res.modifiedCount;
    }
    console.log(`\nUpdated ${n} products.`);
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});