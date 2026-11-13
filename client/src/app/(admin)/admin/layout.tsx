"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  LayoutDashboard,
  LogOut,
  Package,
  PhoneMissed,
  ShoppingCart,
  Store,
  X,
} from "lucide-react";
import { api } from "./orders/lib";
import type { Order } from "./orders/lib";
import PushToggle from "./PushToggle";

const MENU = [
  { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Products", path: "/admin/products", icon: Package },
  { name: "Orders", path: "/admin/orders", icon: ShoppingCart },
  { name: "Abandoned", path: "/admin/abandoned", icon: PhoneMissed },
  { name: "Live", path: "/admin/live", icon: Activity },
];

const SEEN_KEY = "kw_orders_seen_at"; // time of the newest order the admin has seen
const POLL_MS = 30_000;

// short beep (browsers may block it until the page has been clicked once)
function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => ctx.close();
  } catch {
    /* sound is optional */
  }
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  // new-order alert
  const [newCount, setNewCount] = useState(0);
  const [toast, setToast] = useState<{ text: string } | null>(null);
  const prevCount = useRef(0);
  const pathRef = useRef(path);
  const baseTitle = useRef("");

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

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  // Everything up to the newest order counts as "seen"
  const markSeen = useCallback(async () => {
    try {
      const res = await api<{ data?: Order[] }>("/orders?limit=1&noCache=true");
      const at = res.data?.[0]?.createdAt ?? new Date().toISOString();
      localStorage.setItem(SEEN_KEY, at);
    } catch {
      /* try again on the next poll */
    }
    prevCount.current = 0;
    setNewCount(0);
  }, []);

  // Poll for orders that arrived after the last seen one
  useEffect(() => {
    if (!authorized) return;
    let stop = false;

    const check = async () => {
      let seen: string | null = null;
      try {
        seen = localStorage.getItem(SEEN_KEY);
      } catch {}
      // first visit ever: nothing is "new" yet
      if (!seen) return markSeen();

      try {
        const res = await api<{ total?: number; data?: Order[] }>(
          `/orders?limit=1&since=${encodeURIComponent(seen)}&noCache=true`,
        );
        if (stop) return;
        const n = res.total ?? 0;

        if (n > prevCount.current) {
          const o = res.data?.[0];
          setToast({
            text: o
              ? `New order: ${o.customerName} · ৳${o.totalPrice.toLocaleString()}${n > 1 ? ` (+${n - 1} more)` : ""}`
              : `${n} new orders`,
          });
          beep();
          window.dispatchEvent(new Event("kw:new-order")); // Orders page reloads itself
        }

        if (pathRef.current.startsWith("/admin/orders")) {
          await markSeen(); // already looking at the orders
        } else {
          prevCount.current = n;
          setNewCount(n);
        }
      } catch {
        /* offline or logged out: ignore */
      }
    };

    check();
    const timer = setInterval(check, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stop = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authorized, markSeen]);

  // opening the Orders page clears the badge
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (authorized && path.startsWith("/admin/orders")) markSeen();
  }, [authorized, path, markSeen]);

  // browser tab title: "(2) New order"
  useEffect(() => {
    if (!baseTitle.current) baseTitle.current = document.title;
    document.title =
      newCount > 0 ? `(${newCount}) New order!` : baseTitle.current;
  }, [newCount]);

  // the toast hides itself
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(t);
  }, [toast]);

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
              <span className="font-display text-lg font-bold text-primary">
                Wear
              </span>
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
              const badge = href === "/admin/orders" ? newCount : 0;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5 md:text-sm ${
                    active
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "text-white/45 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="max-w-full truncate">{name}</span>
                  {badge > 0 && (
                    <span className="absolute right-1.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white md:static md:ml-auto md:h-5 md:min-w-5 md:text-xs">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
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
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <PushToggle />
        {children}
      </main>

      {/* New order toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-60 flex max-w-sm items-center gap-3 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          <span className="flex-1">🛒 {toast.text}</span>
          {!path.startsWith("/admin/orders") && (
            <Link
              href="/admin/orders"
              onClick={() => setToast(null)}
              className="shrink-0 font-semibold text-primary underline"
            >
              View
            </Link>
          )}
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="shrink-0 text-white/60 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
