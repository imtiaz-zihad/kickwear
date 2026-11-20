import type { ImageLoaderProps } from "next/image";


export default function cloudinaryLoader({ src, width }: ImageLoaderProps): string {
  if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
    return src.replace("/upload/", `/upload/f_auto,q_auto,w_${width},c_limit/`);
  }

  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}