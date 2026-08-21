"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function TradesFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [symbol, setSymbol] = useState(searchParams.get("symbol") ?? "");
  const result = searchParams.get("result") ?? "all";
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/trades?${params.toString()}`);
  }

  function handleSymbolSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam("symbol", symbol);
  }

  const inputClass =
    "rounded-full border border-border bg-bg-surface px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={handleSymbolSubmit}>
        <input
          placeholder="Search symbol..."
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className={inputClass}
        />
      </form>

      <div className="inline-flex rounded-full border border-border bg-bg-elevated p-1">
        {(["all", "win", "loss"] as const).map((r) => (
          <button
            key={r}
            onClick={() => updateParam("result", r === "all" ? "" : r)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              result === r ? "bg-accent-dark text-white" : "text-text-muted hover:text-text-primary"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <input
        type="date"
        value={dateFrom}
        onChange={(e) => updateParam("from", e.target.value)}
        className={inputClass}
        title="From date"
      />
      <span className="text-xs text-text-muted">to</span>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => updateParam("to", e.target.value)}
        className={inputClass}
        title="To date"
      />

      {(searchParams.get("symbol") || result !== "all" || dateFrom || dateTo) && (
        <button
          onClick={() => router.push("/trades")}
          className="text-xs text-text-muted underline hover:text-text-primary"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}