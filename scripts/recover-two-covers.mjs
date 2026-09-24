// بازیابی کاور برای عناوین خاص با موتور کاور — بدون مرحله ویکی‌پدیا/استیم
// (ویکی‌پدیا برای UFC 4 کاور Xbox دارد؛ استیم برای The Swapper فقط بنر 460×215)
// بازیابی کاور برای عناین خاص با موتور کاور — بدون جستجوی وب (نتیجه اشتباه بازی می‌دهد)
// خروجی: جایگزینی مستقیم فایل + رکورد مانفیست (بدون دوره اورراید/دانلود مجدد)
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";

register("./ts-hook.mjs", import.meta.url);

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public/covers/ps4");
const MANIFEST_FILE = path.join(ROOT, "data/ps4-cover-manifest.json");
const MAX_WIDTH = 600;

const { findOfficialCover } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/ai-cover.ts")).href
);
const { getCoverBlob, deleteCoverByUrl } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/cover-store.ts")).href
);

const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));

// مرحله‌های جستجوی وب — matchImageSearch نام بازی را در نام فایل الزامی می‌کند
// پس خطر بازیِ اشتباه کم است (برخلاف duckduckgo که مستقیم تصویر برمی‌گرداند).
const STEPS = ["bing", "google"];
const TARGETS = ["The Swapper", "My Hero One's Justice"];

function slugify(title) {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

for (const title of TARGETS) {
  let cover = null;
  try {
    cover = await findOfficialCover(title, null, title, "PS4", STEPS);
  } catch (err) {
    console.log(`✗ ${title} → engine error: ${err?.message ?? err}`);
    cover = null;
  }
  if (!cover) {
    // کاور قابل قبول پیدا نشد → فایل فعلی (بنر/پشت جعبه) حذف می‌شود تا
    // کارت بازی از fallback گرافیکی سایت استفاده کند.
    const existing = manifest[title];
    if (existing) {
      fs.rmSync(path.join(ROOT, "public", existing.file.replace(/^\//, "")), { force: true });
      delete manifest[title];
      fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      console.log(`– ${title} → cover removed, fallback tile will show`);
    } else {
      console.log(`– ${title} → nothing to do`);
    }
    continue;
  }
  let buf = null;
  try {
    const blob = await getCoverBlob(cover.url.split("/").pop() ?? "");
    if (!blob) throw new Error("blob not found");
    buf = Buffer.from(blob.bytes);
  } catch (err) {
    console.log(`✗ ${title} → blob read failed: ${err?.message ?? err}`);
    buf = null;
    continue;
  } finally {
    await deleteCoverByUrl(cover.url).catch(() => {});
  }

  const meta0 = await sharp(buf).metadata();
  const ratio = (meta0.width ?? 0) / (meta0.height ?? 1);
  if (ratio < 0.55 || ratio > 0.85 || (meta0.width ?? 0) < 250) {
    console.log(`✗ ${title} → rejected ${meta0.width}×${meta0.height} (${ratio.toFixed(3)}) ${cover.source} — fallback tile`);
    const existing = manifest[title];
    if (existing) {
      fs.rmSync(path.join(ROOT, "public", existing.file.replace(/^\//, "")), { force: true });
      delete manifest[title];
      fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    }
    continue;
  }

  const existing = manifest[title];
  const fileName = existing
    ? path.basename(existing.file)
    : `${slugify(title)}.jpg`;
  const meta = await sharp(buf)
    .flatten({ background: "#ffffff" })
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  fs.writeFileSync(path.join(OUT_DIR, fileName), meta.data);
  manifest[title] = {
    file: `/covers/ps4/${fileName}`,
    source: cover.source,
    width: meta.info.width,
    height: meta.info.height,
    bytes: meta.data.length,
  };
  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`✓ ${title} → ${fileName} (${cover.source}, ${meta.info.width}×${meta.info.height})`);
  await new Promise((r) => setTimeout(r, 500));
}

// پاک‌سازی اوررایدهای این عناوان — خروجی مستقیم موتور منبع حقیقت است
// وگرنه پاس بعدی fetch کاور ویکی/جستجوی قبلی را دوباره روی فایل می‌نویسد.
const OVERRIDES_FILE = path.join(ROOT, "data/ps4-cover-overrides.json");
try {
  const ov = JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf8").replace(/^﻿/, ""));
  let changed = false;
  for (const t of TARGETS) {
    if (ov[t]) {
      delete ov[t];
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(OVERRIDES_FILE, `${JSON.stringify(ov, null, 2)}\n`, "utf8");
    console.log(`overrides cleaned: ${Object.keys(ov).length} left`);
  }
} catch {
  /* فایل ندارد */
}
process.exit(0);
