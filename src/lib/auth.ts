import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "doostan_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function getSecret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) {
    throw new Error("SESSION_SECRET تنظیم نشده است. دستور npm run setup را اجرا کنید.");
  }
  return value;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = (stored ?? "").split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const candidate = scryptSync(password, salt, expected.length);
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(username: string): { token: string; maxAge: number } {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ u: username, exp: expiresAt }), "utf8").toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  return { token, maxAge: Math.floor(SESSION_TTL_MS / 1000) };
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u: string; exp: number };
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data.u;
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value) !== null;
}

export async function setSessionCookie(username: string): Promise<void> {
  const { token, maxAge } = createSessionToken(username);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}