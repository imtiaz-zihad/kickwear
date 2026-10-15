"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Eye, Loader2, MessageCircle, Phone, Search, ShoppingBag, X } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

type OrderStatus = "Pending" | "Confirmed" | "Shipped" | "Delivered";
const STATUSES: OrderStatus[] = ["Pending", "Confirmed", "Shipped", "Delivered"];

const STATUS_BADGE: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Confirmed: "bg-green-100 text-green-700",
  Shipped: "bg-orange-100 text-orange-700",
  Delivered: "bg-blue-100 text-blue-700",
};

type OrderItem = {
  productId: string;
  name: string;
  image?: string | null;
  size?: string | null;
  quantity: number;
  basePrice?: number;
  uclPatch?: boolean;
  customName?: string | null;
  customNumber?: string | null;
  addOnsPrice?: number;
  price: number; // final price per unit
};

type Order = {
  _id: string;
  customerName: string;
  phone: string;
  address: string;
  size?: string | null; // legacy: old orders kept one size here
  items: OrderItem[];
  deliveryArea?: "dhaka" | "outside";
  totalPrice: number;
  deliveryCharge: number;
  status: OrderStatus;
  createdAt: string;
};

const money = (n: number) => `৳${(n ?? 0).toLocaleString()}`;
const shortId = (o: Order) => o._id.slice(-6).toUpperCase();
const getArea = (o: Order) => o.deliveryArea ?? (o.deliveryCharge <= 60 ? "dhaka" : "outside");
const areaLabel = (a: string) => (a === "dhaka" ? "Dhaka" : "Outside Dhaka");
const itemSize = (o: Order, i: OrderItem) => i.size ?? o.size ?? null;
const printText = (i: OrderItem) => [i.customName, i.customNumber].filter(Boolean).join(" ");

const authHeaders = (): Record<string, string> => {
  try {
    const t = localStorage.getItem("adminToken");
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
};

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data as T;
}

