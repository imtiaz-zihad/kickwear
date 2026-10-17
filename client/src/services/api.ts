import { NewProduct, Product } from "@/types/product";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

// ─── Shared fetch helper ────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit & { next?: { revalidate?: number } } = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, options);

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const err = await res.json();
      message = err?.message || message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  return res.json();
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type PaginatedProducts = {
  total: number;
  page: number;
  totalPages: number;
  data: Product[];
};

export type OrderStatus = "Pending" | "Confirmed" | "Shipped" | "Delivered";

export type DeliveryArea = "dhaka" | "outside";

// One saved order line (prices are a snapshot calculated by the server)
export type OrderItem = {
  productId: string;
  name: string;
  image?: string | null;
  size?: string | null;
  quantity: number;
  basePrice?: number; // jersey price per unit
  uclPatch?: boolean;
  customName?: string | null;
  customNumber?: string | null;
  addOnsPrice?: number; // add-ons per unit
  price: number; // final price per unit (basePrice + addOnsPrice)
};

// What the client sends: selections only, never prices
export type OrderItemInput = {
  productId: string;
  quantity: number;
  size?: string | null;
  uclPatch?: boolean;
  customName?: string | null;
  customNumber?: string | null;
};

export type Order = {
  _id: string;
  customerName: string;
  phone: string;
  address: string;
  items: OrderItem[];
  deliveryArea?: DeliveryArea;
  totalPrice: number;
  deliveryCharge: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderPayload = {
  customerName: string;
  phone: string;
  address: string;
  deliveryArea: DeliveryArea;
  items: OrderItemInput[];
  meta?: { fbp?: string; fbc?: string; sourceUrl?: string };
};

export type GetOrdersResult = {
  total: number;
  page: number;
  data: Order[];
};

// ─── Products ───────────────────────────────────────────────────────────────

// Get all products (paginated) — cached 2 min
export const getProducts = async (
  page = 1,
  limit = 100
): Promise<PaginatedProducts> => {
  const data = await apiFetch<PaginatedProducts>(
    `/products?page=${page}&limit=${limit}`,
    { next: { revalidate: 120 } }
  );
  return data;
};

// Get featured products — cached 5 min
export const getFeaturedProducts = async (limit = 10): Promise<Product[]> => {
  const data = await apiFetch<PaginatedProducts>(
    `/products?featured=true&limit=${limit}`,
    { next: { revalidate: 300 } }
  );
  return data.data ?? [];
};

// Get products by category — cached 2 min
export const getProductsByCategory = async (
  category: string,
  subcategory?: string,
  limit?: number // e.g. 5 for homepage sections; omit to get all
): Promise<Product[]> => {
  const params = new URLSearchParams({ category });
  if (subcategory) params.set("subcategory", subcategory);
  if (limit) params.set("limit", String(limit));

  const data = await apiFetch<PaginatedProducts>(`/products?${params}`, {
    next: { revalidate: 120 },
  });
  return data.data ?? [];
};

// Search products — no cache (user input driven)
export const searchProducts = async (
  query: string,
  page = 1
): Promise<PaginatedProducts> => {
  const params = new URLSearchParams({ search: query, page: String(page) });
  return apiFetch<PaginatedProducts>(`/products?${params}`, {
    cache: "no-store",
  });
};

// Get single product — cached 5 min
export const getSingleProduct = async (id: string): Promise<Product> => {
  return apiFetch<Product>(`/products/${id}`, {
    next: { revalidate: 300 },
  });
};

// Add product — no cache (mutation)
export const addProduct = async (payload: NewProduct): Promise<Product> => {
  return apiFetch<Product>("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
};

// Update product — no cache (mutation)
export const updateProduct = async (
  id: string,
  payload: Partial<Product>
): Promise<Product> => {
  return apiFetch<Product>(`/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
};

// Delete product — no cache (mutation)
export const deleteProduct = async (id: string): Promise<{ message: string }> => {
  return apiFetch<{ message: string }>(`/products/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
};

// ─── Orders ─────────────────────────────────────────────────────────────────

// Create order — no cache (mutation)
export const createOrder = async (
  order: CreateOrderPayload
): Promise<Order> => {
  return apiFetch<Order>("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
    cache: "no-store",
  });
};

// Get all orders (admin) — short cache 30s
export const getOrders = async (
  page = 1,
  limit = 50,
  status?: OrderStatus
): Promise<GetOrdersResult> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set("status", status);

  return apiFetch<GetOrdersResult>(`/orders?${params}`, {
    next: { revalidate: 30 },
  });
};

// Update order status — no cache (mutation)
export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus
): Promise<Order> => {
  return apiFetch<Order>(`/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
    cache: "no-store",
  });
};

// ─── Tracking ───────────────────────────────────────────────────────────────

// Track orders by phone — no cache (always fresh for customer)
export const trackOrdersByPhone = async (phone: string): Promise<Order[]> => {
  return apiFetch<Order[]>(`/orders/track/${phone}`, {
    cache: "no-store",
  });
};