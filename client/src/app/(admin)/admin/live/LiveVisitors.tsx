"use client";

import { useEffect, useState } from "react";
import { api } from "../orders/lib";

type Live = { online: number; pages: { path: string; count: number }[] };

export default function LiveVisitors() {
  const [data, setData] = useState<Live | null>(null);

  useEffect(() => {
    let stop = false;
    const load = () =>
      api<Live>("/live")
        .then((d) => !stop && setData(d))
        .catch(() => {});
    load();
    const timer = setInterval(load, 10_000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, []);

  const online = data?.online ?? 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="relative flex h-2.5 w-2.5">
          {online > 0 && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              online > 0 ? "bg-green-500" : "bg-neutral-400"
            }`}
          />
        </span>
        Live visitors
      </div>

      <p className="mt-1 text-4xl font-bold">{data ? online : "–"}</p>

      {data && data.pages.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border/60 pt-3 text-sm">
          {data.pages.map((p) => (
            <li key={p.path} className="flex justify-between gap-3">
              <span className="truncate text-muted-foreground">{p.path}</span>
              <span className="font-medium">{p.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}