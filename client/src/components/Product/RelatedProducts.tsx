import { getProductsByCategory } from "@/services/api";
import type { Product } from "@/types/product";
import { pickRelated } from "@/lib/relatedProducts";
import JerseyCard from "@/components/Common/JerseyCard";

// "You may also like" under a product.
// Uses the same cached category request as the category page, so it adds
// no extra load on the server.
export default async function RelatedProducts({ product }: { product: Product }) {
  let related: Product[] = [];

  try {
    const inCategory = await getProductsByCategory(product.category);
    related = pickRelated(product, inCategory, 16);
  } catch {
    return null; // suggestions are optional, never break the product page
  }

  if (related.length === 0) return null;

  return (
    <section
      aria-labelledby="related-products"
      className="mt-12 border-t border-border/60 pt-8"
    >
      <h2
        id="related-products"
        className="mb-5 flex items-center gap-3 font-display text-xl font-bold md:text-2xl"
      >
        <span className="h-6 w-1.5 rounded-full bg-primary" aria-hidden />
        You may also like
      </h2>

      <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
        {related.map((p) => (
          <JerseyCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  );
}