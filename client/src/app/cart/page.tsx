"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { createOrder, type DeliveryArea, type Order } from "@/services/api";
import { track, getMetaIds } from "@/lib/fbpixel";
import { useAbandonedCheckout } from "@/lib/useAbandonedCheckout";
import { MAX_QTY, hasPrint, lineTotal, useCart } from "@/lib/cart";
import { sizeExtra } from "@/lib/sizes";

const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

// "+8801712345678" / "8801712345678" / "01712345678" -> "01712345678"
const normalizePhone = (v: string) => {
  let d = v.replace(/\D/g, "");
  if (d.startsWith("880")) d = d.slice(2);
  return d.slice(0, 11);
};

// Display only. The server recalculates the real prices.
const DELIVERY: Record<DeliveryArea, { label: string; hint: string; charge: number }> = {
  dhaka: { label: "Inside Dhaka", hint: "Dhaka city", charge: 70 },
  outside: { label: "Outside Dhaka", hint: "All over Bangladesh", charge: 130 },
};

type FormErrors = { customerName?: string; phone?: string; address?: string };

const money = (n: number) => `৳${n.toLocaleString()}`;

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
        <p role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = (hasError: boolean) =>
  `w-full rounded-xl border bg-background px-3.5 py-3 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:text-sm ${
    hasError ? "border-red-500" : "border-border"
  }`;

