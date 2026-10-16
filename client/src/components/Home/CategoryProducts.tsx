import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { getProductsByCategory } from "@/services/api";
import { Product } from "@/types/product";
import JerseyCard from "../Common/JerseyCard";

interface Props {
  slug: string; // category slug, e.g. "country-jersey"
  title: string; // section heading, e.g. "Country Jerseys"
  limit?: number;
}

export default async function CategoryProducts({
  slug,
  title,
  limit = 5,
}: Props) {
  let products: Product[] = [];

  try {
    // newest first, limited on the server
    products = (await getProductsByCategory(slug, undefined, limit)).slice(0, limit);
  } catch (err) {
    console.error(`CategoryProducts fetch failed (${slug}):`, err);
  }

  const headingId = `category-${slug}`;

  return (
    <section className="py-2 md:py-4" aria-labelledby={headingId}>
      <div className="container">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2
            id={headingId}
            className="flex items-center gap-3 font-display text-2xl font-bold md:text-3xl"
          >
            <span className="h-7 w-1.5 rounded-full bg-primary" aria-hidden />
            {title}  
          </h2>

          <Link
            href={`/category/${slug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {products.length > 0 ? (
          // 2 columns on mobile/tablet, 5 on desktop
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
            {products.map((product) => (
              <JerseyCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed bg-card py-16 text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              No {title.toLowerCase()} yet.
            </p>
            <p className="text-sm text-muted-foreground/60">
              Add products from the admin panel.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}