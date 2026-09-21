import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test, expect } from "@playwright/test";

// دیتابیس تستی موقت داخل پوشه temp سیستم — هیچ نوشتنی روی data/ واقعی پروژه انجام نمی‌شود.
const dataDir = path.join(os.tmpdir(), `doostan-ps5-account-${process.pid}-${Date.now()}`);
process.env.DOOSTAN_DATA_DIR = dataDir;

test.afterAll(() => {
  try {
    fs.rmSync(dataDir, { recursive: true, force: true });
  } catch {
    // روی ویندوز ممکن است فایل SQLite باز بماند؛ پاک‌نشدن پوشه temp مشکلی نیست
  }
});

test("دسته PS5 اکانتی: نام‌های جایگزین و نشان دسته (واحدی، بدون اینترنت)", async () => {
  const validation = await import("../src/lib/validation");
  const types = await import("../src/lib/types");

  // دسته جدید در فهرست پلتفرم‌های مجاز است و نام‌های جایگزینش شناخته می‌شوند
  expect(validation.PLATFORMS).toContain("PS5 اکانتی");
  expect(validation.normalizePlatform("PS5 اکانتی")).toBe("PS5 اکانتی");
  expect(validation.normalizePlatform("ps5 account")).toBe("PS5 اکانتی");
  expect(validation.normalizePlatform("PS5  اکانتی")).toBe("PS5 اکانتی");
  expect(validation.normalizePlatform("PS5")).toBe("PS5");
  expect(validation.normalizePlatform("Nintendo")).toBeNull();

  expect(types.ACCOUNT_PLATFORM).toBe("PS5 اکانتی");
  expect(types.isAccountPlatform("PS5 اکانتی")).toBe(true);
  expect(types.isAccountPlatform("PS5")).toBe(false);
  expect(types.platformClass("PS5 اکانتی")).toBe("account");
  expect(types.platformClass("PS5")).toBe("ps5");

  // ظرفیت‌ها حذف شده‌اند: اعتبارسنجی فیلد capacity ندارد
  const parsed = validation.validateGameInput({
    title: "EA SPORTS FC 26",
    titleFa: "فوتبال ۲۶",
    platform: "ps5 اکانتی",
    genre: "ورزشی",
    cover: "",
    description: "نسخه اکانتی.",
    featured: false
  });
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value.platform).toBe("PS5 اکانتی");
  expect(Object.keys(parsed.value)).not.toContain("capacity");

  // برچسب دو نفره: با تیک روشن/خاموش می‌شود (پیش‌فرض خاموش)
  const twoPlayerOn = validation.validateGameInput({
    title: "Mortal Kombat 1",
    titleFa: "مورتال کامبت ۱",
    platform: "PS5",
    twoPlayer: true,
    genre: "مبارزه‌ای",
    cover: "",
    description: "",
    featured: false
  });
  expect(twoPlayerOn.ok && twoPlayerOn.value.twoPlayer).toBe(true);
  const twoPlayerOff = validation.validateGameInput({
    title: "Returnal",
    titleFa: "ریتورنال",
    platform: "PS5",
    genre: "ترس و بقا",
    cover: "",
    description: "",
    featured: false
  });
  expect(twoPlayerOff.ok && twoPlayerOff.value.twoPlayer).toBe(false);
});

test("دسته PS5 اکانتی روی دیتابیس قدیمی (بدون ستون capacity) کار می‌کند", async () => {
  // ساختار قدیمی جدول را می‌سازیم تا مطمئن شویم دیگر نیازی به ستون ظرفیت نیست
  fs.mkdirSync(dataDir, { recursive: true });
  const legacy = new DatabaseSync(path.join(dataDir, "doostan.db"));
  legacy.exec(`CREATE TABLE games (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    titleFa TEXT NOT NULL,
    platform TEXT NOT NULL,
    genre TEXT NOT NULL DEFAULT '',
    cover TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    featured INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`);
  const now = new Date().toISOString();
  legacy
    .prepare(`INSERT INTO games (id,title,titleFa,platform,genre,cover,description,featured,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run("legacy-1", "Legacy Game", "بازی قدیمی", "PS5", "اکشن و ماجراجویی", "", "", 0, now, now);
  legacy.close();

  const db = await import("../src/lib/db-sqlite");

  // ردیف قدیمی بدون خطا خوانده می‌شود
  const legacyGame = db.getGame("legacy-1");
  expect(legacyGame?.platform).toBe("PS5");
  expect(legacyGame === null || "capacity" in legacyGame).toBe(false);

  // ثبت بازی در دسته «PS5 اکانتی» با برچسب دو نفره و خواندن دوباره‌اش — بدون هیچ ستون ظرفیتی
  const created = db.createGame({
    title: "EA SPORTS FC 26",
    titleFa: "فوتبال ۲۶",
    platform: "PS5 اکانتی",
    twoPlayer: true,
    genre: "ورزشی",
    cover: "",
    description: "نسخه اکانتی.",
    featured: false
  });
  expect("capacity" in created).toBe(false);
  expect(db.getGame(created.id)?.platform).toBe("PS5 اکانتی");
  expect(db.getGame(created.id)?.twoPlayer).toBe(true);
  expect(db.listGames().find((g) => g.id === created.id)?.twoPlayer).toBe(true);

  // مهاجرت: ستون «دو نفره» خودکار اضافه و ستون ظرفیت (که دیگر وجود ندارد) برنگشته است
  const cols = (db.getConnection().prepare("PRAGMA table_info(games)").all() as Array<{ name?: unknown }>).map((c) => String(c.name));
  expect(cols).toContain("twoPlayer");
  expect(cols).not.toContain("capacity");

  // ویرایش: خاموش کردن برچسب دو نفره و تغییر دسته
  const moved = db.updateGame(created.id, {
    title: created.title,
    titleFa: created.titleFa,
    platform: "PS5",
    twoPlayer: false,
    genre: created.genre,
    cover: created.cover,
    description: created.description,
    featured: created.featured
  });
  expect(moved?.platform).toBe("PS5");
  expect(moved?.twoPlayer).toBe(false);
  expect(db.deleteGame(created.id)).toBe(true);
});
