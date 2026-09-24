/**
 * تکمیل دستی data/ps4-cover-overrides.json برای عنوان‌هایی که جستجوی خودکار
 * (ps4-wiki-overrides.mjs) نتوانست صفحه/تصویر درست پیدا کند.
 *
 * برای هر عنوان، «صفحه‌ی دقیق ویکی‌پدیا» مشخص شده؛ تصویر اصلی صفحه با API
 * گرفته می‌شود (بدون کوتاه‌شدن آدرس) و اگر صفحه تصویر اصلی نداشت، از لیست
 * تصاویر صفحه نزدیک‌ترین فایلِ cover/boxart انتخاب می‌شود.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const OVERRIDES_FILE = path.join(ROOT, "data/ps4-cover-overrides.json");
const FAILED_FILE = path.join(ROOT, "data/ps4-failed-titles.txt");
const RETRY_TITLES_FILE = path.join(ROOT, "data/ps4-retry-titles.txt");

// عنوان کاتالوگ → { page: صفحه‌ی دقیق ویکی‌پدیا، hint: الگوی نام فایل کاور در صفحه }
const MANUAL = {
  "Everybody's Golf": { page: "Everybody's Golf (2017 video game)" },
  "The Order: 1886": { page: "The Order: 1886" },
  "UFC 3": { page: "EA Sports UFC 3" },
  "NBA 2K19": { page: "NBA 2K19" },
  "NBA 2K23": { page: "NBA 2K23" },
  "Trine Enchanted Edition": { page: "Trine (video game)" },
  "Diablo II: Resurrected": { page: "Diablo II: Resurrected" },
  "Friday the 13th: The Game": { page: "Friday the 13th: The Game" },
  "My Hero One's Justice": { page: "My Hero One's Justice" },
  "Assassin's Creed The Ezio Collection": { page: "Assassin's Creed: The Ezio Collection", hint: /ezio/i },
  "Prototype Biohazard Bundle": { page: "Prototype (video game)", hint: /prototype|cover/i },
  "Fall Guys": { page: "Fall Guys", hint: /fall.?guys|cover/i },
  // کاورهای بنری Steam (460×215 از قبل از فیلتر بنر) — با بوکس‌آرت ویکی جایگزین می‌شوند
  "One Piece: Pirate Warriors 3": { page: "One Piece: Pirate Warriors 3" },
  "Injustice: Gods Among Us": { page: "Injustice: Gods Among Us" },
  "WRC 5": { page: "WRC 5" },
  "WRC 6": { page: "WRC 6" },
  "WRC Generations": { page: "WRC Generations" },
  "The Swapper": { page: "The Swapper" },
  "Star Wars: Republic Commando": { page: "Star Wars: Republic Commando" },
  "Metal Gear Solid V: Ground Zeroes": { page: "Metal Gear Solid V: Ground Zeroes" },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&${params}`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (cover-override-bot)", Accept: "application/json" },
      });
      if (res.ok) return await res.json();
      if (res.status === 429 || res.status >= 500) await sleep(1500 * (i + 1));
      else return null;
    } catch {
      await sleep(1500 * (i + 1));
    }
  }
  return null;
}

/** تصویر اصلی صفحه؛ اگر نداشت (یا SVG لوگو بود)، از لیست تصاویر صفحه کاور را حدس می‌زنیم */
async function pageCoverUrl(pageTitle, hint) {
  const j1 = await api(
    `titles=${encodeURIComponent(pageTitle)}&prop=pageimages&piprop=original&pilicense=any`
  );
  const page = j1?.query?.pages?.[0];
  const original = page?.original?.source ? String(page.original.source).split("?")[0] : "";
  if (original && !/\.svg$/i.test(original) && !hint) return original;

  // صفحه بدون pageimage مناسب: از فهرست فایل‌های صفحه کاور را پیدا کن
  const j2 = await api(`titles=${encodeURIComponent(pageTitle)}&prop=images&imlimit=50`);
  const images = j2?.query?.pages?.[0]?.images ?? [];
  const files = images
    .map((i) => String(i.title ?? ""))
    .filter((t) => /^File:/i.test(t) && !/\.svg$/i.test(t));
  const pick =
    (hint && files.find((t) => hint.test(t))) ||
    files.find((t) => /(cover|box\s*art|boxart)/i.test(t)) ||
    (original ? null : files[0]);
  if (!pick) return original || null;
  const j3 = await api(`titles=${encodeURIComponent(pick)}&prop=imageinfo&iiprop=url`);
  const info = j3?.query?.pages?.[0]?.imageinfo?.[0];
  return info?.url ? String(info.url) : original || null;
}

