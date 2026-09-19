"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/types";
import { validateGameInput, detectImageMime, MAX_UPLOAD_BYTES, ALLOWED_UPLOAD_TYPES } from "@/lib/validation";
import { saveCover, deleteCoverByUrl } from "@/lib/cover-store";
import {
  createGame, updateGame, deleteGame, getGame, setGameFeatured, hashKey,
  getThrottle, recordFailedLogin, lockLogin, resetThrottle
} from "@/lib/db";
import { verifyPassword, setSessionCookie, clearSessionCookie, isAuthenticated } from "@/lib/auth";

async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return hashKey(ip);
}

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { error: "نام کاربری و رمز عبور را وارد کنید." };
  }

  const key = await clientKey();
  const throttle = getThrottle(key);
  if (throttle.lockedUntil > Date.now()) {
    const minutes = Math.ceil((throttle.lockedUntil - Date.now()) / 60000);
    return { error: `تعداد تلاش‌های ناموفق زیاد است. ${minutes} دقیقه دیگر دوباره امتحان کنید.` };
  }

  const envUsername = process.env.ADMIN_USERNAME || "admin";
  const envHash = process.env.ADMIN_PASSWORD_HASH || "";
  if (username !== envUsername || !envHash || !verifyPassword(password, envHash)) {
    recordFailedLogin(key);
    const updated = getThrottle(key);
    if (updated.failed >= 5) {
      lockLogin(key, Date.now() + 10 * 60 * 1000);
      return { error: "۵ بار رمز اشتباه وارد شد. ورود برای ۱۰ دقیقه قفل شد." };
    }
    return { error: "نام کاربری یا رمز عبور اشتباه است." };
  }

  resetThrottle(key);
  await setSessionCookie(username);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/admin/login");
}

export async function saveGameAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { error: "دسترسی غیرمجاز. دوباره وارد شوید." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const coverFile = formData.get("coverFile");
  const rawCover = String(formData.get("cover") ?? "");

  let cover = rawCover;
  let oldCoverUrl = "";
  const removeCover = formData.get("removeCover") === "on";
  if (removeCover) {
    cover = "";
  } else if (coverFile instanceof File && coverFile.size > 0) {
    // ✅ عکس آپلودی داخل جدول covers دیتابیس ذخیره و از /api/covers/… با کش مرورگر سرو می‌شود؛
    // به این ترتیب ردیف‌های بازی و لیست‌ها سبک می‌مانند و روی Vercel هم ماندگار است.
    if (coverFile.size > MAX_UPLOAD_BYTES) {
      return { error: "حجم فایل کاور باید کمتر از ۳ مگابایت باشد." };
    }
    const buffer = new Uint8Array(await coverFile.arrayBuffer());
    const mime = detectImageMime(buffer);
    if (!mime || !(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(mime)) {
      return { error: "فرمت فایل کاور باید JPEG، PNG یا WebP باشد." };
    }
    if (id) {
      const existing = await getGame(id);
      oldCoverUrl = existing?.cover ?? "";
    }
    try {
      cover = await saveCover(mime, buffer);
    } catch {
      return { error: "ذخیره عکس با خطا مواجه شد. دوباره تلاش کنید." };
    }
  } else if (id) {
    const existing = await getGame(id);
    if (existing && !cover) cover = existing.cover;
  }

  const parsed = validateGameInput({
    title: String(formData.get("title") ?? ""),
    titleFa: String(formData.get("titleFa") ?? ""),
    platform: String(formData.get("platform") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    cover,
    description: String(formData.get("description") ?? ""),
    featured: formData.get("featured") === "on" || formData.get("featured") === "true"
  });
  if (!parsed.ok) return { error: parsed.error };

  if (id) {
    const updated = await updateGame(id, parsed.value);
    if (!updated) return { error: "بازی مورد نظر پیدا نشد." };
    // پاک‌سازی کاور قدیمی که دیگر استفاده نمی‌شود (تغییر عکس یا حذف عکس)
    if (oldCoverUrl && oldCoverUrl !== parsed.value.cover) {
      await deleteCoverByUrl(oldCoverUrl);
    }
  } else {
    await createGame(parsed.value);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: id ? "تغییرات ذخیره شد." : "بازی جدید با موفقیت اضافه شد." };
}

export async function deleteGameAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { error: "دسترسی غیرمجاز. دوباره وارد شوید." };
  }
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "شناسه بازی نامعتبر است." };

  const game = await getGame(id);
  if (!game) return { error: "بازی مورد نظر پیدا نشد." };
  await deleteGame(id);
  // پاک‌سازی کاور آپلودی یتیم پس از حذف بازی
  if (game.cover.startsWith("/api/covers/")) {
    await deleteCoverByUrl(game.cover);
  }
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: `«${game.titleFa || game.title}» حذف شد.` };
}

export async function toggleFeaturedAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { error: "دسترسی غیرمجاز. دوباره وارد شوید." };
  }
  const id = String(formData.get("id") ?? "").trim();
  const game = await getGame(id);
  if (!game) return { error: "بازی مورد نظر پیدا نشد." };
  await setGameFeatured(id, !game.featured);
  revalidatePath("/");
  revalidatePath("/admin");
  return { success: game.featured ? "ستاره منتخب برداشته شد." : "به منتخب‌ها اضافه شد." };
}