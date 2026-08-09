import { NextRequest, NextResponse } from "next/server";
import {
  checkDashboardPassword,
  createSessionToken,
  isRateLimited,
  JWT_COOKIE_NAME,
  JWT_MAX_AGE_SECONDS,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`login:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429 }
    );
  }

  const { password } = await request.json();

  if (typeof password !== "string" || !checkDashboardPassword(password)) {
    // Deliberately vague — don't reveal whether env var is unset vs. wrong guess.
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });

  response.cookies.set(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: JWT_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}
