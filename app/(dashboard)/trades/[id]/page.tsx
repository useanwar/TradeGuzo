import { notFound } from "next/navigation";
import { getTradeById, getAllTags } from "@/lib/analytics";
import TradeDetail from "@/components/dashboard/TradeDetail";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [trade, allTags] = await Promise.all([getTradeById(id), getAllTags()]);

  if (!trade) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <TradeDetail trade={trade} allTags={allTags} />
    </main>
  );
}