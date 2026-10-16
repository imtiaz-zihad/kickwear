export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export type OrderStatus = "Pending" | "Confirmed" | "Shipped" | "Delivered";
export const STATUSES: OrderStatus[] = ["Pending", "Confirmed", "Shipped", "Delivered"];

export const STATUS_BADGE: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Confirmed: "bg-green-100 text-green-700",
  Shipped: "bg-orange-100 text-orange-700",
  Delivered: "bg-blue-100 text-blue-700",
};

export type OrderItem = {
  productId: string;
  name: string;
  image?: string | null;
  size?: string | null;
  quantity: number;
  basePrice?: number;
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
  createdAt: string;
};

export const money = (n: number) => `৳${(n ?? 0).toLocaleString()}`;
export const shortId = (o: Order) => o._id.slice(-6).toUpperCase();
export const getArea = (o: Order) => o.deliveryArea ?? (o.deliveryCharge <= 60 ? "dhaka" : "outside");
export const areaLabel = (a: string) => (a === "dhaka" ? "Dhaka" : "Outside Dhaka");
export const itemSize = (o: Order, i: OrderItem) => i.size ?? o.size ?? null;
export const printText = (i: OrderItem) => [i.customName, i.customNumber].filter(Boolean).join(" ");

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
