"use client";

import { useRouter } from "next/navigation";
import type { RecentTrade } from "@/lib/analytics";

function formatMoney(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export default function TradesTable({ trades }: { trades: RecentTrade[] }) {
  const router = useRouter();

  if (trades.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-surface p-8 text-center text-text-muted shadow-sm">
        No trades yet. Once your EA sends a closed trade, it'll show up here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
            <th className="px-4 py-3 font-medium">Symbol</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Lots</th>
            <th className="px-4 py-3 font-medium">Open</th>
            <th className="px-4 py-3 font-medium">Close</th>
            <th className="px-4 py-3 font-medium">Net P&L</th>
            <th className="px-4 py-3 font-medium">Closed</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr
              key={trade.id}
              onClick={() => router.push(`/trades/${trade.id}`)}
              className="cursor-pointer border-b border-border last:border-0 hover:bg-bg-elevated"
            >
              <td className="px-4 py-3 font-medium text-text-primary">{trade.symbol}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    trade.type === "BUY"
                      ? "bg-profit-muted text-profit"
                      : "bg-loss-muted text-loss"
                  }`}
                >
                  {trade.type}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-text-primary">{trade.lots.toFixed(2)}</td>
              <td className="px-4 py-3 font-mono text-text-muted">{trade.openPrice.toFixed(5)}</td>
              <td className="px-4 py-3 font-mono text-text-muted">{trade.closePrice.toFixed(5)}</td>
              <td
                className={`px-4 py-3 font-mono font-semibold ${
                  trade.netProfit >= 0 ? "text-profit" : "text-loss"
                }`}
              >
                {formatMoney(trade.netProfit)}
              </td>
              <td className="px-4 py-3 text-text-muted">
                {trade.closeTime.toISOString().slice(0, 16).replace("T", " ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}