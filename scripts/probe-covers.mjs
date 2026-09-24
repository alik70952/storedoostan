// probe: بررسی کارکرد موتور کاور رسمی روی چند عنوان PS4 (بدون تغییر در کد پروژه)
import { register } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

register("./ts-hook.mjs", import.meta.url);

const lib = pathToFileURL(path.join(process.cwd(), "src/lib/ai-cover.ts")).href;
const { findOfficialCover } = await import(lib);

const titles = process.argv.slice(2);
for (const title of titles) {
  const t0 = Date.now();
  let result = null;
  let err = null;
  try {
    result = await findOfficialCover(title, null, title, "PS4");
  } catch (e) {
    err = e?.message ?? String(e);
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`${title} | ${secs}s | ${result ? `${result.source} ${result.url}` : `FAIL ${err ?? ""}`}`);
}
process.exit(0);
