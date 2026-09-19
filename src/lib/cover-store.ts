import { randomUUID } from "node:crypto";

// جدول جداگانه برای کاورهای آپلودی.
// عکس به‌صورت بایت خام ذخیره می‌شود و از طریق /api/covers/<uuid>.<ext> با کش مرورگر سرو می‌شود؛
// به این ترتیب ردیف‌های بازی و لیست‌ها سبک می‌مانند (به‌جای data-URL چند مگابایتی داخل هر بازی).

export const MAX_COVER_BYTES = 3 * 1024 * 1024; // 3MB

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

const usePostgres = Boolean(process.env.DATABASE_URL);

function coverUrl(id: string, mime: string): string {
  return `/api/covers/${id}.${EXT_BY_MIME[mime] ?? "jpg"}`;
}

export function isCoverUrl(value: string): boolean {
  return /^\/api\/covers\/[a-f0-9-]{36}\.(jpg|png|webp)$/i.test(value.trim());
}

/** ذخیره عکس در جدول covers و برگرداندن آدرس نسبی آن */
export async function saveCover(mime: string, bytes: Uint8Array): Promise<string> {
  const id = randomUUID();
  if (usePostgres) {
    const { getPool } = await import("./db-pg");
    const pool = getPool();
    await pool.query(
      `CREATE TABLE IF NOT EXISTS covers (
        id TEXT PRIMARY KEY,
        mime TEXT NOT NULL,
        bytes BYTEA NOT NULL,
        "createdAt" TEXT NOT NULL
      );`
    );
    await pool.query(`INSERT INTO covers (id, mime, bytes, "createdAt") VALUES ($1,$2,$3,$4)`, [
      id, mime, Buffer.from(bytes), new Date().toISOString()
    ]);
  } else {
    const { getConnection } = await import("./db-sqlite");
    const db = getConnection();
    db.exec(`CREATE TABLE IF NOT EXISTS covers (
      id TEXT PRIMARY KEY,
      mime TEXT NOT NULL,
      bytes BLOB NOT NULL,
      createdAt TEXT NOT NULL
    );`);
    db.prepare(`INSERT INTO covers (id, mime, bytes, createdAt) VALUES (?, ?, ?, ?)`).run(
      id, mime, Buffer.from(bytes), new Date().toISOString()
    );
  }
  return coverUrl(id, mime);
}

/** خواندن بایت‌های یک کاور از دیتابیس (برای روت API) */
export async function getCoverBlob(name: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const match = name.match(/^([a-f0-9-]{36})\.(jpg|png|webp)$/i);
  if (!match) return null;
  const id = match[1];
  const fallbackMime = MIME_BY_EXT[match[2].toLowerCase()] ?? "image/jpeg";
  try {
    if (usePostgres) {
      const { getPool } = await import("./db-pg");
      const res = await getPool().query(`SELECT mime, bytes FROM covers WHERE id = $1`, [id]);
      const row = res.rows[0] as { mime?: string; bytes?: Buffer } | undefined;
      if (!row?.bytes) return null;
      const buf = Buffer.from(row.bytes);
      return { bytes: new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)), mime: row.mime || fallbackMime };
    }
    const { getConnection } = await import("./db-sqlite");
    const row = getConnection().prepare(`SELECT mime, bytes FROM covers WHERE id = ?`).get(id) as
      | { mime?: string; bytes?: Uint8Array }
      | undefined;
    if (!row?.bytes) return null;
    const buf = Buffer.from(row.bytes);
    return { bytes: new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)), mime: row.mime || fallbackMime };
  } catch {
    return null;
  }
}

/** حذف کاور بر اساس آدرس نسبی آن (برای پاک‌سازی کاورهای یتیم) */
export async function deleteCoverByUrl(url: string): Promise<void> {
  const match = url.trim().match(/^\/api\/covers\/([a-f0-9-]{36})\.(jpg|png|webp)$/i);
  if (!match) return;
  try {
    if (usePostgres) {
      const { getPool } = await import("./db-pg");
      await getPool().query(`DELETE FROM covers WHERE id = $1`, [match[1]]);
    } else {
      const { getConnection } = await import("./db-sqlite");
      getConnection().prepare(`DELETE FROM covers WHERE id = ?`).run(match[1]);
    }
  } catch {
    // حذف کاور حیاتی نیست؛ خطا را نادیده می‌گیریم
  }
}

const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i;

/** مهاجرت یک‌باره: کاورهای قدیمی که به‌صورت data-URL داخل ردیف بازی ذخیره شده بودند
 *  به جدول covers منتقل و آدرس بازی به‌روز می‌شود. */
let migrated = false;

export async function migrateDataUrlCovers(): Promise<void> {
  if (migrated) return;
  migrated = true;
  try {
    type MiniRow = { id: string; cover: string };
    let rows: MiniRow[] = [];

    if (usePostgres) {
      const { getPool } = await import("./db-pg");
      const res = await getPool().query(`SELECT id, cover FROM games WHERE cover LIKE 'data:image/%' LIMIT 200`);
      rows = res.rows as MiniRow[];
    } else {
      const { getConnection } = await import("./db-sqlite");
      rows = getConnection()
        .prepare(`SELECT id, cover FROM games WHERE cover LIKE 'data:image/%' LIMIT 200`)
        .all() as unknown as MiniRow[];
    }

    const migratedAny = rows.length > 0;
    for (const row of rows) {
      const m = DATA_URL_RE.exec(row.cover ?? "");
      if (!m) continue;
      const mime = m[1].toLowerCase();
      const bytes = Buffer.from(m[2], "base64");
      if (bytes.length === 0 || bytes.length > MAX_COVER_BYTES) continue;
      const url = await saveCover(mime, bytes);
      if (usePostgres) {
        const { getPool } = await import("./db-pg");
        await getPool().query(`UPDATE games SET cover = $1 WHERE id = $2`, [url, row.id]);
      } else {
        const { getConnection } = await import("./db-sqlite");
        getConnection().prepare(`UPDATE games SET cover = ? WHERE id = ?`).run(url, row.id);
      }
    }
    // اگر هنوز ردیف data-URL مانده (بیش از ۲۰۰ تا)، پرچم را ریست کن تا در فراخوانی بعدی ادامه یابد
    if (migratedAny && rows.length === 200) migrated = false;
  } catch {
    migrated = false; // دفعه بعد دوباره تلاش شود
  }
}
