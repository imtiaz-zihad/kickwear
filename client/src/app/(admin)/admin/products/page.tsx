"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Package, Plus, Search } from "lucide-react";
import { CATEGORIES, PAGE_SIZE, api } from "./lib";
import type { Product } from "./lib";
import ProductForm from "./ProductForm";
import { CardSkeleton, ProductCard } from "./ProductCard";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const flash = useCallback((text: string, isError = false) => {
    setToast({ text, error: isError });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadPage = useCallback(async (n: number) => {
    const res = await api<{ total: number; page: number; totalPages: number; data: Product[] }>(
      `/products?page=${n}&limit=${PAGE_SIZE}`
    );
    setTotal(res.total ?? res.data.length);
    setPage(res.page ?? n);
    setTotalPages(res.totalPages ?? 1);
    return res.data ?? [];
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadPage(1)
      .then((data) => !cancelled && setProducts(data))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load products"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await loadPage(page + 1);
      setProducts((prev) => [...prev, ...data]);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not load more", true);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSaved = (saved: Product, isNew: boolean) => {
    setProducts((prev) =>
      isNew ? [saved, ...prev] : prev.map((p) => (p._id === saved._id ? saved : p))
    );
    if (isNew) setTotal((t) => t + 1);
    setEditing(null);
    flash(isNew ? "Product added" : "Product updated");
  };

  const toggleFeatured = async (p: Product) => {
    setBusyId(p._id);
    try {
      const updated = await api<Product>(`/products/${p._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isFeatured: !p.isFeatured }),
      });
      setProducts((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
      flash(updated.isFeatured ? "Marked as featured" : "Removed from featured");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not update", true);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setBusyId(p._id);
    try {
      await api(`/products/${p._id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((x) => x._id !== p._id));
      setTotal((t) => Math.max(0, t - 1));
      flash("Product deleted");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not delete", true);
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: products.length };
    CATEGORIES.forEach((cat) => (c[cat.slug] = products.filter((p) => p.category === cat.slug).length));
    return c;
  }, [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => category === "all" || p.category === category)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.subcategory ?? "").toLowerCase().includes(q)
      );
  }, [products, category, query]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Products</h1>
          <p className="text-muted-foreground">{total} total products</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {[{ slug: "all", label: "All" }, ...CATEGORIES].map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCategory(c.slug)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                category === c.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              {c.label} <span className="opacity-70">({counts[c.slug] ?? 0})</span>
            </button>
          ))}
        </div>

        <div className="relative md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or team"
            aria-label="Search products"
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Grid: 1 per row on phones, 2 on tablets, 3 on desktop */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">No products found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => (
              <ProductCard
                key={p._id}
                product={p}
                busy={busyId === p._id}
                onEdit={() => setEditing(p)}
                onDelete={() => handleDelete(p)}
                onToggleFeatured={() => toggleFeatured(p)}
              />
            ))}
          </div>

          {page < totalPages && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} Load more
              </button>
            </div>
          )}
        </>
      )}

      {/* Add / Edit drawer */}
      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
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
