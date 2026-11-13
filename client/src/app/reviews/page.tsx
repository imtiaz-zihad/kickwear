// src/app/reviews/page.tsx
import type { Metadata } from "next";
import { REVIEWS } from "@/data/reviews";
import ReviewsGallery from "@/components/Reviews/ReviewsGallery";


export const metadata: Metadata = {
  title: "Customer Reviews | Kickwear",
  description:
    "Real messages and photos from Kickwear customers across Bangladesh. See what they say about our football jerseys.",
  alternates: { canonical: "/reviews" },
};

export default function ReviewsPage() {
  return <ReviewsGallery reviews={REVIEWS} />;
}