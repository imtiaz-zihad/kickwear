"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock } from "lucide-react";

// Set NEXT_PUBLIC_ADMIN_PASSWORD in Vercel (and in client/.env.local for local dev)
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    setError("");

    setTimeout(() => {
      if (ADMIN_PASSWORD && password === ADMIN_PASSWORD) {
        try {
          localStorage.setItem("admin", "true");
        } catch {
          setError("Could not sign in. Please enable browser storage.");
          setLoading(false);
          return;
        }
        router.push("/admin/dashboard");
        return; // keep the loading state while navigating
      }

      setError("Incorrect password. Please try again.");
      setPassword("");
      setLoading(false);
    }, 400);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-secondary/40 px-4 py-10">
      {/* soft background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-112 w-md -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-border/60 bg-card p-7 shadow-xl sm:p-10">
          {/* Brand */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-background shadow-sm">
              <Image
                src="/logo.png"
                alt="Kick Wear"
                width={80}
                height={80}
                priority
                className="h-full w-full object-cover"
              />
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight">
              Kick <span className="text-primary">Wear</span>
            </h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Admin Portal
            </p>
          </div>

          <form onSubmit={handleLogin} noValidate className="space-y-5">
            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium">
                Password
              </label>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  autoFocus
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "admin-password-error" : undefined}
                  className={`h-12 w-full rounded-xl border bg-background pl-10 pr-12 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                    error ? "border-red-500" : "border-border"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && (
                <p id="admin-password-error" role="alert" className="mt-2 text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="inline-flex items-center gap-1.5 font-medium hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to store
          </Link>
          <p>Authorized personnel only</p>
        </div>
      </div>
    </div>
  );
}