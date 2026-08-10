import { SignJWT, jwtVerify } from "jose";

// This file is imported by middleware.ts, which runs on Next.js's Edge
// runtime — a stripped-down JS environment that does NOT support Node's
// built-in modules (crypto, fs, etc). jose is Edge-safe, so it lives here.
// Anything needing Node's `crypto` module (timing-safe secret comparison)
// belongs in lib/auth.ts instead, since that only runs in API routes
// (Node runtime), never in middleware.

const JWT_COOKIE_NAME = "session";
const JWT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET is missing or too short. Set a long random string in .env — do not reuse the sample value."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  return await new SignJWT({ role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${JWT_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecretKey());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getJwtSecretKey());
    return true;
  } catch {
    return false;
  }
}

export { JWT_COOKIE_NAME, JWT_MAX_AGE_SECONDS };
