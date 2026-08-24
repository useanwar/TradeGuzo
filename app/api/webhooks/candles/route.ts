import { NextRequest, NextResponse } from "next/server";
import { checkEaSecret, isRateLimited } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`candles:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const incomingKey = request.headers.get("x-api-key");
  if (!checkEaSecret(incomingKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ticketId, bars } = body;

  if (!ticketId || !Array.isArray(bars) || bars.length === 0) {
    return NextResponse.json(
      { error: "ticketId and a non-empty bars array are required" },
      { status: 400 }
    );
  }

  // The trade must already exist — the EA sends candles as a
  // follow-up call right after the trade itself, so this should
  // basically always find it. If it doesn't (e.g. candles arrived
  // for a ticket the trade webhook hasn't processed yet, or never
  // will), there's nothing to attach them to.
  const trade = await prisma.trade.findUnique({
    where: { ticketId: BigInt(ticketId) },
    select: { id: true },
  });

  if (!trade) {
    return NextResponse.json(
      { error: "No trade found for this ticketId — candles must be sent after the trade itself" },
      { status: 404 }
    );
  }

  // Wrapped in a transaction so this whole delete-then-insert is
  // atomic — without this, two near-simultaneous requests (e.g. from
  // two EA instances accidentally both attached and sending the same
  // trade) could interleave: request A deletes, request B deletes,
  // both insert, and you end up with duplicate rows at the same
  // timestamp. That's exactly what caused lightweight-charts' "must
  // be asc ordered by time" crash. skipDuplicates is a second safety
  // net on top of the @@unique([tradeId, time]) constraint, in case
  // any duplicate still slips through.
  await prisma.$transaction([
    prisma.tradeCandle.deleteMany({ where: { tradeId: trade.id } }),
    prisma.tradeCandle.createMany({
      data: bars.map((bar: any) => ({
        tradeId: trade.id,
        time: new Date(bar.time),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      })),
      skipDuplicates: true,
    }),
  ]);

  return NextResponse.json({ ok: true, count: bars.length });
}