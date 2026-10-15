"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const CLOUD_NAME = "ps6g4nx2";
const UPLOAD_PRESET = "kickwear_upload";
const UPLOAD_ENABLED = true;

const CATEGORIES = [
  { slug: "club-jersey", label: "Club Jersey" },
  { slug: "country-jersey", label: "Country Jersey" },
  { slug: "retro", label: "Retro" },
  { slug: "jacket", label: "Jacket" },
];
const SIZES = ["S", "M", "L", "XL", "2XL"];
const DEFAULT_ADDON_PRICE = 200;
const PAGE_SIZE = 100;

type AddOn = { enabled?: boolean; price?: number };
type Product = {
  _id: string;
  name: string;
  category: string;
  subcategory?: string;
  sleeve?: "half" | "full";
  season?: string;
  sizes?: string[];
  images: string[];
  originalPrice: number;
  discountedPrice: number;
  discountPercentage?: number;
  stock?: number;
  description?: string;
  isFeatured?: boolean;
  addOns?: { uclPatch?: AddOn; customPrint?: AddOn };
};

type FormState = {
  name: string;
  category: string;
  team: string;
  season: string;
  sleeve: "" | "half" | "full";
  originalPrice: string;
  discountedPrice: string;
  sizes: string[];
  images: string[];
  description: string;
  stock: string;
  isFeatured: boolean;
  uclEnabled: boolean;
  uclPrice: string;
  printEnabled: boolean;
  printPrice: string;
};

const money = (n: number) => `৳${(n ?? 0).toLocaleString()}`;
const categoryLabel = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
const toSlug = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const fromSlug = (slug?: string) =>
  (slug ?? "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

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

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: fd,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.secure_url) throw new Error(data?.error?.message || "Upload failed");
  return data.secure_url as string;
}

const emptyForm = (): FormState => ({
  name: "",
  category: "club-jersey",
  team: "",
  season: "",
  sleeve: "",
  originalPrice: "",
  discountedPrice: "",
  sizes: [...SIZES],
  images: [""],
  description: "",
  stock: "1",
  isFeatured: false,
  uclEnabled: false,
  uclPrice: String(DEFAULT_ADDON_PRICE),
  printEnabled: false,
  printPrice: String(DEFAULT_ADDON_PRICE),
});

const formFromProduct = (p: Product): FormState => ({
  name: p.name,
  category: p.category,
  team: fromSlug(p.subcategory),
  season: p.season ?? "",
  sleeve: p.sleeve ?? "",
  originalPrice: String(p.originalPrice),
  discountedPrice: String(p.discountedPrice),
  sizes: p.sizes ?? [],
  images: p.images?.length ? p.images : [""],
  description: p.description ?? "",
  stock: String(p.stock ?? 1),
  isFeatured: Boolean(p.isFeatured),
  uclEnabled: p.addOns?.uclPatch?.enabled === true,
  uclPrice: String(p.addOns?.uclPatch?.price ?? DEFAULT_ADDON_PRICE),
  printEnabled: p.addOns?.customPrint?.enabled === true,
  printPrice: String(p.addOns?.customPrint?.price ?? DEFAULT_ADDON_PRICE),
});

const field =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
      {children}
    </label>
  );
}

