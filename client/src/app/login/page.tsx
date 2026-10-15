"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "baborsbcollection7575bd";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }
    setLoading(true);
    setError("");

    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        localStorage.setItem("admin", "true");
        router.push("/admin/dashboard");
      } else {
        setError("Incorrect password. Please try again.");
        setPassword("");
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #111 100%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      {/* Subtle background pattern */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 20% 50%, rgba(249,115,22,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(249,115,22,0.03) 0%, transparent 40%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          position: "relative",
        }}
      >
        {/* Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "48px 40px",
            backdropFilter: "blur(12px)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(249,115,22,0.05)",
          }}
        >
          {/* Brand */}
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "56px",
                height: "56px",
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                borderRadius: "16px",
                marginBottom: "20px",
                boxShadow: "0 8px 24px rgba(249,115,22,0.35)",
              }}
            >
              {/* Lock icon SVG */}
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <h1
              style={{
                fontSize: "22px",
                fontWeight: "700",
                color: "#f5f5f5",
                letterSpacing: "-0.3px",
                marginBottom: "6px",
              }}
            >
              Admin Portal
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: "rgba(255,255,255,0.35)",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                fontFamily: "sans-serif",
              }}
            >
              SB Collection BD
            </p>
          </div>

          {/* Divider */}
          <div
            style={{
              height: "1px",
              background: "rgba(255,255,255,0.06)",
              marginBottom: "32px",
            }}
          />

          {/* Password Field */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "600",
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: "10px",
                fontFamily: "sans-serif",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                style={{
                  width: "100%",
                  padding: "14px 48px 14px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: error
                    ? "1px solid rgba(239,68,68,0.6)"
                    : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "#f5f5f5",
                  fontSize: "14px",
                  outline: "none",
                  fontFamily: "sans-serif",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onFocus={(e) => {
                  if (!error) e.target.style.borderColor = "rgba(249,115,22,0.5)";
                  e.target.style.background = "rgba(255,255,255,0.07)";
                }}
                onBlur={(e) => {
                  if (!error) e.target.style.borderColor = "rgba(255,255,255,0.1)";
                  e.target.style.background = "rgba(255,255,255,0.05)";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.3)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <p
                style={{
                  color: "#f87171",
                  fontSize: "12px",
                  marginTop: "8px",
                  fontFamily: "sans-serif",
                }}
              >
                {error}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading
                ? "rgba(249,115,22,0.4)"
                : "linear-gradient(135deg, #f97316, #ea580c)",
              border: "none",
              borderRadius: "12px",
              color: "white",
              fontSize: "14px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "sans-serif",
              letterSpacing: "0.2px",
              boxShadow: loading ? "none" : "0 4px 20px rgba(249,115,22,0.3)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 8px 28px rgba(249,115,22,0.4)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 4px 20px rgba(249,115,22,0.3)";
            }}
          >
            {loading ? "Verifying..." : "Sign In"}
          </button>
        </div>

        {/* Footer note */}
        <p
          style={{
            textAlign: "center",
            marginTop: "24px",
            fontSize: "11px",
            color: "rgba(255,255,255,0.2)",
            fontFamily: "sans-serif",
            letterSpacing: "0.3px",
          }}
        >
          Authorized personnel only
        </p>
      </div>
    </div>
  );
}