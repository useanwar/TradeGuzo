import {
  getWinRateByDayOfWeek,
  getWinRateByHour,
  getEquityCurve,
  getPerformanceByTag,
} from "@/lib/analytics";
import PerformanceBarChart from "@/components/dashboard/PerformanceBarChart";
import EquityCurveChart from "@/components/dashboard/EquityCurveChart";
import TagPerformanceChart from "@/components/dashboard/TagPerPerformanceChart";

export default async function ReportsPage() {
  const [dayStats, hourStats, equityCurve, tagPerformance] = await Promise.all([
    getWinRateByDayOfWeek(),
    getWinRateByHour(),
    getEquityCurve(),
    getPerformanceByTag(),
  ]);

  const dayChartData = dayStats.map((d) => ({
    label: d.day,
    netPnl: d.netPnl,
    winRate: d.winRate,
    tradeCount: d.tradeCount,
  }));

  // Collapse 24 hourly buckets down to only the hours that actually
  // have trades — a full 0-23 axis is mostly empty bars for anyone
  // who trades within a normal few-hour window each day.
  const hourChartData = hourStats
    .filter((h) => h.tradeCount > 0)
    .map((h) => ({
      label: `${h.hour}:00`,
      netPnl: h.netPnl,
      winRate: h.winRate,
      tradeCount: h.tradeCount,
    }));

  const setupTags = tagPerformance.filter((t) => t.category === "SETUP");
  const mistakeTags = tagPerformance.filter((t) => t.category === "MISTAKE");

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <h1 className="text-lg font-semibold text-text-primary">Reports</h1>

      <div className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-text-primary">Equity Curve</h2>
        <p className="mb-3 text-xs text-text-muted">Cumulative net P&L over time</p>
        <EquityCurveChart data={equityCurve} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-text-primary">By Day of Week</h2>
          <p className="mb-3 text-xs text-text-muted">Net P&L per weekday</p>
          <PerformanceBarChart data={dayChartData} />
        </div>

        <div className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-text-primary">By Time of Day</h2>
          <p className="mb-3 text-xs text-text-muted">Net P&L per hour opened (only hours you've traded)</p>
          {hourChartData.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-text-muted">
              No trades yet.
            </div>
          ) : (
            <PerformanceBarChart data={hourChartData} />
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-text-primary">By Setup</h2>
          <p className="mb-3 text-xs text-text-muted">Net P&L per setup tag</p>
          <TagPerformanceChart data={setupTags} />
        </div>

        <div className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-text-primary">By Mistake</h2>
          <p className="mb-3 text-xs text-text-muted">Net P&L per mistake tag — usually the most revealing one</p>
          <TagPerformanceChart data={mistakeTags} />
        </div>
      </div>
    </main>
  );
}