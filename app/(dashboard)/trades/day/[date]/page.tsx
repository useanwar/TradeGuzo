import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTradesForDay } from "@/lib/analytics";
import TradesTable from "@/components/dashboard/TradesTable";

function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function DayTradesPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const trades = await getTradesForDay(date);

  const netPnl = trades.reduce((sum, t) => sum + t.netProfit, 0);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <Link href="/" className="flex w-fit items-center gap-1 text-sm text-text-muted hover:text-text-primary">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">{formatDateLabel(date)}</h1>
          <p className="text-xs text-text-muted">
            {trades.length} trade{trades.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className={`font-mono text-xl font-semibold ${netPnl >= 0 ? "text-profit" : "text-loss"}`}>
          {netPnl >= 0 ? "+" : "-"}${Math.abs(netPnl).toFixed(2)}
        </div>
      </div>

      <TradesTable trades={trades} />
    </main>
  );
}