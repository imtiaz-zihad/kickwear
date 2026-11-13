"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { api } from "./orders/lib";

type State = "loading" | "unsupported" | "denied" | "off" | "on";

const SW_URL = "/admin-sw.js";
const SW_SCOPE = "/admin/";

function keyToBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const supported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export default function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // What is the current state of this phone/browser?
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supported()) return alive && setState("unsupported");
      if (Notification.permission === "denied") return alive && setState("denied");

      try {
        const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
        const sub = await reg?.pushManager.getSubscription();
        if (!alive) return;
        if (sub) {
          setState("on");
          // keep the server copy fresh (harmless if it already exists)
          api("/push/subscribe", { method: "POST", body: JSON.stringify(sub.toJSON()) }).catch(() => {});
        } else {
          setState("off");
        }
      } catch {
        if (alive) setState("off");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
      const reg = await navigator.serviceWorker.ready;

      const { key } = await api<{ key: string }>("/push/key");
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyToBytes(key),
        }));

      await api("/push/subscribe", { method: "POST", body: JSON.stringify(sub.toJSON()) });
      setState("on");
      setMsg("Chalu hoyeche. Test e click kore dekho.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not enable notifications");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api("/push/unsubscribe", {
          method: "POST",
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }, []);

  const test = useCallback(async () => {
    setBusy(true);
    setMsg("");
    try {
      const r = await api<{ sent: number }>("/push/test", { method: "POST" });
      setMsg(r.sent > 0 ? "Test pathano hoyeche." : "Kono phone registered na.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Test failed");
    } finally {
      setBusy(false);
    }
  }, []);

  if (state === "loading") return null;

  if (state === "unsupported") {
    return (
      <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Ei browser phone notification support kore na. Android-e Chrome use koro.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
        Notification block kora ache. Chrome → site settings (lock icon) → Notifications → Allow, tarpor page reload koro.
      </p>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
      {state === "on" ? (
        <>
          <Bell size={16} className="text-green-600" />
          <span className="font-medium text-green-700">Phone notification ON</span>
          <button
            type="button"
            onClick={test}
            disabled={busy}
            className="ml-auto rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
          >
            Test
          </button>
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Turn off
          </button>
        </>
      ) : (
        <>
          <BellOff size={16} className="text-muted-foreground" />
          <span className="font-medium">Dashboard bondho thakleo new order-er notification pete chaw?</span>
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Wait…" : "Turn on"}
          </button>
        </>
      )}
      {msg && <p className="w-full text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}