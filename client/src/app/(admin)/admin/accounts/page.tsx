"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { api, money } from "../orders/lib";

type Partner = "imtiaz" | "zihad";
type EntryType = "paid" | "received";

type Entry = {
  _id: string;
  partner: Partner;
  type: EntryType;
  amount: number;
  note: string;
  date: string;
};

type PartnerSummary = {
  paid: number;
  received: number;
  balance: number;
  count: number;
};
type Summary = Record<Partner, PartnerSummary>;

const LABEL: Record<Partner, string> = { imtiaz: "Imtiaz", zihad: "Zihad" };
const PARTNERS: Partner[] = ["imtiaz", "zihad"];

const EMPTY_SUMMARY: Summary = {
  imtiaz: { paid: 0, received: 0, balance: 0, count: 0 },
  zihad: { paid: 0, received: 0, balance: 0, count: 0 },
};

// yyyy-mm-dd in the browser's local time (for <input type="date">)
const toInputDate = (d: Date) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
};
const today = () => toInputDate(new Date());

const dayKey = (iso: string) => toInputDate(new Date(iso));

const dayLabel = (key: string) => {
  const now = new Date();
  if (key === toInputDate(now)) return "Today";
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (key === toInputDate(y)) return "Yesterday";
  return new Date(`${key}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

type Form = {
  partner: Partner;
  type: EntryType;
  amount: string;
  date: string;
  note: string;
};

const emptyForm = (): Form => ({
  partner: "imtiaz",
  type: "paid",
  amount: "",
  date: today(),
  note: "",
});

const fieldCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-primary md:text-sm";

// two-option switch (partner / type / list filter)
function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-xl bg-secondary p-1"
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`h-9 flex-1 rounded-lg px-3 text-sm font-semibold transition-colors ${
              on
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function PartnerCard({ partner, s }: { partner: Partner; s: PartnerSummary }) {
  const gets = s.balance > 0;
  const owes = s.balance < 0;

  const tone = gets
    ? {
        pill: "bg-green-600/10 text-green-700",
        amount: "text-green-600",
        label: "Gets",
      }
    : owes
      ? {
          pill: "bg-red-500/10 text-red-600",
          amount: "text-red-600",
          label: "Owes",
        }
      : {
          pill: "bg-secondary text-muted-foreground",
          amount: "text-muted-foreground",
          label: "Settled",
        };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
            {LABEL[partner][0]}
          </span>
          <span className="font-semibold">{LABEL[partner]}</span>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${tone.pill}`}
        >
          {tone.label}
        </span>
      </div>

      <p className={`mt-4 text-3xl font-bold tracking-tight ${tone.amount}`}>
        {money(Math.abs(s.balance))}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3 text-sm">
        <div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowUpRight className="h-3.5 w-3.5 text-green-600" /> Paid
          </p>
          <p className="font-semibold">{money(s.paid)}</p>
        </div>
        <div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowDownLeft className="h-3.5 w-3.5 text-amber-600" /> Received
          </p>
          <p className="font-semibold">{money(s.received)}</p>
        </div>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [filter, setFilter] = useState<Partner | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
    const [courier, setCourier] = useState<{ balance?: number; error?: string }>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const flash = useCallback((text: string) => {
    setToast(text);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api<{ summary: Summary; entries: Entry[] }>(
        "/accounts",
      );
      setEntries(res.entries);
      setSummary(res.summary);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);


  const loadCourier = useCallback(async () => {
    try {
      const r = await api<{ balance: number }>("/accounts/courier-balance");
      setCourier({ balance: r.balance });
    } catch (e) {
      setCourier({ error: e instanceof Error ? e.message : "Could not load" });
    }
  }, []);

  useEffect(() => {
    loadCourier();
  }, [loadCourier]);
  // one partner is owed, the other owes: this payment settles it
  const settle = useMemo(() => {
    const a = summary.imtiaz.balance;
    const b = summary.zihad.balance;
    if (a > 0 && b < 0)
      return {
        from: "zihad" as Partner,
        to: "imtiaz" as Partner,
        amount: Math.min(a, -b),
      };
    if (b > 0 && a < 0)
      return {
        from: "imtiaz" as Partner,
        to: "zihad" as Partner,
        amount: Math.min(b, -a),
      };
    return null;
  }, [summary]);

  // entries of the chosen partner, grouped by day (newest first)
  const groups = useMemo(() => {
    const list =
      filter === "all" ? entries : entries.filter((e) => e.partner === filter);
    const map = new Map<string, Entry[]>();
    for (const e of list) {
      const k = dayKey(e.date);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()];
  }, [entries, filter]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // fresh form; keeps the last partner and type, handy for several entries in a row
  const resetForm = () => {
    setForm((f) => ({ ...emptyForm(), partner: f.partner, type: f.type }));
    setEditingId(null);
    setFormError("");
  };

  const openNew = () => {
    resetForm();
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setFormError("");
  }, [saving]);

  // Esc closes the modal
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  const startEdit = (e: Entry) => {
    setEditingId(e._id);
    setForm({
      partner: e.partner,
      type: e.type,
      amount: String(e.amount),
      date: dayKey(e.date),
      note: e.note ?? "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (saving) return;

    const amount = Number(form.amount);
    if (!Number.isInteger(amount) || amount < 1) {
      return setFormError("Enter a whole amount of ৳1 or more");
    }
    if (!form.date) return setFormError("Select a date");

    setSaving(true);
    setFormError("");
    try {
      const body = JSON.stringify({
        partner: form.partner,
        type: form.type,
        amount,
        note: form.note.trim(),
        // noon local time, so the day never shifts with the time zone
        date: new Date(`${form.date}T12:00:00`).toISOString(),
      });

      if (editingId) {
        await api(`/accounts/${editingId}`, { method: "PATCH", body });
        flash("Entry updated");
      } else {
        await api("/accounts", { method: "POST", body });
        flash("Entry saved");
      }
      resetForm();
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (e: Entry) => {
    if (
      !window.confirm(
        `Delete this entry? ${LABEL[e.partner]} · ${e.type === "paid" ? "Paid" : "Received"} ${money(e.amount)}`,
      )
    ) {
      return;
    }
    setDeletingId(e._id);
    try {
      await api(`/accounts/${e._id}`, { method: "DELETE" });
      if (editingId === e._id) closeModal();
      flash("Entry deleted");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Accounts</h1>
          <p className="text-muted-foreground">
            Partner balance between Imtiaz and Zihad
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add entry
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600"
        >
          {error}
        </p>
      )}
      {/* Steadfast wallet */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            Steadfast balance
          </p>
          <p className="text-xl font-bold">
            {courier.balance !== undefined
              ? money(courier.balance)
              : courier.error
                ? "Unavailable"
                : "Loading…"}
          </p>
          {courier.error && (
            <p className="text-xs text-red-600">{courier.error}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setCourier({});
            loadCourier();
          }}
          className="h-9 rounded-xl border border-border px-3 text-sm font-medium hover:bg-muted"
        >
          Refresh
        </button>
      </div>
      {/* Balances */}
      <div className="grid gap-4 sm:grid-cols-2">
        {PARTNERS.map((p) => (
          <PartnerCard key={p} partner={p} s={summary[p]} />
        ))}
      </div>

      {settle && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <span className="font-semibold text-muted-foreground">
            To settle up
          </span>
          <span className="flex items-center gap-2 font-semibold">
            {LABEL[settle.from]}
            <ArrowRight className="h-4 w-4 text-primary" />
            {LABEL[settle.to]}
          </span>
          <span className="ml-auto text-base font-bold text-primary">
            {money(settle.amount)}
          </span>
        </div>
      )}

      {/* Entries */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">History</h2>
          <div className="w-full sm:w-64">
            <Segmented
              label="Filter by partner"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All" },
                { value: "imtiaz", label: "Imtiaz" },
                { value: "zihad", label: "Zihad" },
              ]}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 py-12 text-center text-muted-foreground">
            No entries yet. Add the first one.
          </div>
        ) : (
          groups.map(([key, list]) => (
            <section key={key} className="space-y-2">
              <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {dayLabel(key)}
              </h3>
              <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                {list.map((e) => {
                  const paid = e.type === "paid";
                  return (
                    <li
                      key={e._id}
                      className={`flex items-center gap-3 p-3 md:px-4 ${
                        editingId === e._id ? "bg-primary/5" : ""
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          paid
                            ? "bg-green-600/10 text-green-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {paid ? (
                          <ArrowUpRight className="h-5 w-5" />
                        ) : (
                          <ArrowDownLeft className="h-5 w-5" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {LABEL[e.partner]}{" "}
                          <span className="font-normal text-muted-foreground">
                            {paid ? "paid" : "received"}
                          </span>
                        </p>
                        {e.note && (
                          <p className="truncate text-sm text-muted-foreground">
                            {e.note}
                          </p>
                        )}
                      </div>

                      <p
                        className={`shrink-0 text-base font-bold ${
                          paid ? "text-green-600" : "text-amber-600"
                        }`}
                      >
                        {paid ? "+" : "−"}
                        {money(e.amount)}
                      </p>

                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(e)}
                          aria-label="Edit entry"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(e)}
                          disabled={deletingId === e._id}
                          aria-label="Delete entry"
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
                        >
                          {deletingId === e._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      {/* Add / edit entry modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <form
            onSubmit={submit}
            className="relative max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-card p-5 shadow-xl md:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingId ? "Edit entry" : "New entry"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-medium">Partner</span>
              <Segmented
                label="Partner"
                value={form.partner}
                onChange={(v) => set("partner", v)}
                options={PARTNERS.map((p) => ({ value: p, label: LABEL[p] }))}
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-medium">Type</span>
              <Segmented
                label="Type"
                value={form.type}
                onChange={(v) => set("type", v)}
                options={[
                  { value: "paid", label: "Paid" },
                  { value: "received", label: "Received" },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                {form.type === "paid"
                  ? "Spent or gave money for the business. The business owes them."
                  : "Got money on behalf of the business (e.g. COD). They owe the business."}
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="acc-amount" className="text-sm font-medium">
                Amount
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
                  ৳
                </span>
                <input
                  id="acc-amount"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  placeholder="0"
                  className={`${fieldCls} h-12 pl-8 text-lg font-semibold`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="acc-date" className="text-sm font-medium">
                Date
              </label>
              <input
                id="acc-date"
                type="date"
                max={today()}
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className={fieldCls}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="acc-note" className="text-sm font-medium">
                Note{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <input
                id="acc-note"
                value={form.note}
                maxLength={200}
                onChange={(e) => set("note", e.target.value)}
                placeholder="e.g. Meta ads, jersey stock, COD"
                className={fieldCls}
              />
            </div>

            {formError && (
              <p
                role="alert"
                className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600"
              >
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-5 w-5 animate-spin" />}
              {editingId ? "Save changes" : "Add entry"}
            </button>
          </form>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-60 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}