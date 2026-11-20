"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUp, Loader2, Package, X } from "lucide-react";
import { api, fromSlug, money } from "./lib";
import type { Product } from "./lib";

// Admin: set the order customers see products in, for ONE category.
// Top of this list = first on the website (and first on the homepage section).
export default function ArrangeProducts({
  category,
  label,
  onClose,
  onSaved,
}: {
  category: string; // slug, e.g. "club-jersey"
  label: string; // "Club Jersey"
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items, setItems] = useState<Product[]>([]);
  const [original, setOriginal] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [moved, setMoved] = useState<string | null>(null); // row that just moved

  // every product of this category, in the order the website shows now
  useEffect(() => {
    let cancelled = false;
    api<{ data: Product[] }>(`/products?category=${category}&limit=100`)
      .then((res) => {
        if (cancelled) return;
        const list = res.data ?? [];
        setItems(list);
        setOriginal(list.map((p) => p._id));
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [category]);

  const dirty = useMemo(
    () => items.some((p, i) => p._id !== original[i]),
    [items, original]
  );

  const close = useCallback(() => {
    if (saving) return;
    if (dirty && !window.confirm("Close without saving the new order?")) return;
    onClose();
  }, [saving, dirty, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setItems(next);
    setMoved(item._id);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api("/products/order", {
        method: "PUT",
        body: JSON.stringify({ ids: items.map((p) => p._id) }),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the order");
      setSaving(false);
    }
  };

  const btn =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-secondary disabled:opacity-30 disabled:hover:bg-card";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Arrange ${label}`}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-background shadow-xl sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-lg font-bold">Arrange order · {label}</h2>
            <p className="text-sm text-muted-foreground">
              Top of the list is shown first on the website. Use the arrows, or{" "}
              <ChevronsUp className="inline h-4 w-4 align-text-bottom" /> to send a product
              to the very top.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">No products in this category</p>
          ) : (
            <ol className="space-y-2">
              {items.map((p, i) => (
                <li
                  key={p._id}
                  className={`flex items-center gap-3 rounded-xl border bg-card p-2 transition-colors ${
                    moved === p._id ? "border-primary bg-primary/5" : "border-border/60"
                  }`}
                >
                  <span className="w-7 shrink-0 text-center text-sm font-bold text-muted-foreground">
                    {i + 1}
                  </span>

                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Package className="h-5 w-5 opacity-30" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[fromSlug(p.subcategory), p.season, p.sleeve && `${p.sleeve} sleeve`]
                        .filter(Boolean)
                        .join(" · ")}{" "}
                      · {money(p.discountedPrice)}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => move(i, 0)}
                      disabled={i === 0 || saving}
                      aria-label={`Move ${p.name} to the top`}
                      title="Move to top"
                      className={btn}
                    >
                      <ChevronsUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0 || saving}
                      aria-label={`Move ${p.name} up`}
                      className={btn}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, i + 1)}
                      disabled={i === items.length - 1 || saving}
                      aria-label={`Move ${p.name} down`}
                      className={btn}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4">
          {error && (
            <p role="alert" className="mb-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              The website shows the new order within a few minutes.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!dirty || saving || loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}