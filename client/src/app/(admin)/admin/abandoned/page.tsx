"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, Phone, RefreshCw, Trash2 } from "lucide-react";
import { api, areaLabel } from "../orders/lib";

type Lead = {
  _id: string;
  phone: string;
  customerName: string;
  address: string;
  deliveryArea: "dhaka" | "outside";
  productName: string;
  size: string | null;
  quantity: number;
  contacted: boolean;
  converted: boolean;
  lastSeenAt: string;
};

type Tab = "open" | "ordered" | "all";

const ago = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

export default function AbandonedPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("open");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setLeads(await api<Lead[]>("/abandoned"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
   
    load();
  }, [load]);

  const visible = useMemo(
    () =>
      leads.filter((l) =>
        tab === "open" ? !l.converted : tab === "ordered" ? l.converted : true,
      ),
    [leads, tab],
  );

  const toggleContacted = async (l: Lead) => {
    setBusyId(l._id);
    try {
      const u = await api<Lead>(`/abandoned/${l._id}`, {
        method: "PATCH",
        body: JSON.stringify({ contacted: !l.contacted }),
      });
      setLeads((p) => p.map((x) => (x._id === l._id ? { ...x, contacted: u.contacted } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (l: Lead) => {
    if (!window.confirm("Delete this lead?")) return;
    setBusyId(l._id);
    try {
      await api(`/abandoned/${l._id}`, { method: "DELETE" });
      setLeads((p) => p.filter((x) => x._id !== l._id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const waLink = (l: Lead) => {
    const text = `আসসালামু আলাইকুম${l.customerName ? ` ${l.customerName}` : ""}, Kick Wear থেকে বলছি। আপনি ${
      l.productName || "আমাদের প্রোডাক্ট"
    } অর্ডার করছিলেন, কোনো সমস্যা হয়েছে? আমরা সাহায্য করতে পারি 😊`;
    return `https://wa.me/88${l.phone}?text=${encodeURIComponent(text)}`;
  };

  const counts = {
    open: leads.filter((l) => !l.converted).length,
    ordered: leads.filter((l) => l.converted).length,
    all: leads.length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Abandoned checkouts</h1>
          <p className="text-muted-foreground">
            People who typed their phone at checkout. Call or WhatsApp them to complete the order.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-secondary disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["open", "Not ordered"],
            ["ordered", "Ordered later"],
            ["all", "All"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            {label} <span className="opacity-70">({counts[key]})</span>
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading && leads.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">Nothing here</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visible.map((l) => (
            <div
              key={l._id}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{l.customerName || "No name yet"}</h3>
                  <span
                    className={`text-xs font-semibold ${
                      l.deliveryArea === "dhaka" ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {areaLabel(l.deliveryArea)}
                  </span>
                  {l.converted && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Ordered later
                    </span>
                  )}
                  {l.contacted && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      Contacted
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium">{l.phone}</p>
                <p className="text-sm text-muted-foreground">{l.address || "No address yet"}</p>
                <p className="text-sm">
                  {l.productName || "Product"} · {l.size ? `Size ${l.size} · ` : ""}× {l.quantity}
                </p>
                <p className="text-xs text-muted-foreground">Last active {ago(l.lastSeenAt)}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                <a
                  href={`tel:${l.phone}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
                >
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
                <a
                  href={waLink(l)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-green-600 hover:bg-secondary"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
                <button
                  type="button"
                  disabled={busyId === l._id}
                  onClick={() => toggleContacted(l)}
                  className="h-8 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                >
                  {l.contacted ? "Unmark contacted" : "Mark contacted"}
                </button>
                <button
                  type="button"
                  disabled={busyId === l._id}
                  onClick={() => remove(l)}
                  aria-label="Delete lead"
                  className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-border text-red-500 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
