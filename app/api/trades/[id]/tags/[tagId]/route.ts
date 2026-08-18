import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const { id: tradeId, tagId } = await params;

  // Only removes the link between this trade and this tag — the Tag
  // itself stays in the database since other trades may still use it.
  await prisma.tagOnTrade.delete({
    where: { tradeId_tagId: { tradeId, tagId } },
  });

  return NextResponse.json({ ok: true });
}