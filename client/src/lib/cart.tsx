"use client";

// Shopping cart (saved in localStorage so it survives refresh / closing the tab).
// Prices stored here are only for display. The server recalculates everything.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export const MAX_QTY = 10;
export const MAX_LINES = 10;
const STORAGE_KEY = "kw_cart";

export type CartLine = {
  key: string;
  productId: string;
  name: string;
  image?: string | null;
  size: string | null;
  quantity: number;
  uclPatch: boolean;
  customName: string | null;
  customNumber: string | null;
  basePrice: number;
  uclPrice: number;
  printPrice: number;
  preorder: boolean; // pre-order jerseys cannot be mixed with in-stock ones
  preorderNote: string; // "Delivery 20-25 Nov"
};

export type NewCartLine = Omit<CartLine, "key">;

export const hasPrint = (l: Pick<CartLine, "customName" | "customNumber">) =>
  Boolean(l.customName || l.customNumber);

export const unitPrice = (l: CartLine) =>
  l.basePrice + (l.uclPatch ? l.uclPrice : 0) + (hasPrint(l) ? l.printPrice : 0);

export const lineTotal = (l: CartLine) => unitPrice(l) * l.quantity;

// Same jersey + same size + same add-ons = same line (quantity adds up)
const makeKey = (l: NewCartLine) =>
  [
    l.productId,
    l.size ?? "",
    l.uclPatch ? 1 : 0,
    l.customName ?? "",
    l.customNumber ?? "",
  ].join("|");

const num = (v: unknown, fallback = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];

    const out: CartLine[] = [];
    for (const o of arr) {
      if (!o || typeof o.productId !== "string" || typeof o.name !== "string") continue;
      const line: NewCartLine = {
        productId: o.productId,
        name: o.name,
        image: str(o.image),
        size: str(o.size),
        quantity: Math.min(MAX_QTY, Math.max(1, Math.floor(num(o.quantity, 1)))),
        uclPatch: o.uclPatch === true,
        customName: str(o.customName),
        customNumber: str(o.customNumber),
        basePrice: num(o.basePrice),
        uclPrice: num(o.uclPrice),
        printPrice: num(o.printPrice),
        preorder: o.preorder === true,
        preorderNote: str(o.preorderNote) ?? "",
      };
      out.push({ ...line, key: makeKey(line) });
    }
    return out.slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

function write(lines: CartLine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* storage blocked: cart still works until refresh */
  }
}

type AddResult = "ok" | "full" | "mixed";

type CartContextValue = {
  lines: CartLine[];
  ready: boolean; // false until the saved cart has been read
  count: number; // total pieces (for the navbar badge)
  addItem: (line: NewCartLine) => AddResult;
  updateQty: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const ref = useRef<CartLine[]>([]);

  const commit = useCallback((next: CartLine[]) => {
    ref.current = next;
    setLines(next);
    write(next);
  }, []);

  useEffect(() => {
    const saved = read();
    ref.current = saved;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(saved);
    setReady(true);

    // keep several tabs in sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) {
        const next = read();
        ref.current = next;
        setLines(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addItem = useCallback(
    (line: NewCartLine): AddResult => {
      const key = makeKey(line);
      const current = ref.current;

      // pre-order and in-stock jerseys ship at different times: separate orders
      if (current.length > 0 && current[0].preorder !== line.preorder) {
        return "mixed";
      }

      const existing = current.find((l) => l.key === key);

      if (existing) {
        commit(
          current.map((l) =>
            l.key === key
              ? {
                  ...l,
                  quantity: Math.min(MAX_QTY, l.quantity + line.quantity),
                  // refresh the display prices
                  basePrice: line.basePrice,
                  uclPrice: line.uclPrice,
                  printPrice: line.printPrice,
                  preorderNote: line.preorderNote,
                }
              : l,
          ),
        );
        return "ok";
      }

      if (current.length >= MAX_LINES) return "full";
      commit([...current, { ...line, key, quantity: Math.min(MAX_QTY, line.quantity) }]);
      return "ok";
    },
    [commit],
  );

  const updateQty = useCallback(
    (key: string, quantity: number) => {
      const q = Math.min(MAX_QTY, Math.max(1, Math.floor(quantity) || 1));
      commit(ref.current.map((l) => (l.key === key ? { ...l, quantity: q } : l)));
    },
    [commit],
  );

  const remove = useCallback(
    (key: string) => commit(ref.current.filter((l) => l.key !== key)),
    [commit],
  );

  const clear = useCallback(() => commit([]), [commit]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      addItem,
      updateQty,
      remove,
      clear,
    }),
    [lines, ready, addItem, updateQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}