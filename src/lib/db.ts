import type { Game, GameInput } from "./types";
import { migrateDataUrlCovers } from "./cover-store";

// روتر ذخیره‌سازی:
//  - اگر DATABASE_URL ست شده → Postgres (ورسل/Neon) — ماندگار ✅
//  - وگرنه → SQLite لوکال (پوشه data) — ماندگار ✅
// این فایل رابط یکدستی برای بقیه کد نگه می‌دارد.

const usePostgres = Boolean(process.env.DATABASE_URL);

async function backend() {
  if (usePostgres) {
    const mod = await import("./db-pg");
    return mod.pgBackend;
  }
  const mod = await import("./db-sqlite");
  return mod.sqliteBackend;
}

export type { Game, GameInput };

export async function listGames(): Promise<Game[]> {
  await migrateDataUrlCovers(); // مهاجرت یک‌باره کاورهای قدیمی data-URL به جدول covers
  return (await backend()).listGames();
}

export async function getGame(id: string): Promise<Game | null> {
  return (await backend()).getGame(id);
}

export async function createGame(input: GameInput): Promise<Game> {
  return (await backend()).createGame(input);
}

export async function updateGame(id: string, input: GameInput): Promise<Game | null> {
  return (await backend()).updateGame(id, input);
}

export async function deleteGame(id: string): Promise<boolean> {
  return (await backend()).deleteGame(id);
}

export async function setGameFeatured(id: string, featured: boolean): Promise<Game | null> {
  return (await backend()).setGameFeatured(id, featured);
}

// ─── throttle ورود (حافظه‌ای؛ ساده و بدون دیتابیس) ───
import { createHash } from "node:crypto";

const throttle = new Map<string, { failed: number; lockedUntil: number }>();

export function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function getThrottle(key: string): { failed: number; lockedUntil: number } {
  return throttle.get(key) ?? { failed: 0, lockedUntil: 0 };
}

export function recordFailedLogin(key: string): void {
  const cur = getThrottle(key);
  throttle.set(key, { failed: cur.failed + 1, lockedUntil: cur.lockedUntil });
}

export function lockLogin(key: string, untilMs: number): void {
  throttle.set(key, { failed: 0, lockedUntil: untilMs });
}

export function resetThrottle(key: string): void {
  throttle.delete(key);
}

// سازگاری با کدهای قدیمی (دیگر فایل فیزیکی ذخیره نمی‌کنیم — کاور داخل DB است)
export function uploadDir(): string {
  return "/tmp/doostan-uploads";
}
