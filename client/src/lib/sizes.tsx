// Extra price (৳, per jersey) for big sizes. The SERVER charges this too
// (server/src/utils/sizes.js). Keep both numbers the same.
export const SIZE_SURCHARGE: Record<string, number> = {
  "3XL": 100,
  "4XL": 200,
};

export const sizeExtra = (size?: string | null): number =>
  (size && SIZE_SURCHARGE[size]) || 0;

// Sizes a new product starts with (3XL / 4XL are switched on per product)
export const DEFAULT_SIZES = ["S", "M", "L", "XL", "2XL"];

// ── Kids sets ───────────────────────────────────────────────────────────────
// Category whose products use kids sizes (same slug as in the admin + navbar)
export const KIDS_CATEGORY = "kids-set";

// Kids size numbers. The SERVER has the same list (server/src/utils/sizes.js).
export const KIDS_SIZES = ["16", "18", "20", "22", "24", "26", "28"];
export const DEFAULT_KIDS_SIZES = [...KIDS_SIZES];

// Kids size chart: size number, age (years), chest and length in inches
export const KIDS_SIZE_CHART: {
  size: string;
  age: string;
  chest: number;
  length: number;
}[] = [
  { size: "16", age: "1–2", chest: 24, length: 18 },
  { size: "18", age: "3–4", chest: 26, length: 19 },
  { size: "20", age: "5–6", chest: 28, length: 20 },
  { size: "22", age: "7–8", chest: 30, length: 21 },
  { size: "24", age: "9–10", chest: 32, length: 22 },
  { size: "26", age: "11–12", chest: 34, length: 23 },
  { size: "28", age: "13–14", chest: 36, length: 24 },
];

export const isKidsSize = (size?: string | null): boolean =>
  !!size && KIDS_SIZES.includes(size);

// a product is a kids product when all of its sizes are kids sizes
export const isKidsSizes = (sizes?: string[]): boolean =>
  !!sizes && sizes.length > 0 && sizes.every(isKidsSize);

export const kidsAge = (size?: string | null): string | null =>
  KIDS_SIZE_CHART.find((r) => r.size === size)?.age ?? null;