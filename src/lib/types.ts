export type Platform = "PS5" | "PS4";

export type Game = {
  id: string;
  title: string;
  titleFa: string;
  platform: Platform;
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