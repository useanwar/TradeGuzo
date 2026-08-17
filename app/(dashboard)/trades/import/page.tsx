import { getAllAccounts } from "@/lib/analytics";
import ImportForm from "@/components/dashboard/ImportForm";

export default async function ImportTradesPage() {
  const accounts = await getAllAccounts();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <h1 className="text-lg font-semibold text-text-primary">Import Trades</h1>
      <ImportForm accounts={accounts} />
    </main>
  );
}