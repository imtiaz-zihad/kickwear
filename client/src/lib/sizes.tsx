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