function Chip({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        accent ? "bg-primary/10 text-primary" : "bg-secondary text-foreground"
      }`}
    >
      {children}
    </span>
  );
}

// What the person making the jersey needs to see
function ItemLine({ order, item }: { order: Order; item: OrderItem }) {
  const size = itemSize(order, item);
  const print = printText(item);
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <span className="font-medium">{item.name}</span>
      {size && <Chip>Size {size}</Chip>}
      <Chip>× {item.quantity}</Chip>
      {item.uclPatch && <Chip accent>UCL patch</Chip>}
      {print && <Chip accent>Print: {print}</Chip>}
    </div>
  );
}

function productionNote(order: Order): string {
  return order.items
    .map((item) =>
      [
        item.name,
        itemSize(order, item) && `Size ${itemSize(order, item)}`,
        `x${item.quantity}`,
        item.uclPatch && "UCL patch",
        printText(item) && `Print: ${printText(item)}`,
      ]
        .filter(Boolean)
        .join(" | ")
    )
    .join("\n");
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OrderStatus | "All">("All");
  const [selected, setSelected] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const flash = useCallback((text: string, isError = false) => {
    setToast({ text, error: isError });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<{ data?: Order[] } | Order[]>("/orders?limit=200&noCache=true")
      .then((res) => !cancelled && setOrders(Array.isArray(res) ? res : (res.data ?? [])))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load orders"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Esc closes the details modal
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const changeStatus = async (order: Order, status: OrderStatus) => {
    if (status === order.status) return;
    if (status === "Confirmed" && !window.confirm("This sends a confirmation SMS to the customer. Continue?")) {
      return;
    }

    setUpdatingId(order._id);
    try {
      const updated = await api<Order>(`/orders/${order._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
      setSelected((s) => (s && s._id === updated._id ? updated : s));
      flash(`Order #${shortId(updated)} → ${status}`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Failed to update status", true);
    } finally {
      setUpdatingId(null);
    }
  };

  const copyNote = async (order: Order) => {
    try {
      await navigator.clipboard.writeText(productionNote(order));
      flash("Copied production note");
    } catch {
      flash("Could not copy", true);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: orders.length };
    STATUSES.forEach((s) => (c[s] = orders.filter((o) => o.status === s).length));
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((o) => filter === "All" || o.status === filter)
      .filter(
        (o) =>
          !q ||
          o.customerName.toLowerCase().includes(q) ||
          o.phone.includes(q) ||
          shortId(o).toLowerCase().includes(q)
      );
  }, [orders, filter, query]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Orders</h1>
        <p className="text-muted-foreground">{orders.length} total orders</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["All", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                filter === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              {s} <span className="opacity-70">({counts[s] ?? 0})</span>
            </button>
          ))}
        </div>

        <div className="relative md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone or order #"
            aria-label="Search orders"
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
        </div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No orders found</p>
      ) : (
        <div className="space-y-3">
          {visible.map((order) => {
            const area = getArea(order);
            return (
              <div
                key={order._id}
                className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 md:flex-row md:items-center md:justify-between md:p-5"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{order.customerName}</h3>
                    <span className="text-xs text-muted-foreground">#{shortId(order)}</span>
                    <span className={`text-xs font-semibold ${area === "dhaka" ? "text-green-600" : "text-red-500"}`}>
                      {areaLabel(area)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.phone} · {order.address}
                  </p>

                  <div className="space-y-1 pt-1">
                    {order.items.map((item, i) => (
                      <ItemLine key={i} order={order} item={item} />
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-lg font-semibold text-primary">{money(order.totalPrice)}</p>

                  <select
                    value={order.status}
                    disabled={updatingId === order._id}
                    onChange={(e) => changeStatus(order, e.target.value as OrderStatus)}
                    aria-label={`Status for order ${shortId(order)}`}
                    className={`h-9 rounded-lg border border-border px-3 text-sm font-medium disabled:opacity-50 ${
                      STATUS_BADGE[order.status] ?? ""
                    }`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setSelected(order)}
                    aria-label="View order details"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-secondary"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Order details"
            className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-card p-5 shadow-xl md:p-6"
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-semibold">Order #{shortId(selected)}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{new Date(selected.createdAt).toLocaleString()}</p>

            {/* Customer */}
            <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-semibold">{selected.customerName}</p>
              </div>

              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-semibold">{selected.phone}</p>
                <div className="mt-1.5 flex gap-3 text-xs font-semibold">
                  <a href={`tel:${selected.phone}`} className="inline-flex items-center gap-1 text-primary">
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                  <a
                    href={`https://wa.me/88${selected.phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-green-600"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                </div>
              </div>

              <div className="col-span-2 rounded-xl bg-secondary/60 p-3">
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-semibold">{selected.address}</p>
              </div>

              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-xs text-muted-foreground">Area</p>
                <p className={`font-semibold ${getArea(selected) === "dhaka" ? "text-green-600" : "text-red-500"}`}>
                  {areaLabel(getArea(selected))}
                </p>
              </div>

              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="mb-1 text-xs text-muted-foreground">Status</p>
                <select
                  value={selected.status}
                  disabled={updatingId === selected._id}
                  onChange={(e) => changeStatus(selected, e.target.value as OrderStatus)}
                  className={`h-8 w-full rounded-lg border border-border px-2 text-sm font-medium disabled:opacity-50 ${
                    STATUS_BADGE[selected.status] ?? ""
                  }`}
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items */}
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">Order Items</h3>
              <button
                type="button"
                onClick={() => copyNote(selected)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
              >
                <Copy className="h-3.5 w-3.5" /> Copy for printing
              </button>
            </div>

            <div className="space-y-3 border-t border-border/60 pt-3">
              {selected.items.map((item, i) => {
                const addOns = item.addOnsPrice ?? 0;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-secondary">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ShoppingBag className="h-5 w-5 opacity-40" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <ItemLine order={selected} item={item} />
                      <p className="text-xs text-muted-foreground">
                        {item.basePrice !== undefined
                          ? `${money(item.basePrice)}${addOns > 0 ? ` + ${money(addOns)} add-ons` : ""} each`
                          : `${money(item.price)} each`}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-semibold">{money(item.price * item.quantity)}</p>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="mt-4 space-y-1 border-t border-border/60 pt-4 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(selected.totalPrice - selected.deliveryCharge)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{money(selected.deliveryCharge)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total (Cash on Delivery)</span>
                <span className="text-primary">{money(selected.totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[60] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.error ? "bg-red-600" : "bg-neutral-900"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}