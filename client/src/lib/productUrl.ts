import type { Product } from "@/types/product";

// Clean URL when the product has a slug, ID link for old data
export const productPath = (p: Pick<Product, "_id" | "slug">) =>
  `/product/${p.slug || p._id}`;