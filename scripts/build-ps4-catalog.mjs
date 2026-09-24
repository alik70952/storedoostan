/**
 * ساخت کاتالوگ TS بازی‌های PS4 از لیست استخراج‌شده از PDF + کاورهای دانلودشده.
 *
 * ورودی:
 *   data/ps4-titles.txt            ۵۰۰ نام انگلیسی (از PDF)
 *   data/ps4-cover-manifest.json   کاور دانلودشده هر عنوان (scripts/fetch-ps4-covers.mjs)
 *   data/ps4-fa-cache.json         کش نام فارسی/ژانر (ساخته می‌شود)
 *   data/ps4-fa-overrides.json     بازنویسی دستی (اختیاری، اولویت بالاتر از مدل)
 * خروجی:
 *   src/lib/ps4-catalog.ts         کاتالوگ نهایی که در seed استفاده می‌شود
 *
 * نام فارسی و ژانر با مدل GLM (APInex) و به‌صورت گروهی ساخته می‌شود؛ نتیجه در کش ذخیره
 * می‌شود تا اجرای مجدد رایگان و سریع باشد. توضیح فارسی از قالب یکنواخت هر ژانر ساخته می‌شود
 * (بدون هزینه مدل، یکدست و بدون توهم).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TITLES_FILE = path.join(ROOT, "data/ps4-titles.txt");
const MANIFEST_FILE = path.join(ROOT, "data/ps4-cover-manifest.json");
const CACHE_FILE = path.join(ROOT, "data/ps4-fa-cache.json");
const OVERRIDES_FILE = path.join(ROOT, "data/ps4-fa-overrides.json");
const OUT_FILE = path.join(ROOT, "src/lib/ps4-catalog.ts");

const GENRES = [
  "اکشن و ماجراجویی",
  "نقش‌آفرینی",
  "ورزشی",
  "مسابقه‌ای",
  "مبارزه‌ای",
  "ترس و بقا",
  "خانوادگی",
  "شوتر",
];

const BATCH_SIZE = Number(process.env.PS4_FA_BATCH || 20);
const CONCURRENCY = Number(process.env.PS4_FA_CONCURRENCY || 3);
const AINEX_BASE_URL = (process.env.AINEX_BASE_URL || "https://api.apinex.bond/v1").replace(/\/$/, "");
const AINEX_MODEL = process.env.AINEX_MODEL || "glm-5.3-flash";

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function readEnvFile(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch {
    /* فایل نبود */
  }
  return out;
}

/* ---------- ۱) قواعد ژانر و دو‌نفره (پشتوانه‌ی مدل + پوشش عنوان‌های ناشناس) ---------- */

