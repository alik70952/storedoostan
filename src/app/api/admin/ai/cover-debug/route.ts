import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { findOfficialCover } from "@/lib/ai-cover";
import { deleteCoverByUrl } from "@/lib/cover-store";

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

  try {
    const cover = await findOfficialCover(name, steamAppId, name);
    if (cover && !keep) await deleteCoverByUrl(cover.url);
    return NextResponse.json({ name, cover, kept: Boolean(cover && keep), steamAppId });
  } catch (err) {
    return NextResponse.json({ name, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
