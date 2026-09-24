/**
 * بازبینی کیفیت کاورهای دانلودشده (کاتالوگ PS4).
 *
 * خروجی: فهرست ردیف‌های «مشکوک» بر اساس نسبت ابعاد، منبع و اندازه — تا بتوان
 * کاورهای اشتباه را با `data/ps4-cover-overrides.json` دستی جایگزین کرد.
 *
 * استفاده:
 *   node scripts/qa-ps4-covers.mjs            # همه مشکوک‌ها
 *   node scripts/qa-ps4-covers.mjs 3          # فقط ریسک ۳ و بالاتر
 *   node scripts/qa-ps4-covers.mjs 0 summary  # فقط خلاصه
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_FILE = path.join(ROOT, "data/ps4-cover-manifest.json");
const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));
const minRisk = Number(process.argv[2] ?? 1);
const summaryOnly = process.argv[3] === "summary";

const RISKY_SOURCES = new Set(["bing", "google", "duckduckgo", "rawg", "wikipedia"]);
const SOURCE_LABEL = {
  "wikipedia-exact": "ویکی‌پدیا (دقیق)",
  downloadha: "دانلودها",
  p30day: "پی‌سی‌دی",
  steam: "استیم",
  bing: "بینگ",
  google: "گوگل",
  duckduckgo: "داک‌داک‌گو",
  wikipedia: "ویکی‌پدیا",
  rawg: "RAWG",
  igdb: "IGDB",
  manual: "دستی",
};

const rows = Object.entries(manifest).map(([title, info]) => {
  const ratio = Number((info.width / info.height).toFixed(3));
  const notes = [];
  let risk = 0;
  if (ratio > 0.85) {
    risk += 3;
    notes.push("مربعی/غیرعمودی");
  }
  if (RISKY_SOURCES.has(info.source)) {
    risk += 2;
    notes.push(`منبع نامطمئن: ${SOURCE_LABEL[info.source] ?? info.source}`);
  }
  if (info.width < 280) {
    risk += 1;
    notes.push("ابعاد کم");
  }
  if (info.source === "downloadha" && ratio > 0.78) {
    risk += 1;
    notes.push("نسبت غیراستاندارد");
  }
  return { title, info, ratio, risk, notes: notes.join("، ") };
});

const missingFiles = rows.filter(
  (r) => !fs.existsSync(path.join(ROOT, "public", String(r.info.file).replace(/^\//, "")))
);
const bySource = {};
for (const r of rows) bySource[r.info.source] = (bySource[r.info.source] ?? 0) + 1;
const risky = rows.filter((r) => r.risk >= minRisk).sort((a, b) => b.risk - a.risk || a.ratio - b.ratio);

console.log(`کاورها: ${rows.length} | مشکوک (ریسک ${minRisk}+): ${risky.length} | فایل گم‌شده: ${missingFiles.length}`);
console.log(`منابع: ${Object.entries(bySource).map(([k, v]) => `${SOURCE_LABEL[k] ?? k}=${v}`).join(" | ")}`);
if (missingFiles.length) console.log(`گم‌شده: ${missingFiles.map((r) => r.title).join(" | ")}`);

if (!summaryOnly) {
  console.log("\nعنوان\tفایل\tمنبع\tابعاد\tنسبت\tریسک\tدلیل");
  for (const r of risky) {
    console.log(`${r.title}\t${r.info.file}\t${SOURCE_LABEL[r.info.source] ?? r.info.source}\t${r.info.width}×${r.info.height}\t${r.ratio}\t${r.risk}\t${r.notes}`);
  }
}
