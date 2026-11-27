"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Loader2, RefreshCw, Truck } from "lucide-react";
import { api, money, shortId } from "./lib";
import type { Order } from "./lib";

// only these orders can be sent to the courier
const BOOKABLE = ["Confirmed", "Collecting"];
// the courier's final answers; anything else can still change
const FINAL = ["delivered", "partial_delivered", "cancelled"];
const STALE_MS = 10 * 60 * 1000; // refresh on open when older than this

const label = (status: string) => {
  if (status.endsWith("_approval_pending")) {
    const base = status.replace("_approval_pending", "").replace(/_/g, " ");
    return `${base} (awaiting confirmation)`;
  }
  const s = status.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const tone = (status: string) => {
  if (status === "delivered" || status === "partial_delivered")
    return "bg-green-100 text-green-700";
  if (status === "cancelled" || status === "exceptional" || status === "hold")
    return "bg-red-100 text-red-700";
  if (status.endsWith("_approval_pending")) return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
};

// Courier (Steadfast) box in the order details modal
export function CourierPanel({
  order,
  onUpdated,
}: {
  order: Order;
  onUpdated: (updated: Order, message: string) => void;
}) {
  const [busy, setBusy] = useState<"" | "book" | "sync">("");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const autoSynced = useRef<string | null>(null);

  const courier = order.courier;
  const booked = Boolean(courier?.consignmentId);
  const canBook = !booked && BOOKABLE.includes(order.status);
  const cod = Math.max(0, order.totalPrice - (order.advancePaid ?? 0));

  const sync = async (silent: boolean) => {
    setBusy("sync");
    setErr("");
    try {
      const updated = await api<Order>(`/orders/${order._id}/courier/sync`, {
        method: "POST",
      });
      onUpdated(updated, silent ? "" : `Order #${shortId(updated)}: courier status updated`);
    } catch (e) {
      if (!silent) setErr(e instanceof Error ? e.message : "Could not read the status");
    } finally {
      setBusy("");
    }
  };

  // when the modal opens, refresh a parcel that has not been checked for a while
  const synced = courier?.syncedAt ? new Date(courier.syncedAt).getTime() : 0;
  const final = FINAL.includes(courier?.status ?? "");
  useEffect(() => {
    if (!booked || final || autoSynced.current === order._id) return;
    autoSynced.current = order._id;
    if (Date.now() - synced > STALE_MS) sync(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order._id, booked]);

  const book = async () => {
    const text = [
      `Send order #${shortId(order)} to Steadfast?`,
      "",
      `Collect on delivery: ${money(cod)}`,
      "The order status will change to Shipped.",
      order.isPreorder ? "\nPre-order: make sure the jersey has arrived first." : "",
    ].join("\n");
    if (!window.confirm(text)) return;

    setBusy("book");
    setErr("");
    try {
      const updated = await api<Order>(`/orders/${order._id}/courier`, {
        method: "POST",
      });
      onUpdated(updated, `Order #${shortId(updated)} sent to Steadfast`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send the order");
    } finally {
      setBusy("");
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be blocked; nothing to do */
    }
  };

  // nothing to show for e.g. delivered / cancelled orders that never went to the courier
  if (!booked && !canBook && order.status !== "Pending") return null;

  return (
    <div className="mb-4 rounded-xl border border-border/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Courier · Steadfast</p>
        {booked && courier?.status && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone(courier.status)}`}
          >
            {label(courier.status)}
          </span>
        )}
        {booked && (
          <button
            type="button"
            onClick={() => sync(false)}
            disabled={busy !== ""}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
          >
            {busy === "sync" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Refresh
          </button>
        )}
      </div>

      {booked && courier ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-secondary/60 p-2">
            <p className="text-[11px] text-muted-foreground">Consignment ID</p>
            <p className="font-semibold">{courier.consignmentId}</p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-2">
            <p className="text-[11px] text-muted-foreground">Tracking code</p>
            <p className="flex items-center gap-1.5 font-semibold">
              {courier.trackingCode || "-"}
              {courier.trackingCode && (
                <button
                  type="button"
                  onClick={() => copy(courier.trackingCode ?? "")}
                  aria-label="Copy tracking code"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
              {copied && <span className="text-[11px] text-green-600">Copied</span>}
            </p>
          </div>
          <p className="col-span-2 text-[11px] text-muted-foreground">
            Sent {new Date(courier.bookedAt).toLocaleString()}
            {courier.syncedAt &&
              ` · checked ${new Date(courier.syncedAt).toLocaleString()}`}
          </p>
        </div>
      ) : canBook ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Collect on delivery: <span className="font-semibold">{money(cod)}</span>
          </p>
          <button
            type="button"
            onClick={book}
            disabled={busy !== ""}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy === "book" && <Loader2 className="h-4 w-4 animate-spin" />}
            Send to Steadfast
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Confirm the order first, then you can send it to the courier.
        </p>
      )}

      {err && (
        <p role="alert" className="mt-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-600">
          {err}
        </p>
      )}
    </div>
  );
}