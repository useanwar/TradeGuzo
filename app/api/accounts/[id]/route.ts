import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { brokerName, currency, initialBalance } = body;

  const account = await prisma.tradingAccount.update({
    where: { id },
    data: {
      ...(brokerName !== undefined ? { brokerName } : {}),
      ...(currency !== undefined ? { currency } : {}),
      ...(initialBalance !== undefined ? { initialBalance } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    account: { ...account, accountNumber: account.accountNumber.toString() },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // onDelete: Cascade on Trade.tradingAccountId means this also
  // deletes every trade under this account, and each of THOSE trades
  // cascades further into its own tags/screenshots/candles. This is
  // genuinely destructive — the confirmation burden for this is
  // handled entirely in the UI (typing the account number to confirm),
  // not here.
  await prisma.tradingAccount.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}