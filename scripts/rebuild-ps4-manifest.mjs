/**
 * بازسازی data/ps4-cover-manifest.json از روی فایل‌های موجود در public/covers/ps4.
 * (مانفیست قبلی به‌خاطر BOM در بازنویسی PowerShell پاک شد؛ فایل‌های کاور سالم‌اند.)
 *
 * نگاشت: برای هر عنوانِ data/ps4-titles.txt که در failures نیست، فایل
 * <slug>.jpg (و در صورت تداخل <slug>-2.jpg و …) را پیدا می‌کند و ابعاد/حجم را
 * با sharp می‌خواند. منبع «restored» ثبت می‌شود چون منبع اصلی نامشخص است.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public/covers/ps4");
const TITLES_FILE = path.join(ROOT, "data/ps4-titles.txt");
const MANIFEST_FILE = path.join(ROOT, "data/ps4-cover-manifest.json");
const FAILURES_FILE = path.join(ROOT, "data/ps4-cover-failures.json");

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

const readJson = (f, fb) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, ""));
  } catch {
    return fb;
  }
};

const titles = fs
  .readFileSync(TITLES_FILE, "utf8")
  .split(/\r?\n/)
  .map((t) => t.trim())
  .filter((t) => t && !t.startsWith("//") && !t.startsWith("#"));
const failures = readJson(FAILURES_FILE, {});

const manifest = {};
const claimed = new Set(); // فایل‌هایی که به عنوان دیگری نسبت داده شده‌اند
let restored = 0;
const missing = [];

for (const title of titles) {
  const base = slugify(title) || "game";
  let fileName = null;
  for (const candidate of [`${base}.jpg`, ...Array.from({ length: 9 }, (_, i) => `${base}-${i + 2}.jpg`)]) {
    if (!claimed.has(candidate) && fs.existsSync(path.join(OUT_DIR, candidate))) {
      fileName = candidate;
      break;
    }
  }
  if (!fileName) {
    if (!failures[title]) missing.push(title);
    continue;
  }
  claimed.add(fileName);
  const abs = path.join(OUT_DIR, fileName);
  const meta = await sharp(abs).metadata();
  manifest[title] = {
    file: `/covers/ps4/${fileName}`,
    source: "restored",
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    bytes: fs.statSync(abs).size,
  };
  restored += 1;
}

fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`بازسازی شد: ${restored} کاور در مانفیست.`);
if (missing.length) console.log(`بدون فایل و بدون رکورد شکست (${missing.length}): ${missing.join(" | ")}`);

// فایل‌های یتیم (روی دیسک ولی نه در مانفیست) گزارش شوند
const orphans = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".jpg") && !claimed.has(f));
if (orphans.length) console.log(`فایل یتیم (${orphans.length}): ${orphans.join(" | ")}`);
