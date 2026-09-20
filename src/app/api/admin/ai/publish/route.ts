import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { createGame, listGames, updateGame } from "@/lib/db";
import { validateGameInput } from "@/lib/validation";
import { normalizeAiJson, splitPlatformSuffix } from "@/lib/ai-game";
import { callGlmForGame } from "@/lib/ai-client";
import { findOfficialCover } from "@/lib/ai-cover";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

type Step = "info" | "cover" | "create";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  return NextResponse.json({
    configured: Boolean(process.env.APINEX_API_KEY),
    baseUrl: (process.env.AINEX_BASE_URL || "https://api.apinex.bond/v1").replace(/\/$/, ""),
    model: process.env.AINEX_MODEL || "glm-5.3-flash",
  });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "دسترسی غیرمجاز. دوباره وارد شوید." }, { status: 401 });
  }

  let name = "";
  try {
    const body = (await request.json()) as { game?: unknown; name?: unknown };
    name = String(body.game ?? body.name ?? "").trim().slice(0, 120);
  } catch {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "نام بازی خالی است.", step: "info" as Step }, { status: 400 });
  }

  // ۰) قانون فروشگاه: پسوند پلتفرم آخر نام بازی («xbox» / «ps5» / «ps4»، مثل «Hi-Fi Rush ps5»)
  // دسته نهایی را تعیین می‌کند. پسوند جدا می‌شود تا نام تمیز به مدل و جستجوی کاور برود.
  // یک بازی می‌تواند هم‌زمان در دو دسته ثبت شود (مثلاً «Hi-Fi Rush xbox» و «Hi-Fi Rush ps5»)؛
  // پس تشخیص تکراری با «نام + پلتفرم» انجام می‌شود، نه فقط نام.
  const { cleanName, forced } = splitPlatformSuffix(name);
  if (!cleanName) {
    return NextResponse.json({ error: "نام بازی خالی است.", step: "info" as Step }, { status: 400 });
  }

  // ۱) جلوگیری از تکراری: اگر همین عنوان در همان دسته از قبل هست، همان را برگردان
  try {
    const all = await listGames();
    const existing = all.find(
      (g) => g.title.trim().toLowerCase() === cleanName.toLowerCase() && (forced === null || g.platform === forced)
    );
    if (existing) {
      // اگر بازی هست ولی کاور ندارد (مثلاً کاور قبلاً پیدا نشده بود)، همین حالا دنبالش بگرد
      if (!existing.cover) {
        try {
          const cover = await findOfficialCover(name, null, name, existing.platform);
          if (cover) {
            const updated = await updateGame(existing.id, {
              title: existing.title,
              titleFa: existing.titleFa,
              platform: existing.platform,
              genre: existing.genre,
              cover: cover.url,
              description: existing.description,
              featured: existing.featured,
            });
            if (updated) {
              revalidatePath("/");
              revalidatePath("/admin");
              return NextResponse.json({
                ok: true,
                skipped: true,
                message: "این بازی از قبل بود ولی کاور نداشت؛ کاور الان پیدا و اضافه شد.",
                game: updated,
                coverSource: cover.source,
                steps: { info: true, cover: true, create: false },
              });
            }
          }
        } catch { /* اگر کاور نیامد، همان مسیر عادی «تکراری» ادامه پیدا می‌کند */ }
      }
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: "این بازی از قبل در فروشگاه هست.",
        game: existing,
        steps: { info: true, cover: Boolean(existing.cover), create: false },
      });
    }
  } catch { /* اگر لیست خوانده نشد، ادامه بده */ }

  // ۲) اطلاعات از GLM (server-side، کلید هرگز به مرورگر نمی‌رود)
  let resolved;
  try {
    const raw = await callGlmForGame(cleanName);
    resolved = normalizeAiJson(raw, cleanName, { forced });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "خطای تولید اطلاعات.", step: "info" as Step, input: cleanName },
      { status: 502 }
    );
  }

  // ۳) کاور رسمی — فقط از منابعِ مجازِ پلتفرم نهایی:
  // Xbox Offline → فقط استور Xbox؛ PS5/PS4 → اول استور PS، بعد سایت‌های ایرانی (p30day/downloadha)،
  // بعد Steam، RAWG، ویکی‌پدیا و جستجوی تصویر وب (گوگل/Bing/DuckDuckGo).
  const cover = await findOfficialCover(resolved.coverQuery, resolved.steamAppId, cleanName, resolved.platform);
  const warning = cover
    ? null
    : `کاور برای «${resolved.title}» پیدا نشد؛ بازی بدون عکس ذخیره شد. بعداً از پنل عکس دستی اضافه کنید یا Retry بزنید.`;

  // ۴) ساخت Game با همان ساختار فعلی سایت (رفتار انتشار فعلی حفظ می‌شود: مستقیم منتشر)
  const parsed = validateGameInput({
    title: resolved.title,
    titleFa: resolved.titleFa,
    platform: resolved.platform,
    genre: resolved.genre,
    cover: cover?.url ?? "",
    description: resolved.description,
    featured: false,
  });
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, step: "create" as Step, input: name },
      { status: 400 }
    );
  }

  try {
    const game = await createGame(parsed.value);
    revalidatePath("/");
    revalidatePath("/admin");
    return NextResponse.json({
      ok: true,
      game,
      coverSource: cover?.source ?? null,
      warning,
      steps: { info: true, cover: Boolean(cover), create: true },
    });
  } catch {
    return NextResponse.json(
      { error: "ذخیره بازی در دیتابیس با خطا مواجه شد.", step: "create" as Step, input: name },
      { status: 500 }
    );
  }
}
