import { getFilteredTrades, getAllAccounts } from "@/lib/analytics";
import AccountSelector from "@/components/dashboard/Accountselector";
import TradesFilterBar from "@/components/dashboard/TradesFilterBar";
import TradesTable from "@/components/dashboard/TradesTable";
import TradesGrid from "@/components/dashboard/TradesGrid";
import ViewToggle from "@/components/dashboard/ViewToggle";

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{
    symbol?: string;
    account?: string;
    result?: string;
    from?: string;
    to?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const accounts = await getAllAccounts();
  const view = params.view === "grid" ? "grid" : "list";

  const trades = await getFilteredTrades({
    symbol: params.symbol || undefined,
    tradingAccountId: params.account || undefined,
    result: params.result === "win" || params.result === "loss" ? params.result : undefined,
    dateFrom: params.from ? new Date(params.from) : undefined,
    // Add a day minus 1ms so "to" is inclusive of the whole selected
    // day, not just up to midnight at its start.
    dateTo: params.to ? new Date(new Date(params.to).getTime() + 24 * 60 * 60 * 1000 - 1) : undefined,
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-text-primary">Trades</h1>
        <AccountSelector accounts={accounts} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TradesFilterBar />
        <ViewToggle />
      </div>

      <p className="text-xs text-text-muted">
        {trades.length} trade{trades.length === 1 ? "" : "s"}
      </p>

      {view === "grid" ? <TradesGrid trades={trades} /> : <TradesTable trades={trades} />}
    </main>
  );
}