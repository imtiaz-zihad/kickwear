"use client";

import { useState } from "react";
import {
  MapPin,
  Package,
  Truck,
  CheckCircle,
  Clock,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const STATUS_STEPS = [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
] as const;

const STATUS_CONFIG = {
  Pending: { icon: Clock, color: "text-yellow-500" },
  Confirmed: { icon: CheckCircle, color: "text-blue-500" },
  Shipped: { icon: Truck, color: "text-orange-500" },
  Delivered: { icon: Package, color: "text-green-500" },
} as const;

type Order = {
  _id: string;
  customerName: string;
  phone: string;
  address: string;
  items: { name: string; quantity: number; price: number }[];
  totalPrice: number;
  deliveryCharge: number;
  status: keyof typeof STATUS_CONFIG;
  createdAt: string;
};

function getStepIndex(status: keyof typeof STATUS_CONFIG) {
  return STATUS_STEPS.indexOf(status);
}

export default function TrackOrderPage() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async () => {
    if (!/^01[3-9]\d{8}$/.test(phone)) {
      setError("Enter valid Bangladeshi number (01XXXXXXXXX)");
      return;
    }

    setError("");
    setLoading(true);
    setSearched(false);

    try {
      const res = await fetch(`${BASE_URL}/orders/track/${phone}`, {
        cache: "no-store",
      });

      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setOrders([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl">

        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-3">
            <MapPin className="text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold">Track Your Order</h1>
          <p className="text-gray-500 text-sm">
            Enter your phone number to see shipment status
          </p>
        </div>

        {/* SEARCH BOX */}
        <div className="bg-white shadow-md rounded-2xl p-5 mb-8">
          <div className="flex gap-3">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="flex-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-300 outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleTrack()}
            />

            <Button
              onClick={handleTrack}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 rounded-xl"
            >
              {loading ? "Tracking..." : "Track"}
            </Button>
          </div>

          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* RESULTS */}
        {searched &&
          (orders.length === 0 ? (
            <div className="text-center bg-white p-10 rounded-2xl shadow">
              <Package className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-600 font-medium">
                No orders found
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const currentStep = getStepIndex(order.status);

                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-2xl shadow-md p-6"
                  >
                    {/* TOP INFO */}
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <h2 className="font-semibold text-lg">
                          {order.customerName}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {order.address}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <span className="px-3 py-1 rounded-full text-xs bg-orange-100 text-orange-600 font-medium">
                        {order.status}
                      </span>
                    </div>

                    {/* STEP PROGRESS BAR */}
                    <div className="flex justify-between mb-6 relative">
                      {STATUS_STEPS.map((step, idx) => {
                        const isActive = idx <= currentStep;

                        const Icon =
                          STATUS_CONFIG[step].icon;

                        return (
                          <div
                            key={step}
                            className="flex flex-col items-center flex-1 relative"
                          >
                            {/* line */}
                            {idx !== 0 && (
                              <div
                                className={`absolute top-4 left-[-50%] w-full h-0.5 ${
                                  isActive
                                    ? "bg-orange-500"
                                    : "bg-gray-200"
                                }`}
                              />
                            )}

                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                                isActive
                                  ? "bg-orange-500 text-white"
                                  : "bg-gray-200 text-gray-500"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>

                            <p className="text-xs mt-2 text-gray-500">
                              {step}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* TIMELINE */}
                    <div className="border-l pl-4 space-y-4">
                      {STATUS_STEPS.slice(0, currentStep + 1).map(
                        (step, i) => {

                          return (
                            <div
                              key={i}
                              className="flex items-start gap-3"
                            >
                              <div className="mt-1">
                                <CircleDot className="text-orange-500 w-4 h-4" />
                              </div>

                              <div>
                                <p className="text-sm font-medium">
                                  {step}
                                </p>
                                <p className="text-xs text-gray-400">
                                  Status updated
                                </p>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>

                    {/* TOTAL */}
                    <div className="flex justify-between mt-6 pt-4 border-t text-sm">
                      <span className="text-gray-500">
                        Delivery: ৳{order.deliveryCharge}
                      </span>
                      <span className="font-bold text-orange-500">
                        Total: ৳{order.totalPrice}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
}