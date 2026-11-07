"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  LayoutDashboard,
  LogOut,
  Package,
  PhoneMissed,
  ShoppingCart,
  Store,
} from "lucide-react";

const MENU = [
  { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Products", path: "/admin/products", icon: Package },
  { name: "Orders", path: "/admin/orders", icon: ShoppingCart },
  { name: "Abandoned", path: "/admin/abandoned", icon: PhoneMissed },
  { name: "Live", path: "/admin/live", icon: Activity },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // the token comes from the server login (/api/admin/login)
    if (!localStorage.getItem("adminToken")) {
      localStorage.removeItem("admin");
      router.replace("/login");
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthorized(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("admin");
    localStorage.removeItem("adminToken");
    router.replace("/login");
  };

  if (!authorized) return null;

  return (
    <div className="flex min-h-screen flex-col bg-secondary/40 md:flex-row">
      {/* SIDEBAR (sticky top bar on mobile) */}
      <aside className="sticky top-0 z-40 flex shrink-0 flex-col bg-neutral-950 text-white md:h-screen md:w-60 md:justify-between">
        <div className="px-3 pb-2 pt-3 md:p-5 md:pt-8">
          {/* Brand (+ logout on mobile) */}
          <div className="mb-3 flex items-center justify-between md:mb-9 md:block md:pl-1">
            <div>
              <span className="font-display text-lg font-bold">Kick </span>
              <span className="font-display text-lg font-bold text-primary">Wear</span>
              <div className="mt-1.5 hidden h-0.5 w-8 rounded bg-linear-to-r from-primary to-transparent md:block" />
            </div>

            <div className="flex items-center gap-1 md:hidden">
              <Link
                href="/"
                aria-label="Visit store"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:bg-white/5"
              >
                <Store size={17} />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Logout"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>

          <p className="mb-3 hidden pl-2 text-[10px] font-semibold uppercase tracking-widest text-white/25 md:block">
            Navigation
          </p>

          {/* Mobile: 5 equal columns, icon over label. Desktop: vertical list */}
          <nav className="grid grid-cols-5 gap-1 md:flex md:flex-col">
            {MENU.map(({ name, path: href, icon: Icon }) => {
              const active = path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5 md:text-sm ${
                    active
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "text-white/45 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="max-w-full truncate">{name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop bottom links */}
        <div className="hidden flex-col gap-0.5 border-t border-white/5 p-5 md:flex">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
          >
            <Store size={15} /> Visit Store
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}