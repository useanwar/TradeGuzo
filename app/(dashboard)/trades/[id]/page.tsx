import { notFound } from "next/navigation";
import { getTradeById, getAllTags, getTradeCandles } from "@/lib/analytics";
import TradeDetail from "@/components/dashboard/TradeDetail";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trade = await getTradeById(id);

  if (!trade) notFound();

  const [allTags, candles] = await Promise.all([getAllTags(), getTradeCandles(id)]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <TradeDetail trade={trade} allTags={allTags} candles={candles} />
    </main>
  );
}