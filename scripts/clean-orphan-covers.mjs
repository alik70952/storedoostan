import fs from "node:fs";
import path from "node:path";

// نگهداری جدول covers: ردیف‌هایی که هیچ بازی‌ای به آن‌ها اشاره نمی‌کند («کاور یتیم»).
// این ردیف‌ها از آزمون‌های دیباگ (/api/admin/ai/cover-debug)، انتشارهای نیمه‌کاره یا
// آپلودهایی که بعداً عوض شده‌اند باقی می‌مانند و حجم دیتابیس را بی‌دلیل بالا می‌برند.
//
//   node scripts/clean-orphan-covers.mjs            → فقط گزارش (هیچ چیزی حذف نمی‌شود)
//   node scripts/clean-orphan-covers.mjs --apply    → حذف واقعی ردیف‌های یتیم
//
// روی SQLite لوکال (پوشه data، یا DOOSTAN_DATA_DIR) و روی Postgres (DATABASE_URL) کار می‌کند.

const apply = process.argv.includes("--apply");
const COVER_REF_RE = /\/api\/covers\/([a-f0-9-]{36})\.(?:jpg|jpeg|png|webp)/gi;

function referencedIds(games) {
  const ids = new Set();
  for (const g of games) {
    for (const m of String(g.cover ?? "").matchAll(COVER_REF_RE)) ids.add(m[1]);
  }
  return ids;
}

function report(label, gamesCount, coverIds, used) {
  const orphans = coverIds.filter((id) => !used.has(id));
  console.log(`${label}: ${gamesCount} بازی، ${coverIds.length} کاور در دیتابیس، ${orphans.length} یتیم`);
  return orphans;
}

async function runSqlite() {
  const { DatabaseSync } = await import("node:sqlite");
  const dataDir = process.env.DOOSTAN_DATA_DIR || path.join(process.cwd(), "data");
  const dbPath = path.join(dataDir, "doostan.db");
  if (!fs.existsSync(dbPath)) {
    console.log(`دیتابیس SQLite پیدا نشد: ${dbPath}`);
    return;
  }
  const db = new DatabaseSync(dbPath);
  const games = db.prepare("SELECT cover FROM games").all();
  const coverIds = db.prepare("SELECT id FROM covers").all().map((r) => String(r.id));
  const orphans = report(`SQLite (${dbPath})`, games.length, coverIds, referencedIds(games));
  if (!orphans.length) {
    console.log("کاور یتیمی وجود ندارد. ✅");
    return;
  }
  if (!apply) {
    console.log("حالت گزارش: برای حذف، همین دستور را با --apply اجرا کنید.");
    console.log("نمونه: " + orphans.slice(0, 5).join(", "));
    return;
  }
  const del = db.prepare("DELETE FROM covers WHERE id = ?");
  for (const id of orphans) del.run(id);
  console.log(`✅ ${orphans.length} کاور یتیم حذف شد.`);
}

async function runPostgres() {
  const pg = await import("pg");
  const Pool = pg.default?.Pool ?? pg.Pool;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });
  try {
    const games = (await pool.query("SELECT cover FROM games")).rows;
    let coverIds = [];
    try {
      coverIds = (await pool.query("SELECT id FROM covers")).rows.map((r) => String(r.id));
    } catch {
      console.log("جدول covers در این دیتابیس وجود ندارد؛ چیزی برای پاک‌سازی نیست.");
      return;
    }
    const orphans = report("Postgres (DATABASE_URL)", games.length, coverIds, referencedIds(games));
    if (!orphans.length) {
      console.log("کاور یتیمی وجود ندارد. ✅");
      return;
    }
    if (!apply) {
      console.log("حالت گزارش: برای حذف، همین دستور را با --apply اجرا کنید.");
      console.log("نمونه: " + orphans.slice(0, 5).join(", "));
      return;
    }
    await pool.query("DELETE FROM covers WHERE id = ANY($1::text[])", [orphans]);
    console.log(`✅ ${orphans.length} کاور یتیم حذف شد.`);
  } finally {
    await pool.end().catch(() => {});
  }
}

if (process.env.DATABASE_URL) {
  await runPostgres();
} else {
  await runSqlite();
}
