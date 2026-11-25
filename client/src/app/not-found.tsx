// src/app/not-found.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Home, PackageSearch } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found | Kickwear",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="w-full max-w-md text-center">
        <p className="text-7xl font-extrabold tracking-tight text-primary md:text-8xl">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold md:text-3xl">
          Page not found
        </h1>
        <p className="mt-2 text-muted-foreground">
          The page you are looking for does not exist or may have been moved.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Home className="h-4 w-4" />
            Back to home
          </Link>
          <Link
            href="/track-order"
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 font-semibold hover:bg-secondary"
          >
            <PackageSearch className="h-4 w-4" />
            Track order
          </Link>
        </div>
      </div>
    </main>
  );
}