export default function CartPage() {
  const uid = useId();
  const startedRef = useRef(false);
  const { lines, ready, updateQty, remove, clear } = useCart();

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
  const [placedPreorder, setPlacedPreorder] = useState(false);

  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const deliveryCharge = DELIVERY[form.deliveryArea].charge;
  const total = subtotal + deliveryCharge;

  // The cart never mixes pre-order and in-stock jerseys
  const isPreorder = lines.length > 0 && lines[0].preorder;
  const preorderNote = lines.find((l) => l.preorderNote)?.preorderNote ?? "";

  // One-line summary of the whole cart for the "abandoned checkout" list
  const summary = lines
    .map((l) => `${l.name}${l.size ? ` (${l.size})` : ""} x${l.quantity}`)
    .join(", ")
    .slice(0, 190);

  useAbandonedCheckout({
    enabled: ready && lines.length > 0 && !placed,
    form,
    productId: lines[0]?.productId,
    productName: isPreorder ? `[Pre-order] ${summary}`.slice(0, 190) : summary,
    size: null,
    quantity: totalQty,
  });

  const pixelData = () => ({
    content_ids: lines.map((l) => l.productId),
    content_type: "product",
    value: subtotal,
    currency: "BDT",
    num_items: totalQty,
  });

  // InitiateCheckout once, when the customer starts typing their details
  const handleFormStart = () => {
    if (startedRef.current || lines.length === 0) return;
    startedRef.current = true;
    track("InitiateCheckout", pixelData());
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    let firstId = "";
    if (!form.customerName.trim()) {
      e.customerName = "Please enter your name";
      firstId ||= `${uid}-name`;
    }
    if (!BD_PHONE_REGEX.test(form.phone)) {
      e.phone = "Enter a valid 11-digit mobile number (01XXXXXXXXX)";
      firstId ||= `${uid}-phone`;
    }
    if (!form.address.trim()) {
      e.address = "Please enter your full address";
      firstId ||= `${uid}-address`;
    }
    setErrors(e);
    if (firstId) {
      const el = document.getElementById(firstId);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLInputElement | null)?.focus({ preventScroll: true });
    }
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitting || lines.length === 0 || !validate()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      // Only selections are sent. The server calculates every price.
      const order = await createOrder({
        customerName: form.customerName.trim(),
        phone: form.phone,
        address: form.address.trim(),
        deliveryArea: form.deliveryArea,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          size: l.size,
          uclPatch: l.uclPatch,
          customName: l.customName,
          customNumber: l.customNumber,
        })),
        meta: getMetaIds(),
      });

      setPlacedPreorder(isPreorder);
      setPlaced(order);
      clear();

      track(
        "Purchase",
        {
          value: order.totalPrice,
          currency: "BDT",
          content_ids: order.items.map((i) => i.productId),
          content_type: "product",
          num_items: order.items.reduce((sum, i) => sum + i.quantity, 0),
        },
        order._id, // same id the server sends → Meta de-duplicates
      );

      window.scrollTo({ top: 0 });
    } catch (err) {
      console.error("Create order error:", err);
      setSubmitError(
        err instanceof Error && err.message
          ? err.message
          : "Could not place your order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your cart…
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
            <h1 className="text-2xl font-bold">
              {placedPreorder ? "Pre-order placed!" : "Order placed!"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Order #{placed._id.slice(-6).toUpperCase()} ·{" "}
              {placed.items.reduce((s, i) => s + i.quantity, 0)} items
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            {placedPreorder
              ? "Thank you! We will call you shortly to confirm your pre-order."
              : "Thank you! We will call you shortly to confirm your order."}
          </p>

          <div className="space-y-1 rounded-xl bg-secondary/60 p-4 text-left">
            <Line label="Delivery" value={placed.deliveryCharge} />
            <Line
              label="Total to pay (Cash on Delivery)"
              value={placed.totalPrice}
              strong
            />
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <Link
              href="/track-order"
              className="flex h-12 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Track Your Order
            </Link>
            <Link
              href="/"
              className="flex h-12 items-center justify-center rounded-xl border border-border font-semibold hover:bg-secondary"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty cart ───────────────────────────────────────────────────────────
  if (lines.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h1 className="text-xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a jersey and press Add to Cart.
        </p>
        <Link
          href="/"
          className="mt-6 flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  // ── Cart + checkout ──────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold md:text-3xl">
        Your Cart{" "}
        <span className="text-base font-medium text-muted-foreground">
          ({totalQty} {totalQty === 1 ? "item" : "items"})
        </span>
      </h1>

      {isPreorder && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-semibold text-amber-700">
              Pre-order{preorderNote ? ` · ${preorderNote}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              These jerseys are not in stock yet. We will call you to confirm, and
              deliver after they arrive. In-stock jerseys must be ordered separately.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="grid gap-8 lg:grid-cols-5">
        {/* LEFT: items + delivery info */}
        <div className="space-y-5 lg:col-span-3">
          {/* Items */}
          <ul className="space-y-3">
            {lines.map((l) => (
              <li
                key={l.key}
                className="flex gap-4 rounded-2xl border border-border/60 bg-card p-3 md:p-4"
              >
                <Link
                  href={`/product/${l.productId}`}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-secondary"
                >
                  {l.image ? (
                    <Image
                      src={l.image}
                      alt={l.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ShoppingBag className="h-6 w-6 opacity-40" />
                    </div>
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/product/${l.productId}`}
                      className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary md:text-base"
                    >
                      {l.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(l.key)}
                      aria-label={`Remove ${l.name}`}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                    {l.preorder && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-700">
                        Pre-order
                      </span>
                    )}
                    {l.size && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 font-medium">
                        Size {l.size}
                      </span>
                    )}
                    {l.uclPatch && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                        UCL patch
                      </span>
                    )}
                    {hasPrint(l) && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                        Print: {[l.customName, l.customNumber].filter(Boolean).join(" ")}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => updateQty(l.key, l.quantity - 1)}
                        disabled={l.quantity <= 1}
                        aria-label="Decrease quantity"
                        className="flex h-9 w-9 items-center justify-center rounded-l-xl hover:bg-secondary disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">
                        {l.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(l.key, l.quantity + 1)}
                        disabled={l.quantity >= MAX_QTY}
                        aria-label="Increase quantity"
                        className="flex h-9 w-9 items-center justify-center rounded-r-xl hover:bg-secondary disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <span className="font-bold text-primary">{money(lineTotal(l))}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Link
            href="/"
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            + Add more jerseys
          </Link>

          {/* Delivery info */}
          <div
            onFocusCapture={handleFormStart}
            className="space-y-5 rounded-2xl border border-border/60 bg-card p-5 md:p-6"
          >
            <h2 className="flex items-center gap-2 font-semibold">
              <MapPin className="h-5 w-5 text-primary" /> Delivery Info
            </h2>

            <Field id={`${uid}-name`} label="Full name" error={errors.customerName}>
              <input
                id={`${uid}-name`}
                autoComplete="name"
                placeholder="Your name"
                value={form.customerName}
                onChange={(e) => {
                  setForm({ ...form, customerName: e.target.value });
                  setErrors((x) => ({ ...x, customerName: undefined }));
                }}
                aria-invalid={Boolean(errors.customerName)}
                className={inputClass(Boolean(errors.customerName))}
              />
            </Field>

            <Field id={`${uid}-phone`} label="Mobile number" error={errors.phone}>
              <input
                id={`${uid}-phone`}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="01XXXXXXXXX"
                value={form.phone}
                onChange={(e) => {
                  setForm({ ...form, phone: normalizePhone(e.target.value) });
                  setErrors((x) => ({ ...x, phone: undefined }));
                }}
                aria-invalid={Boolean(errors.phone)}
                className={inputClass(Boolean(errors.phone))}
              />
            </Field>

            <Field id={`${uid}-address`} label="Full address" error={errors.address}>
              <textarea
                id={`${uid}-address`}
                rows={3}
                autoComplete="street-address"
                placeholder="House, road, area, thana, district"
                value={form.address}
                onChange={(e) => {
                  setForm({ ...form, address: e.target.value });
                  setErrors((x) => ({ ...x, address: undefined }));
                }}
                aria-invalid={Boolean(errors.address)}
                className={inputClass(Boolean(errors.address))}
              />
            </Field>

            <div>
              <span className="mb-1.5 block text-sm font-medium">Delivery area</span>
              <div
                role="radiogroup"
                aria-label="Delivery area"
                className="grid grid-cols-2 gap-3"
              >
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
        </div>

        {/* RIGHT: summary */}
        <div className="space-y-4 self-start rounded-2xl border border-border/60 bg-card p-5 md:p-6 lg:col-span-2 lg:sticky lg:top-28">
          <h2 className="text-lg font-semibold">Order Summary</h2>

          {/* Each item with its own breakdown */}
          <ul className="space-y-3">
            {lines.map((l) => {
              const printText = [l.customName, l.customNumber]
                .filter(Boolean)
                .join(" ");
              return (
                <li key={l.key} className="rounded-xl bg-secondary/50 p-3 text-sm">
                  <p className="font-semibold leading-snug">
                    {l.name}
                    {l.size && (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · Size {l.size}
                      </span>
                    )}
                  </p>
                  <div className="mt-2 space-y-1">
                    <Line label={`Jersey × ${l.quantity}`} value={l.basePrice * l.quantity} />
                    {sizeExtra(l.size) > 0 && (
                      <Line
                        label={`Size ${l.size} extra × ${l.quantity}`}
                        value={sizeExtra(l.size) * l.quantity}
                      />
                    )}
                    {l.uclPatch && (
                      <Line
                        label={`UCL patch × ${l.quantity}`}
                        value={l.uclPrice * l.quantity}
                      />
                    )}
                    {hasPrint(l) && (
                      <Line
                        label={`Print "${printText}" × ${l.quantity}`}
                        value={l.printPrice * l.quantity}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="space-y-2 border-t border-border/60 pt-4">
            <Line
              label={`Subtotal (${totalQty} ${totalQty === 1 ? "item" : "items"})`}
              value={subtotal}
            />
            <Line label="Delivery" value={deliveryCharge} />
          </div>

          <div className="border-t border-border/60 pt-4">
            <Line label="Total (Cash on Delivery)" value={total} strong />
          </div>

          {submitError && (
            <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Placing order…
              </>
            ) : (
              <>
                {isPreorder ? "Place Pre-order" : "Place Order"} · {money(total)}
              </>
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Delivery charge is added once for the whole order. Final price is
            confirmed by our system when you place the order.
          </p>
        </div>
      </form>
    </div>
  );
}