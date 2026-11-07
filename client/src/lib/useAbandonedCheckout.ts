"use client";
// client/src/lib/useAbandonedCheckout.ts
// Saves what the visitor has typed so far (once a valid phone is entered),
// so the shop can follow up if they never press "Place order".
import { useEffect, useRef } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const PHONE = /^01[3-9]\d{8}$/;

function sessionId(): string {
  const fresh = () =>
    Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    let id = localStorage.getItem("ck_sid");
    if (!id) {
      id = fresh();
      localStorage.setItem("ck_sid", id);
    }
    return id;
  } catch {
    return fresh();
  }
}

type Args = {
  enabled: boolean; // false while loading and after the order is placed
  form: {
    customerName: string;
    phone: string;
    address: string;
    deliveryArea: string;
  };
  productId?: string;
  productName?: string;
  size?: string | null;
  quantity?: number;
};

export function useAbandonedCheckout({
  enabled,
  form,
  productId,
  productName,
  size,
  quantity,
}: Args) {
  const sid = useRef<string>("");
  const lastSent = useRef("");
  const latest = useRef<string | null>(null);

  const send = (body: string) => {
    if (!BASE_URL || body === lastSent.current) return;
    lastSent.current = body;
    fetch(`${BASE_URL}/abandoned`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true, // survives the tab being closed
    }).catch(() => {
      /* never bother the customer */
    });
  };

  // Debounced save while typing
  useEffect(() => {
    if (!enabled || !PHONE.test(form.phone)) {
      latest.current = null;
      return;
    }
    if (!sid.current) sid.current = sessionId();

    const body = JSON.stringify({
      sessionId: sid.current,
      customerName: form.customerName,
      phone: form.phone,
      address: form.address,
      deliveryArea: form.deliveryArea,
      productId,
      productName,
      size,
      quantity,
    });
    latest.current = body;

    const t = setTimeout(() => send(body), 1500);
    return () => clearTimeout(t);
   
  }, [enabled, form, productId, productName, size, quantity]);

  // Flush immediately when the visitor leaves / switches app
  useEffect(() => {
    if (!enabled) return;
    const flush = () => {
      if (document.visibilityState === "hidden" && latest.current) {
        send(latest.current);
      }
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [enabled]);
}
