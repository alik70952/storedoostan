import type { Game } from "./types";
import { seedGames } from "./seed";
import { PS4_PLATFORM, ps4Catalog } from "./ps4-catalog";

// کاتالوگ پروژه = بازی‌های دستی seed + کاتالوگ ۵۰۰ بازی PS4 (src/lib/ps4-catalog.ts).
//
// چرا این لایه لازم است؟ روی Vercel دیتابیس (Neon Postgres) قبل از این تغییر پر شده است،
// پس منطق قبلی «فقط وقتی جدول خالی بود seed کن» هیچ‌وقت بازی‌های جدید را اضافه نمی‌کرد.
// شناسه ثابت هر ردیف کاتالوگ اجازه می‌دهد در هر دیپلوی فقط ردیف‌های «نبوده» اضافه شوند.

/** شناسه ثابت هر بازی کاتالوگ PS4 — با شماره یک‌مبنا تا در هر دیپلوی یکسان بماند */
export function ps4CatalogId(oneBasedIndex: number): string {
  return `ps4-cat-${oneBasedIndex}`;
}

/** نام نرمال‌شده برای تشخیص تکراری (پسوند سال حذف می‌شود: «God of War (2018)» = «God of War») */
function normTitle(value: string): string {
  return value
    .replace(/\(\s*\d{4}\s*\)/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * عنوان‌هایی که در seed دستی با کاور رسمی خودشان ثبت شده‌اند و نباید نسخه دوم‌شان
 * در کاتالوگ PS4 هم بیاید (جلوگیری از کارت تکراری در تب PS4).
 */
const SEEDED_PS4_TITLES = new Set([
  "godofwar",
  "marvelsspiderman",
  "horizonzerodawn",
  "thelastofuspartii",
  "deathstranding",
  "bloodborne",
  "persona5royal",
  "daysgone",
  "fifa23",
]);

function buildPs4CatalogGames(): Game[] {
  const taken = new Set(seedGames.filter((g) => g.platform === "PS4").map((g) => normTitle(g.title)));
  for (const title of SEEDED_PS4_TITLES) taken.add(title);

  const total = ps4Catalog.length;
  const games: Game[] = [];
  ps4Catalog.forEach((entry, index) => {
    const key = normTitle(entry.title);
    if (!key || taken.has(key)) return;
    taken.add(key);
    // ترتیب زمانی یک‌ساعته: لیست PDF (از محبوب‌ترین به کم‌طرفدارتر) همان ترتیب نمایش «جدیدترین» را می‌دهد
    const createdAt = new Date(Date.now() - (total - index) * 3_600_000).toISOString();
    games.push({
      id: ps4CatalogId(index + 1),
      title: entry.title,
      titleFa: entry.titleFa || entry.title,
      platform: PS4_PLATFORM,
      twoPlayer: entry.twoPlayer,
      genre: entry.genre,
      cover: entry.cover,
      description: entry.description,
      featured: false,
      createdAt,
      updatedAt: createdAt,
    });
  });
  return games;
}

export const ps4CatalogGames: Game[] = buildPs4CatalogGames();

/** منبع واحد برای ساخت اولیه جدول و پرکردن ردیف‌های ناقص */
export const catalogGames: Game[] = [...seedGames, ...ps4CatalogGames];
