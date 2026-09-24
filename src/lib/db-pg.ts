import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import type { Game, GameInput, Platform } from "./types";
import { catalogGames } from "./catalog";

// بک‌اند Postgres (Neon/Supabase) برای استقرار روی Vercel.
// فقط وقتی استفاده می‌شود که DATABASE_URL ست شده باشد.

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

const GAME_COLUMNS = `(id,title,"titleFa",platform,"twoPlayer",genre,cover,description,featured,"createdAt","updatedAt")`;

/** درج گروهی بازی‌ها — ردیف‌های موجود دست نمی‌خورند (ON CONFLICT DO NOTHING) */
async function insertGames(pool: Pool, games: Game[]): Promise<void> {
  const CHUNK = 100;
  for (let i = 0; i < games.length; i += CHUNK) {
    const chunk = games.slice(i, i + CHUNK);
    const values: unknown[] = [];
    const tuples = chunk.map((g, index) => {
      const base = index * 11;
      values.push(
        g.id, g.title, g.titleFa, g.platform, g.twoPlayer ? 1 : 0,
        g.genre, g.cover, g.description, g.featured ? 1 : 0, g.createdAt, g.updatedAt
      );
      const placeholders = Array.from({ length: 11 }, (_, k) => `$${base + k + 1}`);
      return `(${placeholders.join(",")})`;
    });
    await pool.query(`INSERT INTO games ${GAME_COLUMNS} VALUES ${tuples.join(",")} ON CONFLICT (id) DO NOTHING`, values);
  }
}

/**
 * پرکردن ردیف‌های کاتالوگ در دیتابیس موجود (مثل Neon روی Vercel).
 * فقط ردیف‌های «نبوده» اضافه می‌شوند؛ داده‌ها و ویرایش‌های ادمین دست نمی‌خورند.
 * علاوه بر آن، بازی‌هایی که قبلاً کاورشان پیدا نشده بود (cover خالی) کاور می‌گیرند.
 */
async function ensureCatalogRows(p: Pool): Promise<void> {
  const existingRes = await p.query(`SELECT id FROM games WHERE id LIKE 'ps4-cat-%'`);
  const existing = new Set(existingRes.rows.map((row) => String((row as { id: unknown }).id)));
  const missing = catalogGames.filter((g) => !existing.has(g.id));
  if (missing.length > 0) await insertGames(p, missing);

  const emptyRes = await p.query(
    `SELECT COUNT(*)::int AS c FROM games WHERE id LIKE 'ps4-cat-%' AND (cover IS NULL OR cover = '')`
  );
  if (Number(emptyRes.rows[0]?.c ?? 0) > 0) {
    const withCover = catalogGames.filter((g) => g.cover && existing.has(g.id));
    const CHUNK = 200;
    for (let i = 0; i < withCover.length; i += CHUNK) {
      const chunk = withCover.slice(i, i + CHUNK);
      const values: unknown[] = [];
      const tuples = chunk.map((g, index) => {
        const base = index * 2;
        values.push(g.id, g.cover);
        return `($${base + 1},$${base + 2})`;
      });
      await p.query(
        `UPDATE games AS g SET cover = v.cover FROM (VALUES ${tuples.join(",")}) AS v(id, cover)
         WHERE g.id = v.id AND (g.cover IS NULL OR g.cover = '')`,
        values
      );
    }
  }
}

let ready: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const p = getPool();
      await p.query(`CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        "titleFa" TEXT NOT NULL,
        platform TEXT NOT NULL,
        "twoPlayer" INTEGER NOT NULL DEFAULT 0,
        genre TEXT NOT NULL DEFAULT '',
        cover TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        featured INTEGER NOT NULL DEFAULT 0,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );`);
      // مهاجرت سبک: دیتابیس‌های قدیمی ستون دسته «دو نفره» را ندارند.
      await p.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS "twoPlayer" INTEGER NOT NULL DEFAULT 0`);
      const count = await p.query("SELECT COUNT(*)::int AS c FROM games");
      if (Number(count.rows[0]?.c ?? 0) === 0) {
        await insertGames(p, catalogGames);
      } else {
        await ensureCatalogRows(p);
      }
    })();
    ready.catch(() => {
      ready = null;
    });
  }
  await ready;
}

type Row = Record<string, unknown>;

function toGame(r: Row): Game {
  const platform = (
    r.platform === "Xbox Offline" ? "Xbox Offline" :
    r.platform === "PS4" ? "PS4" :
    r.platform === "PS5 اکانتی" ? "PS5 اکانتی" :
    "PS5"
  ) as Platform;
  return {
    id: String(r.id),
    title: String(r.title ?? ""),
    titleFa: String(r.titleFa ?? ""),
    platform,
    twoPlayer: Number(r.twoPlayer) === 1,
    genre: String(r.genre ?? ""),
    cover: String(r.cover ?? ""),
    description: String(r.description ?? ""),
    featured: Number(r.featured) === 1,
    createdAt: String(r.createdAt ?? new Date().toISOString()),
    updatedAt: String(r.updatedAt ?? new Date().toISOString()),
  };
}

export const pgBackend = {
  async listGames(): Promise<Game[]> {
    await ensureSchema();
    const res = await getPool().query('SELECT * FROM games ORDER BY "createdAt" DESC');
    return (res.rows as Row[]).map(toGame);
  },
  async getGame(id: string): Promise<Game | null> {
    await ensureSchema();
    const res = await getPool().query("SELECT * FROM games WHERE id = $1", [id]);
    const row = (res.rows as Row[])[0];
    return row ? toGame(row) : null;
  },
  async createGame(input: GameInput): Promise<Game> {
    await ensureSchema();
    const now = new Date().toISOString();
    const game: Game = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    await getPool().query(
      `INSERT INTO games (id,title,"titleFa",platform,"twoPlayer",genre,cover,description,featured,"createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [game.id, game.title, game.titleFa, game.platform, game.twoPlayer ? 1 : 0, game.genre, game.cover, game.description, game.featured ? 1 : 0, game.createdAt, game.updatedAt]
    );
    return game;
  },
  async updateGame(id: string, input: GameInput): Promise<Game | null> {
    await ensureSchema();
    const res = await getPool().query(
      `UPDATE games SET title=$1,"titleFa"=$2,platform=$3,"twoPlayer"=$4,genre=$5,cover=$6,description=$7,featured=$8,"updatedAt"=$9 WHERE id=$10`,
      [input.title, input.titleFa, input.platform, input.twoPlayer ? 1 : 0, input.genre, input.cover, input.description, input.featured ? 1 : 0, new Date().toISOString(), id]
    );
    if ((res.rowCount ?? 0) === 0) return null;
    return pgBackend.getGame(id);
  },
  async deleteGame(id: string): Promise<boolean> {
    await ensureSchema();
    const res = await getPool().query("DELETE FROM games WHERE id = $1", [id]);
    return (res.rowCount ?? 0) > 0;
  },
  async setGameFeatured(id: string, featured: boolean): Promise<Game | null> {
    await ensureSchema();
    await getPool().query('UPDATE games SET featured=$1,"updatedAt"=$2 WHERE id=$3', [
      featured ? 1 : 0,
      new Date().toISOString(),
      id,
    ]);
    return pgBackend.getGame(id);
  },
};
