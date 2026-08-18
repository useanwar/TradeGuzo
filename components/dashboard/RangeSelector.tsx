"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { DateRangeKey } from "@/lib/analytics";

const OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "all", label: "All" },
];

export default function RangeSelector({ current }: { current: DateRangeKey }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSelect(key: DateRangeKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "month") {
      // "month" is the default — omit it from the URL to keep links
      // clean, same convention as AccountSelector's "all" option.
      params.delete("range");
    } else {
      params.set("range", key);
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-full border border-border bg-bg-elevated p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => handleSelect(opt.key)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            current === opt.key
              ? "bg-accent-dark text-white"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}