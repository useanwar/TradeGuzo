import {
  getKpiSummary,
  getCalendarData,
  getRecentTrades,
  getAllAccounts,
  getLastSyncedAt,
  getDateRangeBounds,
  type DateRangeKey,
} from "@/lib/analytics";
import Header from "@/components/dashboard/Header";
import KpiCards from "@/components/dashboard/KpiCards";
import RangeSelector from "@/components/dashboard/RangeSelector";
import Calendar from "@/components/dashboard/Calendar";
import TradesTable from "@/components/dashboard/TradesTable";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; account?: string; range?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : now.getUTCFullYear();
  const month = params.month ? parseInt(params.month, 10) : now.getUTCMonth() + 1;
  const tradingAccountId = params.account; // undefined = "All Accounts"

  const validRanges: DateRangeKey[] = ["week", "month", "year", "all"];
  const range: DateRangeKey = validRanges.includes(params.range as DateRangeKey)
    ? (params.range as DateRangeKey)
    : "month"; // default
  const dateRangeBounds = getDateRangeBounds(range);

  const [summary, calendarDays, recentTrades, accounts, lastSyncedAt] = await Promise.all([
    getKpiSummary(tradingAccountId, dateRangeBounds),
    getCalendarData(year, month, tradingAccountId),
    getRecentTrades(20, tradingAccountId),
    getAllAccounts(),
    getLastSyncedAt(),
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <Header accounts={accounts} lastSyncedAt={lastSyncedAt} />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
          Performance
        </h2>
        <RangeSelector current={range} />
      </div>
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