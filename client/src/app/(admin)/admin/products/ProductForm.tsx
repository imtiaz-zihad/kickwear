"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  CATEGORIES,
  DEFAULT_ADDON_PRICE,
  SIZES,
  api,
  emptyForm,
  field,
  formFromProduct,
  money,
  toSlug,
  uploadImage,
} from "./lib";
import type { FormState, Product, SetField } from "./lib";
import { AddOnsSection, ErrorText, ImagesSection, Label, Section, Toggle } from "./FormParts";


export default function ProductForm({
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

  const set: SetField = (key, value) => {
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

          <ImagesSection
            images={form.images}
            uploading={uploading}
            error={errors.images}
            onChange={(imgs) => set("images", imgs)}
            onUpload={handleUpload}
          />

          <AddOnsSection form={form} set={set} />

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
              className="flex h-12 flex-2 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
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
