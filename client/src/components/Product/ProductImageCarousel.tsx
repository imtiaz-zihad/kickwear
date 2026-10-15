"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Props {
  images: string[];
  name: string;
}

export default function ProductImageCarousel({ images, name }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // No images → placeholder (next/image crashes on an empty src)
  if (!images || images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <ShoppingBag className="h-12 w-12 opacity-30" />
      </div>
    );
  }

  const multiple = images.length > 1;

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative overflow-hidden rounded-2xl bg-secondary">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {images.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="relative aspect-square min-w-0 flex-[0_0_100%]"
              >
                <Image
                  src={src}
                  alt={`${name} - ${i + 1}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  quality={85}
                  className="object-cover"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        </div>

        {multiple && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow transition hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => emblaApi?.scrollNext()}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow transition hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
              {selected + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {multiple && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={`${src}-thumb-${i}`}
              type="button"
              aria-label={`Show image ${i + 1}`}
              aria-current={i === selected}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === selected
                  ? "border-primary"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}