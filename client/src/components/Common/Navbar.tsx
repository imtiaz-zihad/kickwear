"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  MapPin,
  Globe,
  History,
  Shirt,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";

// WhatsApp number
const WHATSAPP_NUMBER = "8801894302115";

// Navigation categories
const NAV_CATEGORIES = [
  { name: "Club Jersey", slug: "club-jersey", icon: ShieldCheck },
  { name: "Country Jersey", slug: "country-jersey", icon: Globe },
  { name: "Retro", slug: "retro", icon: History },
  { name: "Jacket", slug: "jacket", icon: Shirt },
];

// WhatsApp Icon
const WhatsAppIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
      {/* TOP NAVBAR */}
      <div className="container flex h-14 items-center justify-between px-4 md:h-24 md:px-6">
        {/* LOGO */}
        <Link
          href="/"
          className="flex shrink-0 items-center"
          aria-label="Kick Wear home"
        >
          <Image
            src="/logo.png"
            alt="Kick Wear logo"
            width={80}
            height={80}
            priority
            className="h-11 w-11 object-contain md:h-20 md:w-20"
          />

          <span className="-ml-1 whitespace-nowrap font-display text-2xl font-extrabold leading-none tracking-tight text-foreground md:-ml-2 md:text-3xl">
            Kick <span className="gradient-text">Wear</span>
          </span>
        </Link>

        {/* DESKTOP CATEGORIES */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_CATEGORIES.map(({ name, slug }) => {
            const href = `/category/${slug}`;

            return (
              <Link
                key={slug}
                href={href}
                className={`rounded-full px-5 py-2.5 text-base font-medium transition-all duration-200 ${
                  isActive(href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {name}
              </Link>
            );
          })}
        </nav>

        {/* RIGHT SIDE */}
        <div className="flex shrink-0 items-center gap-2">
          {/* WHATSAPP - DESKTOP */}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-full px-5 py-2.5 text-base font-medium text-green-600 transition-all duration-200 hover:bg-green-50 hover:text-green-700 lg:flex"
          >
            <WhatsAppIcon className="h-5 w-5" />
            WhatsApp
          </a>

          {/* TRACK ORDER - DESKTOP */}
          <Link
            href="/track-order"
            className={`hidden items-center gap-1.5 rounded-full px-5 py-2.5 text-base font-medium transition-all duration-200 lg:flex ${
              isActive("/track-order")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <MapPin className="h-4 w-4" />
            Track Order
          </Link>

          {/* MOBILE MENU BUTTON */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* MOBILE CATEGORY BAR - BELOW LOGO */}
      <nav
        aria-label="Product categories"
        className="flex items-center gap-2 overflow-x-auto px-5 pb-2 pt-0 lg:hidden scrollbar-hide"
      >
        {NAV_CATEGORIES.map(({ name, slug }) => {
          const href = `/category/${slug}`;

          return (
            <Link
              key={slug}
              href={href}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive(href)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-secondary"
              }`}
            >
              {name}
            </Link>
          );
        })}
      </nav>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <nav className="flex flex-col gap-1 border-t border-border/50 bg-background/95 p-4 backdrop-blur-xl lg:hidden">
          {NAV_CATEGORIES.map(({ name, slug, icon: Icon }) => {
            const href = `/category/${slug}`;

            return (
              <Link
                key={slug}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                  isActive(href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {name}
              </Link>
            );
          })}

          {/* WHATSAPP - MOBILE */}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-base font-medium text-green-600 transition-colors hover:bg-green-50"
          >
            <WhatsAppIcon className="h-5 w-5" />
            WhatsApp
          </a>

          {/* TRACK ORDER - MOBILE */}
          <Link
            href="/track-order"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <MapPin className="h-5 w-5" />
            Track Order
          </Link>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