const GENRE_RULES = [
  [/fifa|efootball|pes\b|nba|nfl|mlb|nhl|wwe|ufc|football|soccer|tennis|golf|cricket|rugby|volleyball|olympics|gran turismo|driveclub|motogp/i, "ورزشی"],
  [/forza|need for speed|project cars|assetto|wreckfest|burnout|ridge racer|trackmania|rally|dirt\b/i, "مسابقه‌ای"],
  [/tekken|street fighter|mortal kombat|injustice|soulcalibur|dead or alive|fighterz|ultimate ninja storm|one's justice|jump force|brawlhalla|guilty gear|king of fighters|virtua fighter/i, "مبارزه‌ای"],
  [/resident evil|outlast|amnesia|layers of fear|evil within|silent hill|dead space|alien: isolation|the quarry|until dawn|dark pictures|dying light|days gone|dead by daylight|friday the 13th|soma|visage|little nightmares|man of medan|little hope|house of ashes|devil in me|zombie|world war z|back 4 blood/i, "ترس و بقا"],
  [/call of duty|battlefield|doom|quake|wolfenstein|halo|gears of war|destiny|borderlands|titanfall|apex legends|overwatch|rainbow six|sniper|ghost recon|far cry|crysis|metro|killzone|homefront|medal of honor|payday|plants vs\.? zombies|hunt: showdown|insurgency/i, "شوتر"],
  [/minecraft|lego |overcooked|moving out|it takes two|a way out|unravel|human: fall flat|gang beasts|rocket league|fall guys|among us|crash bandicoot|spyro|rayman|trine|little big planet|littlebigplanet|sackboy|knack|astro bot|everybody's golf|dreams|concrete genie|medievil|just dance|singstar|party|family/i, "خانوادگی"],
  [/diablo|dark souls|elden ring|bloodborne|nioh|sekiro|dragon quest|final fantasy|persona|shin megami|kingdom hearts|tales of|nier|yakuza|judgment|dragon age|mass effect|the witcher|cyberpunk|fallout|elder scrolls|skyrim|divinity|baldur|monster hunter|god of war|assassin's creed|horizon|immortals fenyx|valhalla|star ocean|ni no kuni|disgaea|atelier|trails of|like a dragon|remnant|mortal shell|the surge|lords of the fallen|darksiders|greedfall|kingdoms of amalur|outward|elex|risen|torchlight|path of exile|odin sphere|dragon's dogma/i, "نقش‌آفرینی"],
];

const TWO_PLAYER_RULES = [
  /fifa|efootball|pes\b|nba|nfl|mlb|nhl|wwe|ufc|tennis|golf|cricket|rugby|volleyball|gran turismo|driveclub|need for speed|forza|motogp|f1\b|dirt|rally/i,
  /tekken|street fighter|mortal kombat|injustice|soulcalibur|dead or alive|fighterz|ultimate ninja storm|one's justice|jump force|brawlhalla|king of fighters|virtua fighter|naruto|dragon ball/i,
  /little big planet|littlebigplanet|sackboy|knack|overcooked|moving out|it takes two|a way out|unravel two|human: fall flat|gang beasts|rocket league|fall guys|among us|rayman|trine|borderlands|diablo|cuphead|resident evil 5|resident evil 6|revelations|lego |minecraft|terraria|sniper elite|zombie army|dying light|dead by daylight|plants vs\.? zombies|broforce|castle crashers|duck game|towerfall|crash team racing|team sonic|pixeljunk|everybody's golf|battleblock|nidhogg|ultimate chicken/i,
];

function keywordGenre(title) {
  for (const [re, genre] of GENRE_RULES) {
    if (re.test(title)) return genre;
  }
  return "اکشن و ماجراجویی";
}

function keywordTwoPlayer(title) {
  return TWO_PLAYER_RULES.some((re) => re.test(title));
}

const env = {
  ...readEnvFile(path.join(ROOT, ".env.local")),
  ...readEnvFile(path.join(ROOT, ".env.production")),
  ...process.env,
};
const API_KEY = env.APINEX_API_KEY || "";
const MANIFEST = readJson(MANIFEST_FILE, {});


/* ---------- ۲) نام فارسی + ژانر با مدل (گروهی، کش‌شده) ---------- */

const FA_SYSTEM_PROMPT = `You translate PlayStation game titles for a Persian game store catalog.
Return STRICT JSON only, no markdown, no extra text:
{"games":[{"title":"<exact input title>","titleFa":"<Persian name>","genre":"<genre>"}]}
Rules:
- Keep the SAME ORDER and the EXACT input titles in "title".
- "titleFa" must be the natural Persian name Persian gamers use (e.g. "خدای جنگ", "الدن رینگ", "ندای وظیفه: جنگاوری پیشرفته"). Persian script only, no Latin letters.
- "genre" must be exactly one of: ${GENRES.join(" | ")}
- Never invent a different game; if unsure, transliterate the title.`;

async function askGlm(titles) {
  if (!API_KEY) throw new Error("APINEX_API_KEY نیست");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(`${AINEX_BASE_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: AINEX_MODEL,
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: FA_SYSTEM_PROMPT },
          { role: "user", content: `Games (${titles.length}):\n${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`APInex ${res.status}: ${(await res.text().catch(() => "")).slice(0, 160)}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content);
    return Array.isArray(parsed?.games) ? parsed.games : [];
  } finally {
    clearTimeout(timer);
  }
}

const cache = readJson(CACHE_FILE, {});
const overrides = readJson(OVERRIDES_FILE, {});
const titles = fs
  .readFileSync(TITLES_FILE, "utf8")
  .split(/\r?\n/)
  .map((t) => t.trim())
  .filter((t) => t && !t.startsWith("//") && !t.startsWith("#"));

const need = titles.filter((t) => !cache[t]?.titleFa);
const batches = [];
for (let i = 0; i < need.length; i += BATCH_SIZE) batches.push(need.slice(i, i + BATCH_SIZE));

console.log(`عنوان‌ها: ${titles.length} — از کش: ${titles.length - need.length} — دسته‌های مدل: ${batches.length}`);
if (need.length > 0 && !API_KEY) console.log("هشدار: APINEX_API_KEY پیدا نشد؛ نام فارسی همان عنوان انگلیسی می‌شود.");

let cursor = 0;
let okBatches = 0;
async function worker() {
  while (cursor < batches.length) {
    const batch = batches[cursor++];
    try {
      const rows = await askGlm(batch);
      // اعتبارسنجی: تعداد و ترتیب عنوان‌ها باید دقیقاً یکی باشد
      let applied = 0;
      for (let i = 0; i < batch.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const sameTitle = String(row.title ?? "").trim().toLowerCase() === batch[i].toLowerCase();
        const titleFa = String(row.titleFa ?? "").trim();
        if (!sameTitle || !titleFa) continue;
        const rawGenre = String(row.genre ?? "").trim();
        const genre = GENRES.includes(rawGenre) ? rawGenre : keywordGenre(batch[i]);
        cache[batch[i]] = { titleFa, genre };
        applied += 1;
      }
      okBatches += 1;
      console.log(`دسته ${cursor}/${batches.length}: ${applied}/${batch.length} عنوان ترجمه شد`);
      writeJson(CACHE_FILE, cache);
    } catch (err) {
      console.log(`دسته ${cursor}/${batches.length} ناموفق: ${err.message}`);
    }
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, Math.max(1, batches.length)) }, worker));


/* ---------- ۳) ساخت فایل TS ---------- */

function persianDescription(titleFa, genre) {
  const flavor =
    {
      "اکشن و ماجراجویی": "ماجراجویی سینمایی با گیم‌پلی روان و دنیایی پرجزئیات",
      "نقش‌آفرینی": "دنیای نقش‌آفرینی عمیق با ارتقای قهرمان و انتخاب‌های داستانی",
      "ورزشی": "شبیه‌سازی ورزشی با تیم‌ها و لیگ‌های به‌روز",
      "مسابقه‌ای": "مسابقه سرعتی با خودروها و پیست‌های متنوع",
      "مبارزه‌ای": "مبارزه بازیکن‌محور با کمبوها و شخصیت‌های متنوع",
      "ترس و بقا": "تجربه ترسناک با فضاسازی نفس‌گیر و بقای سخت",
      "خانوادگی": "بازی شاد و مناسب دورهمی خانوادگی",
      "شوتر": "شوتر پرهیجان با نبردهای سریع و کمپین سینمایی",
    }[genre] ?? "تجربه‌ای پرطرفدار میان گیمرهای پلی‌استیشن";
  return `نسخه کپی‌خور «${titleFa}» برای PS4 — ${flavor}. نصب آفلاین، اجرای تضمینی و تستشده روی کنسول؛ همراه با پشتیبانی فروشگاه دوستان.`;
}

const missingCovers = [];
const entries = titles.map((title) => {
  const cover = MANIFEST[title]?.file ?? "";
  if (!cover) missingCovers.push(title);
  const fromOverride = overrides[title] ?? {};
  const fromCache = cache[title] ?? {};
  const titleFa = fromOverride.titleFa || fromCache.titleFa || title;
  const genreCandidate = fromOverride.genre || fromCache.genre;
  const genre = GENRES.includes(genreCandidate) ? genreCandidate : keywordGenre(title);
  const twoPlayer = fromOverride.twoPlayer ?? keywordTwoPlayer(title);
  const description = fromOverride.description || persianDescription(titleFa, genre);
  return { title, titleFa, genre, twoPlayer, description, cover };
});

const body = entries
  .map(
    (e) =>
      `  { title: ${JSON.stringify(e.title)}, titleFa: ${JSON.stringify(e.titleFa)}, genre: ${JSON.stringify(e.genre)}, twoPlayer: ${e.twoPlayer ? "true" : "false"}, description: ${JSON.stringify(e.description)}, cover: ${JSON.stringify(e.cover)} },`
  )
  .join("\n");

const file = `import type { Platform } from "./types";

// ⚠️ فایل تولیدشده — دست نزنید.
// منبع: لیست ۵۰۰ بازی PS4 (PDF) + کاورهای رسمی دانلودشده در public/covers/ps4
// بازتولید کاورها: node --experimental-strip-types scripts/fetch-ps4-covers.mjs
// بازتولید کاتالوگ: node --experimental-strip-types scripts/build-ps4-catalog.mjs

export type Ps4CatalogEntry = {
  title: string;
  titleFa: string;
  genre: string;
  twoPlayer: boolean;
  description: string;
  cover: string;
};

export const PS4_PLATFORM: Platform = "PS4";

export const ps4Catalog: Ps4CatalogEntry[] = [
${body}
];
`;

fs.writeFileSync(OUT_FILE, file, "utf8");
console.log(`\nکاتالوگ ساخته شد: ${path.relative(ROOT, OUT_FILE)} (${entries.length} بازی، دسته‌های موفق: ${okBatches}/${batches.length})`);
console.log(`بدون کاور: ${missingCovers.length}${missingCovers.length ? ` — ${missingCovers.slice(0, 12).join(" | ")}` : ""}`);
