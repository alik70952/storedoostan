import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Game, GameInput, Platform } from "./types";
import { catalogGames } from "./catalog";

// لوکال: پوشه data ـــ روی Vercel: حافظه موقت /tmp (ماندگار نیست؛ برای ماندگاری DATABASE_URL بگذارید)
const DATA_DIR =
  process.env.DOOSTAN_DATA_DIR ||
  (process.env.VERCEL ? path.join("/tmp", "doostan-data") : path.join(process.cwd(), "data"));
const DB_PATH = path.join(DATA_DIR, "doostan.db");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

let db: DatabaseSync | null = null;

const INSERT_GAME_SQL = `INSERT OR IGNORE INTO games (id,title,titleFa,platform,twoPlayer,genre,cover,description,featured,createdAt,updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

/**
 * پرکردن ردیف‌های کاتالوگ (بازی‌های seed + کاتالوگ ۵۰۰ بازی PS4) در دیتابیس موجود.
 * شناسه ثابت ردیف‌ها باعث می‌شود در اجرای بعدی چیزی تکراری ساخته نشود، و
 * ویرایش/حذف ادمین هم دست‌نخورده بماند.
 */
function ensureCatalogRows(connection: DatabaseSync): void {
  const rows = connection.prepare("SELECT id FROM games").all() as Array<{ id?: unknown }>;
  const existingIds = new Set(rows.map((row) => String(row.id ?? "")));
  const missing = catalogGames.filter((g) => !existingIds.has(g.id));
  if (missing.length > 0) {
    const insert = connection.prepare(INSERT_GAME_SQL);
    connection.exec("BEGIN");
    try {
      for (const g of missing) {
        insert.run(g.id, g.title, g.titleFa, g.platform, g.twoPlayer ? 1 : 0, g.genre, g.cover, g.description, g.featured ? 1 : 0, g.createdAt, g.updatedAt);
      }
      connection.exec("COMMIT");
    } catch (err) {
      connection.exec("ROLLBACK");
      throw err;
    }
  }

  // بازی‌هایی که در زمان انتشار کاورشان پیدا نشده بود، آخرین کاور کاتالوگ را می‌گیرند
  const empty = connection
    .prepare("SELECT COUNT(*) AS c FROM games WHERE id LIKE 'ps4-cat-%' AND (cover IS NULL OR cover = '')")
    .get() as { c?: unknown } | undefined;
  if (Number(empty?.c ?? 0) > 0) {
    const update = connection.prepare("UPDATE games SET cover = ? WHERE id = ? AND (cover IS NULL OR cover = '')");
    connection.exec("BEGIN");
    try {
      for (const g of catalogGames) {
        if (g.cover) update.run(g.cover, g.id);
      }
      connection.exec("COMMIT");
    } catch {
      connection.exec("ROLLBACK");
    }
  }
}

export function getConnection(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  const existing = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='games'").get();
  if (existing) {
    ensureTwoPlayerColumn(db);
  } else {
    db.exec(`CREATE TABLE games (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      titleFa TEXT NOT NULL,
      platform TEXT NOT NULL,
      twoPlayer INTEGER NOT NULL DEFAULT 0,
      genre TEXT NOT NULL DEFAULT '',
      cover TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      featured INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );`);
  }
  ensureCatalogRows(db);
  return db;
}

// مهاجرت سبک: دیتابیس‌های قدیمی ستون دسته «دو نفره» را ندارند.
function ensureTwoPlayerColumn(connection: DatabaseSync): void {
  const columns = connection.prepare("PRAGMA table_info(games)").all() as Array<{ name?: unknown }>;
  const hasTwoPlayer = columns.some((c) => String(c.name ?? "") === "twoPlayer");
  if (!hasTwoPlayer) {
    connection.exec("ALTER TABLE games ADD COLUMN twoPlayer INTEGER NOT NULL DEFAULT 0");
  }
}

function rowToGame(row: Record<string, unknown>): Game {
  const platform = (
    row.platform === "Xbox Offline" ? "Xbox Offline" :
    row.platform === "PS4" ? "PS4" :
    row.platform === "PS5 اکانتی" ? "PS5 اکانتی" :
    "PS5"
  ) as Platform;
  return {
    id: String(row.id),
    title: String(row.title),
    titleFa: String(row.titleFa),
    platform,
    twoPlayer: Number(row.twoPlayer) === 1,
    genre: String(row.genre),
    cover: String(row.cover),
    description: String(row.description),
    featured: Number(row.featured) === 1,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt)
  };
}

export function listGames(): Game[] {
  const rows = getConnection().prepare("SELECT * FROM games ORDER BY createdAt DESC").all() as Record<string, unknown>[];
  return rows.map(rowToGame);
}

export function getGame(id: string): Game | null {
  const row = getConnection().prepare("SELECT * FROM games WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToGame(row) : null;
}

export function createGame(input: GameInput): Game {
  const now = new Date().toISOString();
  const game: Game = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
  getConnection().prepare(`INSERT INTO games (id,title,titleFa,platform,twoPlayer,genre,cover,description,featured,createdAt,updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    game.id, game.title, game.titleFa, game.platform, game.twoPlayer ? 1 : 0, game.genre, game.cover, game.description, game.featured ? 1 : 0, game.createdAt, game.updatedAt
  );
  return game;
}

export function updateGame(id: string, input: GameInput): Game | null {
  const existing = getGame(id);
  if (!existing) return null;
  getConnection().prepare(`UPDATE games SET title=?, titleFa=?, platform=?, twoPlayer=?, genre=?, cover=?, description=?, featured=?, updatedAt=? WHERE id=?`)
    .run(input.title, input.titleFa, input.platform, input.twoPlayer ? 1 : 0, input.genre, input.cover, input.description, input.featured ? 1 : 0, new Date().toISOString(), id);
  return getGame(id);
}

export function deleteGame(id: string): boolean {
  const result = getConnection().prepare("DELETE FROM games WHERE id = ?").run(id);
  return Number(result.changes) > 0;
}

export function setGameFeatured(id: string, featured: boolean): Game | null {
  const existing = getGame(id);
  if (!existing) return null;
  getConnection().prepare("UPDATE games SET featured = ?, updatedAt = ? WHERE id = ?")
    .run(featured ? 1 : 0, new Date().toISOString(), id);
  return getGame(id);
}

export function uploadDir(): string {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch {
    // روی محیط‌های فقط-خواندنی (serverless) فقط مسیر را برمی‌گردانیم
  }
  return UPLOADS_DIR;
}

// نسخه async برای استفاده از طریق روتر src/lib/db.ts
export const sqliteBackend = {
  listGames: async (): Promise<Game[]> => listGames(),
  getGame: async (id: string): Promise<Game | null> => getGame(id),
  createGame: async (input: GameInput): Promise<Game> => createGame(input),
  updateGame: async (id: string, input: GameInput): Promise<Game | null> => updateGame(id, input),
  deleteGame: async (id: string): Promise<boolean> => deleteGame(id),
  setGameFeatured: async (id: string, featured: boolean): Promise<Game | null> => setGameFeatured(id, featured),
};
