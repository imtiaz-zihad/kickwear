import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingBag, Sparkles } from "lucide-react";
import { Product, Sleeve } from "@/types/product";

interface Props {
  product: Product;
  priority?: boolean; // true for above-the-fold cards
}

const SLEEVE_LABEL: Record<Sleeve, string> = {
  half: "Half Sleeve",
  full: "Full Sleeve",
};

// Prefer the `sleeve` field; fall back to the name for old products
// ("Barcelona Home 26/27 — Half Sleeve" → "Half Sleeve")
function getSleeveLabel(product: Product): string | null {
  if (product.sleeve && SLEEVE_LABEL[product.sleeve]) {
    return SLEEVE_LABEL[product.sleeve];
  }
  const match = product.name.match(/\b(half|full)\s*sleeve\b/i);
  return match ? SLEEVE_LABEL[match[1].toLowerCase() as Sleeve] : null;
}

// "man-city" → "Man City"
function formatSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function JerseyCard({ product, priority = false }: Props) {
  const image = product.images?.[0];
  const hoverImage = product.images?.[1]; // shown on hover (desktop)
  const sleeve = getSleeveLabel(product);

  const hasDiscount = product.originalPrice > product.discountedPrice;
  const discount =
    product.discountPercentage && product.discountPercentage > 0
      ? Math.round(product.discountPercentage)
      : hasDiscount
        ? Math.round(
            ((product.originalPrice - product.discountedPrice) /
              product.originalPrice) *
              100,
          )
        : 0;

  const soldOut = product.stock !== undefined && product.stock <= 0;
  const customizable =
    product.addOns?.uclPatch?.enabled === true ||
    product.addOns?.customPrint?.enabled === true;

  // "Man City · 26/27", falls back to the category name
  const eyebrow =
    [product.subcategory && formatSlug(product.subcategory), product.season]
      .filter(Boolean)
      .join(" · ") || formatSlug(product.category);

  return (
    <Link
      href={`/product/${product._id}`}
      className="group flex h-full flex-col rounded-2xl border border-border/50 bg-card p-1.5 md:p-2.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Image */}
      <div className="relative aspect-4/5 md:aspect-square overflow-hidden rounded-xl bg-linear-to-b from-secondary/60 to-secondary">
        {image ? (
          <>
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 20vw"
              className={`object-cover transition-all duration-700 ease-out ${
                hoverImage ? "group-hover:opacity-0" : "group-hover:scale-105"
              }`}
              priority={priority}
              loading={priority ? "eager" : "lazy"}
            />
            {hoverImage && (
              <Image
                src={hoverImage}
                alt=""
                fill
                sizes="(max-width: 768px) 50vw, 20vw"
                className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                loading="lazy"
              />
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-8 w-8 opacity-30" />
          </div>
        )}

        {/* soft bottom shade for depth */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-linear-to-t from-black/10 to-transparent" />

        {/* Badges row: sleeve (left) + discount (right) */}
        <div className="absolute inset-x-1.5 top-1.5 flex items-start justify-between gap-1 md:inset-x-2 md:top-2">
          {sleeve ? (
            <span className="truncate rounded-full bg-white/85 px-2 py-0.5 text-[9px] font-semibold text-neutral-900 shadow-sm ring-1 ring-black/5 backdrop-blur-sm md:px-2.5 md:py-1 md:text-[11px]">
              {sleeve}
            </span>
          ) : (
            <span />
          )}

          {discount > 0 && !soldOut && (
            <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm md:px-2.5 md:py-1 md:text-[11px]">
              -{discount}%
            </span>
          )}
        </div>

        {/* Sold out overlay */}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span className="rounded-full bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-neutral-900">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:text-[11px]">
            {eyebrow}
          </p>

          {customizable && (
            <p className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              <span className="hidden md:inline">Customizable</span>
            </p>
          )}
        </div>
        <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary md:min-h-2 md:text-base">
          {product.name}
        </h3>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-extrabold text-primary md:text-xl">
            ৳{product.discountedPrice?.toLocaleString()}
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through md:text-sm">
              ৳{product.originalPrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* CTA (whole card is the link) */}
        <span
          className={`mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all ${
            soldOut
              ? "bg-secondary text-muted-foreground"
              : "bg-primary text-primary-foreground shadow-sm shadow-primary/20 group-hover:bg-primary/90 group-hover:shadow-md group-hover:shadow-primary/30"
          }`}
        >
          {soldOut ? (
            "View details"
          ) : (
            <>
              Order Now
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-17" />
            </>
          )}
        </span>
      </div>
    </Link>
  );
}
