"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../orders/lib";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

type PageRow = {
  path: string;
  total: number;
  today: number;
  unique: number;
  uniqueToday: number;
};

type Stats = {
  totalViews: number;
  todayViews: number;
  uniqueVisitors: number;
  uniqueToday: number;
  pages: PageRow[];
};

type Visit = {
  path: string;
  at: string;
  visitor: string | null;
  device: string;
  src: string | null;
};

type SourceRow = { source: string; total: number; today: number };

function Card({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Dhaka",
  });

// readable names for the short source codes
const SOURCE_NAMES: Record<string, string> = {
  msgr: "Messenger",
  msgr_fu: "Messenger follow-up",
  direct: "Direct",
  facebook: "Facebook",
  instagram: "Instagram",
  google: "Google",
  whatsapp: "WhatsApp",
  other: "Other",
};

const sourceLabel = (s: string | null) => {
  if (!s) return "–";
  if (SOURCE_NAMES[s]) return SOURCE_NAMES[s];
  const t = s.replace(/[_-]/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export default function PageViews() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [sources, setSources] = useState<SourceRow[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;

    const load = () => {
      api<Stats>("/live/stats")
        .then((d) => !stop && setStats(d))
        .catch((e) => !stop && setError(e instanceof Error ? e.message : "Failed"));
      api<{ visits: Visit[] }>("/live/today")
        .then((d) => !stop && setVisits(d.visits))
        .catch(() => {});
      api<{ sources: SourceRow[] }>("/live/sources")
        .then((d) => !stop && setSources(d.sources))
        .catch(() => {});
    };

    load();
    const timer = setInterval(load, 30_000);

    // product names for /product/<id> paths
    fetch(`${API}/products?limit=200`)
      .then((r) => r.json())
      .then((json) => {
        const list: { _id: string; name: string }[] = Array.isArray(json)
          ? json
          : (json.data ?? []);
        if (!stop) {
          setNames(Object.fromEntries(list.map((p) => [p._id, p.name])));
        }
      })
      .catch(() => {});

    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, []);

  const label = (path: string) => {
    if (path === "/") return "Home";
    if (path.startsWith("/product/")) {
      const id = path.replace("/product/", "");
      return names[id] ?? `Product …${id.slice(-6)}`;
    }
    if (path.startsWith("/category"))
      return `Category ${path.replace("/category", "")}`.trim();
    if (path === "/checkout") return "Checkout";
    if (path === "/track-order") return "Track order";
    return path;
  };

  const todayPages = useMemo(
    () =>
      (stats?.pages ?? [])
        .filter((p) => p.today > 0)
        .sort((a, b) => b.today - a.today),
    [stats],
  );

  const lifetimePages = useMemo(
    () => [...(stats?.pages ?? [])].sort((a, b) => b.total - a.total),
    [stats],
  );

  // how many times each visitor appears today (to flag repeat visitors)
  const repeat = useMemo(() => {
    const m: Record<string, number> = {};
    (visits ?? []).forEach((v) => {
      if (v.visitor) m[v.visitor] = (m[v.visitor] ?? 0) + 1;
    });
    return m;
  }, [visits]);

  const n = (x: number | undefined) => (stats ? (x ?? 0) : "–");

  const th = "px-4 py-3 font-semibold";
  const wrap = "overflow-x-auto rounded-2xl border border-border/60 bg-card";
  const thead =
    "bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground";

  return (
    <div className="space-y-10">
      {error && (
        <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* ---------------- TODAY ---------------- */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Today</h2>

        <div className="grid max-w-md grid-cols-2 gap-3">
          <Card label="Views today" value={n(stats?.todayViews)} />
          <Card label="Unique today" value={n(stats?.uniqueToday)} />
        </div>

        {/* per page, today */}
        <div className={wrap}>
          <table className="w-full text-sm">
            <thead className={thead}>
              <tr>
                <th className={th}>Page</th>
                <th className={`${th} text-right`}>Views</th>
                <th className={`${th} text-right`}>Unique</th>
              </tr>
            </thead>
            <tbody>
              {stats && todayPages.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                    No visits today yet
                  </td>
                </tr>
              )}
              {todayPages.map((p) => (
                <tr key={p.path} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <span className="font-medium">{label(p.path)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.path}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{p.today}</td>
                  <td className="px-4 py-3 text-right text-primary">{p.uniqueToday}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* where visitors come from */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            Where visitors come from
          </h3>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead className={thead}>
                <tr>
                  <th className={th}>Source</th>
                  <th className={`${th} text-right`}>Today</th>
                  <th className={`${th} text-right`}>Last 14 days</th>
                </tr>
              </thead>
              <tbody>
                {sources && sources.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                      No data yet
                    </td>
                  </tr>
                )}
                {(sources ?? []).map((s) => (
                  <tr key={s.source} className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium">{sourceLabel(s.source)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{s.today}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {s.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Each count is one visit (a visitor&apos;s first page), not every page view.
          </p>
        </div>

        {/* visit log with time */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            Today&apos;s visits (newest first)
          </h3>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead className={thead}>
                <tr>
                  <th className={th}>Time</th>
                  <th className={th}>Page</th>
                  <th className={th}>Source</th>
                  <th className={th}>Visitor</th>
                  <th className={th}>Device</th>
                </tr>
              </thead>
              <tbody>
                {visits && visits.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      No timed visits yet
                    </td>
                  </tr>
                )}
                {(visits ?? []).map((v, i) => (
                  <tr key={`${v.at}-${i}`} className="border-t border-border/60">
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium">
                      {timeOf(v.at)}
                    </td>
                    <td className="px-4 py-2.5">{label(v.path)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {sourceLabel(v.src)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {v.visitor ? `#${v.visitor}` : "–"}
                      {v.visitor && repeat[v.visitor] > 1 && (
                        <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                          ×{repeat[v.visitor]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{v.device}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing the latest 200 visits. Time is Bangladesh time. Source shows only
            for the first page of a visit.
          </p>
        </div>
      </section>

      {/* ---------------- LIFETIME ---------------- */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Lifetime</h2>

        <div className="grid max-w-md grid-cols-2 gap-3">
          <Card label="Views lifetime" value={n(stats?.totalViews)} />
          <Card label="Unique lifetime" value={n(stats?.uniqueVisitors)} />
        </div>

        <div className={wrap}>
          <table className="w-full text-sm">
            <thead className={thead}>
              <tr>
                <th className={th}>Page</th>
                <th className={`${th} text-right`}>Views</th>
                <th className={`${th} text-right`}>Unique</th>
              </tr>
            </thead>
            <tbody>
              {stats && lifetimePages.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                    No views yet
                  </td>
                </tr>
              )}
              {lifetimePages.map((p) => (
                <tr key={p.path} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <span className="font-medium">{label(p.path)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.path}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{p.total}</td>
                  <td className="px-4 py-3 text-right text-primary">{p.unique}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}