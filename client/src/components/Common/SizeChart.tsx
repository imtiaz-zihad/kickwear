"use client";

import { Ruler, X } from "lucide-react";
import { useRef } from "react";

export const SIZE_CHART: { size: string; chest: number; length: number }[] = [
  { size: "S", chest: 38, length: 27 },
  { size: "M", chest: 40, length: 28 },
  { size: "L", chest: 42, length: 29 },
  { size: "XL", chest: 44, length: 30 },
  { size: "2XL", chest: 46, length: 31 },
];

export default function SizeChart({
  selectedSize,
}: {
  selectedSize?: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        <Ruler className="h-4 w-4" />
        Size Chart
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="size-chart-title"
        // click on the backdrop (the dialog element itself) closes it
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border-0 bg-card p-0 text-foreground shadow-xl backdrop:bg-black/50"
      >
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="size-chart-title" className="text-lg font-bold">
              Size Chart
            </h2>
            <button
              type="button"
              aria-label="Close size chart"
              onClick={() => dialogRef.current?.close()}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Size</th>
                  <th className="px-4 py-2.5 font-semibold">Chest (inch)</th>
                  <th className="px-4 py-2.5 font-semibold">Length (inch)</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_CHART.map((row) => {
                  const active = row.size === selectedSize;
                  return (
                    <tr
                      key={row.size}
                      className={`border-t border-border/60 ${
                        active ? "bg-primary/10 font-semibold text-primary" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5">{row.size}</td>
                      <td className="px-4 py-2.5">{row.chest}</td>
                      <td className="px-4 py-2.5">{row.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            All measurements are in inches. Allow 1–2 inch variation.
          </p>
        </div>
      </dialog>
    </>
  );
}