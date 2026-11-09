"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState } from "react";
import {
  Check,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Search,
  ShoppingBag,
  Truck,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const WHATSAPP_NUMBER = "8801894302115";
const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

const STATUS_STEPS = ["Pending", "Confirmed", "Shipped", "Delivered"] as const;
type Status = (typeof STATUS_STEPS)[number];

const STATUS_INFO: Record<
  Status,
  { icon: typeof Clock; badge: string; message: string }
> = {
  Pending: {
    icon: Clock,
    badge: "bg-yellow-100 text-yellow-700",
    message: "We received your order. We will call you shortly to confirm it.",
  },
  Confirmed: {
    icon: CheckCircle,
    badge: "bg-blue-100 text-blue-700",
    message: "Your order is confirmed and is being prepared.",
  },
  Shipped: {
    icon: Truck,
    badge: "bg-orange-100 text-orange-700",
    message: "Your order is on its way to you.",
  },
  Delivered: {
    icon: Package,
    badge: "bg-green-100 text-green-700",
    message: "Delivered. Thank you for shopping with us!",
  },
};

type OrderItem = {
  name: string;
  image?: string | null;
  size?: string | null;
  quantity: number;
  price: number; // final price per unit
  uclPatch?: boolean;
  customName?: string | null;
  customNumber?: string | null;
};

type Order = {
  _id: string;
  customerName: string;
  phone: string;
  address: string;
  size?: string | null; // legacy: old orders kept one size here
  items: OrderItem[];
  totalPrice: number;
  deliveryCharge: number;
  status: Status;
  createdAt: string;
};

const money = (n: number) => `৳${(n ?? 0).toLocaleString()}`;
const shortId = (o: Order) => o._id.slice(-6).toUpperCase();
const printText = (i: OrderItem) =>
  [i.customName, i.customNumber].filter(Boolean).join(" ");

function Chip({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        accent ? "bg-primary/10 text-primary" : "bg-secondary text-foreground"
      }`}
    >
      {children}
    </span>
  );
}

function Stepper({ status }: { status: Status }) {
  const current = Math.max(0, STATUS_STEPS.indexOf(status));

  return (
    <ol className="flex" aria-label="Order progress">
      {STATUS_STEPS.map((step, idx) => {
        const done = idx < current;
        const active = idx === current;
        const reached = idx <= current;
        const Icon = STATUS_INFO[step].icon;

        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className="relative flex flex-1 flex-col items-center"
          >
            {/* connector to the previous step */}
            {idx !== 0 && (
              <div
                className={`absolute left-[-50%] top-4 h-0.5 w-full ${
                  reached ? "bg-primary" : "bg-border"
                }`}
              />
            )}

            <div
              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                reached
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              } ${active ? "ring-4 ring-primary/20" : ""}`}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>

            <span
              className={`mt-2 text-xs ${
                reached ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function OrderCard({ order }: { order: Order }) {
  const info = STATUS_INFO[order.status] ?? STATUS_INFO.Pending;
  const subtotal = order.totalPrice - order.deliveryCharge;
  const helpMessage = `Hi! I need help with my order #${shortId(order)} (${order.customerName}).`;

  return (
    <article className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      {/* Top */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Order #{shortId(order)}
          </p>
          <h2 className="mt-0.5 text-lg font-semibold">{order.customerName}</h2>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {order.address}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${info.badge}`}>
          {order.status}
        </span>
      </div>

      {/* Progress */}
      <div className="space-y-4 p-5">
        <Stepper status={order.status} />
        <p className="rounded-xl bg-secondary/60 px-4 py-3 text-center text-sm text-muted-foreground">
          {info.message}
        </p>
      </div>

      {/* Items */}
      <div className="space-y-4 border-t border-border/60 p-5">
        {order.items.map((item, i) => {
          const size = item.size ?? order.size ?? null;
          const print = printText(item);
          return (
            <div key={i} className="flex gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <ShoppingBag className="h-5 w-5 opacity-40" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{item.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {size && <Chip>Size {size}</Chip>}
                  <Chip>Qty {item.quantity}</Chip>
                  {item.uclPatch && <Chip accent>UCL patch</Chip>}
                  {print && <Chip accent>Print: {print}</Chip>}
                </div>
              </div>

              <p className="shrink-0 text-sm font-semibold">
                {money(item.price * item.quantity)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="space-y-1.5 border-t border-border/60 bg-secondary/30 p-5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{money(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Delivery</span>
          <span>{money(order.deliveryCharge)}</span>
        </div>
        <div className="flex justify-between pt-1 text-base font-bold">
          <span>Total · Cash on Delivery</span>
          <span className="text-primary">{money(order.totalPrice)}</span>
        </div>

        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(helpMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 hover:underline"
        >
          <MessageCircle className="h-4 w-4" /> Need help with this order?
        </a>
      </div>
    </article>
  );
}

function OrderSkeleton() {
  return (
    <div className="animate-pulse space-y-5 rounded-2xl border border-border/60 bg-card p-5">
      <div className="h-5 w-40 rounded bg-secondary" />
      <div className="h-9 w-full rounded bg-secondary" />
      <div className="h-16 w-full rounded bg-secondary" />
    </div>
  );
}

export default function TrackOrderPage() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchedPhone, setSearchedPhone] = useState("");
  const [error, setError] = useState("");

  const handleTrack = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;

    if (!BD_PHONE_REGEX.test(phone)) {
      setError("Enter a valid 11-digit mobile number (01XXXXXXXXX)");
      return;
    }

    setError("");
    setLoading(true);
    setSearched(false);

    try {
      const res = await fetch(`${BASE_URL}/orders/track/${phone}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Could not load your orders. Please try again.");
      }

      setOrders(Array.isArray(data) ? data : []);
      setSearchedPhone(phone);
      setSearched(true);
    } catch (err) {
      setOrders([]);
      setSearched(false);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-secondary/50 to-background px-4 py-10 md:py-14">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">Track Your Order</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the phone number you used to order and see where your jersey is.
          </p>
        </div>

        {/* Search */}
        <form
          onSubmit={handleTrack}
          noValidate
          className="mb-8 rounded-2xl border border-border/60 bg-card p-4 shadow-sm md:p-5"
        >
          <label htmlFor="track-phone" className="sr-only">
            Mobile number
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="track-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={11}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 11));
                  setError("");
                }}
                placeholder="01XXXXXXXXX"
                aria-invalid={Boolean(error)}
                className={`h-12 w-full rounded-xl border bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary ${
                  error ? "border-red-500" : "border-border"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Tracking…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" /> Track
                </>
              )}
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </form>

        {/* Loading */}
        {loading && (
          <div className="space-y-5">
            <OrderSkeleton />
          </div>
        )}

        {/* Results */}
        {!loading && searched &&
          (orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold">No orders found for {searchedPhone}</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                Check the number and try again, or place a new order.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Continue shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                {orders.length} {orders.length === 1 ? "order" : "orders"} found for{" "}
                <span className="font-semibold text-foreground">{searchedPhone}</span>
              </p>
              {orders.map((order) => (
                <OrderCard key={order._id} order={order} />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}