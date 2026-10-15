"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, X } from "lucide-react";
import Image from "next/image";

const STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered"] as const;
type Status = (typeof STATUSES)[number];

type OrderItem = {
  productId: string;
  name: string;
  image?: string | null;
  size?: string | null;
  quantity: number;
  basePrice?: number; // jersey price per unit
  uclPatch?: boolean;
  customName?: string | null;
  customNumber?: string | null;
  addOnsPrice?: number; // add-ons per unit
  price: number; // final price per unit
};

type Order = {
  _id: string;
  customerName: string;
  phone: string;
  address: string;
  size?: string | null; // legacy: old orders stored size here
  items: OrderItem[];
  deliveryArea?: "dhaka" | "outside";
  totalPrice: number; // items + delivery
  deliveryCharge: number;
  status: Status;
  createdAt: string;
};

type Product = { _id: string; images: string[] };

const STATUS_STYLE: Record<string, string> = {
  Pending: "text-yellow-600",
  Confirmed: "text-green-600",
  Shipped: "text-orange-600",
  Delivered: "text-blue-600",
};

const money = (n: number) => `৳${n.toLocaleString()}`;

// New orders have deliveryArea; old ones are guessed from the charge
const isDhaka = (o: Order) =>
  o.deliveryArea ? o.deliveryArea === "dhaka" : o.deliveryCharge <= 60;

const itemSize = (item: OrderItem, order: Order) => item.size ?? order.size ?? null;
const printText = (item: OrderItem) =>
  [item.customName, item.customNumber].filter(Boolean).join(" ");

function Chip({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "gray" | "orange" | "blue";
}) {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    orange: "bg-orange-100 text-orange-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

// Everything the person making the jersey needs to see
function ItemTags({ item, order }: { item: OrderItem; order: Order }) {
  const size = itemSize(item, order);
  const print = printText(item);
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {size && <Chip>Size {size}</Chip>}
      <Chip>Qty {item.quantity}</Chip>
      {item.uclPatch && <Chip tone="blue">UCL patch</Chip>}
      {print && <Chip tone="orange">Print: {print}</Chip>}
    </div>
  );
}

