import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { notes, rating, followedPlan } = body;

  const trade = await prisma.trade.update({
    where: { id },
    data: {
      ...(notes !== undefined ? { notes } : {}),
      ...(rating !== undefined ? { rating } : {}),
      ...(followedPlan !== undefined ? { followedPlan } : {}),
    },
  });

  return NextResponse.json({ ok: true, tradeId: trade.id });
}