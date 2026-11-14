"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Eye, Loader2, Plus, Search } from "lucide-react";
import {
  SOURCE_LABEL,
  STATUSES,
  STATUS_BADGE,
  api,
  areaLabel,
  dueAmount,
  getArea,
  money,
  shortId,
} from "./lib";
import type { AdvancePayload, EditPayload, Order, OrderStatus } from "./lib";
import { Chip, ItemLine, OrderModal, productionNote } from "./OrderParts";
import NewOrderModal from "./NewOrderModal";
import { RiskChip } from "./RiskParts";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OrderStatus | "All">("All");
  const [preorderOnly, setPreorderOnly] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [newOpen, setNewOpen] = useState(false);
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
      .catch(
        (err) =>
          !cancelled && setError(err instanceof Error ? err.message : "Failed to load orders"),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // the admin layout fires this when a new order arrives
  useEffect(() => {
    const reload = () => {
      api<{ data?: Order[] } | Order[]>("/orders?limit=200&noCache=true")
        .then((res) => setOrders(Array.isArray(res) ? res : (res.data ?? [])))
        .catch(() => {});
    };
    window.addEventListener("kw:new-order", reload);
    return () => window.removeEventListener("kw:new-order", reload);
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
    if (status === "Cancelled" && !window.confirm(`Cancel order #${shortId(order)}?`)) return;
    if (
      status === "Confirmed" &&
      !window.confirm("This sends a confirmation SMS to the customer. Continue?")
    ) {
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

  const saveEdit = async (order: Order, payload: EditPayload) => {
    const updated = await api<Order>(`/orders/${order._id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
    setSelected((s) => (s && s._id === updated._id ? updated : s));
    flash(`Order #${shortId(updated)} updated`);
  };

  const saveAdvance = async (order: Order, payload: AdvancePayload) => {
    const updated = await api<Order>(`/orders/${order._id}/advance`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
    setSelected((s) => (s && s._id === updated._id ? updated : s));
    flash(
      payload.amount > 0
        ? `Order #${shortId(updated)}: advance ${money(payload.amount)} saved`
        : `Order #${shortId(updated)}: advance removed`,
    );
  };

  // a Steadfast re-check returns the updated order
  const applyUpdated = (updated: Order) => {
    setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
    setSelected((s) => (s && s._id === updated._id ? updated : s));
    flash(`Order #${shortId(updated)}: customer record updated`);
  };

  const handleCreated = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
    setNewOpen(false);
    flash(`Order #${shortId(order)} created`);
  };

  const copyNote = async (order: Order) => {
    try {
      await navigator.clipboard.writeText(productionNote(order));
      flash("Copied production note");
    } catch {
      flash("Could not copy", true);
    }
  };

  // Status counts follow the Pre-order toggle, so the numbers always match the list
  const counts = useMemo(() => {
    const base = preorderOnly ? orders.filter((o) => o.isPreorder) : orders;
    const c: Record<string, number> = { All: base.length };
    STATUSES.forEach((s) => (c[s] = base.filter((o) => o.status === s).length));
    return c;
  }, [orders, preorderOnly]);

  const preorderCount = useMemo(
    () => orders.filter((o) => o.isPreorder).length,
    [orders],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((o) => !preorderOnly || o.isPreorder)
      .filter((o) => filter === "All" || o.status === filter)
      .filter(
        (o) =>
          !q ||
          o.customerName.toLowerCase().includes(q) ||
          o.phone.includes(q) ||
          shortId(o).toLowerCase().includes(q),
      );
  }, [orders, filter, preorderOnly, query]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Orders</h1>
          <p className="text-muted-foreground">
            {orders.length} total orders
            {preorderCount > 0 && ` · ${preorderCount} pre-order`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New order
        </button>
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

          {/* Pre-order toggle (combines with the status filter) */}
          <button
            type="button"
            aria-pressed={preorderOnly}
            onClick={() => setPreorderOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              preorderOnly
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:border-amber-500"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Pre-order <span className="opacity-80">({preorderCount})</span>
          </button>
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
                className={`flex flex-col justify-between gap-4 rounded-2xl border bg-card p-4 md:p-5 ${
                  order.isPreorder ? "border-amber-500/50" : "border-border/60"
                }`}
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{order.customerName}</h3>
                    <span className="text-xs text-muted-foreground">#{shortId(order)}</span>
                    <span
                      className={`text-xs font-semibold ${
                        area === "dhaka" ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {areaLabel(area)}
                    </span>
                    {order.isPreorder && <Chip accent>Pre-order</Chip>}
                    {order.source && order.source !== "web" && (
                      <Chip accent>{SOURCE_LABEL[order.source]}</Chip>
                    )}
                    {order.edited && <Chip>Edited</Chip>}
                    <RiskChip risk={order.risk} />
                  </div>

                  {order.isPreorder && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                      <Clock className="h-3.5 w-3.5" />
                      {order.preorderNote || "Pre-order"}
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground">
                    {order.phone} · {order.address}
                  </p>

                  <div className="space-y-1 pt-1">
                    {order.items.map((item, i) => (
                      <ItemLine key={i} order={order} item={item} />
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-3">
                  <div className="mr-auto">
                    <p className="text-lg font-semibold text-primary">
                      {money(order.totalPrice)}
                    </p>
                    {(order.advancePaid ?? 0) > 0 && (
                      <p className="text-xs font-semibold text-amber-700">
                        Advance {money(order.advancePaid ?? 0)} · Collect {money(dueAmount(order))}
                      </p>
                    )}
                  </div>

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
          onSaveEdit={saveEdit}
          onSaveAdvance={saveAdvance}
          onRiskChecked={applyUpdated}
        />
      )}

      {/* New order modal */}
      {newOpen && (
        <NewOrderModal onClose={() => setNewOpen(false)} onCreated={handleCreated} />
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