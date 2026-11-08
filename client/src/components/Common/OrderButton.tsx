"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import {
  CheckCircle2,
  Check,
  Loader2,
  MapPin,
  Phone,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import QuantitySelector from "./QuantitySelector";
import SizeChart, { SIZE_CHART } from "./SizeChart";
import type { ProductAddOns } from "@/types/product";
import { createOrder, type DeliveryArea, type Order } from "@/services/api";
import { track, getMetaIds } from "@/lib/fbpixel";
import { useAbandonedCheckout } from "@/lib/useAbandonedCheckout";
import { useCart } from "@/lib/cart";

// Mirrors the backend default. The backend recalculates the real price.
const DEFAULT_ADDON_PRICE = 200;

// Same number as Navbar/Footer (international format, no "+")
const CONTACT_NUMBER = "8801894302115";

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

interface Props {
  productId: string;
  productName: string; // used in the WhatsApp message
  basePrice: number; // discounted jersey price
  image?: string | null; // first product image (shown in the cart)
  sizes?: string[]; // empty → no size selection needed
  addOns?: ProductAddOns;
  outOfStock?: boolean;
}

type Errors = {
  size?: string;
  print?: string;
  customerName?: string;
  phone?: string;
  address?: string;
};

const money = (n: number) => `৳${n.toLocaleString()}`;

const WhatsAppIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// Compact toggle card (two sit side by side)
function AddOn({
  title,
  description,
  price,
  checked,
  onToggle,
}: {
  title: string;
  description: string;
  price: number;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={`flex h-full flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors ${
        checked
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
            checked
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border"
          }`}
        >
          {checked && <Check className="h-3.5 w-3.5" />}
        </span>
        <span className="text-sm font-semibold leading-tight">{title}</span>
      </span>
      <span className="text-xs text-muted-foreground">{description}</span>
      <span className="mt-auto pt-1 text-sm font-semibold text-primary">
        +{money(price)}
      </span>
    </button>
  );
}

