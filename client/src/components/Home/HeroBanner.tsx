import Link from "next/link";
import { Button } from "../ui/button";

export default function HeroBanner() {
  return (
    <section className="relative w-full overflow-hidden bg-linear-to-br from-orange-50 via-white to-orange-50">
      
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,115,0,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,115,0,0.05),transparent_50%)]" />

      {/* Content Container */}
      <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 relative">
        
        <div className="max-w-2xl mx-auto text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 text-xs md:text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            New Collection 2026
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Discover Your <br />
            <span className="text-orange-500">Perfect Style</span>
          </h1>

          {/* Description */}
          <p className="text-gray-600 text-sm md:text-base mb-8">
            Premium Bangladeshi fashion for Men & Women.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            
            <Button asChild size="lg" className="rounded-full px-8 h-11 bg-orange-500 hover:bg-orange-600">
              <Link href="/category/men">Shop Men</Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full px-8 h-11 border-gray-300"
            >
              <Link href="/category/women">Shop Women</Link>
            </Button>

          </div>
        </div>
      </div>
    </section>
  );
}