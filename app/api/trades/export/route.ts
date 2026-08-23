import { NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const trades = await prisma.trade.findMany({
    orderBy: { closeTime: "desc" },
    include: {
      account: { select: { accountNumber: true, brokerName: true } },
      tags: { include: { tag: true } },
    },
  });

  const rows = trades.map((t) => ({
    ticketId: t.ticketId.toString(),
    accountNumber: t.account.accountNumber.toString(),
    brokerName: t.account.brokerName,
    symbol: t.symbol,
    type: t.type,
    lots: t.lots,
    openPrice: t.openPrice,
    closePrice: t.closePrice,
    stopLoss: t.stopLoss ?? "",
    takeProfit: t.takeProfit ?? "",
    profit: t.profit,
    commission: t.commission,
    swap: t.swap,
    netProfit: t.netProfit,
    openTime: t.openTime.toISOString(),
    closeTime: t.closeTime.toISOString(),
    notes: t.notes ?? "",
    rating: t.rating ?? "",
    followedPlan: t.followedPlan === null ? "" : t.followedPlan,
    isManual: t.isManual,
    // Papa.unparse handles quoting/escaping for us — commas or
    // quotes inside notes/tag names won't break the CSV structure.
    tags: t.tags.map((link) => `${link.tag.name} (${link.tag.category})`).join("; "),
  }));

  const csv = Papa.unparse(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="trades-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}