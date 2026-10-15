"use client";

import { Minus, Plus } from "lucide-react";

interface Props {
  quantity: number;
  setQuantity: (q: number) => void;
  min?: number;
  max?: number;
}

export default function QuantitySelector({
  quantity,
  setQuantity,
  min = 1,
  max = 10,
}: Props) {
  return (
    <div className="inline-flex items-center rounded-xl border border-border bg-card">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => setQuantity(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        className="flex h-11 w-11 items-center justify-center rounded-l-xl transition-colors hover:bg-secondary disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>

      <span className="w-10 text-center font-semibold" aria-live="polite">
        {quantity}
      </span>

      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => setQuantity(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        className="flex h-11 w-11 items-center justify-center rounded-r-xl transition-colors hover:bg-secondary disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}