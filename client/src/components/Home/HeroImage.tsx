"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";

const images = [
  { src: "/banner4.png", alt: "Hero Banner 1" },
  { src: "/banner2.jpg", alt: "Hero Banner 2" },
  { src: "/banner3.jpg", alt: "Hero Banner 3" },
];

export default function HeroImage() {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startInterval = () => {
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 2000);
  };

  useEffect(() => {
    startInterval();
    return () => clearInterval(intervalRef.current!);
  }, []);

  const goTo = (index: number) => {
    clearInterval(intervalRef.current!);
    setCurrent(index);
    startInterval(); // restart timer on manual nav
  };

  return (
<div className="relative w-full h-32 sm:h-56 md:h-80 lg:h-105 overflow-hidden rounded-3xl">      {/* Sliding track */}
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {images.map((img, index) => (
          <div key={img.src} className="relative min-w-full h-full shrink-0">
            <Image
              src={img.src}
              alt={img.alt}
              fill
              priority={index === 0} // ✅ only first image is eager
              sizes="100vw"
              className="object-contain md:object-cover"
            />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === current
                ? "bg-white w-6"
                : "bg-white/50 w-2 hover:bg-white/80"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
