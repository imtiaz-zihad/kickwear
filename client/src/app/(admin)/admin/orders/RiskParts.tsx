"use client";

import { useState } from "react";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { api } from "./lib";
import type { Order, Risk } from "./lib";

const STYLE: Record<Risk["level"], { chip: string; label: string }> = {
  low: { chip: "bg-green-100 text-green-700", label: "Low risk" },
  medium: { chip: "bg-amber-100 text-amber-700", label: "Medium risk" },
  high: { chip: "bg-red-100 text-red-700", label: "High risk" },
  new: { chip: "bg-slate-100 text-slate-600", label: "New customer" },
};

// Small badge for the order card: "Risk 40%"
export function RiskChip({ risk }: { risk?: Risk }) {
  if (!risk) return null;
  const s = STYLE[risk.level];
  return (
    <span
      title={s.label}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${s.chip}`}
    >
      <ShieldAlert className="h-3 w-3" />
      {risk.level === "new" ? "New" : `Risk ${risk.percent}%`}
    </span>
  );
}

// Bigger box for the order details modal, with a "Check again" button
export function RiskPanel({
  order,
  onChecked,
}: {
  order: Order;
  onChecked: (updated: Order) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const risk = order.risk;

  const recheck = async () => {
    setBusy(true);
    setErr("");
    try {
      const updated = await api<Order>(`/orders/${order._id}/risk`, { method: "POST" });
      onChecked(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Check failed");
    } finally {
      setBusy(false);
    }
  };

  const s = risk ? STYLE[risk.level] : null;

  return (
    <div className="mb-4 rounded-xl border border-border/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Steadfast delivery record</p>
        {s && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.chip}`}>
            {s.label}
          </span>
        )}
        <button
          type="button"
          onClick={recheck}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {risk ? "Check again" : "Check now"}
        </button>
      </div>

      {!risk ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Not checked yet. Press &quot;Check now&quot; to see this customer&apos;s record.
        </p>
      ) : risk.level === "new" ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No finished parcels on Steadfast yet, so there is nothing to judge.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-secondary/60 p-2">
            <p className="text-lg font-bold">{risk.percent}%</p>
            <p className="text-[11px] text-muted-foreground">Risk</p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-2">
            <p className="text-lg font-bold text-green-700">{risk.deliveryPercent ?? "-"}%</p>
            <p className="text-[11px] text-muted-foreground">Delivered</p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-2">
            <p className="text-lg font-bold text-red-600">{risk.cancelPercent ?? "-"}%</p>
            <p className="text-[11px] text-muted-foreground">Cancelled</p>
          </div>
        </div>
      )}

      {risk && risk.reports > 0 && (
        <p className="mt-2 text-xs font-semibold text-red-600">
          Reported by other merchants: {risk.reports}
        </p>
      )}
      {risk?.volume && (
        <p className="mt-1 text-xs text-muted-foreground">Order volume: {risk.volume}</p>
      )}
      {risk?.checkedAt && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Checked {new Date(risk.checkedAt).toLocaleString()}
        </p>
      )}
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  );
}