function ErrorText({ children }: { children?: string }) {
  return children ? (
    <p role="alert" className="mt-1.5 text-sm text-red-600">
      {children}
    </p>
  ) : null;
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/* ───────────────────────── Add / Edit form ───────────────────────── */

function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: (p: Product, isNew: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(() => (product ? formFromProduct(product) : emptyForm()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const original = Number(form.originalPrice);
  const discounted = Number(form.discountedPrice);
  const pricesOk = original > 0 && discounted > 0 && discounted <= original;
  const discountPct = pricesOk ? Math.round(((original - discounted) / original) * 100) : 0;

  const toggleSize = (s: string) =>
    set("sizes", form.sizes.includes(s) ? form.sizes.filter((x) => x !== s) : SIZES.filter((x) => form.sizes.includes(x) || x === s));

  const setImage = (i: number, url: string) =>
    set("images", form.images.map((u, idx) => (idx === i ? url : u)));
  const removeImage = (i: number) => {
    const next = form.images.filter((_, idx) => idx !== i);
    set("images", next.length ? next : [""]);
  };
  const moveImageUp = (i: number) => {
    if (i === 0) return;
    const next = [...form.images];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    set("images", next);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setErrors((e) => ({ ...e, images: "" }));
    try {
      const urls = await Promise.all(Array.from(files).map(uploadImage));
      const existing = form.images.filter((u) => u.trim());
      set("images", [...existing, ...urls]);
    } catch (err) {
      setErrors((e) => ({ ...e, images: err instanceof Error ? err.message : "Upload failed" }));
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Enter a product name";
    if (!form.category) e.category = "Select a category";
    if (!(original > 0)) e.originalPrice = "Enter the regular price";
    if (!(discounted > 0)) e.discountedPrice = "Enter the discount price";
    else if (discounted > original) e.discountedPrice = "Cannot be higher than the regular price";
    if (!form.images.some((u) => u.trim())) e.images = "Add at least one image";
    if (form.stock.trim() === "" || Number(form.stock) < 0) e.stock = "Enter 0 or more";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (saving || uploading || !validate()) return;

    setSaving(true);
    setSubmitError("");

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      category: form.category,
      subcategory: toSlug(form.team),
      season: form.season.trim(),
      sizes: form.sizes,
      images: form.images.map((u) => u.trim()).filter(Boolean),
      originalPrice: original,
      discountedPrice: discounted,
      description: form.description.trim(),
      stock: Number(form.stock),
      isFeatured: form.isFeatured,
      addOns: {
        uclPatch: { enabled: form.uclEnabled, price: Number(form.uclPrice) || DEFAULT_ADDON_PRICE },
        customPrint: { enabled: form.printEnabled, price: Number(form.printPrice) || DEFAULT_ADDON_PRICE },
      },
    };
    if (form.sleeve) payload.sleeve = form.sleeve; // empty is never sent (enum)

    try {
      const saved = product
        ? await api<Product>(`/products/${product._id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await api<Product>("/products", { method: "POST", body: JSON.stringify(payload) });
      onSaved(saved, !product);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not save product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-label={product ? "Edit product" : "Add product"}
        className="flex h-full w-full max-w-xl flex-col bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <h2 className="text-lg font-semibold">{product ? "Edit Product" : "Add Product"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-7 overflow-y-auto p-5">
          <Section title="Basic info">
            <div>
              <Label htmlFor="p-name">Name</Label>
              <input
                id="p-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Barcelona Home 26/27"
                className={field}
              />
              <ErrorText>{errors.name}</ErrorText>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="p-category">Category</Label>
                <select
                  id="p-category"
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  className={field}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <ErrorText>{errors.category}</ErrorText>
              </div>

              <div>
                <Label htmlFor="p-team">Team / Country</Label>
                <input
                  id="p-team"
                  value={form.team}
                  onChange={(e) => set("team", e.target.value)}
                  placeholder="Barcelona"
                  className={field}
                />
                {form.team.trim() && (
                  <p className="mt-1 text-xs text-muted-foreground">Saved as: {toSlug(form.team) || "—"}</p>
                )}
              </div>

              <div>
                <Label htmlFor="p-season">Season</Label>
                <input
                  id="p-season"
                  value={form.season}
                  onChange={(e) => set("season", e.target.value)}
                  placeholder="26/27"
                  className={field}
                />
              </div>

              <div>
                <Label htmlFor="p-sleeve">Sleeve</Label>
                <select
                  id="p-sleeve"
                  value={form.sleeve}
                  onChange={(e) => set("sleeve", e.target.value as FormState["sleeve"])}
                  className={field}
                >
                  <option value="">Not applicable</option>
                  <option value="half">Half Sleeve</option>
                  <option value="full">Full Sleeve</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="p-desc">Description (optional)</Label>
              <textarea
                id="p-desc"
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </Section>

          <Section title="Pricing">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="p-original">Regular price (৳)</Label>
                <input
                  id="p-original"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.originalPrice}
                  onChange={(e) => set("originalPrice", e.target.value)}
                  placeholder="1200"
                  className={field}
                />
                <ErrorText>{errors.originalPrice}</ErrorText>
              </div>
              <div>
                <Label htmlFor="p-discounted">Discount price (৳)</Label>
                <input
                  id="p-discounted"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.discountedPrice}
                  onChange={(e) => set("discountedPrice", e.target.value)}
                  placeholder="1050"
                  className={field}
                />
                <ErrorText>{errors.discountedPrice}</ErrorText>
              </div>
            </div>
            {pricesOk && (
              <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">
                {discountPct > 0
                  ? `${discountPct}% off · customer saves ${money(original - discounted)}`
                  : "No discount"}
              </p>
            )}
          </Section>

          <Section title="Sizes">
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => {
                const on = form.sizes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggleSize(s)}
                    className={`h-10 min-w-14 rounded-xl border px-4 text-sm font-semibold transition-colors ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Customers can only pick the sizes selected here.
            </p>
          </Section>

          <Section title="Images">
            <div className="space-y-2">
              {form.images.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {url.trim() && <img src={url} alt="" className="h-full w-full object-cover" />}
                    {i === 0 && url.trim() && (
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-[9px] font-semibold text-white">
                        MAIN
                      </span>
                    )}
                  </div>
                  <input
                    value={url}
                    onChange={(e) => setImage(i, e.target.value)}
                    placeholder="https://… image URL"
                    aria-label={`Image ${i + 1} URL`}
                    className={field}
                  />
                  <button
                    type="button"
                    onClick={() => moveImageUp(i)}
                    disabled={i === 0}
                    aria-label="Move up"
                    title="Move up (first image is the main one)"
                    className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label="Remove image"
                    className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => set("images", [...form.images, ""])}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-secondary"
              >
                <Plus className="h-4 w-4" /> Add URL
              </button>

              {UPLOAD_ENABLED && (
                <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-secondary">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Uploading…" : "Upload images"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    disabled={uploading}
                    onChange={(e) => {
                      handleUpload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <ErrorText>{errors.images}</ErrorText>
          </Section>

          <Section title="Optional extras (customers can add)">
            <div className="space-y-4 rounded-xl border border-border/60 p-4">
              <Toggle
                checked={form.uclEnabled}
                onChange={(v) => set("uclEnabled", v)}
                label="UCL patch"
                hint="Champions League sleeve patch"
              />
              {form.uclEnabled && (
                <div className="max-w-[10rem]">
                  <Label htmlFor="p-ucl-price">Price (৳)</Label>
                  <input
                    id="p-ucl-price"
                    type="number"
                    min={0}
                    value={form.uclPrice}
                    onChange={(e) => set("uclPrice", e.target.value)}
                    className={field}
                  />
                </div>
              )}

              <div className="border-t border-border/60" />

              <Toggle
                checked={form.printEnabled}
                onChange={(v) => set("printEnabled", v)}
                label="Name & number print"
                hint="Customer types a name and number"
              />
              {form.printEnabled && (
                <div className="max-w-[10rem]">
                  <Label htmlFor="p-print-price">Price (৳)</Label>
                  <input
                    id="p-print-price"
                    type="number"
                    min={0}
                    value={form.printPrice}
                    onChange={(e) => set("printPrice", e.target.value)}
                    className={field}
                  />
                </div>
              )}
            </div>
          </Section>

          <Section title="Stock & visibility">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="p-stock">Stock (0 = sold out)</Label>
                <input
                  id="p-stock"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) => set("stock", e.target.value)}
                  className={field}
                />
                <ErrorText>{errors.stock}</ErrorText>
              </div>
              <div className="flex items-end pb-2">
                <div className="w-full">
                  <Toggle
                    checked={form.isFeatured}
                    onChange={(v) => set("isFeatured", v)}
                    label="Featured"
                    hint="Show in Popular Jerseys"
                  />
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 p-4">
          {submitError && (
            <p role="alert" className="mb-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">
              {submitError}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-12 flex-1 rounded-xl border border-border font-semibold hover:bg-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Saving…
                </>
              ) : product ? (
                "Save changes"
              ) : (
                "Add product"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ───────────────────────── Product card ───────────────────────── */

function ProductCard({
  product: p,
  busy,
  onEdit,
  onDelete,
  onToggleFeatured,
}: {
  product: Product;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
}) {
  const soldOut = p.stock !== undefined && p.stock <= 0;
  const hasDiscount = p.originalPrice > p.discountedPrice;
  const discount =
    p.discountPercentage && p.discountPercentage > 0
      ? Math.round(p.discountPercentage)
      : hasDiscount
        ? Math.round(((p.originalPrice - p.discountedPrice) / p.originalPrice) * 100)
        : 0;
  const meta = [categoryLabel(p.category), fromSlug(p.subcategory), p.season].filter(Boolean).join(" · ");

  const iconBtn =
    "flex h-9 flex-1 items-center justify-center rounded-lg bg-secondary/60 transition-colors hover:bg-secondary disabled:opacity-50";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg md:flex-row">
      {/* Image */}
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-secondary md:aspect-auto md:min-h-44 md:w-40 lg:w-44">
        {p.images?.[0] ? (
          <img
            src={p.images[0]}
            alt={p.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Package className="h-8 w-8 opacity-30" />
          </div>
        )}

        {discount > 0 && !soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm md:text-xs">
            -{discount}%
          </span>
        )}

        {p.isFeatured && (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow-sm">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />
          </span>
        )}

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-neutral-900 md:text-xs">
              Sold out
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col p-3 md:p-4">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:text-[11px]">
          {meta}
        </p>

        <h3 className="mt-1 line-clamp-2 min-h-9 text-sm font-bold leading-snug md:min-h-0 md:text-base">
          {p.name}
        </h3>

        <div className="mt-2 flex flex-wrap gap-1">
          {p.sleeve && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium md:text-xs">
              {p.sleeve === "half" ? "Half" : "Full"} Sleeve
            </span>
          )}
          {p.addOns?.uclPatch?.enabled && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary md:text-xs">
              UCL
            </span>
          )}
          {p.addOns?.customPrint?.enabled && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary md:text-xs">
              Print
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-extrabold text-primary md:text-lg">{money(p.discountedPrice)}</span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">{money(p.originalPrice)}</span>
          )}
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          {soldOut ? "Out of stock" : `Stock: ${p.stock ?? "—"}`}
        </p>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-1.5 border-t border-border/60 pt-3">
          <button
            type="button"
            onClick={onToggleFeatured}
            disabled={busy}
            aria-label={p.isFeatured ? "Remove from featured" : "Mark as featured"}
            title={p.isFeatured ? "Featured" : "Mark as featured"}
            className={iconBtn}
          >
            <Star
              className={`h-4 w-4 ${p.isFeatured ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground"}`}
            />
          </button>
          <button type="button" onClick={onEdit} aria-label="Edit product" title="Edit" className={iconBtn}>
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            aria-label="Delete product"
            title="Delete"
            className="flex h-9 flex-1 items-center justify-center rounded-lg bg-red-500/10 text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </article>
  );
}

function CardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-2xl border border-border/60 bg-card md:flex-row">
      <div className="aspect-square w-full bg-secondary md:aspect-auto md:min-h-44 md:w-40 lg:w-44" />
      <div className="flex-1 space-y-3 p-3 md:p-4">
        <div className="h-3 w-1/2 rounded bg-secondary" />
        <div className="h-4 w-3/4 rounded bg-secondary" />
        <div className="h-4 w-1/3 rounded bg-secondary" />
        <div className="h-9 w-full rounded-lg bg-secondary" />
      </div>
    </div>
  );
}

/* ───────────────────────── Products list ───────────────────────── */

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

      {/* Grid: 2 cards per row */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
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