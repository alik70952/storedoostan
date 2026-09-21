import type { GameInput, Platform } from "./types";
import { GENRES } from "./types";

export const PLATFORMS: Platform[] = ["PS5", "PS4", "PS5 اکانتی", "Xbox Offline"];

// نام‌های جایگزین دسته «PS5 اکانتی» (برای ورودی‌های دستی و افزودن با هوش مصنوعی)
const ACCOUNT_PLATFORM_ALIASES = new Set<string>([
  "PS5 اکانتی",
  "PS5اکانتی",
  "PS5 اکانت",
  "PS5اکانت",
  "PS5 ACCOUNT",
  "PS5 ACCOUNTS",
  "PS5 ACCOUNTI",
  "PS5 ACCOUNTY",
  "PS5 ACCOUNTGAME",
  "PS5 ACCOUNT GAMES",
  "ACCOUNT PS5",
  "PLAYSTATION 5 اکانتی",
]);
export const MAX_TEXT = 120;
export const MAX_DESCRIPTION = 800;
export const MAX_URL = 1000;
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function normalizeCoverInput(value: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  // عکس آپلودشده (data-URL) — دست نزن، فقط سقف حجم
  if (/^data:image\//i.test(trimmed)) return trimmed.slice(0, 8 * 1024 * 1024);
  const withProto = normalizeCoverUrl(trimmed);
  return withProto.slice(0, MAX_URL);
}

export function normalizeCoverUrl(value: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  // عکس آپلودشده (data-URL) را دست نزن
  if (/^data:image\//i.test(trimmed)) return trimmed;
  // اگر کاربر https را جا انداخته (مثل example.com/a.jpg) خودمان اضافه می‌کنیم
  if (/^(www\.)?[^/\s]+\.[a-z]{2,}(\/\S*)?$/i.test(trimmed) && !/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function isSafeCoverUrl(value: string): boolean {
  if (!value) return true;
  const trimmed = normalizeCoverUrl(value);
  if (!trimmed) return true;
  if (trimmed.length > 8 * 1024 * 1024) return false;
  // عکس آپلودشده که داخل دیتابیس به‌صورت data-URL ذخیره شده
  if (/^data:image\/(jpeg|png|webp|gif);base64,/i.test(trimmed)) return true;
  if (/^javascript:|^data:|^vbscript:|^blob:|^file:/i.test(trimmed)) return false;
  // آدرس نسبی کاور آپلودشده داخل همین سایت (جدول covers دیتابیس)
  if (trimmed.startsWith("/api/covers/")) {
    return /^\/api\/covers\/[a-f0-9-]{36}\.(jpg|png|webp)(\?[^#]*)?(#.*)?$/i.test(trimmed);
  }
  // بقیه آدرس‌های نسبی (مثل /uploads/...) را قبول نمی‌کنیم
  if (trimmed.startsWith("/")) return false;
  if (trimmed.length > MAX_URL) return false;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (/\.(svg|svgz)(\?|#|$)/i.test(url.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function normalizePlatform(value: string): Platform | null {
  const cleaned = (value ?? "").replace(/\s+/g, " ").trim();
  const upper = cleaned.toUpperCase();
  if (upper === "PS5") return "PS5";
  if (upper === "PS4") return "PS4";
  if (ACCOUNT_PLATFORM_ALIASES.has(upper)) return "PS5 اکانتی";
  if (upper === "XBOX OFFLINE") return "Xbox Offline";
  return null;
}

export type ValidationOk = { ok: true; value: GameInput };
export type ValidationErr = { ok: false; error: string };

export function validateGameInput(raw: {
  title?: string;
  titleFa?: string;
  platform?: string;
  twoPlayer?: boolean;
  genre?: string;
  cover?: string;
  description?: string;
  featured?: boolean;
}): ValidationOk | ValidationErr {
  const clean = (value?: string) => (value ?? "").trim().replace(/\s+/g, " ");
  const title = clean(raw.title).slice(0, MAX_TEXT);
  const titleFa = clean(raw.titleFa).slice(0, MAX_TEXT);
  const platform = normalizePlatform(raw.platform ?? "");
  const genre = clean(raw.genre).slice(0, 60) || GENRES[0];
  // کاور اختیاری: فایل آپلودشده data-URL (تا ۸ مگ) یا لینک http/https (تا ۱۰۰۰ کاراکتر)
  let cover = normalizeCoverInput(raw.cover ?? "");
  const description = (raw.description ?? "").trim().slice(0, MAX_DESCRIPTION);

  if (!title) return { ok: false, error: "نام اصلی بازی الزامی است." };
  if (!titleFa) return { ok: false, error: "نام فارسی بازی الزامی است." };
    if (!platform) return { ok: false, error: "پلتفرم نامعتبر است." };
  // کاور کاملاً اختیاری است: اگر خالی است یا لینک خراب/ناامن است،
  // به‌جای خطا و جلوگیری از ذخیره، فقط بدون عکس ذخیره می‌کنیم.
  if (cover && !isSafeCoverUrl(cover)) cover = "";

  return {
    ok: true,
    value: {
      title,
      titleFa,
      platform,
      // دسته دو نفره: برچسب عرضی — بازی هم در تب پلتفرم خودش و هم در تب «دو نفره» نمایش داده می‌شود
      twoPlayer: Boolean(raw.twoPlayer),
      genre,
      cover,
      description,
      featured: Boolean(raw.featured)
    }
  };
}