"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, ImagePlus } from "lucide-react";
import type { TradeDetail as TradeDetailType, TagOption } from "@/lib/analytics";

function formatMoney(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

const CATEGORY_STYLES: Record<string, string> = {
  SETUP: "bg-profit-muted text-profit",
  MISTAKE: "bg-loss-muted text-loss",
  EMOTION: "bg-bg-elevated text-text-muted",
};

export default function TradeDetail({
  trade,
  allTags,
}: {
  trade: TradeDetailType;
  allTags: TagOption[];
}) {
  const router = useRouter();

  const [notes, setNotes] = useState(trade.notes ?? "");
  const [notesSaved, setNotesSaved] = useState(true);
  const [rating, setRating] = useState(trade.rating);
  const [followedPlan, setFollowedPlan] = useState(trade.followedPlan);
  const [tags, setTags] = useState(trade.tags);
  const [screenshots, setScreenshots] = useState(trade.screenshots);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUploadScreenshot(file: File) {
    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/trades/${trade.id}/screenshots`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    setUploading(false);

    if (!res.ok) {
      setUploadError(data.error ?? "Upload failed");
      return;
    }

    setScreenshots((prev) => [...prev, data.screenshot]);
  }

  async function handleDeleteScreenshot(screenshotId: string) {
    setScreenshots((prev) => prev.filter((s) => s.id !== screenshotId));
    await fetch(`/api/trades/${trade.id}/screenshots/${screenshotId}`, { method: "DELETE" });
  }
  const [newTagName, setNewTagName] = useState("");
  const [newTagCategory, setNewTagCategory] = useState<"SETUP" | "MISTAKE" | "EMOTION">("SETUP");

  async function patchTrade(fields: Record<string, unknown>) {
    await fetch(`/api/trades/${trade.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
  }

  async function handleSaveNotes() {
    await patchTrade({ notes });
    setNotesSaved(true);
  }

  async function handleSetRating(value: number) {
    const next = rating === value ? null : value; // click same star again to clear
    setRating(next);
    await patchTrade({ rating: next });
  }

  async function handleSetFollowedPlan(value: boolean | null) {
    setFollowedPlan(value);
    await patchTrade({ followedPlan: value });
  }

  async function handleAddTag() {
    if (!newTagName.trim()) return;
    const res = await fetch(`/api/trades/${trade.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim(), category: newTagCategory }),
    });
    const data = await res.json();
    if (res.ok) {
      setTags((prev) => [...prev, { id: data.tag.id, name: data.tag.name, category: data.tag.category }]);
      setNewTagName("");
    }
  }

  async function handleRemoveTag(tagId: string) {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    await fetch(`/api/trades/${trade.id}/tags/${tagId}`, { method: "DELETE" });
  }

  async function handleQuickAddTag(t: TagOption) {
    setTags((prev) => [...prev, t]);
    await fetch(`/api/trades/${trade.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: t.name, category: t.category }),
    });
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent";

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Header */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-text-primary">{trade.symbol}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                trade.type === "BUY" ? "bg-profit-muted text-profit" : "bg-loss-muted text-loss"
              }`}
            >
              {trade.type}
            </span>
            {trade.isManual && (
              <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-xs font-medium text-text-muted">
                Manual
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {trade.account.brokerName} · #{trade.account.accountNumber}
          </p>
        </div>
        <div className={`font-mono text-xl font-semibold ${trade.netProfit >= 0 ? "text-profit" : "text-loss"}`}>
          {formatMoney(trade.netProfit)}
        </div>
      </div>

      {/* Execution breakdown */}
      <div className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
          Execution
        </h2>
        <div className="grid grid-cols-2 gap-4 font-mono text-sm sm:grid-cols-3">
          <div><span className="block text-xs text-text-muted">Lots</span>{trade.lots.toFixed(2)}</div>
          <div><span className="block text-xs text-text-muted">Open Price</span>{trade.openPrice.toFixed(5)}</div>
          <div><span className="block text-xs text-text-muted">Close Price</span>{trade.closePrice.toFixed(5)}</div>
          <div><span className="block text-xs text-text-muted">Stop Loss</span>{trade.stopLoss?.toFixed(5) ?? "—"}</div>
          <div><span className="block text-xs text-text-muted">Take Profit</span>{trade.takeProfit?.toFixed(5) ?? "—"}</div>
          <div><span className="block text-xs text-text-muted">Commission</span>{formatMoney(trade.commission)}</div>
          <div><span className="block text-xs text-text-muted">Swap</span>{formatMoney(trade.swap)}</div>
          <div><span className="block text-xs text-text-muted">Gross Profit</span>{formatMoney(trade.profit)}</div>
          <div>
            <span className="block text-xs text-text-muted">Max Adverse (MAE)</span>
            {trade.mae !== null && trade.mae !== undefined && typeof trade.mae === "number" && isFinite(trade.mae) ? (
              <span className="text-loss">{formatMoney(trade.mae)}</span>
            ) : (
              <span className="text-text-muted">Not tracked</span>
            )}
          </div>
          <div>
            <span className="block text-xs text-text-muted">Max Favorable (MFE)</span>
            {trade.mfe !== null && trade.mfe !== undefined && typeof trade.mfe === "number" && isFinite(trade.mfe) ? (
              <span className="text-profit">{formatMoney(trade.mfe)}</span>
            ) : (
              <span className="text-text-muted">Not tracked</span>
            )}
          </div>
          <div><span className="block text-xs text-text-muted">Opened</span>{trade.openTime.toISOString().slice(0, 16).replace("T", " ")}</div>
          <div><span className="block text-xs text-text-muted">Closed</span>{trade.closeTime.toISOString().slice(0, 16).replace("T", " ")}</div>
        </div>
      </div>

      {/* Rule adherence + rating */}
      <div className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
          Review
        </h2>

        <div className="mb-4">
          <p className="mb-1.5 text-xs text-text-muted">Followed your plan?</p>
          <div className="flex gap-2">
            {([["yes", true], ["no", false], ["Not reviewed", null]] as const).map(([label, val]) => (
              <button
                key={label}
                onClick={() => handleSetFollowedPlan(val)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  followedPlan === val ? "bg-accent-dark text-white" : "bg-bg-elevated text-text-muted"
                }`}
              >
                {label === "yes" ? "Yes" : label === "no" ? "No" : label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs text-text-muted">Execution rating</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => handleSetRating(n)}
                className={`h-8 w-8 rounded-lg text-sm font-medium ${
                  rating !== null && n <= rating ? "bg-accent text-white" : "bg-bg-elevated text-text-muted"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
          Tags
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {tags.length === 0 && <p className="text-sm text-text-muted">No tags yet.</p>}
          {tags.map((tag) => (
            <span
              key={tag.id}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_STYLES[tag.category]}`}
            >
              #{tag.name}
              <button onClick={() => handleRemoveTag(tag.id)}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
            className={inputClass}
          />
          <select
            value={newTagCategory}
            onChange={(e) => setNewTagCategory(e.target.value as any)}
            className={inputClass}
          >
            <option value="SETUP">Setup</option>
            <option value="MISTAKE">Mistake</option>
            <option value="EMOTION">Emotion</option>
          </select>
          <button
            onClick={handleAddTag}
            className="whitespace-nowrap rounded-lg bg-accent-dark px-3 py-2 text-sm font-medium text-white"
          >
            Add
          </button>
        </div>
        {allTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {allTags
              .filter((t) => !tags.some((existing) => existing.id === t.id))
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleQuickAddTag(t)}
                  className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted hover:bg-bg-elevated"
                >
                  + #{t.name}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Screenshots */}
      <div className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
          Screenshots
        </h2>

        {screenshots.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {screenshots.map((s) => (
              <div key={s.id} className="group relative overflow-hidden rounded-lg border border-border">
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.url} alt={s.label ?? "Trade screenshot"} className="h-32 w-full object-cover" />
                </a>
                <button
                  onClick={() => handleDeleteScreenshot(s.id)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-bg-surface/90 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-loss"
                  title="Remove screenshot"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUploadScreenshot(e.target.files[0])}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-bg-elevated disabled:opacity-50"
        >
          <ImagePlus size={14} />
          {uploading ? "Uploading..." : "Add Screenshot"}
        </button>
        {uploadError && <p className="mt-2 text-xs text-loss">{uploadError}</p>}
      </div>

      {/* Notes */}
      <div className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
          Notes
        </h2>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
          rows={5}
          className={inputClass}
        />
        <button
          onClick={handleSaveNotes}
          disabled={notesSaved}
          className="mt-2 rounded-full bg-accent-dark px-4 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        >
          {notesSaved ? "Saved" : "Save Notes"}
        </button>
      </div>
    </div>
  );
}