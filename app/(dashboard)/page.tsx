import { getKpiSummary, getCalendarData, getRecentTrades } from "@/lib/analytics";
import KpiCards from "@/components/dashboard/KpiCards";
import Calendar from "@/components/dashboard/Calendar";
import TradesTable from "@/components/dashboard/TradesTable";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : now.getUTCFullYear();
  const month = params.month ? parseInt(params.month, 10) : now.getUTCMonth() + 1;

  const [summary, calendarDays, recentTrades] = await Promise.all([
    getKpiSummary(),
    getCalendarData(year, month),
    getRecentTrades(20),
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <h1 className="text-lg font-semibold text-text-primary">Trading Journal</h1>

      <KpiCards summary={summary} />
      <Calendar year={year} month={month} days={calendarDays} />

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-text-muted">
          Recent Trades
        </h2>
        <TradesTable trades={recentTrades} />
      </div>
    </main>
  );
}