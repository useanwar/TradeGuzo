import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// No auth check needed here beyond what middleware.ts/proxy.ts already
// does — this route isn't in PUBLIC_PATHS, so a request only reaches
// this code at all if it already carried a valid session cookie.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { accountNumber, brokerName, currency, initialBalance } = body;

  if (!accountNumber || !brokerName) {
    return NextResponse.json(
      { error: "accountNumber and brokerName are required" },
      { status: 400 }
    );
  }

  try {
    const account = await prisma.tradingAccount.create({
      data: {
        accountNumber: BigInt(accountNumber),
        brokerName,
        currency: currency || "USD",
        initialBalance: initialBalance ?? 10000.0,
      },
    });

    return NextResponse.json({
      ok: true,
      account: { ...account, accountNumber: account.accountNumber.toString() },
    });
  } catch (err: any) {
    // Prisma's unique constraint violation code — this account
    // number + broker combination already exists.
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this number and broker already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
}