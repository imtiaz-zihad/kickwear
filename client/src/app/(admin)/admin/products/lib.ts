export type AddOn = { enabled?: boolean; price?: number };

export type Product = {
  _id: string;
  name: string;
  category: string;
  subcategory?: string;
  sleeve?: "half" | "full";
  season?: string;
  sizes?: string[];
  images: string[];
  originalPrice: number;
  discountedPrice: number;
  discountPercentage?: number;
  stock?: number;
  description?: string;
  isFeatured?: boolean;
  addOns?: { uclPatch?: AddOn; customPrint?: AddOn };
};

export type FormState = {
  name: string;
  category: string;
  team: string;
  season: string;
  sleeve: "" | "half" | "full";
  originalPrice: string;
  discountedPrice: string;
  sizes: string[];
  images: string[];
  description: string;
  stock: string;
  isFeatured: boolean;
  uclEnabled: boolean;
  uclPrice: string;
  printEnabled: boolean;
  printPrice: string;
};

export type SetField = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const CLOUD_NAME = "ps6g4nx2";
export const UPLOAD_PRESET = "kickwear_upload";
export const UPLOAD_ENABLED = true;

export const CATEGORIES = [
  { slug: "club-jersey", label: "Club Jersey" },
  { slug: "country-jersey", label: "Country Jersey" },
  { slug: "retro", label: "Retro" },
  { slug: "jacket", label: "Jacket" },
];
export const SIZES = ["S", "M", "L", "XL", "2XL"];
export const DEFAULT_ADDON_PRICE = 200;
export const PAGE_SIZE = 100;


export const money = (n: number) => `৳${(n ?? 0).toLocaleString()}`;

export const categoryLabel = (slug: string) =>
  CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;

export const toSlug = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const fromSlug = (slug?: string) =>
  (slug ?? "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const field =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary";


const authHeaders = (): Record<string, string> => {
  try {
    const t = localStorage.getItem("adminToken");
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data as T;
}

export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: fd,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.secure_url) throw new Error(data?.error?.message || "Upload failed");
  return data.secure_url as string;
}


export const emptyForm = (): FormState => ({
  name: "",
  category: "club-jersey",
  team: "",
  season: "",
  sleeve: "",
  originalPrice: "",
  discountedPrice: "",
  sizes: [...SIZES],
  images: [""],
  description: "",
  stock: "1",
  isFeatured: false,
  uclEnabled: false,
  uclPrice: String(DEFAULT_ADDON_PRICE),
  printEnabled: false,
  printPrice: String(DEFAULT_ADDON_PRICE),
});

export const formFromProduct = (p: Product): FormState => ({
  name: p.name,
  category: p.category,
  team: fromSlug(p.subcategory),
  season: p.season ?? "",
  sleeve: p.sleeve ?? "",
  originalPrice: String(p.originalPrice),
  discountedPrice: String(p.discountedPrice),
  sizes: p.sizes ?? [],
  images: p.images?.length ? p.images : [""],
  description: p.description ?? "",
  stock: String(p.stock ?? 1),
  isFeatured: Boolean(p.isFeatured),
  uclEnabled: p.addOns?.uclPatch?.enabled === true,
  uclPrice: String(p.addOns?.uclPatch?.price ?? DEFAULT_ADDON_PRICE),
  printEnabled: p.addOns?.customPrint?.enabled === true,
  printPrice: String(p.addOns?.customPrint?.price ?? DEFAULT_ADDON_PRICE),
});
