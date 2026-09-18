import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import type { Game, GameInput, Platform } from "./types";
import { seedGames } from "./seed";

// بک‌اند Postgres (Neon/Supabase) برای استقرار روی Vercel.
// فقط وقتی استفاده می‌شود که DATABASE_URL ست شده باشد.

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
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
        genre TEXT NOT NULL DEFAULT '',
        cover TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        featured INTEGER NOT NULL DEFAULT 0,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );`);
      const count = await p.query("SELECT COUNT(*)::int AS c FROM games");
      if (Number(count.rows[0]?.c ?? 0) === 0) {
        for (const g of seedGames) {
          await p.query(
            `INSERT INTO games (id,title,"titleFa",platform,genre,cover,description,featured,"createdAt","updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
            [g.id, g.title, g.titleFa, g.platform, g.genre, g.cover, g.description, g.featured ? 1 : 0, g.createdAt, g.updatedAt]
          );
        }
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
  return {
    id: String(r.id),
    title: String(r.title ?? ""),
    titleFa: String(r.titleFa ?? ""),
    platform: (r.platform === "PS4" ? "PS4" : "PS5") as Platform,
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
      `INSERT INTO games (id,title,"titleFa",platform,genre,cover,description,featured,"createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [game.id, game.title, game.titleFa, game.platform, game.genre, game.cover, game.description, game.featured ? 1 : 0, game.createdAt, game.updatedAt]
    );
    return game;
  },
  async updateGame(id: string, input: GameInput): Promise<Game | null> {
    await ensureSchema();
    const res = await getPool().query(
      `UPDATE games SET title=$1,"titleFa"=$2,platform=$3,genre=$4,cover=$5,description=$6,featured=$7,"updatedAt"=$8 WHERE id=$9`,
      [input.title, input.titleFa, input.platform, input.genre, input.cover, input.description, input.featured ? 1 : 0, new Date().toISOString(), id]
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
