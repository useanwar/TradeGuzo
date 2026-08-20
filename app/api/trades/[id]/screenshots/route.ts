import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB — generous for a chart
// screenshot, while keeping any single upload from eating a large
// chunk of the 1GB/month free Blob storage quota.
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tradeId } = await params;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const label = formData.get("label") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPEG, or WebP images are allowed" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large — 5MB max" },
      { status: 400 }
    );
  }

  // addRandomSuffix avoids overwriting another trade's screenshot if
  // two files happen to share a name; access: "public" since this is
  // a personal single-user tool and the URL itself already isn't
  // guessable, no need for signed-URL complexity here.
  const blob = await put(`trades/${tradeId}/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  const screenshot = await prisma.tradeScreenshot.create({
    data: {
      url: blob.url,
      label: label || null,
      tradeId,
    },
  });

  return NextResponse.json({ ok: true, screenshot });
}