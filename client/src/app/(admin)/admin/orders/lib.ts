export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Collecting"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export const STATUSES: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Collecting",
  "Shipped",
  "Delivered",
  "Cancelled",
];

export const STATUS_BADGE: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Confirmed: "bg-green-100 text-green-700",
  Collecting: "bg-violet-100 text-violet-700",
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

// Steadfast delivery record of the customer (filled by the server)
export type Risk = {
  percent: number | null; // % of parcels not delivered (null = new customer)
  level: "new" | "low" | "medium" | "high";
  deliveryPercent: number | null;
  cancelPercent: number | null;
  reports: number;
  volume?: string;
  checkedAt?: string;
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
  risk?: Risk;
  isPreorder?: boolean;
  preorderNote?: string;
  originalTotal?: number | null;
  advancePaid?: number; // paid before delivery; the rest is Cash on Delivery
  advanceMethod?: string;
  advanceTrxId?: string;
  createdAt: string;
};

// a jersey the admin adds to an existing order (the server sets the prices)
export type NewItemInput = {
  productId: string;
  quantity: number;
  size: string | null;
  uclPatch: boolean;
  customName: string | null;
  customNumber: string | null;
};

// what the admin can change on an existing order
export type EditPayload = {
  items?: { size?: string | null; quantity?: number; price?: number }[];
  deliveryCharge?: number;
  addItems?: NewItemInput[]; // new jerseys (appended after the existing ones)
};

// answer of POST /orders/:id/merge
export type MergeResult = { order: Order; cancelled: Order };

// what the admin sends to record an advance payment
export type AdvancePayload = { amount: number; method: string; trxId: string };

export const ADVANCE_METHODS = [
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "rocket", label: "Rocket" },
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
];

// amount the courier must collect on delivery
export const dueAmount = (o: Order) =>
  Math.max(0, o.totalPrice - (o.advancePaid ?? 0));

export const money = (n: number) => `৳${(n ?? 0).toLocaleString()}`;
export const shortId = (o: Order) => o._id.slice(-6).toUpperCase();
export const getArea = (o: Order) =>
  o.deliveryArea ?? (o.deliveryCharge <= 60 ? "dhaka" : "outside");
export const areaLabel = (a: string) =>
  a === "dhaka" ? "Dhaka" : "Outside Dhaka";
export const itemSize = (o: Order, i: OrderItem) => i.size ?? o.size ?? null;
export const printText = (i: OrderItem) =>
  [i.customName, i.customNumber].filter(Boolean).join(" ");

// WhatsApp message to the customer: what they ordered, the amount, and a
// question asking them to confirm. (Pending orders ask to confirm; later
// statuses only send the summary.)
export const orderWhatsAppText = (o: Order): string => {
  const lines: string[] = [
    `আসসালামু আলাইকুম ${o.customerName}, Kick Wear থেকে বলছি। 😊`,
    "",
    `আপনার অর্ডার #${shortId(o)}${o.isPreorder ? " (Pre-order)" : ""}:`,
    "",
  ];

  o.items.forEach((it, i) => {
    const parts = [
      it.name,
      itemSize(o, it) && `Size ${itemSize(o, it)}`,
      it.uclPatch && "UCL patch",
      printText(it) && `Print: ${printText(it)}`,
    ].filter(Boolean);
    lines.push(
      `${i + 1}) ${parts.join(" | ")} × ${it.quantity} = ${money(it.price * it.quantity)}`,
    );
  });

  lines.push("");
  lines.push(`🚚 Delivery (${areaLabel(getArea(o))}): ${money(o.deliveryCharge)}`);
  lines.push(`✅ Total: ${money(o.totalPrice)}`);
  if ((o.advancePaid ?? 0) > 0) {
    lines.push(`💵 Advance paid: ${money(o.advancePaid ?? 0)}`);
    lines.push(`💰 Delivery-র সময় দিতে হবে: ${money(dueAmount(o))}`);
  } else {
    lines.push("💰 Cash on Delivery");
  }

  if (o.address) lines.push("", `📍 ${o.address}`);
  if (o.isPreorder && o.preorderNote) lines.push("", `⏳ Pre-order: ${o.preorderNote}`);

  if (o.status === "Pending") {
    lines.push("", 'আপনার অর্ডারটি কি আমরা কনফার্ম করবো? কনফার্ম করতে "হ্যাঁ" লিখে রিপ্লাই দিন। 🙏');
  } else {
    lines.push("", `অর্ডারের বর্তমান অবস্থা: ${o.status}`);
  }

  return lines.join("\n");
};

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