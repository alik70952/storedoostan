// probe: بررسی موتور کاور + ذخیره‌سازی دیتابیس در محیط فعلی (برای عیب‌یابی شکست‌های گروهی)
import { register } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

register("./ts-hook.mjs", import.meta.url);
const ROOT = process.cwd();

const cover = await import(pathToFileURL(path.join(ROOT, "src/lib/ai-cover.ts")).href);
const store = await import(pathToFileURL(path.join(ROOT, "src/lib/cover-store.ts")).href);

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

for (const title of process.argv.slice(2)) {
  // ۱) ویکی‌پدیا با تطبیق دقیق
  const t0 = Date.now();
  let exact = null;
  try {
    exact = await cover.wikipediaExactCover(title);
  } catch (err) {
    console.log(`  wikipediaExactCover خطا: ${err.message}`);
  }
  console.log(`${title} | wikipedia-exact: ${exact ? exact.url : "null"} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

  // ۲) ذخیره‌سازی مستقیم (تست SQLite)
  try {
    const url = await store.saveCover("image/jpeg", Buffer.alloc(30000, 1));
    console.log(`  saveCover ok: ${url}`);
    const blob = await store.getCoverBlob(url.split("/").pop());
    console.log(`  getCoverBlob: ${blob ? `${blob.mime} ${blob.bytes.length}B` : "null"}`);
    await store.deleteCoverByUrl(url);
    console.log("  deleteCoverByUrl ok");
  } catch (err) {
    console.log(`  خطای دیتابیس: ${err.message}`);
  }

  // ۳) موتور کامل با مراحل گروهی
  const t1 = Date.now();
  let found = null;
  try {
    found = await cover.findOfficialCover(title, null, title, "PS4", BULK_STEPS);
  } catch (err) {
    console.log(`  findOfficialCover خطا: ${err.message}`);
  }
  console.log(`  findOfficialCover: ${found ? `${found.source} ${found.url}` : "null"} (${((Date.now() - t1) / 1000).toFixed(1)}s)`);
}
process.exit(0);
