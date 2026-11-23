"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { sizeExtra } from "@/lib/sizes";
import { BASE_URL, money } from "./lib";
import type { NewItemInput } from "./lib";

type AddOn = { enabled?: boolean; price?: number };

type PickProduct = {
  _id: string;
  name: string;
  category?: string;
  subcategory?: string;
  images?: string[];
  discountedPrice: number;
  sizes?: string[];
  stock?: number;
  availability?: string;
  addOns?: { uclPatch?: AddOn; customPrint?: AddOn };
};

// a jersey waiting to be saved into the order
export type AddedItem = {
  input: NewItemInput;
  name: string;
  image: string | null;
  unit: number; // price per jersey (display only, the server recalculates)
  size: string | null;
};

// The server returns at most 100 products per page: load every page
async function fetchAllProducts(): Promise<PickProduct[]> {
  const all: PickProduct[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await fetch(`${BASE_URL}/products?limit=100&page=${page}`);
    const json = await res.json();
    if (Array.isArray(json)) return json;
    all.push(...(json.data ?? []));
    totalPages = json.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages && page <= 20);
  return all;
}

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary";

export default function AddJerseyPanel({
  isPreorder,
  onAdd,
}: {
  isPreorder: boolean; // an order only holds pre-order OR in-stock jerseys
  onAdd: (item: AddedItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<PickProduct[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [ucl, setUcl] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customNumber, setCustomNumber] = useState("");
  const [err, setErr] = useState("");

  const openPanel = async () => {
    setOpen(true);
    if (products || loading) return;
    setLoading(true);
    try {
      setProducts(await fetchAllProducts());
    } catch {
      setErr("Could not load products");
    } finally {
      setLoading(false);
    }
  };

  const product = products?.find((p) => p._id === productId);

  // every word typed must match the name, team or category
  const options = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (products ?? [])
      .filter((p) => (p.availability === "preorder") === isPreorder)
      .filter((p) => isPreorder || (p.stock ?? 1) > 0)
      .filter((p) => {
        const hay = `${p.name} ${p.subcategory ?? ""} ${p.category ?? ""}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 8);
  }, [products, query, isPreorder]);

  const sizes = product?.sizes ?? [];
  const patchCfg = product?.addOns?.uclPatch;
  const printCfg = product?.addOns?.customPrint;
  const wantsPrint =
    !!printCfg?.enabled && (!!customName.trim() || !!customNumber.trim());
  const unit =
    (product?.discountedPrice ?? 0) +
    sizeExtra(size) +
    (ucl && patchCfg?.enabled ? (patchCfg.price ?? 0) : 0) +
    (wantsPrint ? (printCfg?.price ?? 0) : 0);

  const pick = (id: string) => {
    setProductId(id);
    setSize("");
    setUcl(false);
    setCustomName("");
    setCustomNumber("");
    setErr("");
  };

  const reset = () => {
    setProductId("");
    setQuery("");
    setSize("");
    setQuantity("1");
    setUcl(false);
    setCustomName("");
    setCustomNumber("");
    setErr("");
  };

  const add = () => {
    setErr("");
    if (!product) return setErr("Select a jersey");
    if (sizes.length > 0 && !size) return setErr("Select a size");
    const q = Number(quantity);
    if (!Number.isInteger(q) || q < 1 || q > 20) return setErr("Quantity must be 1–20");
    if (wantsPrint && (!customName.trim() || !customNumber.trim())) {
      return setErr("Name and number must be filled together");
    }

    onAdd({
      name: product.name,
      image: product.images?.[0] ?? null,
      unit,
      size: size || null,
      input: {
        productId: product._id,
        quantity: q,
        size: size || null,
        uclPatch: !!(ucl && patchCfg?.enabled),
        customName: wantsPrint ? customName.trim() : null,
        customNumber: wantsPrint ? customNumber.trim() : null,
      },
    });
    reset();
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={openPanel}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/60 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
      >
        <Plus className="h-4 w-4" /> Add jersey
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          Add jersey{isPreorder ? " (pre-order)" : ""}
        </p>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-xs font-semibold text-muted-foreground hover:underline"
        >
          Close
        </button>
      </div>

      {!product ? (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jersey (e.g. como away)"
              className={`${inputCls} pl-8`}
            />
          </div>

          {loading ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading products…
            </p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {options.map((p) => (
                <li key={p._id}>
                  <button
                    type="button"
                    onClick={() => pick(p._id)}
                    className="flex w-full items-center gap-2 rounded-lg border border-border bg-background p-2 text-left text-sm hover:border-primary/60"
                  >
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-secondary">
                      {p.images?.[0] && (
                        <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {money(p.discountedPrice)}
                    </span>
                  </button>
                </li>
              ))}
              {options.length === 0 && (
                <li className="py-2 text-xs text-muted-foreground">No jersey found</li>
              )}
            </ul>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-background p-2 text-sm">
            <span className="min-w-0 truncate font-medium">{product.name}</span>
            <button
              type="button"
              onClick={() => pick("")}
              className="shrink-0 text-xs font-semibold text-primary hover:underline"
            >
              Change
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {sizes.length > 0 && (
              <label className="text-xs text-muted-foreground">
                Size
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className={`${inputCls} mt-0.5`}
                >
                  <option value="">Select</option>
                  {sizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                      {sizeExtra(s) > 0 ? ` (+${money(sizeExtra(s))})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-xs text-muted-foreground">
              Qty
              <input
                type="number"
                min={1}
                max={20}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`${inputCls} mt-0.5`}
              />
            </label>
          </div>

          {patchCfg?.enabled && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ucl}
                onChange={(e) => setUcl(e.target.checked)}
              />
              UCL patch (+{money(patchCfg.price ?? 0)})
            </label>
          )}

          {printCfg?.enabled && (
            <div className="grid grid-cols-[1fr_5rem] gap-2">
              <label className="text-xs text-muted-foreground">
                Print name (+{money(printCfg.price ?? 0)})
                <input
                  value={customName}
                  maxLength={12}
                  onChange={(e) =>
                    setCustomName(
                      e.target.value.toUpperCase().replace(/[^A-Z .'-]/g, "").slice(0, 12),
                    )
                  }
                  className={`${inputCls} mt-0.5 uppercase`}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Number
                <input
                  value={customNumber}
                  inputMode="numeric"
                  maxLength={2}
                  onChange={(e) =>
                    setCustomNumber(e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  className={`${inputCls} mt-0.5`}
                />
              </label>
            </div>
          )}

          {err && (
            <p role="alert" className="rounded-lg bg-red-500/10 p-2 text-xs text-red-600">
              {err}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">
              {money(unit)} <span className="font-normal text-muted-foreground">each</span>
            </p>
            <button
              type="button"
              onClick={add}
              className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Add to order
            </button>
          </div>
        </div>
      )}

      {!product && err && (
        <p role="alert" className="rounded-lg bg-red-500/10 p-2 text-xs text-red-600">
          {err}
        </p>
      )}
    </div>
  );
}