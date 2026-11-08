import type { ImageLoaderProps } from "next/image";

// Lets Cloudinary resize + compress images (f_auto = WebP/AVIF, q_auto = smart quality)
// instead of Vercel's image optimizer, which has a monthly limit on the free plan.
export default function cloudinaryLoader({ src, width }: ImageLoaderProps): string {
  if (!src.includes("res.cloudinary.com") || !src.includes("/upload/")) {
    return src; // other hosts (e.g. Unsplash) are served as they are
  }
  return src.replace("/upload/", `/upload/f_auto,q_auto,w_${width},c_limit/`);
}