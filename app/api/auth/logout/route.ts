import { NextResponse } from "next/server";
import { JWT_COOKIE_NAME } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  // Setting maxAge 0 tells the browser to delete the cookie immediately,
  // rather than us trying to guess/replicate whatever value was in it.
  response.cookies.set(JWT_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}