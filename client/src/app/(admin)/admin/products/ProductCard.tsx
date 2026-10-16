"use client";
/* eslint-disable @next/next/no-img-element */

import { Loader2, Package, Pencil, Star, Trash2 } from "lucide-react";
import type { Product } from "./lib";
import { categoryLabel, fromSlug, money } from "./lib";

export function ProductCard({
  product: p,
  busy,
  onEdit,
  onDelete,
  onToggleFeatured,
}: {
  product: Product;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
}) {
  const soldOut = p.stock !== undefined && p.stock <= 0;
  const hasDiscount = p.originalPrice > p.discountedPrice;
  const discount =
    p.discountPercentage && p.discountPercentage > 0
      ? Math.round(p.discountPercentage)
      : hasDiscount
        ? Math.round(((p.originalPrice - p.discountedPrice) / p.originalPrice) * 100)
        : 0;
  const meta = [categoryLabel(p.category), fromSlug(p.subcategory), p.season].filter(Boolean).join(" · ");

  const iconBtn =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-50";

  return (
    <article className="group flex gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
      {/* Image */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-secondary">
        {p.images?.[0] ? (
          <img
            src={p.images[0]}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-6 w-6 opacity-30" />
          </div>
        )}

        {discount > 0 && !soldOut && (
          <span className="absolute left-1 top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            -{discount}%
          </span>
        )}

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase text-neutral-900">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {meta}
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug">{p.name}</h3>

        <div className="mt-1 flex flex-wrap gap-1">
          {p.sleeve && (
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium">
              {p.sleeve === "half" ? "Half" : "Full"}
            </span>
          )}
          {p.addOns?.uclPatch?.enabled && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              UCL
            </span>
          )}
          {p.addOns?.customPrint?.enabled && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              Print
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0">
            <p className="text-sm font-extrabold leading-none text-primary">{money(p.discountedPrice)}</p>
            {hasDiscount && (
              <p className="mt-0.5 text-[11px] leading-none text-muted-foreground line-through">
                {money(p.originalPrice)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleFeatured}
              disabled={busy}
              aria-label={p.isFeatured ? "Remove from featured" : "Mark as featured"}
              title={p.isFeatured ? "Featured" : "Mark as featured"}
              className={`${iconBtn} hover:bg-secondary`}
            >
              <Star
                className={`h-4 w-4 ${p.isFeatured ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground"}`}
              />
            </button>
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit product"
              title="Edit"
              className={`${iconBtn} hover:bg-secondary`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              aria-label="Delete product"
              title="Delete"
              className={`${iconBtn} text-red-500 hover:bg-red-500/10`}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function CardSkeleton() {
  return (
    <div className="flex animate-pulse gap-3 rounded-2xl border border-border/60 bg-card p-3">
      <div className="h-24 w-24 shrink-0 rounded-xl bg-secondary" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/2 rounded bg-secondary" />
        <div className="h-4 w-3/4 rounded bg-secondary" />
        <div className="h-3 w-1/3 rounded bg-secondary" />
      </div>
    </div>
  );
}
