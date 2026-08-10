import crypto from "crypto";

// This file uses Node's built-in `crypto` module, which only works in
// the Node runtime — NOT in Next.js's Edge runtime (middleware.ts).
// Only import this from API routes (app/api/**/route.ts), never from
// middleware.ts. Session/JWT logic that middleware needs lives in
// lib/session.ts instead, which is Edge-safe.

/**
 * Constant-time string comparison. Never use `===`/`!==` on secrets —
 * plain comparison short-circuits on the first mismatched byte, which
 * leaks timing information an attacker can use to guess the secret
 * one character at a time.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // Buffers must be equal length for timingSafeEqual to run at all,
  // so compare a fixed-length hash instead of the raw (variable-length) input.
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

/**
 * Minimal in-memory rate limiter — fine for a single-user self-hosted
 * instance behind a login form. Resets on process restart, which is
 * acceptable here since the threat model is brute force, not persistence.
 */
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