function Row({
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
        strong
          ? "border-t border-border/60 pt-2 text-base font-bold"
          : "text-muted-foreground"
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

// text-base on phone stops iOS from zooming into the field
const inputClass = (hasError: boolean) =>
  `w-full rounded-xl border bg-background px-3.5 py-3 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:text-sm ${
    hasError ? "border-red-500" : "border-border"
  }`;

export default function OrderButton({
  productId,
  productName,
  basePrice,
  image,
  sizes = [],
  addOns,
  outOfStock = false,
}: Props) {
  const uid = useId();
  const { addItem, count: cartCount } = useCart();

  // wraps both the form and the success card (used to scroll after ordering)
  const rootRef = useRef<HTMLDivElement>(null);
  // makes AddToCart / InitiateCheckout fire only once per visit
  const startedRef = useRef(false);
  // AddToCart already sent by the "Add to Cart" button
  const cartTrackedRef = useRef(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState<string | null>(null);
  const [uclPatch, setUclPatch] = useState(false);
  const [printOn, setPrintOn] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customNumber, setCustomNumber] = useState("");

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    address: "",
    deliveryArea: "dhaka" as DeliveryArea,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [placed, setPlaced] = useState<Order | null>(null);
  const [cartMsg, setCartMsg] = useState<"" | "added" | "full">("");

  const needsSize = sizes.length > 0;
  const uclAvailable = addOns?.uclPatch?.enabled === true;
  const printAvailable = addOns?.customPrint?.enabled === true;
  const uclPrice = addOns?.uclPatch?.price ?? DEFAULT_ADDON_PRICE;
  const printPrice = addOns?.customPrint?.price ?? DEFAULT_ADDON_PRICE;

  const uclActive = uclAvailable && uclPatch;
  const printActive = printAvailable && printOn;

  const unitPrice =
    basePrice + (uclActive ? uclPrice : 0) + (printActive ? printPrice : 0);
  const subtotal = unitPrice * quantity;
  const deliveryCharge = DELIVERY[form.deliveryArea].charge;
  const total = subtotal + deliveryCharge;

  const chartRow = SIZE_CHART.find((r) => r.size === size);

  // Save typed details (once a valid phone is entered) for follow-up
  useAbandonedCheckout({
    enabled: !placed && !outOfStock,
    form,
    productId,
    productName,
    size,
    quantity,
  });

  // WhatsApp message reflects the current selection
  const printText = [customName.trim(), customNumber.trim()]
    .filter(Boolean)
    .join(" ");
  const waMessage = [
    `Hi! I want to order: ${productName}`,
    size && `Size: ${size}`,
    `Quantity: ${quantity}`,
    uclActive && "UCL patch: Yes",
    printActive && printText && `Name & number: ${printText}`,
    `Total: ${money(subtotal)} (+ delivery)`,
  ]
    .filter(Boolean)
    .join("\n");
  const whatsappHref = `https://wa.me/${CONTACT_NUMBER}?text=${encodeURIComponent(waMessage)}`;
  const callHref = `tel:+${CONTACT_NUMBER}`;

  const pixelData = () => ({
    content_ids: [productId],
    content_name: productName,
    content_type: "product",
    value: subtotal,
    currency: "BDT",
    num_items: quantity,
  });

  // Fires once, when the customer starts filling in the delivery details
  const handleFormStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (!cartTrackedRef.current) track("AddToCart", pixelData());
    track("InitiateCheckout", pixelData());
  };

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.focus({ preventScroll: true });
    }
  };

  // includeDelivery=false → only check the product selection (for Add to Cart)
  const validate = (includeDelivery: boolean): boolean => {
    const e: Errors = {};
    let firstId = "";
    const fail = (key: keyof Errors, msg: string, id: string) => {
      e[key] = msg;
      if (!firstId) firstId = id;
    };

    if (needsSize && !size) fail("size", "Please select a size", `${uid}-size`);
    if (printActive && !customName.trim() && !customNumber.trim()) {
      fail("print", "Enter a name or number to print", `${uid}-print`);
    }

    if (includeDelivery) {
      if (!form.customerName.trim()) {
        fail("customerName", "Please enter your name", `${uid}-cname`);
      }
      if (!BD_PHONE_REGEX.test(form.phone)) {
        fail("phone", "Enter a valid 11-digit mobile number (01XXXXXXXXX)", `${uid}-phone`);
      }
      if (!form.address.trim()) {
        fail("address", "Please enter your full address", `${uid}-address`);
      }
    }

    setErrors(e);
    if (firstId) scrollToId(firstId);
    return Object.keys(e).length === 0;
  };

  const handleAddToCart = () => {
    if (outOfStock || !validate(false)) return;

    const result = addItem({
      productId,
      name: productName,
      image: image ?? null,
      size,
      quantity,
      uclPatch: uclActive,
      customName: printActive ? customName.trim() || null : null,
      customNumber: printActive ? customNumber.trim() || null : null,
      basePrice,
      uclPrice,
      printPrice,
    });

    if (addedTimer.current) clearTimeout(addedTimer.current);

    if (result === "full") {
      setCartMsg("full");
      return;
    }

    track("AddToCart", pixelData());
    cartTrackedRef.current = true;
    setCartMsg("added");
    addedTimer.current = setTimeout(() => setCartMsg(""), 8000);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitting || outOfStock || !validate(true)) return;

    const name = printActive ? customName.trim() : "";
    const number = printActive ? customNumber.trim() : "";

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
            productId,
            quantity,
            size,
            uclPatch: uclActive,
            customName: name || null,
            customNumber: number || null,
          },
        ],
        meta: getMetaIds(),
      });

      setPlaced(order);

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

      requestAnimationFrame(() =>
        rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
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

  return (
    <div ref={rootRef} className="scroll-mt-24">
      {placed ? (
        /* ── Success ── */
        <div className="space-y-4 rounded-2xl border border-green-600/30 bg-green-50 p-6 text-center dark:bg-green-950/20">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold">Order placed!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Order #{placed._id.slice(-6).toUpperCase()}
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Thank you! We will call you shortly to confirm your order.
          </p>

          <div className="space-y-1 rounded-xl bg-background/70 p-4 text-left text-sm">
            <Row label="Delivery" value={placed.deliveryCharge} />
            <Row
              label="Total to pay (Cash on Delivery)"
              value={placed.totalPrice}
              strong
            />
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <Link
              href="/track-order"
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Track Your Order
            </Link>
            <Link
              href="/"
              className="flex h-12 flex-1 items-center justify-center rounded-xl border border-border bg-background font-semibold hover:bg-secondary"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      ) : (
        /* ── Order form ── */
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Size */}
          {needsSize && (
            <div id={`${uid}-size`} className="scroll-mt-24">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Size</span>
                <SizeChart selectedSize={size} />
              </div>

              <div
                role="radiogroup"
                aria-label="Select size"
                className="flex flex-wrap gap-2"
              >
                {sizes.map((s) => {
                  const active = size === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setSize(s);
                        setErrors((e) => ({ ...e, size: undefined }));
                      }}
                      className={`h-9 min-w-11 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>

              {chartRow && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Size {chartRow.size}: Chest {chartRow.chest} in · Length{" "}
                  {chartRow.length} in{" "}
                  <span className="text-xs">(1–2 in variation)</span>
                </p>
              )}

              {errors.size && (
                <p role="alert" className="mt-2 text-sm text-red-600">
                  {errors.size}
                </p>
              )}
            </div>
          )}

          {/* Add-ons: UCL patch + Name & Number side by side */}
          {(uclAvailable || printAvailable) && (
            <div id={`${uid}-print`} className="scroll-mt-24 space-y-2">
              <span className="block text-sm font-semibold">
                Customize{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </span>

              <div
                className={`grid gap-2 ${
                  uclAvailable && printAvailable ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {uclAvailable && (
                  <AddOn
                    title="UCL Patch"
                    description="Champions League sleeve patch"
                    price={uclPrice}
                    checked={uclPatch}
                    onToggle={() => setUclPatch((v) => !v)}
                  />
                )}

                {printAvailable && (
                  <AddOn
                    title="Name & Number"
                    description="Print on the back"
                    price={printPrice}
                    checked={printOn}
                    onToggle={() => {
                      setPrintOn((v) => !v);
                      setErrors((e) => ({ ...e, print: undefined }));
                    }}
                  />
                )}
              </div>

              {printActive && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <div className="grid grid-cols-[1fr_5.5rem] gap-3">
                    <div>
                      <label
                        htmlFor={`${uid}-name`}
                        className="mb-1 block text-xs font-medium text-muted-foreground"
                      >
                        Name (max 12 letters)
                      </label>
                      <input
                        id={`${uid}-name`}
                        value={customName}
                        maxLength={12}
                        autoComplete="off"
                        placeholder="MESSI"
                        onChange={(e) =>
                          setCustomName(
                            e.target.value
                              .toUpperCase()
                              .replace(/[^A-Z .'-]/g, "")
                              .slice(0, 12),
                          )
                        }
                        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${uid}-number`}
                        className="mb-1 block text-xs font-medium text-muted-foreground"
                      >
                        Number
                      </label>
                      <input
                        id={`${uid}-number`}
                        value={customNumber}
                        inputMode="numeric"
                        maxLength={2}
                        autoComplete="off"
                        placeholder="10"
                        onChange={(e) =>
                          setCustomNumber(e.target.value.replace(/\D/g, "").slice(0, 2))
                        }
                        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:text-sm"
                      />
                    </div>
                  </div>

                  {quantity > 1 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      The same name and number will be printed on all {quantity}{" "}
                      jerseys.
                    </p>
                  )}

                  {errors.print && (
                    <p role="alert" className="mt-2 text-sm text-red-600">
                      {errors.print}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Contact + Quantity + Add to Cart (one row) */}
          <div>
            <span className="mb-2 block text-sm font-semibold">Quantity</span>

            <div className="flex flex-wrap items-center gap-2">
              <QuantitySelector quantity={quantity} setQuantity={setQuantity} />

              {/* WhatsApp (wide) + Call */}
              <div className="flex min-w-0 flex-1 basis-24 items-center gap-2">
                <a
                  href={whatsappHref}
                  onClick={() => track("Contact", { content_name: productName })}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Order on WhatsApp"
                  title="WhatsApp"
                  className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-green-600/40 px-3 text-sm font-semibold text-green-600 transition-colors hover:bg-green-50"
                >
                  <WhatsAppIcon className="h-5 w-5 shrink-0" />
                  <span className="hidden truncate sm:inline">WhatsApp</span>
                </a>

                <a
                  href={callHref}
                  onClick={() => track("Contact", { content_name: productName })}
                  aria-label="Call us"
                  title="Call"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-secondary"
                >
                  <Phone className="h-5 w-5" />
                </a>
              </div>

              {/* Add to cart (right side) */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={outOfStock}
                className="ml-auto flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border-2 border-primary px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShoppingCart size={16} />
                Add to Cart
              </button>
            </div>

            {cartMsg === "added" && (
              <div
                role="status"
                className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/20"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Added to cart ({cartCount} {cartCount === 1 ? "item" : "items"})
                </span>
                <Link href="/cart" className="shrink-0 font-semibold underline">
                  View cart
                </Link>
              </div>
            )}

            {cartMsg === "full" && (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600"
              >
                Your cart is full. Please place this order first, then add more.
              </p>
            )}
          </div>

          {/* Delivery info (single-page checkout) */}
          <div
            onFocusCapture={handleFormStart}
            className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 md:p-5"
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-5 w-5 text-primary" /> Delivery Info
            </h2>

            <Field id={`${uid}-cname`} label="Full name" error={errors.customerName}>
              <input
                id={`${uid}-cname`}
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

            {/* Delivery area */}
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

          {/* Price summary */}
          <div className="space-y-1.5 rounded-xl bg-secondary/60 p-4 text-sm">
            <Row label={`Jersey × ${quantity}`} value={basePrice * quantity} />
            {uclActive && (
              <Row label={`UCL patch × ${quantity}`} value={uclPrice * quantity} />
            )}
            {printActive && (
              <Row
                label={`Name & number × ${quantity}`}
                value={printPrice * quantity}
              />
            )}
            <Row label="Delivery" value={deliveryCharge} />
            <Row label="Total (Cash on Delivery)" value={total} strong />
          </div>

          {/* Place order */}
          <div className="space-y-3">
            {submitError && (
              <p
                role="alert"
                className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600"
              >
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || outOfStock}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {outOfStock ? (
                "Out of Stock"
              ) : submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Placing order…
                </>
              ) : (
                <>
                  <ShoppingBag size={18} /> Place Order · {money(total)}
                </>
              )}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Ordering more than one jersey? Tap Add to Cart for each, then check
              out together.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}