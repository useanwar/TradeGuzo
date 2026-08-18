import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tradeId } = await params;
  const body = await request.json();
  const { name, category } = body;

  if (!name || !category) {
    return NextResponse.json({ error: "name and category are required" }, { status: 400 });
  }

  // Reuse an existing tag with this exact name+category, or create a
  // new one — matches the schema's @@unique([name, category]).
  const tag = await prisma.tag.upsert({
    where: { name_category: { name, category } },
    update: {},
    create: { name, category },
  });

  // Upsert the link too, so tagging the same trade with the same tag
  // twice (e.g. a double-click) doesn't error, just no-ops.
  await prisma.tagOnTrade.upsert({
    where: { tradeId_tagId: { tradeId, tagId: tag.id } },
    update: {},
    create: { tradeId, tagId: tag.id },
  });

  return NextResponse.json({ ok: true, tag });
}