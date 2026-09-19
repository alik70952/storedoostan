import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getCoverBlob } from "@/lib/cover-store";

// سرو کاورها: اول از جدول covers داخل دیتابیس (کاورهای جدید و مهاجرت‌شده)،
// بعد از فایل‌های قدیمی پوشه data/uploads (سازگاری با نسخه‌های قبلی).

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

function legacyUploadDir(): string {
  const base =
    process.env.DOOSTAN_DATA_DIR ||
    (process.env.VERCEL ? "/tmp/doostan-data" : process.cwd() + "/data");
  return path.join(base, "uploads");
}

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const match = name.match(/^([a-f0-9-]{36})\.(jpg|png|webp)$/i);
  if (!match) {
    return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  }
  const ext = match[2].toLowerCase();

  // ۱) دیتابیس (جدول covers)
  const blob = await getCoverBlob(name);
  if (blob) {
    return new NextResponse(blob.bytes.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": blob.mime,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  }

  // ۲) فایل قدیمی روی دیسک (فقط لوکال/سرور شخصی)
  try {
    const file = await fs.readFile(path.join(legacyUploadDir(), `${match[1]}.${ext}`));
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": MIME_BY_EXT[ext],
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  }
}