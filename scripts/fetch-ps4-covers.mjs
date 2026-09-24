/**
 * دانلود کاور رسمی برای لیست بازی‌های PS4 و ساخت فایل‌های استاتیک داخل ریپو.
 *
 * چرا استاتیک؟ چون روی Vercel فایل‌سیستم/دیتابیس لوکال ماندگار نیست و می‌خواهیم بازی‌ها
 * با کاور رسمی «بعد از push و deploy» بدون تنظیمات اضافه نمایش داده شوند.
 *
 * خروجی:
 *   public/covers/ps4/<slug>.jpg        کاور رسمی (فشرده‌شده با sharp)
 *   data/ps4-cover-manifest.json        نگاشت نام بازی → فایل کاور + منبع
 *   data/ps4-cover-failures.json        عنوان‌هایی که کاور پیدا نشد
 *
 * اجرای مجدد = ادامه از جایی که مانده (resume) — فایل‌های موجود دوباره دانلود نمی‌شوند.
 * متغیرهای محیطی اختیاری: PS4_COVER_CONCURRENCY (پیش‌فرض ۳)، PS4_COVER_LIMIT
 */
import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

register("./ts-hook.mjs", import.meta.url);

const ROOT = process.cwd();
const TITLES_FILE = process.env.PS4_COVER_TITLES
  ? path.resolve(process.env.PS4_COVER_TITLES)
  : path.join(ROOT, "data/ps4-titles.txt");
const OUT_DIR = path.join(ROOT, "public/covers/ps4");
const MANIFEST_FILE = path.join(ROOT, "data/ps4-cover-manifest.json");
const FAILURES_FILE = path.join(ROOT, "data/ps4-cover-failures.json");
// بازنویسی دستی: { "نام بازی": "https://…/cover.jpg" } — برای عنوان‌هایی که موتور کاور
// نتیجه درست نمی‌دهد یا کاور پیدا نمی‌کند (نتیجه بازبینی دستی کیفیت کاورها).
const OVERRIDES_FILE = path.join(ROOT, "data/ps4-cover-overrides.json");
const CONCURRENCY = Number(process.env.PS4_COVER_CONCURRENCY || 3);
const LIMIT = Number(process.env.PS4_COVER_LIMIT || 0);
const MAX_WIDTH = 600;

// مراحل کاور برای کار گروهی: مسیر ویکی‌پدیا (تطبیق دقیق عنوان) و سایت‌های ایرانی/Steam.
// مرحله جستجوی تصویر استور پلی‌استیشن در این محیط پاسخ نمی‌دهد و فقط زمان می‌برد،
// پس برای ۵۰۰ عنوان کنار گذاشته می‌شود (در پنل ادمین همان ترتیب پیش‌فرض حفظ شده است).
const BULK_STEPS = [
  "wikipedia-exact",
  "downloadha",
  "p30day",
  "steam-known",
  "steam-search",
  "wikipedia",
  "duckduckgo",
  "bing",
  "google",
];

const { findOfficialCover } = await import(pathToFileURL(path.join(ROOT, "src/lib/ai-cover.ts")).href);
const { getCoverBlob, deleteCoverByUrl } = await import(pathToFileURL(path.join(ROOT, "src/lib/cover-store.ts")).href);
const sharp = (await import("sharp")).default;

export function slugify(title) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

const titles = fs
  .readFileSync(TITLES_FILE, "utf8")
  .split(/\r?\n/)
  .map((t) => t.trim())
  .filter((t) => t && !t.startsWith("//") && !t.startsWith("#"));

const manifest = readJson(MANIFEST_FILE, {});
const failures = readJson(FAILURES_FILE, {});
const coverOverrides = readJson(OVERRIDES_FILE, {});

