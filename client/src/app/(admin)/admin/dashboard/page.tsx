"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle,
  Clock,
  Loader2,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { STATUS_BADGE, api, money } from "../orders/lib";
import type { Order } from "../orders/lib";

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [orderRes, productRes] = await Promise.all([
          api<{ total?: number; data?: Order[] } | Order[]>(
            "/orders?limit=1000&noCache=true",
          ),
          api<{ total?: number; data?: unknown[] }>("/products?limit=1"),
        ]);
        if (cancelled) return;

        const list = Array.isArray(orderRes) ? orderRes : (orderRes.data ?? []);
        setOrders(list);
        setTotalOrders(
          Array.isArray(orderRes)
            ? list.length
            : (orderRes.total ?? list.length),
        );
        setTotalProducts(productRes.total ?? productRes.data?.length ?? 0);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load dashboard",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // cancelled orders are not revenue. totalPrice already includes delivery
  const revenue = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + (o.totalPrice ?? 0), 0);
  const pending = orders.filter((o) => o.status === "Pending").length;
  const delivered = orders.filter((o) => o.status === "Delivered").length;

  const recent = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back to your admin panel
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card
          title="Products"
          value={totalProducts}
          icon={<Package className="h-5 w-5" />}
        />
        <Card
          title="Orders"
          value={totalOrders}
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <Card
          title="Revenue"
          value={money(revenue)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <Card
          title="Pending"
          value={pending}
          icon={<Clock className="h-5 w-5" />}
        />
        <Card
          title="Delivered"
          value={delivered}
          icon={<CheckCircle className="h-5 w-5" />}
        />
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          <Link
            href="/admin/orders"
            className="text-sm font-semibold text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : recent.length === 0 ? (
          <p className="text-muted-foreground">No orders yet</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recent.map((order) => {
              const first = order.items?.[0];
              const more = (order.items?.length ?? 0) - 1;
              return (
                <div
                  key={order._id}
                  className="flex h-full flex-col justify-between gap-4 rounded-xl border border-border/60 bg-background p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {order.customerName}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        #{order._id.slice(-6).toUpperCase()}
                      </span>
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {first ? first.name : "—"}
                      {more > 0 && ` +${more} more`} ·{" "}
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        STATUS_BADGE[order.status] ??
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {order.status}
                    </span>
                    <p className="font-semibold">{money(order.totalPrice)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 md:p-5">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{title}</p>
        <h2 className="truncate text-xl font-bold md:text-2xl">{value}</h2>
      </div>
      <div className="shrink-0 rounded-xl bg-primary/10 p-3 text-primary">
        {icon}
      </div>
    </div>
  );
}