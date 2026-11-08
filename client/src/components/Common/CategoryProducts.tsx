"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, ShoppingBag, X } from "lucide-react";
import { Product } from "@/types/product";
import JerseyCard from "@/components/Common/JerseyCard";

type SortKey = "default" | "new" | "low" | "high";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "default", label: "Featured" },
  { value: "new", label: "Newest" },
  { value: "low", label: "Price: Low to High" },
  { value: "high", label: "Price: High to Low" },
];

// "man-city" → "Man City"
const formatSlug = (slug: string) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

// "man-city", "mancity", "Man City" → "mancity" (so duplicates group together)
const teamKey = (s?: string) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

// sleeve field first, fall back to the product name for old products
function getSleeve(p: Product): "half" | "full" | "" {
  if (p.sleeve === "half" || p.sleeve === "full") return p.sleeve;
  const m = p.name.match(/\b(half|full)\s*sleeve\b/i);
  return m ? (m[1].toLowerCase() as "half" | "full") : "";
}

const selectCls =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary";

type TeamOpt = { key: string; label: string; count: number };

export default function CategoryProducts({ products }: { products: Product[] }) {
  const sp = useSearchParams();

  const [team, setTeam] = useState(teamKey(sp.get("team") ?? ""));
  const [sleeve, setSleeve] = useState(sp.get("sleeve") ?? "");
  const [season, setSeason] = useState(sp.get("season") ?? "");
  const [sort, setSort] = useState<SortKey>((sp.get("sort") as SortKey) || "default");
  const [q, setQ] = useState(sp.get("q") ?? "");

  // keep the URL in sync (shareable links) without re-fetching the page
  const syncUrl = (next: Record<string, string>) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(next).forEach(([k, v]) => {
      if (v && v !== "default") params.set(k, v);
      else params.delete(k);
    });
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

  const update = (key: string, value: string) => {
    if (key === "team") setTeam(value);
    if (key === "sleeve") setSleeve(value);
    if (key === "season") setSeason(value);
    if (key === "sort") setSort(value as SortKey);
    if (key === "q") setQ(value);
    syncUrl({ [key]: value });
  };

  const clearAll = () => {
    setTeam("");
    setSleeve("");
    setSeason("");
    setSort("default");
    setQ("");
    window.history.replaceState(null, "", window.location.pathname);
  };

  // options come from the products themselves (no hardcoding)
  const { teams, seasons, sleeves } = useMemo(() => {
    const t = new Map<string, TeamOpt>();
    const s = new Set<string>();
    const sl = new Set<string>();
    products.forEach((p) => {
      if (p.subcategory) {
        const key = teamKey(p.subcategory);
        const cur = t.get(key);
        if (cur) {
          cur.count += 1;
          // prefer the hyphenated slug for the label ("man-city" over "mancity")
          if (p.subcategory.includes("-") && !cur.label.includes(" ")) {
            cur.label = formatSlug(p.subcategory);
          }
        } else {
          t.set(key, { key, label: formatSlug(p.subcategory), count: 1 });
        }
      }
      if (p.season) s.add(p.season);
      const x = getSleeve(p);
      if (x) sl.add(x);
    });
    return {
      teams: [...t.values()].sort((a, b) => a.label.localeCompare(b.label)),
      seasons: [...s].sort().reverse(),
      sleeves: [...sl],
    };
  }, [products]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = products.filter((p) => {
      if (team && teamKey(p.subcategory) !== team) return false;
      if (sleeve && getSleeve(p) !== sleeve) return false;
      if (season && p.season !== season) return false;
      if (needle && !`${p.name} ${p.subcategory ?? ""}`.toLowerCase().includes(needle))
        return false;
      return true;
    });

    if (sort === "low") list = [...list].sort((a, b) => a.discountedPrice - b.discountedPrice);
    if (sort === "high") list = [...list].sort((a, b) => b.discountedPrice - a.discountedPrice);
    // Mongo _id starts with a timestamp, so a bigger id = newer product
    if (sort === "new") list = [...list].sort((a, b) => (a._id < b._id ? 1 : -1));
    return list;
  }, [products, team, sleeve, season, sort, q]);

  const hasFilters = Boolean(team || sleeve || season || q || sort !== "default");
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card text-muted-foreground hover:border-primary/40"
    }`;

  return (
    <>
      {/* ── Filter bar (sticky on phone) ── */}
      <div className="sticky top-0 z-30 -mx-6 border-b bg-background/95 px-6 py-3 backdrop-blur md:static md:mx-0 md:px-0">
        {/* PHONE: team chips, one row, swipe sideways */}
        {teams.length > 1 && (
          <div className="-mx-6 mb-3 flex touch-pan-x gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
            <button type="button" onClick={() => update("team", "")} className={chip(!team)}>
              All ({products.length})
            </button>
            {teams.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => update("team", team === t.key ? "" : t.key)}
                className={chip(team === t.key)}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
        )}

        {/* Search + dropdowns (desktop also gets a Team dropdown) */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <div className="relative col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => update("q", e.target.value)}
              placeholder="Search jersey..."
              className={`${selectCls} pl-9`}
            />
          </div>

          {teams.length > 1 && (
            <select
              value={team}
              onChange={(e) => update("team", e.target.value)}
              className={`${selectCls} hidden md:block`}
              aria-label="Team"
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label} ({t.count})
                </option>
              ))}
            </select>
          )}

          {sleeves.length > 1 && (
            <select
              value={sleeve}
              onChange={(e) => update("sleeve", e.target.value)}
              className={selectCls}
              aria-label="Sleeve"
            >
              <option value="">All sleeves</option>
              <option value="full">Full Sleeve</option>
              <option value="half">Half Sleeve</option>
            </select>
          )}

          {seasons.length > 1 && (
            <select
              value={season}
              onChange={(e) => update("season", e.target.value)}
              className={selectCls}
              aria-label="Season"
            >
              <option value="">All seasons</option>
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          <select
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
            className={selectCls}
            aria-label="Sort"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Count + clear ── */}
      <div className="flex items-center justify-between py-3">
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "item" : "items"}
          {filtered.length !== products.length && ` of ${products.length}`}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* ── Grid ── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((product, i) => (
            <JerseyCard key={product._id} product={product} priority={i < 4} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">
            No jerseys match these filters.
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-3 text-sm font-semibold text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}