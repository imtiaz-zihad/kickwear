import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { getFeaturedProducts } from "@/services/api";
import { Product } from "@/types/product";
import JerseyCard from "../Common/JerseyCard";

const MAX_PRODUCTS = 10;

export default async function FeaturedProducts() {
  let featured: Product[] = [];

  try {
    featured = (await getFeaturedProducts()).slice(0, MAX_PRODUCTS);
  } catch (err) {
    console.error("FeaturedProducts fetch failed:", err);
  }

  return (
    <section className="py-2 md:py-10" aria-labelledby="popular-jerseys">
      <div className="container">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2
            id="popular-jerseys"
            className="flex items-center gap-3 font-display text-2xl font-bold md:text-3xl"
          >
            <span className="h-7 w-1.5 rounded-full bg-primary" aria-hidden />
            Popular Jerseys
          </h2>

          <Link
            href="/category/club-jersey"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featured.length > 0 ? (
          // 2 columns on mobile/tablet, 5 on desktop → 10 items = 2 clean rows
          <div className="grid grid-cols-2 gap-1 md:gap-4 lg:grid-cols-5">
            {featured.map((product, i) => (
              <JerseyCard key={product._id} product={product} priority={i < 5} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed bg-card py-16 text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">No featured products yet.</p>
            <p className="text-sm text-muted-foreground/60">
              Add products from the admin panel.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}