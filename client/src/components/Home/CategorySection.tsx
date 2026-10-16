import { ArrowUpRight, Globe, History, Shirt, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type Category = {
  id: string;
  name: string;
  slug: string;
  count: number;
  icon: LucideIcon;
};

// TODO: replace with data fetched from your DB (name, slug, _count of products)
const categories: Category[] = [
  {
    id: "1",
    name: "Club Jersey",
    slug: "club-jersey",
    count: 22,
    icon: ShieldCheck,
  },
  {
    id: "2",
    name: "Country Jersey",
    slug: "country-jersey",
    count: 6,
    icon: Globe,
  },
  { id: "3", name: "Retro", slug: "retro", count: 10, icon: History },
  { id: "4", name: "Jacket", slug: "jacket", count: 3, icon: Shirt },
];

export default function CategorySection() {
  return (
    <section
      className="container py-2 md:py-2"
      aria-labelledby="shop-by-category"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2
          id="shop-by-category"
          className="flex items-center gap-3 font-display text-2xl font-bold md:text-3xl"
        >
          <span className="h-7 w-1.5 rounded-full bg-primary" aria-hidden />
          Shop by category
        </h2>

        <Link
          href="/shop"
          className="hidden items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex"
        >
          View all
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {categories.map(({ id, name, slug, count, icon: Icon }) => (
          <Link
            key={id}
            href={`/category/${slug}`}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card p-3 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-row sm:gap-4 sm:p-4 sm:text-left md:p-5"
          >
            {/* Icon bubble */}
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground sm:h-14 sm:w-14">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>

            {/* Text */}
            <span className="min-w-0 sm:flex-1">
              <span className="block truncate text-sm font-bold sm:text-base md:text-lg">
                {name}
              </span>
              <span className="block text-xs text-muted-foreground sm:text-sm">
                {count} {count === 1 ? "item" : "items"}
              </span>
            </span>

            {/* Arrow (desktop only) */}
            <ArrowUpRight
              className="hidden h-5 w-5 shrink-0 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary group-hover:opacity-100 sm:block"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
