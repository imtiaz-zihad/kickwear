"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { sizeExtra } from "@/lib/sizes";
import {
  Copy,
  Loader2,
  Pencil,
  Phone,
  MessageCircle,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  SOURCE_LABEL,
  STATUSES,
  ADVANCE_METHODS,
  STATUS_BADGE,
  areaLabel,
  dueAmount,
  getArea,
  itemSize,
  money,
  printText,
  shortId,
} from "./lib";
import type { AdvancePayload, EditPayload, Order, OrderItem, OrderStatus } from "./lib";

const SIZE_OPTIONS = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"];

export function Chip({
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
        .join(" | "),
    )
    .join("\n");
}

// extra = the 3XL/4XL surcharge already inside `price`
type Draft = { size: string; quantity: string; price: string; extra: number };

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary";

export function OrderModal({
  selected,
  updatingId,
  onClose,
  onChangeStatus,
  onCopyNote,
  onSaveEdit,
  onSaveAdvance,
}: {
  selected: Order;
  updatingId: string | null;
  onClose: () => void;
  onChangeStatus: (order: Order, status: OrderStatus) => void;
  onCopyNote: (order: Order) => void;
  onSaveEdit: (order: Order, payload: EditPayload) => Promise<void>;
  onSaveAdvance: (order: Order, payload: AdvancePayload) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft[]>([]);
  const [delivery, setDelivery] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // advance payment box
  const [advAmount, setAdvAmount] = useState(String(selected.advancePaid ?? 0));
  const [advMethod, setAdvMethod] = useState(selected.advanceMethod ?? "");
  const [advTrx, setAdvTrx] = useState(selected.advanceTrxId ?? "");
  const [advSaving, setAdvSaving] = useState(false);
  const [advErr, setAdvErr] = useState("");

  const advance = selected.advancePaid ?? 0;
  const due = dueAmount(selected);

  const saveAdvance = async () => {
    setAdvErr("");
    const amount = Math.round(Number(advAmount));
    if (!Number.isFinite(amount) || amount < 0 || amount > selected.totalPrice) {
      return setAdvErr(`Enter an amount from ৳0 to ${money(selected.totalPrice)}`);
    }
    setAdvSaving(true);
    try {
      await onSaveAdvance(selected, { amount, method: advMethod, trxId: advTrx.trim() });
    } catch (e) {
      setAdvErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setAdvSaving(false);
    }
  };

  const canEdit = ["Pending", "Confirmed", "Collecting"].includes(selected.status);

  const startEdit = () => {
    setDraft(
      selected.items.map((it) => ({
        size: itemSize(selected, it) ?? "",
        quantity: String(it.quantity),
        price: String(it.price),
        extra: it.sizeExtra ?? 0,
      })),
    );
    setDelivery(String(selected.deliveryCharge));
    setErr("");
    setEditing(true);
  };

  const setField = (i: number, key: keyof Draft, value: string) =>
    setDraft((prev) =>
      prev.map((d, idx) => (idx === i ? { ...d, [key]: value } : d)),
    );

  // changing the size to / from 3XL or 4XL also moves the unit price
  const changeSize = (i: number, size: string) =>
    setDraft((prev) =>
      prev.map((d, idx) => {
        if (idx !== i) return d;
        const extra = sizeExtra(size);
        const price = Math.max(0, (Number(d.price) || 0) + extra - d.extra);
        return { ...d, size, extra, price: String(price) };
      }),
    );

  // live totals while editing
  const previewSubtotal = editing
    ? draft.reduce(
        (s, d) => s + (Number(d.price) || 0) * (Number(d.quantity) || 0),
        0,
      )
    : selected.totalPrice - selected.deliveryCharge;
  const previewDelivery = editing
    ? Number(delivery) || 0
    : selected.deliveryCharge;

  const save = async () => {
    setErr("");

    const items = draft.map((d) => ({
      size: d.size || null,
      quantity: Number(d.quantity),
      price: Number(d.price),
    }));

    if (
      items.some(
        (i) =>
          !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 20,
      )
    ) {
      return setErr("Quantity must be 1–20");
    }
    if (items.some((i) => !Number.isFinite(i.price) || i.price < 0)) {
      return setErr("Enter a valid price");
    }
    const d = Number(delivery);
    if (!Number.isFinite(d) || d < 0)
      return setErr("Enter a valid delivery charge");

    setSaving(true);
    try {
      await onSaveEdit(selected, { items, deliveryCharge: d });
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

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
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{new Date(selected.createdAt).toLocaleString()}</span>
          {selected.source && selected.source !== "web" && (
            <Chip accent>{SOURCE_LABEL[selected.source]}</Chip>
          )}
          {selected.edited && <Chip>Edited</Chip>}
          {selected.isPreorder && <Chip accent>Pre-order</Chip>}
        </div>

        {selected.isPreorder && selected.preorderNote && (
          <p className="mb-4 rounded-xl bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700">
            Pre-order · {selected.preorderNote}
          </p>
        )}
        
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
              <a
                href={`tel:${selected.phone}`}
                className="inline-flex items-center gap-1 text-primary"
              >
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
            <p
              className={`font-semibold ${
                getArea(selected) === "dhaka"
                  ? "text-green-600"
                  : "text-red-500"
              }`}
            >
              {areaLabel(getArea(selected))}
            </p>
          </div>

          <div className="rounded-xl bg-secondary/60 p-3">
            <p className="mb-1 text-xs text-muted-foreground">Status</p>
            <select
              value={selected.status}
              disabled={updatingId === selected._id}
              onChange={(e) =>
                onChangeStatus(selected, e.target.value as OrderStatus)
              }
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
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-semibold">Order Items</h3>
          <div className="flex gap-2">
            {canEdit && !editing && (
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => onCopyNote(selected)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary"
            >
              <Copy className="h-3.5 w-3.5" /> Copy for printing
            </button>
          </div>
        </div>

        <div className="space-y-3 border-t border-border/60 pt-3">
          {selected.items.map((item, i) => {
            const addOns = item.addOnsPrice ?? 0;
            return (
              <div key={i} className="flex gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-secondary">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ShoppingBag className="h-5 w-5 opacity-40" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <ItemLine order={selected} item={item} />

                  {editing && draft[i] ? (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <label className="text-xs text-muted-foreground">
                        Size
                        <select
                          value={draft[i].size}
                          onChange={(e) => changeSize(i, e.target.value)}
                          className={`${inputCls} mt-0.5`}
                        >
                          <option value="">–</option>
                          {Array.from(
                            new Set([
                              ...(draft[i].size ? [draft[i].size] : []),
                              ...SIZE_OPTIONS,
                            ]),
                          ).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Qty
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={draft[i].quantity}
                          onChange={(e) =>
                            setField(i, "quantity", e.target.value)
                          }
                          className={`${inputCls} mt-0.5`}
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Unit price ৳
                        <input
                          type="number"
                          min={0}
                          value={draft[i].price}
                          onChange={(e) => setField(i, "price", e.target.value)}
                          className={`${inputCls} mt-0.5`}
                        />
                      </label>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {item.basePrice !== undefined
                        ? `${money(item.basePrice)}${(item.sizeExtra ?? 0) > 0 ? ` + ${money(item.sizeExtra ?? 0)} size` : ""}${addOns > 0 ? ` + ${money(addOns)} add-ons` : ""} each`
                        : `${money(item.price)} each`}
                    </p>
                  )}
                </div>

                {!editing && (
                  <p className="shrink-0 text-sm font-semibold">
                    {money(item.price * item.quantity)}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 space-y-1 border-t border-border/60 pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{money(previewSubtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Delivery</span>
            {editing ? (
              <input
                type="number"
                min={0}
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
                className={`${inputCls} w-24 text-right`}
              />
            ) : (
              <span>{money(selected.deliveryCharge)}</span>
            )}
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total (Cash on Delivery)</span>
            <span className="text-primary">
              {money(previewSubtotal + previewDelivery)}
            </span>
          </div>
          {selected.edited && selected.originalTotal != null && !editing && (
            <p className="text-xs text-muted-foreground">
              Original total: {money(selected.originalTotal)}
            </p>
          )}

          {/* Advance paid / due on delivery */}
          {!editing && advance > 0 && (
            <>
              <div className="flex justify-between text-green-700">
                <span>
                  Advance paid
                  {selected.advanceMethod &&
                    ` (${ADVANCE_METHODS.find((m) => m.value === selected.advanceMethod)?.label ?? selected.advanceMethod}${selected.advanceTrxId ? ` · ${selected.advanceTrxId}` : ""})`}
                </span>
                <span>− {money(advance)}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-amber-500/10 px-3 py-2 text-base font-bold text-amber-700">
                <span>Collect on delivery</span>
                <span>{money(due)}</span>
              </div>
            </>
          )}
        </div>

        {/* Record advance payment */}
        {!editing && (
          <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-secondary/40 p-3">
            <p className="text-sm font-semibold">Advance payment</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <label className="text-xs text-muted-foreground">
                Amount ৳
                <input
                  type="number"
                  min={0}
                  max={selected.totalPrice}
                  value={advAmount}
                  onChange={(e) => setAdvAmount(e.target.value)}
                  className={`${inputCls} mt-0.5`}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Method
                <select
                  value={advMethod}
                  onChange={(e) => setAdvMethod(e.target.value)}
                  className={`${inputCls} mt-0.5`}
                >
                  <option value="">–</option>
                  {ADVANCE_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 text-xs text-muted-foreground sm:col-span-1">
                TrxID (optional)
                <input
                  value={advTrx}
                  maxLength={40}
                  onChange={(e) => setAdvTrx(e.target.value)}
                  className={`${inputCls} mt-0.5`}
                />
              </label>
            </div>
            {advErr && (
              <p role="alert" className="rounded-lg bg-red-500/10 p-2 text-xs text-red-600">
                {advErr}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Set 0 to remove the advance.
              </p>
              <button
                type="button"
                onClick={saveAdvance}
                disabled={advSaving}
                className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {advSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save advance
              </button>
            </div>
          </div>
        )}

        {editing && (
          <div className="mt-4 space-y-3">
            {err && (
              <p
                role="alert"
                className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600"
              >
                {err}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
