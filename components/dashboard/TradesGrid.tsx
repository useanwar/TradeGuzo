"use client";

import { useRouter } from "next/navigation";
import { ImageOff } from "lucide-react";
import type { RecentTrade } from "@/lib/analytics";

function formatMoney(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export default function TradesGrid({ trades }: { trades: RecentTrade[] }) {
  const router = useRouter();

  if (trades.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-surface p-8 text-center text-text-muted shadow-sm">
        No trades match these filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {trades.map((trade) => (
        <div
          key={trade.id}
          onClick={() => router.push(`/trades/${trade.id}`)}
          className="cursor-pointer overflow-hidden rounded-xl border border-border bg-bg-surface shadow-sm transition-transform hover:scale-[1.02]"
        >
          <div className="flex h-28 items-center justify-center bg-bg-elevated">
            {trade.screenshotUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={trade.screenshotUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageOff size={20} className="text-text-muted" />
            )}
          </div>
          <div className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">{trade.symbol}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  trade.type === "BUY" ? "bg-profit-muted text-profit" : "bg-loss-muted text-loss"
                }`}
              >
                {trade.type}
              </span>
            </div>
            <div
              className={`mt-1 font-mono text-sm font-semibold ${
                trade.netProfit >= 0 ? "text-profit" : "text-loss"
              }`}
            >
              {formatMoney(trade.netProfit)}
            </div>
            <div className="mt-0.5 text-[11px] text-text-muted">
              {trade.closeTime.toISOString().slice(0, 10)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}