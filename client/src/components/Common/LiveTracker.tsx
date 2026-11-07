"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;
const INTERVAL = 20_000;

const randomId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

// per-tab id for "online now"
function getSessionId(): string {
  try {
    let id = sessionStorage.getItem("live_id");
    if (!id) {
      id = randomId();
      sessionStorage.setItem("live_id", id);
    }
    return id;
  } catch {
    return randomId();
  }
}

// per-browser id for "unique visitors" (kept until the visitor clears site data)
function getVisitorId(): string | undefined {
  try {
    let id = localStorage.getItem("vid");
    if (!id) {
      id = randomId();
      localStorage.setItem("vid", id);
    }
    return id;
  } catch {
    return undefined;
  }
}

const cleanSrc = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 30) || "other";

// Where did this visit come from? utm_source wins, then the referrer.
function detectSource(): string {
  try {
    const utm = new URLSearchParams(window.location.search).get("utm_source");
    if (utm) return cleanSrc(utm);

    if (!document.referrer) return "direct";
    const host = new URL(document.referrer).hostname.replace(/^www\./, "");
    if (host === window.location.hostname.replace(/^www\./, "")) return "direct";
    if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(host)) return "facebook";
    if (/(^|\.)(messenger\.com|m\.me)$/.test(host)) return "msgr";
    if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
    if (/(^|\.)google\./.test(host)) return "google";
    if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(host)) return "whatsapp";
    return cleanSrc(host);
  } catch {
    return "direct";
  }
}

// The source is decided once per tab session and reused on later pages.
// `landing` is true only for the first page of the session.
function getSource(): { src: string; landing: boolean } {
  try {
    const saved = sessionStorage.getItem("src");
    if (saved) return { src: saved, landing: false };
    const src = detectSource();
    sessionStorage.setItem("src", src);
    return { src, landing: true };
  } catch {
    return { src: detectSource(), landing: false };
  }
}

// Run once in your own browser's console to stop counting your visits:
//   localStorage.setItem("noTrack", "1")
function optedOut(): boolean {
  try {
    return localStorage.getItem("noTrack") === "1";
  } catch {
    return false;
  }
}

function post(endpoint: string, body: unknown) {
  fetch(`${API}/live/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

export default function LiveTracker() {
  const pathname = usePathname();
  const lastView = useRef<string | null>(null);

  useEffect(() => {
    if (!API || pathname.startsWith("/admin") || pathname.startsWith("/login")) {
      return;
    }
    if (optedOut()) return;

    // 1) lifetime page view (+ unique visitor + source): once per page
    if (lastView.current !== pathname) {
      lastView.current = pathname;
      const { src, landing } = getSource();
      post("view", { path: pathname, vid: getVisitorId(), src, landing });
    }

    // 2) live presence: every 20s while the tab is visible
    const id = getSessionId();
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      post("ping", { id, path: pathname });
    };

    ping();
    const timer = setInterval(ping, INTERVAL);
    document.addEventListener("visibilitychange", ping);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [pathname]);

  return null;
}