import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";

export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // Buffers must be equal length for timingSafeEqual to run at all,
  // so pad/compare a hash instead of the raw (variable-length) input.
  const hashA = crypto.createHash("sha256").update(bufA).digest();
  const hashB = crypto.createHash("sha256").update(bufB).digest();

  return crypto.timingSafeEqual(hashA, hashB);
}

export function checkEaSecret(incoming: string | null): boolean {
  const secret = process.env.EA_SECRET_KEY;
  if (!secret || !incoming) return false;
  return timingSafeEqual(incoming, secret);
}

export function checkDashboardPassword(incoming: string): boolean {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return false;
  return timingSafeEqual(incoming, password);
}

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


const attempts = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(
  key: string,
  maxAttempts = 5,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;
  if (entry.count > maxAttempts) return true;

  return false;
}