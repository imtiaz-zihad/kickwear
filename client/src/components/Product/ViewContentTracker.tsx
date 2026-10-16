"use client";
// client/src/components/Product/ViewContentTracker.tsx
import { useEffect } from "react";
import { track, productData } from "@/lib/fbpixel";

export default function ViewContentTracker({
  product,
}: {
  product: { _id: string; name: string; discountedPrice: number };
}) {
  useEffect(() => {
    track("ViewContent", productData(product));
  }, [product._id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
