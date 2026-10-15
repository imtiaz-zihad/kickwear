import Link from "next/link";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { Product } from "@/types/product";

interface Props {
  product: Product;
  priority?: boolean; // pass true for above-the-fold cards (e.g. first 4)
}

const ProductCard = ({ product, priority = false }: Props) => {
  const image = product.images?.[0];

  return (
    <Link href={`/product/${product._id}`} className="group block">
      <div className="relative aspect-3/4 rounded-2xl overflow-hidden bg-secondary mb-3 shadow-soft group-hover:shadow-card-hover transition-all duration-500">

        {/* Discount Badge */}
        {product.discountPercentage && product.discountPercentage > 0 && (
          <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-md">
            -{product.discountPercentage}% Off
          </span>
        )}

        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            sizes="(max-width: 768px) 50vw, 25vw"
            // ✅ First row cards load eagerly, rest are lazy (better LCP score)
            priority={priority}
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            <ShoppingBag className="h-8 w-8 opacity-30" />
          </div>
        )}
      </div>

      <h3 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
        {product.name}
      </h3>

      <p className="text-foreground font-bold text-base mt-1">
        ৳{product.discountedPrice?.toLocaleString()}
      </p>
    </Link>
  );
};

export default ProductCard;