"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Loader2,
  MapPin,
  ShoppingBag,
} from "lucide-react";
import {
  createOrder,
  getSingleProduct,
  type DeliveryArea,
  type Order,
} from "@/services/api";
import type { Product } from "@/types/product";

const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;
const MAX_QTY = 10;

// Display only. The server recalculates the real prices.
const DEFAULT_ADDON_PRICE = 200;
const DELIVERY: Record<DeliveryArea, { label: string; hint: string; charge: number }> = {
  dhaka: { label: "Inside Dhaka", hint: "Dhaka city", charge: 70 },
  outside: { label: "Outside Dhaka", hint: "All over Bangladesh", charge: 130 },
};

interface StoredOrder {
  productId: string;
  quantity: number;
  size: string | null;
  uclPatch: boolean;
  customName: string | null;
  customNumber: string | null;
}

type FormErrors = { customerName?: string; phone?: string; address?: string };

const money = (n: number) => `৳${n.toLocaleString()}`;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

// Reads the selection saved by the product page's "Order Now" button
function readStoredOrder(): StoredOrder | null {
  try {
    const raw = localStorage.getItem("order");
    if (!raw) return null;

    const o = JSON.parse(raw);
    if (!o || typeof o.productId !== "string") return null;

    const qty = Math.floor(Number(o.quantity)) || 1;
    return {
      productId: o.productId,
      quantity: Math.min(MAX_QTY, Math.max(1, qty)),
      size: str(o.size),
      uclPatch: o.uclPatch === true,
      customName: str(o.customName),
      customNumber: str(o.customNumber !== null ? String(o.customNumber ?? "") : null),
    };
  } catch {
    return null;
  }
}

