"use client";
/* eslint-disable @next/next/no-img-element */

import { Copy, Phone, MessageCircle, ShoppingBag, X } from "lucide-react";
import {
  STATUSES,
  STATUS_BADGE,
  areaLabel,
  getArea,
  itemSize,
  money,
  printText,
  shortId,
} from "./lib";
import type { Order, OrderItem, OrderStatus } from "./lib";

export function Chip({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
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

// What the person making the jersey needs to see
export function ItemLine({ order, item }: { order: Order; item: OrderItem }) {
  const size = itemSize(order, item);
  const print = printText(item);
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <span className="font-medium">{item.name}</span>
      {size && <Chip>Size {size}</Chip>}
      <Chip>× {item.quantity}</Chip>
      {item.uclPatch && <Chip accent>UCL patch</Chip>}
      {print && <Chip accent>Print: {print}</Chip>}
    </div>
  );
}

export function productionNote(order: Order): string {
  return order.items
    .map((item) =>
      [
        item.name,
        itemSize(order, item) && `Size ${itemSize(order, item)}`,
        `x${item.quantity}`,
        item.uclPatch && "UCL patch",
        printText(item) && `Print: ${printText(item)}`,
      ]
        .filter(Boolean)
        .join(" | ")
    )
    .join("\n");
}

export function OrderModal({
  selected,
  updatingId,
  onClose,
  onChangeStatus,
  onCopyNote,
}: {
  selected: Order;
  updatingId: string | null;
  onClose: () => void;
  onChangeStatus: (order: Order, status: OrderStatus) => void;
  onCopyNote: (order: Order) => void;
}) {
  return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Order details"
            className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-card p-5 shadow-xl md:p-6"
          >
            <button
              type="button"
              onClick={() => onClose()}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-semibold">Order #{shortId(selected)}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{new Date(selected.createdAt).toLocaleString()}</p>

            {/* Customer */}
            <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-semibold">{selected.customerName}</p>
              </div>

              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-semibold">{selected.phone}</p>
                <div className="mt-1.5 flex gap-3 text-xs font-semibold">
                  <a href={`tel:${selected.phone}`} className="inline-flex items-center gap-1 text-primary">
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                  <a
                    href={`https://wa.me/88${selected.phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-green-600"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                </div>
              </div>

              <div className="col-span-2 rounded-xl bg-secondary/60 p-3">
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-semibold">{selected.address}</p>
              </div>

              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-xs text-muted-foreground">Area</p>
                <p className={`font-semibold ${getArea(selected) === "dhaka" ? "text-green-600" : "text-red-500"}`}>
                  {areaLabel(getArea(selected))}
                </p>
              </div>

              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="mb-1 text-xs text-muted-foreground">Status</p>
                <select
                  value={selected.status}
                  disabled={updatingId === selected._id}
                  onChange={(e) => onChangeStatus(selected, e.target.value as OrderStatus)}
                  className={`h-8 w-full rounded-lg border border-border px-2 text-sm font-medium disabled:opacity-50 ${
                    STATUS_BADGE[selected.status] ?? ""
                  }`}
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items */}
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">Order Items</h3>
              <button
                type="button"
                onClick={() => onCopyNote(selected)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
              >
                <Copy className="h-3.5 w-3.5" /> Copy for printing
              </button>
            </div>

            <div className="space-y-3 border-t border-border/60 pt-3">
              {selected.items.map((item, i) => {
                const addOns = item.addOnsPrice ?? 0;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-secondary">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ShoppingBag className="h-5 w-5 opacity-40" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <ItemLine order={selected} item={item} />
                      <p className="text-xs text-muted-foreground">
                        {item.basePrice !== undefined
                          ? `${money(item.basePrice)}${addOns > 0 ? ` + ${money(addOns)} add-ons` : ""} each`
                          : `${money(item.price)} each`}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-semibold">{money(item.price * item.quantity)}</p>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="mt-4 space-y-1 border-t border-border/60 pt-4 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(selected.totalPrice - selected.deliveryCharge)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{money(selected.deliveryCharge)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total (Cash on Delivery)</span>
                <span className="text-primary">{money(selected.totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>
  );
}