export default function OrdersPage() {
  const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const showToast = (text: string, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [orderRes, productRes] = await Promise.all([
        fetch(`${BASE_URL}/orders?limit=200`),
        fetch(`${BASE_URL}/products?limit=100`),
      ]);
      if (!orderRes.ok) throw new Error("Failed to load orders");

      const orderData = await orderRes.json();
      const list: Order[] = Array.isArray(orderData) ? orderData : (orderData?.data ?? []);
      setOrders(list);
      setTotal(orderData?.total ?? list.length);

      // only used for old orders that have no image saved
      if (productRes.ok) {
        const productData = await productRes.json();
        setProducts(Array.isArray(productData?.data) ? productData.data : []);
      }
    } catch (err) {
      console.error(err);
      setError("Could not load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [BASE_URL]);

  useEffect(() => {
     
    load();
  }, [load]);

  // close modal with Esc
  useEffect(() => {
    if (!selectedOrder) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedOrder(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedOrder]);

  const getImage = (item: OrderItem) =>
    item.image || products.find((p) => p._id === item.productId)?.images?.[0] || "/placeholder.jpg";

  const handleStatusChange = async (orderId: string, status: Status) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");

      const updated: Order = await res.json();
      setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
      setSelectedOrder((cur) => (cur?._id === updated._id ? updated : cur));
      showToast(`Order marked ${status}`);
    } catch (err) {
      console.error(err);
      showToast("Failed to update order status", false);
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: orders.length };
    STATUSES.forEach((s) => (c[s] = orders.filter((o) => o.status === s).length));
    return c;
  }, [orders]);

  const visible = useMemo(
    () =>
      [...orders]
        .filter((o) => filter === "All" || o.status === filter)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders, filter]
  );

  return (
    <div className="p-6">
      {/* Header */}
      <h2 className="mb-1 text-2xl font-semibold">Orders</h2>
      <p className="mb-5 text-gray-500">
        {total} total orders
        {total > orders.length && ` (showing latest ${orders.length})`}
      </p>

      {/* Status filter */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(["All", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === s
                ? "border-orange-500 bg-orange-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s} <span className="opacity-70">({counts[s] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* States */}
      {loading && <p className="text-gray-400">Loading orders…</p>}

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
          <button onClick={load} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <p className="text-gray-400">No orders found.</p>
      )}

      {/* Orders list */}
      <div className="space-y-4">
        {visible.map((order) => (
          <div
            key={order._id}
            className="flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
          >
            {/* Left */}
            <div className="min-w-0 space-y-1">
              <h3 className="font-semibold">{order.customerName}</h3>
              <p className="text-sm text-gray-500">{order.phone}</p>
              <p className="text-sm text-gray-500">{order.address}</p>

              {/* What to make */}
              <div className="space-y-2 pt-1">
                {order.items.map((item, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <ItemTags item={item} order={order} />
                  </div>
                ))}
              </div>

              <p className="pt-1 text-sm text-gray-400">
                {new Date(order.createdAt).toLocaleDateString()} •{" "}
                <span
                  className={`font-semibold ${isDhaka(order) ? "text-green-600" : "text-red-500"}`}
                >
                  {isDhaka(order) ? "Dhaka" : "Outside Dhaka"}
                </span>
              </p>
            </div>

            {/* Right */}
            <div className="flex shrink-0 items-center gap-4">
              <p className="text-lg font-semibold text-orange-500">{money(order.totalPrice)}</p>

              <select
                value={order.status}
                disabled={updatingId === order._id}
                onChange={(e) => handleStatusChange(order._id, e.target.value as Status)}
                className={`rounded-lg border bg-gray-50 px-3 py-1 text-sm disabled:opacity-50 ${
                  STATUS_STYLE[order.status] ?? "text-gray-600"
                }`}
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>

              <button
                onClick={() => setSelectedOrder(order)}
                aria-label="View order details"
                className="rounded-lg border p-2 hover:bg-gray-100"
              >
                <Eye size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setSelectedOrder(null)}
        >
          <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6">
            <button
              onClick={() => setSelectedOrder(null)}
              aria-label="Close"
              className="absolute right-4 top-4 text-gray-500 hover:text-red-500"
            >
              <X />
            </button>

            <h2 className="mb-1 text-xl font-semibold">Order Details</h2>
            <p className="mb-4 text-xs text-gray-400">
              #{selectedOrder._id.slice(-6).toUpperCase()} •{" "}
              {new Date(selectedOrder.createdAt).toLocaleString()}
            </p>

            {/* Info grid */}
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded bg-gray-100 p-3">
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-semibold">{selectedOrder.customerName}</p>
              </div>
              <div className="rounded bg-gray-100 p-3">
                <p className="text-sm text-gray-500">Phone</p>
                <a href={`tel:${selectedOrder.phone}`} className="font-semibold text-orange-600">
                  {selectedOrder.phone}
                </a>
              </div>
              <div className="col-span-2 rounded bg-gray-100 p-3">
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-semibold">{selectedOrder.address}</p>
              </div>
              <div className="rounded bg-gray-100 p-3">
                <p className="text-sm text-gray-500">Area</p>
                <p
                  className={`font-semibold ${
                    isDhaka(selectedOrder) ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {isDhaka(selectedOrder) ? "Dhaka" : "Outside Dhaka"}
                </p>
              </div>
              <div className="rounded bg-gray-100 p-3">
                <p className="text-sm text-gray-500">Status</p>
                <p className={`font-semibold ${STATUS_STYLE[selectedOrder.status] ?? ""}`}>
                  {selectedOrder.status}
                </p>
              </div>
            </div>

            {/* Items */}
            <h3 className="mb-2 font-semibold">Order Items</h3>
            <div className="space-y-4 border-t pt-3">
              {selectedOrder.items.map((item, i) => {
                const print = printText(item);
                const size = itemSize(item, selectedOrder);
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-14 shrink-0">
                          <Image
                            src={getImage(item)}
                            alt={item.name}
                            fill
                            sizes="56px"
                            className="rounded-lg border object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          <ItemTags item={item} order={selectedOrder} />
                        </div>
                      </div>
                      <p className="whitespace-nowrap text-sm font-medium">
                        {money(item.price * item.quantity)}
                      </p>
                    </div>

                    {/* Production slip */}
                    {(size || item.uclPatch || print) && (
                      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
                          To prepare (× {item.quantity})
                        </p>
                        <ul className="space-y-0.5 text-gray-800">
                          {size && <li>Size: <b>{size}</b></li>}
                          {item.uclPatch && <li>UCL patch: <b>Yes</b></li>}
                          {item.customName && <li>Name: <b>{item.customName}</b></li>}
                          {item.customNumber && <li>Number: <b>{item.customNumber}</b></li>}
                        </ul>
                      </div>
                    )}

                    {/* Unit price breakdown */}
                    {item.basePrice !== undefined && (item.addOnsPrice ?? 0) > 0 && (
                      <p className="text-xs text-gray-500">
                        Per jersey: {money(item.basePrice)} + {money(item.addOnsPrice ?? 0)} add-ons ={" "}
                        {money(item.price)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="mt-5 space-y-1 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(selectedOrder.totalPrice - selectedOrder.deliveryCharge)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{money(selectedOrder.deliveryCharge)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total (Cash on Delivery)</span>
                <span className="text-orange-500">{money(selectedOrder.totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-60 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.ok ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}