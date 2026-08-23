"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Login failed");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-bg-surface p-6 shadow-sm"
      >
        <h1
          className="mb-4 text-2xl font-bold tracking-tight text-text-primary"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Trade<span className="text-profit">G</span>uzo
        </h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="mb-3 w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-text-primary outline-none focus:border-accent"
        />
        {error && (
          <p className="mb-3 text-sm text-loss" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || password.length === 0}
          className="w-full rounded-full bg-accent-dark py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Checking..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}