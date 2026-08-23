import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, category } = body;

  const tag = await prisma.tag.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(category !== undefined ? { category } : {}),
    },
  });

  return NextResponse.json({ ok: true, tag });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // onDelete: Cascade on TagOnTrade.tagId removes the tag from every
  // trade that had it — the trades themselves are untouched, only
  // the tag association goes away.
  await prisma.tag.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}