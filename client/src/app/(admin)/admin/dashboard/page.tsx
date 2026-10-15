"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Clock,
  CheckCircle,
} from "lucide-react";

type OrderItem = {
  name: string;
  size?: string | null;
  quantity: number;
  uclPatch?: boolean;
  customName?: string | null;
  customNumber?: string | null;
};

type Order = {
  _id: string;
  customerName: string;
  size?: string | null; // legacy
  items: OrderItem[];
  totalPrice: number; // items + delivery (delivery is already included)
  status: string;
  createdAt: string;
};

const money = (n: number) => `৳${n.toLocaleString()}`;

export default function Dashboard() {
  const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const isAdmin = localStorage.getItem("admin");
    if (!isAdmin) {
      router.push("/login");
      return;
    }

    setAuthorized(true);

    (async () => {
      try {
        const [orderRes, productRes] = await Promise.all([
          fetch(`${BASE_URL}/orders?limit=500`),
          fetch(`${BASE_URL}/products?limit=1`), // only need the total count
        ]);
        if (!orderRes.ok) {
          const body = await orderRes.text();
          throw new Error(
            `orders ${orderRes.status} ${orderRes.url} → ${body.slice(0, 200)}`,
          );
        }

        const ordersRaw = await orderRes.json();
        const list: Order[] = Array.isArray(ordersRaw)
          ? ordersRaw
          : (ordersRaw?.data ?? []);
        setOrders(list);
        setTotalOrders(ordersRaw?.total ?? list.length);

        if (productRes.ok) {
          const productsData = await productRes.json();
          setTotalProducts(
            productsData?.total ?? productsData?.data?.length ?? 0,
          );
        }
      } catch (err) {
        console.error("Error loading dashboard:", err);
        setError("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [BASE_URL, router]);

  if (!authorized) return null;

  // totalPrice already includes delivery, so don't add deliveryCharge again
  const revenue = orders.reduce((sum, o) => sum + (o.totalPrice ?? 0), 0);
  const pending = orders.filter(
    (o) => o.status?.toLowerCase() === "pending",
  ).length;
  const delivered = orders.filter(
    (o) => o.status?.toLowerCase() === "delivered",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Welcome back to your admin panel</p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>
      )}

      <div className="grid gap-6 md:grid-cols-5">
        <Card title="Total Products" value={totalProducts} icon={<Package />} />
        <Card
          title="Total Orders"
          value={totalOrders}
          icon={<ShoppingCart />}
        />
        <Card title="Revenue" value={money(revenue)} icon={<TrendingUp />} />
        <Card title="Pending" value={pending} icon={<Clock />} />
        <Card title="Delivered" value={delivered} icon={<CheckCircle />} />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Recent Orders</h2>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-400">No orders found</p>
        ) : (
          <div className="space-y-4">
            {[...orders]
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .slice(0, 10)
              .map((order) => (
                <RecentOrder key={order._id} order={order} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h2 className="text-2xl font-bold">{value}</h2>
      </div>
      <div className="rounded-xl bg-orange-100 p-3 text-orange-500">{icon}</div>
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-600",
  confirmed: "bg-green-100 text-green-600",
  shipped: "bg-orange-100 text-orange-600",
  delivered: "bg-blue-100 text-blue-600",
};

// "Man City Home 26/27 · XL · UCL · MESSI 10"
function summarize(order: Order): string {
  const item = order.items?.[0];
  if (!item) return "";
  const size = item.size ?? order.size;
  const print = [item.customName, item.customNumber].filter(Boolean).join(" ");
  const parts = [
    item.name,
    size,
    item.uclPatch && "UCL patch",
    print && `Print: ${print}`,
  ].filter(Boolean);
  const more = order.items.length > 1 ? ` +${order.items.length - 1} more` : "";
  return parts.join(" · ") + more;
}

function RecentOrder({ order }: { order: Order }) {
  const status = order.status?.toLowerCase() ?? "";
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3">
      <div className="min-w-0">
        <p className="font-semibold">{order.customerName}</p>
        <p className="truncate text-sm text-gray-600">{summarize(order)}</p>
        <p className="text-xs text-gray-400">
          {new Date(order.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <span
          className={`rounded-full px-3 py-1 text-xs ${STATUS_COLOR[status] ?? "bg-gray-100 text-gray-600"}`}
        >
          {order.status}
        </span>
        <p className="font-semibold">{money(order.totalPrice ?? 0)}</p>
      </div>
    </div>
  );
}
