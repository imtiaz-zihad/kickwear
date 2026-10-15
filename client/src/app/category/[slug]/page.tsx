import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";

import { getProductsByCategory } from "@/services/api";
import { Product } from "@/types/product";
import JerseyCard from "@/components/Common/JerseyCard";

// ✅ Next.js 15: params is a Promise
interface Props {
  params: Promise<{ slug: string }>;
}

// ✅ Revalidate every 60 seconds (ISR)
export const revalidate = 60;

// Keep slugs in sync with Navbar, CategorySection and your DB category values
const CATEGORY_INFO: Record<string, { title: string; description: string }> = {
  "club-jersey": {
    title: "Club Jerseys",
    description: "Home, away and third kits from your favourite clubs",
  },
  "country-jersey": {
    title: "Country Jerseys",
    description: "National team kits for every tournament",
  },
  retro: {
    title: "Retro Jerseys",
    description: "Classic kits from football's golden eras",
  },
  jacket: {
    title: "Jackets",
    description: "Track tops, windbreakers and jackets",
  },
};

// Fallback for slugs not in CATEGORY_INFO: "t-shirts" → "T Shirts"
function formatCategoryName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getCategoryInfo(slug: string) {
  return (
    CATEGORY_INFO[slug] ?? {
      title: formatCategoryName(slug),
      description: `Explore our latest ${formatCategoryName(slug).toLowerCase()}`,
    }
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { title, description } = getCategoryInfo(slug);
  return { title, description };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const { title, description } = getCategoryInfo(slug);

  let products: Product[] = [];

  try {
    products = await getProductsByCategory(slug);
  } catch (err) {
    console.error(`[CategoryPage] Failed to fetch "${slug}":`, err);
  }

  return (
    <div className="min-h-screen flex flex-col px-6">
      {/* ── Header ── */}
      <div className="bg-linear-to-b from-secondary/50 to-background border-b">
        <div className="container py-2 md:py-2">
          <h1 className="font-display text-3xl md:text-5xl font-extrabold mb-3">
            {title}
          </h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* ── Product Grid ── */}
      <div className="container py-2 flex-1">
        {products.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {products.length} {products.length === 1 ? "item" : "items"}
            </p>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((product, i) => (
                <JerseyCard
                  key={product._id}
                  product={product}
                  priority={i < 4}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg font-medium">
              No products in this category yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}