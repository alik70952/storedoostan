import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { findOfficialCover } from "@/lib/ai-cover";
import { normalizePlatform } from "@/lib/validation";
import { deleteCoverByUrl } from "@/lib/cover-store";
import type { Platform } from "@/lib/types";

// ابزار تشخیصی موتور کاور: نشان می‌دهد برای یک نام بازی، کاور از کدام منبع می‌آید.
// فقط برای ادمینِ واردشده است؛ چون هر فراخوانی یک دانلود واقعی + نوشتن موقت در جدول covers دارد.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const search = new URL(request.url).searchParams;
  const name = (search.get("name") || "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: "name?" }, { status: 400 });

  // keep=1 → کاور پیدا‌شده در دیتابیس بماند (کاربر بعداً دستی وصلش کند).
  // در حالت عادی روت فقط تشخیص است، پس ردیف موقت پاک می‌شود تا جدول covers پرِ فایل یتیم نشود.
  const keep = search.get("keep") === "1";
  const steamAppIdRaw = search.get("steamAppId") || "";
  const steamAppId = /^\d{1,10}$/.test(steamAppIdRaw) ? Number(steamAppIdRaw) : null;
  // پلتفرم اختیاری (?platform=xbox|ps5|ps4|ps5-اکانتی) تا ترتیب منابع همان قانون انتشار باشد
  const platformParam = (search.get("platform") || "").trim().toUpperCase();
  const platformAlias =
    platformParam === "XBOX" ? "XBOX OFFLINE" :
    platformParam === "PLAYSTATION 4" || platformParam === "PLAYSTATION4" ? "PS4" :
    platformParam;
  // normalizePlatform دسته‌های PS5 / PS4 / PS5 اکانتی / Xbox Offline و نام‌های جایگزینشان را می‌شناسد
  const platform: Platform = normalizePlatform(platformAlias) ?? "PS5";

  try {
    const cover = await findOfficialCover(name, steamAppId, name, platform);
    if (cover && !keep) await deleteCoverByUrl(cover.url);
    return NextResponse.json({ name, platform, cover, kept: Boolean(cover && keep), steamAppId });
  } catch (err) {
    return NextResponse.json({ name, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
