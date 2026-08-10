import { NextRequest, NextResponse } from "next/server";

// Temporary stub — no auth, no DB, just proves WebRequest() from MT4/MT5
// can actually reach your Next.js server. Delete this once the EA is
// confirmed working and you've moved on to hitting the real
// /api/webhooks/trade route.
export async function POST(request: NextRequest) {
  const body = await request.text();
  console.log("=== EA ping received ===");
  console.log("Headers:", Object.fromEntries(request.headers.entries()));
  console.log("Body:", body);

  return NextResponse.json({ ok: true, received: body });
}
