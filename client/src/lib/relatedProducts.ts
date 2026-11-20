import type { Product } from "@/types/product";

// Words that do not tell two jerseys apart ("Kit" vs "Jersey", sleeve words)
const IGNORE = new Set([
  "half", "full", "sleeve", "sleeves", "short", "long",
  "kit", "kits", "jersey", "jerseys", "shirt", "shirts", "the", "new", "official",
]);

// Same key for the half and the full sleeve version of one jersey
// (same rule the server uses to link them on the product page)
const pairKey = (p: Pick<Product, "name" | "season">) =>
  [
    ...new Set(
      `${p.name} ${p.season ?? ""}`
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .map((w) => (/^20\d\d$/.test(w) ? w.slice(2) : w))
        .filter((w) => !IGNORE.has(w)),
    ),
  ]
    .sort()
    .join(" ");

// Up to `limit` other jerseys to suggest under a product:
//  - never the product itself or its other sleeve
//  - one card per jersey (half and full sleeve are not both shown)
//  - not sold out (pre-orders are fine)
//  - same team first, then the rest of the category
export function pickRelated(
  current: Product,
  list: Product[],
  limit = 4,
): Product[] {
  const currentKey = pairKey(current);
  const groups = new Map<string, Product[]>();

  for (const p of list) {
    if (p._id === current._id) continue;
    const soldOut =
      p.availability !== "preorder" && p.stock !== undefined && p.stock <= 0;
    if (soldOut) continue;

    const key = pairKey(p);
    if (key === currentKey) continue;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  // one product per jersey, the same sleeve as the current one if possible
  const unique = [...groups.values()].map(
    (g) => g.find((p) => p.sleeve === current.sleeve) ?? g[0],
  );

  const sameTeam = (p: Product) =>
    !!current.subcategory && p.subcategory === current.subcategory;

  return [...unique.filter(sameTeam), ...unique.filter((p) => !sameTeam(p))].slice(
    0,
    limit,
  );
}