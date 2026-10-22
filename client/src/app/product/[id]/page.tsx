import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Banknote, ChevronRight, Truck } from "lucide-react";
import { getSingleProduct } from "@/services/api";
import { Product, Sleeve } from "@/types/product";
import OrderButton from "@/components/Common/OrderButton";
import ProductImageCarousel from "@/components/Product/ProductImageCarousel";
import ViewContentTracker from "@/components/Product/ViewContentTracker";

const SLEEVE_LABEL: Record<Sleeve, string> = {
  half: "Half Sleeve",
  full: "Full Sleeve",
};

// "real-madrid" → "Real Madrid"
function formatSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function getProduct(id: string): Promise<Product | null> {
  try {
    return await getSingleProduct(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Product not found" };

  return {
    title: product.name,
    description: `Buy ${product.name} for ৳${product.discountedPrice.toLocaleString()}. Cash on delivery all over Bangladesh.`,
    openGraph: {
      title: product.name,
      images: product.images?.[0] ? [product.images[0]] : [],
    },
  };
}

export default async function ProductDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const hasDiscount = product.originalPrice > product.discountedPrice;
  const savings = product.originalPrice - product.discountedPrice;
  const discount =
    product.discountPercentage && product.discountPercentage > 0
      ? Math.round(product.discountPercentage)
      : hasDiscount
        ? Math.round((savings / product.originalPrice) * 100)
        : 0;

  const sleeve = product.sleeve ? SLEEVE_LABEL[product.sleeve] : null;
  const outOfStock = product.stock !== undefined && product.stock <= 0;

  // Only show rows that have data
  const specs = [
    { label: "Category", value: formatSlug(product.category) },
    product.subcategory && { label: "Team", value: formatSlug(product.subcategory) },
    product.season && { label: "Season", value: product.season },
    sleeve && { label: "Sleeve", value: sleeve },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <ViewContentTracker product={product} />
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex items-center gap-1 text-sm text-muted-foreground"
      >
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <Link
          href={`/category/${product.category}`}
          className="hover:text-foreground"
        >
          {formatSlug(product.category)}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* LEFT: images */}
        <div className="relative self-start lg:sticky lg:top-24">
          {discount > 0 && (
            <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
              -{discount}%
            </span>
          )}
          <ProductImageCarousel images={product.images ?? []} name={product.name} />
        </div>

        {/* RIGHT: info */}
        <div className="space-y-6">
          {/* Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/category/${product.category}`}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
            >
              {formatSlug(product.category)}
            </Link>
            {sleeve && (
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                {sleeve}
              </span>
            )}
            {product.season && (
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                {product.season}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-display text-2xl font-bold leading-tight text-foreground md:text-4xl">
            {product.name}
          </h1>

          {/* Price */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-3xl font-bold text-primary md:text-4xl">
              ৳{product.discountedPrice.toLocaleString()}
            </span>
            {hasDiscount && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  ৳{product.originalPrice.toLocaleString()}
                </span>
                <span className="rounded-md bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-600">
                  Save ৳{savings.toLocaleString()}
                </span>
              </>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          {/* Size + quantity + order */}
          <OrderButton
            productId={product._id}
            productName={product.name}
            basePrice={product.discountedPrice}
            sizes={product.sizes ?? []}
            addOns={product.addOns}
            outOfStock={outOfStock}
          />

          {/* Trust cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex gap-3 rounded-2xl border border-border/60 bg-card p-4">
              <Truck className="h-6 w-6 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">Fast Delivery</p>
                <p className="text-xs text-muted-foreground">
                  Dhaka ৳70 · Outside ৳130
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl border border-border/60 bg-card p-4">
              <Banknote className="h-6 w-6 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">Cash on Delivery</p>
                <p className="text-xs text-muted-foreground">
                  Pay when you receive
                </p>
              </div>
            </div>
          </div>

          {/* Details */}
          {specs.length > 0 && (
            <dl className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card text-sm">
              {specs.map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}