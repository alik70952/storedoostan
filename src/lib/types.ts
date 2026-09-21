export type Platform = "PS5" | "PS4" | "PS5 اکانتی" | "Xbox Offline";

// دسته «PS5 اکانتی»: بازی‌های اکانتی پلی‌استیشن ۵ — بدون ظرفیت، همه در همین یک دسته
// (بدون annotation تا نوعش literal بماند و کلید آبجکت‌ها هم دقیق تایپ شود)
export const ACCOUNT_PLATFORM = "PS5 اکانتی";

export function isAccountPlatform(platform: Platform): boolean {
  return platform === ACCOUNT_PLATFORM;
}

// کلاس CSS نشان دسته (کارت‌ها و پیل‌های پنل ادمین)
export function platformClass(platform: Platform): string {
  if (isAccountPlatform(platform)) return "account";
  if (platform === "PS4") return "ps4";
  if (platform === "Xbox Offline") return "xbox";
  return "ps5";
}

export type Game = {
  id: string;
  title: string;
  titleFa: string;
  platform: Platform;
  // دسته «بازی‌های دو نفره»: برچسب عرضی روی بازی‌های PS5/PS4 — بازی هم در تب پلتفرم خودش هست و هم در تب دو نفره
  twoPlayer: boolean;
  genre: string;
  cover: string;
  description: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GameInput = Omit<Game, "id" | "createdAt" | "updatedAt">;

export type ActionResult = {
  error?: string;
  success?: string;
};

export const GENRES = ["اکشن و ماجراجویی", "نقش‌آفرینی", "ورزشی", "مسابقه‌ای", "مبارزه‌ای", "ترس و بقا", "خانوادگی", "شوتر"] as const;

export function persianNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}