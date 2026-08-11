import { NextRequest, NextResponse } from "next/server";
import { checkEaSecret, isRateLimited } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  // Rate-limit by IP before touching auth logic — cheap protection
  // against brute forcing EA_SECRET_KEY.
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`webhook:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const incomingKey = request.headers.get("x-api-key");
  if (!checkEaSecret(incomingKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const {
    ticketId,
    accountNumber,
    brokerName,
    symbol,
    type, // "BUY" | "SELL"
    lots,
    openPrice,
    closePrice,
    stopLoss,
    takeProfit,
    profit, // gross P&L, excludes commission/swap
    commission = 0,
    swap = 0,
    openTime,
    closeTime,
  } = body;

  if (!ticketId || !accountNumber || !brokerName || !symbol || !type) {
    return NextResponse.json(
      { error: "Missing required trade fields" },
      { status: 400 }
    );
  }

  // Find-or-create the account without any userId — single-user instance.
  const account = await prisma.tradingAccount.upsert({
    where: {
      accountNumber_brokerName: { accountNumber: BigInt(accountNumber), brokerName },
    },
    update: {},
    create: { accountNumber: BigInt(accountNumber), brokerName },
  });

  const netProfit = profit - commission - swap;

  const trade = await prisma.trade.upsert({
    where: { ticketId: BigInt(ticketId) },
    update: {
      closePrice,
      profit,
      commission,
      swap,
      netProfit,
      closeTime: closeTime ? new Date(closeTime) : undefined,
    },
    create: {
      ticketId: BigInt(ticketId),
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
      tradingAccountId: account.id,
    },
  });

  return NextResponse.json({ ok: true, tradeId: trade.id });
}