function Line({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        strong ? "text-lg font-bold" : "text-sm text-muted-foreground"
      }`}
    >
      <span>{label}</span>
      <span className={strong ? "text-primary" : ""}>{money(value)}</span>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = (hasError: boolean) =>
  `w-full rounded-xl border bg-background px-3.5 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
    hasError ? "border-red-500" : "border-border"
  }`;

export default function CheckoutPage() {
  const router = useRouter();

  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [stored, setStored] = useState<StoredOrder | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    address: "",
    deliveryArea: "dhaka" as DeliveryArea,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [placed, setPlaced] = useState<Order | null>(null);

  // Load the saved selection + the product
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const order = readStoredOrder();
      if (!order) {
        if (!cancelled) setLoadState("empty");
        return;
      }

      try {
        const p = await getSingleProduct(order.productId);
        if (cancelled) return;
        setStored(order);
        setProduct(p);
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Loading / empty / error ──────────────────────────────────────────────
  if (loadState === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your order…
      </div>
    );
  }

  if (loadState === "empty" || loadState === "error" || !stored || !product) {
    const isError = loadState === "error";
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h1 className="text-xl font-bold">
          {isError ? "Could not load your order" : "No product selected"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isError
            ? "Please check your connection and try again."
            : "Choose a jersey and press Order Now to start checkout."}
        </p>
        <div className="mt-6 flex gap-3">
          {isError && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-11 rounded-xl border border-border px-5 text-sm font-semibold hover:bg-secondary"
            >
              Try again
            </button>
          )}
          <Link
            href="/"
            className="flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (placed) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-6 py-10">
        <div className="w-full space-y-5 rounded-3xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold">Order placed!</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Order #{placed._id.slice(-6).toUpperCase()}
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Thank you! We will call you shortly to confirm your order.
          </p>

          <div className="space-y-1 rounded-xl bg-secondary/60 p-4 text-left">
            <Line label="Delivery" value={placed.deliveryCharge} />
            <Line label="Total to pay (Cash on Delivery)" value={placed.totalPrice} strong />
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push("/track-order")}
              className="h-12 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Track Your Order
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="h-12 rounded-xl border border-border font-semibold hover:bg-secondary"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Price breakdown (display only) ───────────────────────────────────────
  const uclActive = stored.uclPatch && product.addOns?.uclPatch?.enabled === true;
  const printActive =
    Boolean(stored.customName || stored.customNumber) &&
    product.addOns?.customPrint?.enabled === true;

  const uclPrice = product.addOns?.uclPatch?.price ?? DEFAULT_ADDON_PRICE;
  const printPrice = product.addOns?.customPrint?.price ?? DEFAULT_ADDON_PRICE;

  const qty = stored.quantity;
  const jerseyTotal = product.discountedPrice * qty;
  const uclTotal = uclActive ? uclPrice * qty : 0;
  const printTotal = printActive ? printPrice * qty : 0;
  const subtotal = jerseyTotal + uclTotal + printTotal;
  const deliveryCharge = DELIVERY[form.deliveryArea].charge;
  const total = subtotal + deliveryCharge;

  const printText = [stored.customName, stored.customNumber].filter(Boolean).join(" ");
  const outOfStock = product.stock !== undefined && product.stock <= 0;
  const image = product.images?.[0];

  // ── Submit ───────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.customerName.trim()) e.customerName = "Please enter your name";
    if (!BD_PHONE_REGEX.test(form.phone)) {
      e.phone = "Enter a valid 11-digit mobile number (01XXXXXXXXX)";
    }
    if (!form.address.trim()) e.address = "Please enter your full address";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !validate()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      // Only selections are sent. The server calculates every price.
      const order = await createOrder({
        customerName: form.customerName.trim(),
        phone: form.phone,
        address: form.address.trim(),
        deliveryArea: form.deliveryArea,
        items: [
          {
            productId: product._id,
            quantity: qty,
            size: stored.size,
            uclPatch: uclActive,
            customName: printActive ? stored.customName : null,
            customNumber: printActive ? stored.customNumber : null,
          },
        ],
      });

      try {
        localStorage.removeItem("order");
      } catch {
        /* ignore */
      }
      setPlaced(order);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message
          ? err.message
          : "Could not place your order. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Checkout</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid gap-8 lg:grid-cols-5">
        {/* LEFT: delivery info */}
        <div className="space-y-5 lg:col-span-3">
          <div className="space-y-5 rounded-2xl border border-border/60 bg-card p-5 md:p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <MapPin className="h-5 w-5 text-primary" /> Delivery Info
            </h2>

            <Field id="name" label="Full name" error={errors.customerName}>
              <input
                id="name"
                autoComplete="name"
                placeholder="Your name"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                aria-invalid={Boolean(errors.customerName)}
                className={inputClass(Boolean(errors.customerName))}
              />
            </Field>

            <Field id="phone" label="Mobile number" error={errors.phone}>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={11}
                placeholder="01XXXXXXXXX"
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })
                }
                aria-invalid={Boolean(errors.phone)}
                className={inputClass(Boolean(errors.phone))}
              />
            </Field>

            <Field id="address" label="Full address" error={errors.address}>
              <textarea
                id="address"
                rows={3}
                autoComplete="street-address"
                placeholder="House, road, area, thana, district"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                aria-invalid={Boolean(errors.address)}
                className={inputClass(Boolean(errors.address))}
              />
            </Field>

            {/* Delivery area */}
            <div>
              <span className="mb-1.5 block text-sm font-medium">Delivery area</span>
              <div role="radiogroup" aria-label="Delivery area" className="grid grid-cols-2 gap-3">
                {(Object.keys(DELIVERY) as DeliveryArea[]).map((key) => {
                  const active = form.deliveryArea === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setForm({ ...form, deliveryArea: key })}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      <span className="block text-sm font-semibold">
                        {DELIVERY[key].label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {DELIVERY[key].hint}
                      </span>
                      <span className="mt-1 block text-sm font-bold text-primary">
                        {money(DELIVERY[key].charge)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COD */}
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4">
            <Banknote className="h-6 w-6 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Cash on Delivery</p>
              <p className="text-sm text-muted-foreground">Pay after receiving your order</p>
            </div>
          </div>
        </div>

        {/* RIGHT: summary */}
        <div className="space-y-4 self-start rounded-2xl border border-border/60 bg-card p-5 md:p-6 lg:col-span-2 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold">Order Summary</h2>

          <div className="flex gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
              {image ? (
                <Image
                  src={image}
                  alt={product.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ShoppingBag className="h-6 w-6 opacity-40" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug">{product.name}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                {stored.size && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-medium">
                    Size {stored.size}
                  </span>
                )}
                <span className="rounded-full bg-secondary px-2 py-0.5 font-medium">
                  Qty {qty}
                </span>
                {uclActive && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    UCL patch
                  </span>
                )}
                {printActive && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    Print: {printText}
                  </span>
                )}
              </div>
              <Link
                href={`/product/${product._id}`}
                className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
              >
                Change
              </Link>
            </div>
          </div>

          <div className="space-y-2 border-t border-border/60 pt-4">
            <Line label={`Jersey × ${qty}`} value={jerseyTotal} />
            {uclActive && <Line label={`UCL patch × ${qty}`} value={uclTotal} />}
            {printActive && <Line label={`Name & number × ${qty}`} value={printTotal} />}
            <Line label="Subtotal" value={subtotal} />
            <Line label="Delivery" value={deliveryCharge} />
          </div>

          <div className="border-t border-border/60 pt-4">
            <Line label="Total" value={total} strong />
          </div>

          {outOfStock && (
            <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">
              This product is currently out of stock.
            </p>
          )}

          {submitError && (
            <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || outOfStock}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Placing order…
              </>
            ) : (
              <>Place Order · {money(total)}</>
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Final price is confirmed by our system when you place the order.
          </p>
        </div>
      </form>
    </div>
  );
}