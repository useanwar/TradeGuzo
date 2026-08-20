import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; screenshotId: string }> }
) {
  const { screenshotId } = await params;

  const screenshot = await prisma.tradeScreenshot.findUnique({
    where: { id: screenshotId },
  });

  if (!screenshot) {
    return NextResponse.json({ error: "Screenshot not found" }, { status: 404 });
  }

  // Delete from Blob storage first — if this fails, we haven't lost
  // the database record, so a retry is still possible. Deleting the
  // DB row first and having the Blob delete fail would leave an
  // orphaned file silently eating into the storage quota forever.
  await del(screenshot.url);

  await prisma.tradeScreenshot.delete({ where: { id: screenshotId } });

  return NextResponse.json({ ok: true });
}