"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { TagWithCount } from "@/lib/analytics";

const CATEGORY_STYLES: Record<string, string> = {
  SETUP: "bg-profit-muted text-profit",
  MISTAKE: "bg-loss-muted text-loss",
  EMOTION: "bg-bg-elevated text-text-muted",
};

export default function TagsSettings({ tags }: { tags: TagWithCount[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"SETUP" | "MISTAKE" | "EMOTION">("SETUP");

  function startEditing(tag: TagWithCount) {
    setEditingId(tag.id);
    setName(tag.name);
    setCategory(tag.category);
  }

  async function handleSave(id: string) {
    await fetch(`/api/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category }),
    });
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string, tradeCount: number) {
    if (tradeCount > 0) {
      const confirmed = confirm(
        `This tag is used on ${tradeCount} trade${tradeCount === 1 ? "" : "s"}. Delete it anyway? The trades themselves won't be affected, just this tag.`
      );
      if (!confirmed) return;
    }
    await fetch(`/api/tags/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const inputClass =
    "rounded-lg border border-border bg-bg-surface px-2 py-1 text-sm text-text-primary outline-none focus:border-accent";

  if (tags.length === 0) {
    return <p className="text-sm text-text-muted">No tags yet — add some from any trade's detail page.</p>;
  }

  return (
    <div className="space-y-2">
      {tags.map((tag) => (
        <div key={tag.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
          {editingId === tag.id ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className={inputClass}
              >
                <option value="SETUP">Setup</option>
                <option value="MISTAKE">Mistake</option>
                <option value="EMOTION">Emotion</option>
              </select>
              <button
                onClick={() => handleSave(tag.id)}
                className="rounded-lg bg-accent-dark px-3 py-1 text-sm font-medium text-white"
              >
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="rounded-lg bg-bg-elevated px-3 py-1 text-sm text-text-muted"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[tag.category]}`}>
                  #{tag.name}
                </span>
                <span className="text-xs text-text-muted">
                  {tag.tradeCount} trade{tag.tradeCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEditing(tag)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-text-muted hover:bg-bg-elevated"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(tag.id, tag.tradeCount)}
                  className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-loss hover:bg-loss-muted"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}