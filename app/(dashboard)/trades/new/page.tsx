import { getAllAccounts } from "@/lib/analytics";
import TradeForm from "@/components/dashboard/TradeForm";

export default async function NewTradePage() {
  const accounts = await getAllAccounts();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <h1 className="text-lg font-semibold text-text-primary">Log a Trade</h1>
      <TradeForm accounts={accounts} />
    </main>
  );
}