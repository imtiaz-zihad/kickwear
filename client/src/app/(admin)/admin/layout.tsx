"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Package, ShoppingCart, Store, LogOut } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const admin = localStorage.getItem("admin");
    if (!admin) {
      router.push("/login");
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) return null;

  const menu = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Products", path: "/admin/products", icon: Package },
    { name: "Orders", path: "/admin/orders", icon: ShoppingCart },
  ];

  const handleLogout = () => {
    localStorage.removeItem("admin");
    router.push("/login");
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f4f4f0",
        fontFamily: "sans-serif",
      }}
    >
      {/* SIDEBAR */}
      <div
        style={{
          width: "240px",
          flexShrink: 0,
          background: "#111",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        {/* Top: Logo + Nav */}
        <div style={{ padding: "32px 20px 24px" }}>
          {/* Brand */}
          <div style={{ marginBottom: "36px", paddingLeft: "4px" }}>
            <span
              style={{
                fontSize: "17px",
                fontWeight: "700",
                color: "#f5f5f5",
                letterSpacing: "-0.3px",
                fontFamily: "Georgia, serif",
              }}
            >
              Kick{" "}
            </span>
            <span
              style={{
                fontSize: "17px",
                fontWeight: "700",
                color: "#f97316",
                fontFamily: "Georgia, serif",
              }}
            >
              Wear
            </span>

            <div
              style={{
                marginTop: "6px",
                height: "2px",
                width: "32px",
                background: "linear-gradient(90deg, #f97316, transparent)",
                borderRadius: "2px",
              }}
            />
          </div>

          {/* Nav label */}
          <p
            style={{
              fontSize: "10px",
              fontWeight: "600",
              color: "rgba(255,255,255,0.25)",
              letterSpacing: "1.2px",
              textTransform: "uppercase",
              marginBottom: "12px",
              paddingLeft: "8px",
            }}
          >
            Navigation
          </p>

          {/* Menu items */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {menu.map((item) => {
              const Icon = item.icon;
              const active = path.includes(item.path);
              return (
                <Link key={item.name} href={item.path} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "11px 12px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      background: active
                        ? "linear-gradient(135deg, #f97316, #ea580c)"
                        : "transparent",
                      color: active ? "#fff" : "rgba(255,255,255,0.45)",
                      boxShadow: active ? "0 4px 16px rgba(249,115,22,0.3)" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLDivElement).style.background =
                          "rgba(255,255,255,0.06)";
                        (e.currentTarget as HTMLDivElement).style.color =
                          "rgba(255,255,255,0.75)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLDivElement).style.background = "transparent";
                        (e.currentTarget as HTMLDivElement).style.color =
                          "rgba(255,255,255,0.45)";
                      }
                    }}
                  >
                    <Icon size={16} />
                    <span style={{ fontSize: "13px", fontWeight: "500" }}>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Store + Logout */}
        <div
          style={{
            padding: "20px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <Link href="/" style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "10px",
                color: "rgba(255,255,255,0.35)",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLDivElement).style.color = "rgba(255,255,255,0.7)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "transparent";
                (e.currentTarget as HTMLDivElement).style.color = "rgba(255,255,255,0.35)";
              }}
            >
              <Store size={15} />
              <span>Visit Store</span>
            </div>
          </Link>

          <div
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "10px",
              color: "rgba(255,255,255,0.35)",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background =
                "rgba(239,68,68,0.1)";
              (e.currentTarget as HTMLDivElement).style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = "transparent";
              (e.currentTarget as HTMLDivElement).style.color = "rgba(255,255,255,0.35)";
            }}
          >
            <LogOut size={15} />
            <span>Logout</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, padding: "36px", overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}