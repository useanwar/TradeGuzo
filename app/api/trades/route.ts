import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    tradingAccountId,
    symbol,
    type, // "BUY" | "SELL"
    lots,
    openPrice,
    closePrice,
    stopLoss,
    takeProfit,
    profit,
    commission = 0,
    swap = 0,
    openTime,
    closeTime,
    notes,
    rating,
    followedPlan,
  } = body;

  if (!tradingAccountId || !symbol || !type || !openPrice || !closePrice || profit === undefined) {
    return NextResponse.json(
      { error: "Missing required trade fields" },
      { status: 400 }
    );
  }

  const netProfit = profit - commission - swap;

  // Real trades get their ticketId from MT5. Manual entries have no
  // such thing, so we synthesize one from the current timestamp —
  // ticketId still needs SOME unique value to satisfy the schema's
  // @unique constraint, but isManual is what actually marks this as
  // hand-entered, not the ticketId itself.
  const syntheticTicketId = BigInt(Date.now());

  const trade = await prisma.trade.create({
    data: {
      ticketId: syntheticTicketId,
      symbol,
      type,
      lots,
      openPrice,
      closePrice,
      stopLoss,
      takeProfit,
      profit,
      commission,
      swap,
      netProfit,
      openTime: new Date(openTime),
      closeTime: new Date(closeTime),
      notes,
      rating,
      followedPlan,
      isManual: true,
      tradingAccountId,
    },
  });

  return NextResponse.json({
    ok: true,
    tradeId: trade.id,
  });
}