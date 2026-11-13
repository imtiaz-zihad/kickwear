"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import cloudinaryLoader from "@/lib/cloudinaryLoader";
import type { Review } from "@/data/reviews";

const WHATSAPP_NUMBER = "8801894302115";


// Cloudinary images get resized/compressed; local files are used as they are
const CLOUD_NAME = "ps6g4nx2";

// Cloudinary images are resized + compressed to the width we ask for.
const sized = (src: string, width: number) => {
  const url =
    src.startsWith("http") || src.startsWith("/")
      ? src
      : `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${src}`;
  return cloudinaryLoader({ src: url, width });
};
export default function ReviewsGallery({ reviews }: { reviews: Review[] }) {
  const [tag, setTag] = useState("All");
  const [open, setOpen] = useState<number | null>(null); // index in `shown`
  const touchX = useRef<number | null>(null);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reviews) if (r.tag) counts.set(r.tag, (counts.get(r.tag) ?? 0) + 1);
    return [...counts.entries()];
  }, [reviews]);

  const shown = useMemo(
    () => (tag === "All" ? reviews : reviews.filter((r) => r.tag === tag)),
    [reviews, tag],
  );

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (dir: 1 | -1) =>
      setOpen((i) => (i === null ? i : (i + dir + shown.length) % shown.length)),
    [shown.length],
  );

  // keyboard + page scroll lock while the viewer is open
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, step]);

  const current = open !== null ? shown[open] : null;

  return (
    <main className="bg-secondary/30">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-linear-to-b from-primary/10 via-background to-background">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-160 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="relative mx-auto max-w-3xl px-4 py-12 text-center md:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <MessageCircle className="h-3.5 w-3.5" />
            Real screenshots from real customers
          </span>
          <h1 className="font-display mt-4 text-3xl font-bold tracking-tight md:text-5xl">
            Customer <span className="text-primary">Reviews</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
            Messages from Messenger, WhatsApp and Instagram. Nothing edited, nothing
            made up. Tap any review to see it full size.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
            {reviews.length > 0 && (
              <span className="rounded-full bg-card px-3.5 py-1.5 shadow-sm ring-1 ring-border">
                <b className="text-foreground">{reviews.length}</b>{" "}
                <span className="text-muted-foreground">reviews</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-muted-foreground shadow-sm ring-1 ring-border">
              <Truck className="h-3.5 w-3.5 text-primary" /> Delivery all over Bangladesh
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-muted-foreground shadow-sm ring-1 ring-border">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Cash on Delivery
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 py-8 md:px-6 md:py-12">
        {/* FILTERS */}
        {tags.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:justify-center md:overflow-visible">
            {[["All", reviews.length] as const, ...tags].map(([t, n]) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  tag === t
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground hover:ring-primary/40"
                }`}
              >
                {t} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </div>
        )}

        {/* GRID (masonry) */}
        {shown.length === 0 ? (
          <div className="mx-auto max-w-md rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageCircle className="h-7 w-7" />
            </div>
            <p className="font-display text-lg font-semibold">Reviews are coming soon</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We are collecting feedback from our customers. Check back shortly.
            </p>
          </div>
        ) : (
          <div key={tag} className="columns-2 gap-3 md:columns-3 md:gap-4 lg:columns-4">
            {shown.map((r, i) => (
              <figure
                key={r.id}
                className="group mb-3 break-inside-avoid animate-in fade-in zoom-in-95 duration-500 md:mb-4"
                style={{ animationDelay: `${Math.min(i, 12) * 40}ms`, animationFillMode: "backwards" }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  aria-label={`Open review${r.name ? ` from ${r.name}` : ""}`}
                  className="relative block w-full cursor-zoom-in overflow-hidden rounded-2xl bg-card text-left shadow-sm ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 hover:ring-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <img
                    src={sized(r.src, 600)}
                    alt={r.alt || `Customer review${r.name ? ` from ${r.name}` : ""}`}
                    width={r.width}
                    height={r.height}
                    loading={i < 4 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-auto w-full bg-muted transition-transform duration-500 group-hover:scale-[1.03]"
                  />

                  {r.tag && (
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                      {r.tag}
                    </span>
                  )}
                  <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100 max-md:opacity-100">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </span>
                </button>

                {(r.name || r.product) && (
                  <figcaption className="px-1.5 pt-2 text-xs leading-snug">
                    {r.name && <span className="font-semibold text-foreground">{r.name}</span>}
                    {r.name && r.product && <span className="text-muted-foreground"> · </span>}
                    {r.product && <span className="text-muted-foreground">{r.product}</span>}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="relative mt-12 overflow-hidden rounded-3xl bg-neutral-950 px-6 py-10 text-center text-white md:mt-16 md:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/30 blur-3xl"
          />
          <h2 className="font-display relative text-2xl font-bold md:text-3xl">
            Ready for your <span className="text-primary">jersey</span>?
          </h2>
          <p className="relative mx-auto mt-2 max-w-md text-sm text-white/60">
            Order in a minute. Pay when it reaches your door.
          </p>
          <div className="relative mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
            >
              <ShoppingBag className="h-4 w-4" /> Shop jerseys
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Kickwear, I want to share my review.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <MessageCircle className="h-4 w-4" /> Send us your review
            </a>
          </div>
        </div>
      </section>

      {/* FULL-SIZE VIEWER */}
      {current && open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Review"
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={close}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
          }}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          {shown.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Previous review"
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:left-6"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Next review"
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:right-6"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <figure
            key={current.id}
            className="flex max-h-full max-w-full flex-col items-center gap-3 animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={sized(current.src, 1400)}
              alt={current.alt || `Customer review${current.name ? ` from ${current.name}` : ""}`}
              className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <figcaption className="text-center text-xs text-white/70">
              {[current.name, current.product].filter(Boolean).join(" · ")}
              {(current.name || current.product) && " · "}
              {open + 1} / {shown.length}
            </figcaption>
          </figure>
        </div>
      )}
    </main>
  );
}