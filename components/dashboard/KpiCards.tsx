import type { KpiSummary } from "@/lib/analytics";

function formatMoney(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export default function KpiCards({ summary }: { summary: KpiSummary }) {
  const secondaryCards = [
    { label: "Win Rate", value: `${summary.winRate.toFixed(1)}%` },
    {
      label: "Profit Factor",
      value: summary.profitFactor === null ? "—" : summary.profitFactor.toFixed(2),
    },
    { label: "Avg Win / Loss", value: `${formatMoney(summary.avgWin)} / ${formatMoney(summary.avgLoss)}` },
    { label: "Total Trades", value: String(summary.totalTrades) },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {/* Hero card — solid brand color, mirrors the "Visa card" /
          "Activity" tile pattern from the reference designs. Stays
          sage green regardless of sign (it's the app's signature
          tile, not a pass/fail signal) — the number itself still
          reads clearly as a loss via its own color and "−" sign.
          Strict functional green/red is reserved for the calendar
          and trades table, where color is the primary signal. */}
      <div className="rounded-2xl bg-accent-dark p-5 text-white shadow-sm lg:col-span-1">
        <div className="text-xs font-medium uppercase tracking-wide text-white/70">
          Net P&L
        </div>
        <div
          className={`mt-2 font-mono text-2xl font-semibold ${
            summary.netPnl >= 0 ? "text-white" : "text-red-200"
          }`}
        >
          {formatMoney(summary.netPnl)}
        </div>
      </div>

      {secondaryCards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {card.label}
          </div>
          <div className="mt-2 font-mono text-xl font-semibold text-text-primary">
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}