// نام فایل یکتا برای هر بازی (تکراری‌ها با پسوند شماره)
const usedSlugs = new Set(Object.values(manifest).map((v) => path.basename(String(v.file || ""))));
function slugFor(title) {
  const base = slugify(title) || "game";
  let candidate = `${base}.jpg`;
  let i = 2;
  while (usedSlugs.has(candidate)) candidate = `${base}-${i++}.jpg`;
  usedSlugs.add(candidate);
  return candidate;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

let done = 0;
let failCount = 0;
let skipped = 0;
const total = LIMIT > 0 ? Math.min(LIMIT, titles.length) : titles.length;

async function processTitle(title, index) {
  const overrideRaw = coverOverrides[title];
  const override =
    typeof overrideRaw === "string"
      ? overrideRaw
      : overrideRaw && typeof overrideRaw.cover === "string"
        ? overrideRaw.cover
        : "";
  const existing = manifest[title];
  const fileExists = existing && fs.existsSync(path.join(ROOT, "public", String(existing.file ?? "").replace(/^\//, "")));
  // کاور دستی همیشه برنده است (اگر قبلاً از موتور گرفته شده، دوباره ساخته می‌شود)
  if (fileExists && (!override || existing.source === "manual")) {
    skipped += 1;
    return;
  }

  // در اجرای «فقط عنوان‌های باقی‌مانده» می‌توان ناموفق‌های قبلی را رد کرد
  // (برای پاس اصلی سریع؛ پاس دوم مخصوص ناموفق‌ها جدا اجرا می‌شود)
  if (process.env.PS4_COVER_SKIP_FAILED === "1" && failures[title]) {
    skipped += 1;
    return;
  }

  const started = Date.now();

  // ۰) کاور دستی: آدرس تصویر مستقیم از data/ps4-cover-overrides.json
  if (override) {
    try {
      // ویکی‌پدیا روی تقاضای هم‌زمان 429 می‌دهد → تلاش مجدد با فاصله
      let res = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        res = await fetch(override, { headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" } });
        if (res.ok) break;
        if (res.status === 429 || res.status >= 500) {
          await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
          continue;
        }
        break;
      }
      if (!res?.ok) throw new Error(`HTTP ${res?.status ?? "fail"}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      const fileName = existing?.file ? path.basename(String(existing.file)) : slugFor(title);
      const meta = await sharp(bytes)
        .flatten({ background: "#ffffff" })
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      fs.writeFileSync(path.join(OUT_DIR, fileName), meta.data);
      manifest[title] = {
        file: `/covers/ps4/${fileName}`,
        source: "manual",
        width: meta.info.width,
        height: meta.info.height,
        bytes: meta.data.length,
      };
      delete failures[title];
      writeJson(MANIFEST_FILE, manifest);
      writeJson(FAILURES_FILE, failures);
      done += 1;
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`[${index}/${total}] ${title} → ${fileName} (کاور دستی, ${meta.info.width}×${meta.info.height}, ${secs}s)`);
      return;
    } catch (err) {
      failures[title] = `خطای کاور دستی: ${err?.message ?? String(err)}`;
      writeJson(FAILURES_FILE, failures);
      failCount += 1;
      console.log(`[${index}/${total}] ${title} → خطای کاور دستی`);
      return;
    }
  }

  let cover = null;
  try {
    // حالت اجرا (PS4_COVER_STEPS): fast (پیش‌فرض، سریع) | full (ترتیب کامل موتور) | retry (پرس‌وجوی «نام + PS4»)
    const mode = process.env.PS4_COVER_STEPS || "fast";
    if (mode === "full") {
      cover = await findOfficialCover(title, null, title, "PS4");
    } else if (mode === "retry") {
      cover = await findOfficialCover(`${title} PS4`, null, title, "PS4", BULK_STEPS);
    } else {
      cover = await findOfficialCover(title, null, title, "PS4", BULK_STEPS);
    }
  } catch (err) {
    failures[title] = `خطا: ${err?.message ?? String(err)}`;
    writeJson(FAILURES_FILE, failures);
    failCount += 1;
    console.log(`[${index}/${total}] ${title} → خطای موتور کاور`);
    return;
  }

  if (!cover) {
    failures[title] = "کاور رسمی پیدا نشد";
    writeJson(FAILURES_FILE, failures);
    failCount += 1;
    console.log(`[${index}/${total}] ${title} → کاور پیدا نشد`);
    return;
  }

  try {
    const blob = await getCoverBlob(cover.url.split("/").pop() ?? "");
    if (!blob) throw new Error("بایت‌های کاور در دیتابیس پیدا نشد");
    const fileName = slugFor(title);
    const meta = await sharp(Buffer.from(blob.bytes))
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
    delete failures[title];
    writeJson(MANIFEST_FILE, manifest);
    writeJson(FAILURES_FILE, failures);
    done += 1;
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`[${index}/${total}] ${title} → ${fileName} (${cover.source}, ${meta.info.width}×${meta.info.height}, ${secs}s)`);
  } catch (err) {
    failures[title] = `خطای ذخیره: ${err?.message ?? String(err)}`;
    writeJson(FAILURES_FILE, failures);
    failCount += 1;
    console.log(`[${index}/${total}] ${title} → خطای ذخیره فایل`);
  } finally {
    // ردیف موقت کاور از دیتابیس لوکال پاک می‌شود؛ منبع حقیقت فایل‌های public است
    await deleteCoverByUrl(cover.url).catch(() => {});
  }
}

async function main() {
  const queue = titles.slice(0, total).map((title, i) => ({ title, index: i + 1 }));
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, CONCURRENCY) }, async () => {
    while (cursor < queue.length) {
      const item = queue[cursor++];
      await processTitle(item.title, item.index);
    }
  });
  await Promise.all(workers);

  const withCover = Object.keys(manifest).length;
  console.log(`\nپایان: ${done} دانلود جدید، ${skipped} از قبل موجود، ${failCount} ناموفق.`);
  console.log(`کاورهای موجود: ${withCover} از ${titles.length} — منیفست: ${path.relative(ROOT, MANIFEST_FILE)}`);
}

await main();
process.exit(0);
