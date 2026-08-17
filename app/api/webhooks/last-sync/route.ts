import { NextRequest, NextResponse } from "next/server";
import { checkEaSecret, isRateLimited } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`last-sync:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const incomingKey = request.headers.get("x-api-key");
  if (!checkEaSecret(incomingKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountNumber = request.nextUrl.searchParams.get("accountNumber");
  const brokerName = request.nextUrl.searchParams.get("brokerName");

  if (!accountNumber || !brokerName) {
    return NextResponse.json(
      { error: "accountNumber and brokerName query params are required" },
      { status: 400 }
    );
  }

  const account = await prisma.tradingAccount.findUnique({
    where: {
      accountNumber_brokerName: {
        accountNumber: BigInt(accountNumber),
        brokerName,
      },
    },
  });

  // Account has never synced anything before — EA should backfill
  // its full available history.
  if (!account) {
    return NextResponse.json({ lastCloseTime: null });
  }

  const latestTrade = await prisma.trade.findFirst({
    where: { tradingAccountId: account.id },
    orderBy: { closeTime: "desc" },
    select: { closeTime: true },
  });

  return NextResponse.json({
    lastCloseTime: latestTrade?.closeTime?.toISOString() ?? null,
  });
}