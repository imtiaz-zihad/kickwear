"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Search } from "lucide-react";
import { STATUSES, STATUS_BADGE, api, areaLabel, getArea, money, shortId } from "./lib";
import type { Order, OrderStatus } from "./lib";
import { ItemLine, OrderModal, productionNote } from "./OrderParts";

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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {visible.map((order) => {
            const area = getArea(order);
            return (
              <div
                key={order._id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-border/60 bg-card p-4 md:p-5"
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

                <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-3">
                  <p className="mr-auto text-lg font-semibold text-primary">{money(order.totalPrice)}</p>

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
        <OrderModal
          selected={selected}
          updatingId={updatingId}
          onClose={() => setSelected(null)}
          onChangeStatus={changeStatus}
          onCopyNote={copyNote}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-60 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.error ? "bg-red-600" : "bg-neutral-900"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}