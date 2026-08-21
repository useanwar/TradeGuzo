"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { List, LayoutGrid } from "lucide-react";

export default function ViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "grid" ? "grid" : "list";

  function setView(next: "list" | "grid") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "list") {
      params.delete("view"); // list is the default, keep URL clean
    } else {
      params.set("view", next);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-full border border-border bg-bg-elevated p-1">
      <button
        onClick={() => setView("list")}
        title="List view"
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
          view === "list" ? "bg-accent-dark text-white" : "text-text-muted hover:text-text-primary"
        }`}
      >
        <List size={14} />
      </button>
      <button
        onClick={() => setView("grid")}
        title="Grid view"
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
          view === "grid" ? "bg-accent-dark text-white" : "text-text-muted hover:text-text-primary"
        }`}
      >
        <LayoutGrid size={14} />
      </button>
    </div>
  );
}