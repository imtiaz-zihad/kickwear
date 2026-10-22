"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
 import { LayoutDashboard, LogOut, Package, PhoneMissed, ShoppingCart, Store } from "lucide-react";
const MENU = [
  { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Products", path: "/admin/products", icon: Package },
  { name: "Orders", path: "/admin/orders", icon: ShoppingCart },
  { name: "Abandoned", path: "/admin/abandoned", icon: PhoneMissed },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("admin")) {
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
      {/* SIDEBAR (top bar on mobile) */}
      <aside className="flex shrink-0 flex-col bg-neutral-950 text-white md:sticky md:top-0 md:h-screen md:w-60 md:justify-between">
        <div className="p-4 md:p-5 md:pt-8">
          <div className="mb-4 md:mb-9 md:pl-1">
            <span className="font-display text-lg font-bold">Kick </span>
            <span className="font-display text-lg font-bold text-primary">Wear</span>
            <div className="mt-1.5 hidden h-0.5 w-8 rounded bg-linear-to-r from-primary to-transparent md:block" />
          </div>

          <p className="mb-3 hidden pl-2 text-[10px] font-semibold uppercase tracking-widest text-white/25 md:block">
            Navigation
          </p>

          <nav className="flex gap-1 md:flex-col">
            {MENU.map(({ name, path: href, icon: Icon }) => {
              const active = path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-1 items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors md:flex-none md:justify-start ${
                    active
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "text-white/45 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  <Icon size={16} />
                  {name}
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

        {/* Mobile logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 border-t border-white/5 py-2.5 text-sm text-white/50 md:hidden"
        >
          <LogOut size={14} /> Logout
        </button>
      </aside>

      {/* MAIN */}
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}