async function validDims(imageUrl) {
  let res = null;
  for (let i = 0; i < 3; i++) {
    try {
      res = await fetch(imageUrl, { headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" } });
      if (res.ok) break;
      if (res.status === 429 || res.status >= 500) {
        await sleep(2000 * (i + 1));
        continue;
      }
      return { ok: false, why: `HTTP ${res.status}` };
    } catch (err) {
      if (i === 2) return { ok: false, why: String(err?.message ?? err) };
      await sleep(2000 * (i + 1));
    }
  }
  if (!res || !res.ok) return { ok: false, why: `HTTP ${res?.status ?? "fail"}` };
  try {
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 15_000) return { ok: false, why: `${buf.length}B` };
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    const ratio = w && h ? w / h : 0;
    if (!w || !h) return { ok: false, why: "no-dims" };
    if (ratio < 0.5 || ratio > 1.4) return { ok: false, why: `${w}×${h} ratio` };
    if (h < 250 || w < 200) return { ok: false, why: `${w}×${h} small` };
    return { ok: true, why: `${w}×${h}` };
  } catch (err) {
    return { ok: false, why: String(err?.message ?? err) };
  }
}

let overrides = {};
try {
  overrides = JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf8").replace(/^﻿/, ""));
} catch {
  /* شروع تازه */
}

let added = 0;
for (const [title, cfg] of Object.entries(MANUAL)) {
  // عنوان‌هایی که قبلاً کاور معتبر گرفته‌اند دوباره پردازش نمی‌شوند
  if (overrides[title]) continue;
  await sleep(400);
  const url = await pageCoverUrl(cfg.page, cfg.hint ?? null);
  if (!url) {
    console.log(`✗ ${title} → تصویری در «${cfg.page}» پیدا نشد`);
    continue;
  }
  const v = await validDims(url);
  if (!v.ok) {
    console.log(`✗ ${title} → ${url.slice(-50)} نامعتبر (${v.why})`);
    continue;
  }
  overrides[title] = url;
  added += 1;
  console.log(`✓ ${title} → ${v.why} ${url.slice(-60)}`);
  await sleep(300);
}

const sorted = Object.fromEntries(Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(OVERRIDES_FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");

// فهرست عنوان‌هایی که باید در پاس مجدد fetch پردازش شوند:
// همه‌ی اوررایدهایی که در لیست ناموفق‌ها هستند یا کاور اشتباه قبلی داشتند
const WRONG_COVERS = [
  "Monster Hunter World: Iceborne",
  "My Hero One's Justice",
  "Metal Gear Survive",
  "Call of Duty: WWII",
];
const failed = fs.existsSync(FAILED_FILE)
  ? fs.readFileSync(FAILED_FILE, "utf8").split(/\r?\n/).map((t) => t.trim()).filter(Boolean)
  : [];
const retrySet = new Set([...failed, ...WRONG_COVERS]);
const retryTitles = Object.keys(sorted).filter((t) => retrySet.has(t));
fs.writeFileSync(RETRY_TITLES_FILE, `${retryTitles.join("\n")}\n`, "utf8");

console.log(`\nپایان: ${added} اورراید جدید، ${Object.keys(sorted).length} کل، ${retryTitles.length} عنوان برای پاس مجدد.`);
