/**
 * ساخت خودکار data/ps4-cover-overrides.json برای عنوان‌هایی که موتور کاور
 * برایشان کاور رسمی پیدا نکرد (یا کاور اشتباه گرفت — مثل آرت ساندترک/DLC).
 *
 * روش: جستجوی ویکی‌پدیا (صفحه‌ی بازی) → برداشتن تصویر اصلی صفحه → اعتبارسنجی
 * بوکس‌آرت عمودی با sharp → ثبت آدرس مستقیم تصویر در فایل اورراید.
 * fetch-ps4-covers.mjs این آدرس‌ها را با اولویت «کاور دستی» دانلود و ذخیره می‌کند.
 *
 * نکته: فیلتر نوار کنسول (PS4/PS5) عمداً اعمال نمی‌شود؛ برای عنوان‌های باقی‌مانده
 * داشتن بوکس‌آرت رسمی (حتی با نوار PS5) بهتر از نداشتن کاور است.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const FAILED_FILE = path.join(ROOT, "data/ps4-failed-titles.txt");
const OVERRIDES_FILE = path.join(ROOT, "data/ps4-cover-overrides.json");
const RETRY_TITLES_FILE = path.join(ROOT, "data/ps4-retry-titles.txt");

// کاورهایی که دانلود شدند ولی محتوای اشتباه دارند (آرت ساندترک/DLC/بنر)
const WRONG_COVERS = [
  "Monster Hunter World: Iceborne", // آرت DLC با بنر بنفش Steam
  "My Hero One's Justice", // بنر افقی header استیم
  "Metal Gear Survive", // آرت Original Soundtrack
  "Call of Duty: WWII", // آرت Soundtrack
];

const failed = fs.existsSync(FAILED_FILE)
  ? fs.readFileSync(FAILED_FILE, "utf8").split(/\r?\n/).map((t) => t.trim()).filter(Boolean)
  : [];
const titles = [...new Set([...failed, ...WRONG_COVERS])];

const STOP = new Set(["the", "of", "a", "an", "and", "video", "game", "edition", "s"]);
function words(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`:;!?.,()™®\-–—]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
}
function score(pageTitle, gameTitle) {
  const gw = new Set(words(gameTitle));
  if (!gw.size) return 0;
  const pw = new Set(words(pageTitle));
  let hit = 0;
  for (const w of gw) if (pw.has(w)) hit++;
  // جریمه: صفحه‌ای که عدد اضافه‌ای معرفی می‌کند (مثل «Everybody's Golf 4» به‌جای
  // «Everybody's Golf» نسخه ۲۰۱۷) احتمالاً نسخه/بازی دیگری است.
  let extraNums = 0;
  for (const w of pw) if (/^\d+$/.test(w) && !gw.has(w)) extraNums++;
  return hit / gw.size - extraNums * 0.15;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, init, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        await sleep(1500 * (i + 1));
        continue;
      }
      return res; // خطای قطعی (۴xx) — تکرار فایده ندارد
    } catch {
      await sleep(1500 * (i + 1));
    }
  }
  return null;
}

async function searchWiki(title) {
  const queries = [`intitle:"${title}" video game`, `${title} video game`];
  for (const q of queries) {
    const url =
      "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2" +
      `&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=8` +
      "&prop=pageimages&piprop=original&pilicense=any";
    try {
      const res = await fetchWithRetry(url, {
        headers: { "User-Agent": "Mozilla/5.0 (cover-override-bot)", Accept: "application/json" },
      });
      if (!res) continue;
      const json = await res.json();
      const pages = (json.query?.pages ?? []).filter((p) => p.original?.source);
      if (!pages.length) continue;
      const ranked = pages
        .map((p) => ({ p, s: score(String(p.title ?? ""), title) }))
        .sort((a, b) => b.s - a.s);
      const best = ranked[0];
      if (!best || best.s < 0.5) continue;
      return { pageTitle: String(best.p.title), image: String(best.p.original.source).split("?")[0] };
    } catch {
      /* تلاش بعدی */
    }
  }
  return null;
}

async function isValidBoxArt(imageUrl) {
  try {
    const res = await fetchWithRetry(imageUrl, { headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" } });
    if (!res) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 15_000) return false;
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (!w || !h) return false;
    const ratio = w / h;
    // بوکس‌آرت عمودی/مربعی؛ بنر افقی و آرت خیلی باریک رد می‌شود
    if (ratio < 0.55 || ratio > 1.35) return false;
    if (h < 300 || w < 220) return false;
    return true;
  } catch {
    return false;
  }
}

let existing = {};
try {
  existing = JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf8"));
} catch {
  /* فایل ندارد */
}

const overrides = { ...existing };
const misses = [];
let added = 0;
for (const title of titles) {
  // عنوان‌هایی که قبلاً اورراید معتبر دارند دوباره پردازش نمی‌شوند
  // (جز کاورهای اشتباهِ مشخص‌شده در WRONG_COVERS که همیشه بازبینی می‌شوند)
  if (overrides[title] && !WRONG_COVERS.includes(title)) continue;
  await sleep(400); // رعایت rate-limit ویکی‌پدیا
  const found = await searchWiki(title);
  if (!found) {
    misses.push(title);
    console.log(`✗ ${title} → صفحه ویکی‌پدیا پیدا نشد`);
    continue;
  }
  if (!(await isValidBoxArt(found.image))) {
    misses.push(title);
    console.log(`✗ ${title} → تصویر «${found.pageTitle}» بوکس‌آرت معتبر نبود`);
    continue;
  }
  overrides[title] = found.image;
  added += 1;
  console.log(`✓ ${title} → «${found.pageTitle}»`);
}

const sorted = Object.fromEntries(Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(OVERRIDES_FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");

// لیست عنوان‌هایی که باید در پاس مجدد fetch پردازش شوند (فقط همین‌ها)
const retryTitles = Object.keys(sorted).filter((t) => titles.includes(t));
fs.writeFileSync(RETRY_TITLES_FILE, `${retryTitles.join("\n")}\n`, "utf8");

console.log(`\nپایان: ${added} اورراید جدید، ${Object.keys(sorted).length} کل اورراید، ${misses.length} بدون نتیجه.`);
if (misses.length) console.log(`بدون نتیجه: ${misses.join(" | ")}`);
