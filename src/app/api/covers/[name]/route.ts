import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

// این روت فقط برای سازگاری با عکس‌های قدیمی (data/uploads) نگه داشته شده.
// کاورهای جدید داخل دیتابیس (data-URL) ذخیره می‌شوند و نیازی به این روت ندارند.

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
  const match = name.match(/^([a-f0-9-]{36})\.(jpg|png|webp)$/);
  if (!match) {
    return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  }
  try {
    const file = await fs.readFile(path.join(legacyUploadDir(), `${match[1]}.${match[2]}`));
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": MIME_BY_EXT[match[2]],
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  }
}