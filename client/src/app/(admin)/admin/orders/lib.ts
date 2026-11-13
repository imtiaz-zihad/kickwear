export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export const STATUSES: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

export const STATUS_BADGE: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Confirmed: "bg-green-100 text-green-700",
  Shipped: "bg-orange-100 text-orange-700",
  Delivered: "bg-blue-100 text-blue-700",
  Cancelled: "bg-red-100 text-red-700",
};

export type OrderSource =
  | "web"
  | "messenger"
  | "whatsapp"
  | "instagram"
  | "phone";

export const SOURCE_LABEL: Record<OrderSource, string> = {
  web: "Website",
  messenger: "Messenger",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  phone: "Phone",
};

export type OrderItem = {
  productId: string;
  name: string;
  image?: string | null;
  size?: string | null;
  quantity: number;
  basePrice?: number;
  sizeExtra?: number; // extra for 3XL / 4XL per unit
  uclPatch?: boolean;
  customName?: string | null;
  customNumber?: string | null;
  addOnsPrice?: number;
  price: number; // final price per unit
};

export type Order = {
  _id: string;
  customerName: string;
  phone: string;
  address: string;
  size?: string | null; // legacy: old orders kept one size here
  items: OrderItem[];
  deliveryArea?: "dhaka" | "outside";
  totalPrice: number;
  deliveryCharge: number;
  status: OrderStatus;
  source?: OrderSource;
  edited?: boolean;
  isPreorder?: boolean;
  preorderNote?: string;
  originalTotal?: number | null;
  createdAt: string;
};

// what the admin can change on an existing order
export type EditPayload = {
  items?: { size?: string | null; quantity?: number; price?: number }[];
  deliveryCharge?: number;
};

export const money = (n: number) => `৳${(n ?? 0).toLocaleString()}`;
export const shortId = (o: Order) => o._id.slice(-6).toUpperCase();
export const getArea = (o: Order) =>
  o.deliveryArea ?? (o.deliveryCharge <= 60 ? "dhaka" : "outside");
export const areaLabel = (a: string) =>
  a === "dhaka" ? "Dhaka" : "Outside Dhaka";
export const itemSize = (o: Order, i: OrderItem) => i.size ?? o.size ?? null;
export const printText = (i: OrderItem) =>
  [i.customName, i.customNumber].filter(Boolean).join(" ");

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

  // token missing/expired: back to the login page
  if (res.status === 401 && typeof window !== "undefined") {
    try {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("admin");
    } catch {}
    window.location.href = "/login";
  }

  const data = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(data?.message || `Request failed (${res.status})`);
  return data as T;
}
