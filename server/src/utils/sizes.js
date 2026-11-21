// Adult sizes
const SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"];
const DEFAULT_SIZES = ["S", "M", "L", "XL", "2XL"];

// Kids sizes (size numbers, age 1-14). Used by the "kids-set" category.
// The size chart for them is in the client: src/lib/sizes.tsx
const KIDS_SIZES = ["16", "18", "20", "22", "24", "26", "28"];

// everything a product is allowed to have
const ALL_SIZES = [...SIZES, ...KIDS_SIZES];

// 3XL / 4XL cost extra (kids sizes never do)
const SIZE_SURCHARGE = { "3XL": 100, "4XL": 200 };

const sizeExtra = (size) => SIZE_SURCHARGE[size] || 0;

module.exports = {
  SIZES,
  DEFAULT_SIZES,
  KIDS_SIZES,
  ALL_SIZES,
  SIZE_SURCHARGE,
  sizeExtra,
};