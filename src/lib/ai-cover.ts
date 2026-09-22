// موتور پیدا کردن کاور رسمی هر بازی از کل اینترنت — بدون حدس و بدون ساخت تصویر AI.
// منابع به ترتیب: PlayStation Store (هنر رسمی PS از جستجوی محدود به استور) →
// IGDB (بوکس‌آرت رسمی همه بازی‌ها؛ اگر کلید رایگان Twitch تنظیم شده باشد) →
// سایت‌های ایرانی p30day/downloadha (کاور بازی‌های PS) → Steam → RAWG (اگر کلید باشد) →
// ویکی‌پدیا → جستجوی تصویر وب: DuckDuckGo → Bing → Google (متاکریتیک/IGN و… هم از همین راه).
// قانون فروشگاه: دسته Xbox Offline فقط و فقط از استور Xbox کاور می‌گیرد.
// بازی‌های PS4 یک مسیر جدا (psstore-ps4 → playstation-ps4) دارند تا کاور همان کنسول
// (نوار مشکی PS4، نسخه ...00 استور) برداشته شود، نه کاور سفید PS5.
// خروجی همیشه یک فایل واقعیِ دانلودشده است که در جدول covers ذخیره می‌شود (/api/covers/<uuid>.<ext>).

import { saveCover } from "./cover-store";
import type { Platform } from "./types";
import { detectImageMime } from "./validation";

const KNOWN_STEAM_APP_IDS: Record<string, number> = {
  "god of war ragnarok": 2322010,
  "god of war ragnarök": 2322010,
  "resident evil 4": 2050650,
  "resident evil 4 remake": 2050650,
  "black myth: wukong": 2358720,
  "black myth wukong": 2358720,
  "marvel's spider-man 2": 2651280,
  "spider-man 2": 2651280,
  "the last of us part ii": 2531310,
  "the last of us part 2": 2531310,
  "elden ring": 1245620,
  "horizon forbidden west": 2420110,
  "ghost of tsushima": 2215430,
  "red dead redemption 2": 1174180,
  "forza horizon 5": 1551360,
  "god of war": 1593500,
  "god of war (2018)": 1593500,
};

export type FoundCover = { url: string; source: string };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // سقف جدول covers
const MIN_IMAGE_BYTES = 6 * 1024;
const SEARCH_TIMEOUT_MS = 10_000;
const IMAGE_TIMEOUT_MS = 12_000;

/* ---------- ابزارهای پایه ---------- */

function norm(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

async function fetchText(
  url: string,
  headers: Record<string, string> = {},
  ms = SEARCH_TIMEOUT_MS
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", ...headers },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** ابعاد واقعی تصویر را از هدر بایت‌ها می‌خوانیم (بدون کتابخانه خارجی) */
export function getImageSize(bytes: Uint8Array, mime: string): { width: number; height: number } | null {
  try {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (mime === "image/png" && bytes.length >= 24) {
      return { width: dv.getUint32(16), height: dv.getUint32(20) };
    }
    if (mime === "image/jpeg") {
      let off = 2;
      while (off + 9 < bytes.length) {
        if (bytes[off] !== 0xff) { off++; continue; }
        const marker = bytes[off + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: dv.getUint16(off + 5), width: dv.getUint16(off + 7) };
        }
        off += 2 + dv.getUint16(off + 2);
      }
      return null;
    }
    if (mime === "image/webp" && bytes.length >= 30) {
      const fourcc = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
      if (fourcc === "VP8 ") {
        return { width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff };
      }
      if (fourcc === "VP8L") {
        const bits = dv.getUint32(21, true);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (fourcc === "VP8X") {
        const w = bytes[24] | (bytes[25] << 8) | (bytes[26] << 16);
        const h = bytes[27] | (bytes[28] << 8) | (bytes[29] << 16);
        return { width: w + 1, height: h + 1 };
      }
    }
  } catch { /* هدر ناقص */ }
  return null;
}

type Downloaded = { bytes: Uint8Array; mime: string; width: number; height: number; alpha: boolean };

/** آیا PNG/WebP کانال شفافیت (آلفا) دارد؟ لوگوها تقریباً همیشه پس‌زمینه شفاف دارند */
function hasAlphaChannel(bytes: Uint8Array, mime: string): boolean {
  try {
    if (mime === "image/png" && bytes.length > 26) return [4, 6].includes(bytes[25]);
    if (mime === "image/webp" && bytes.length > 20) {
      const fourcc = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
      if (fourcc === "VP8X") return (bytes[20] & 0x10) !== 0;
    }
  } catch { /* هدر ناقص */ }
  return false;
}

/**
 * دانلود و اعتبارسنجی کامل یک تصویر (MIME واقعی + ابعاد).
 * opts.portrait = فقط بوکس‌آرت عمودیِ واقعی را قبول کن (برای ویکی‌پدیا و جستجوی وب) —
 * بنر افقی، والپیپر و لوگوی شفاف رد می‌شود.
 * opts.wantPlatform = کنسول درخواستی (PS4/PS5): نوار بالای بوکس‌آرت (سفید=PS5، مشکی=PS4)
 * با sharp از بایت‌ها خوانده می‌شود و اگر مال کنسول دیگری بود، تصویر رد می‌شود.
 */
async function downloadImage(
  url: string,
  opts: { portrait?: boolean; allowSquare?: boolean; wantPlatform?: "PS4" | "PS5" } = {}
): Promise<Downloaded | null> {
  const portrait = opts.portrait === true;
  if (!/^https?:\/\//i.test(url)) return null;
  if (/\.(svg|svgz|ico|gif)(\?|#|$)/i.test(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8", Referer: "https://www.google.com/" },
    });
    if (!res.ok) return null;
    const declared = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (declared && declared !== "application/octet-stream" && !declared.startsWith("image/")) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    // کاور واقعی حداقل ~۲۰ کیلوبایت است؛ فایل‌های چند کیلوبایتی لوگو/آیکون‌اند
    const minBytes = portrait ? 20_000 : MIN_IMAGE_BYTES;
    if (buf.length < minBytes || buf.length > MAX_IMAGE_BYTES) return null;
    const mime = detectImageMime(buf);
    if (!mime) return null; // HTML/خطا/فرمت پشتیبانی‌نشده
    const size = getImageSize(buf, mime);
    if (!size) return null;
    const { width, height } = size;
    const alpha = hasAlphaChannel(buf, mime);
    const minDim = Math.min(width, height);
    const maxDim = Math.max(width, height);
    if (portrait) {
      // بوکس‌آرت: عمودی یا (برای هنر رسمی استور PS) مربعی، بزرگ، بدون پس‌زمینه شفاف
      if (alpha) return null;
      const maxRatio = opts.allowSquare ? 1.25 : 1.1;
      const ratio = width / height;
      if (ratio < 0.45 || ratio > maxRatio) return null;
      if (minDim < 260 || maxDim < 360) return null;
    } else {
      // کاور بازی نباید آیکون کوچک یا بنر خیلی کشیده باشد
      if (minDim < 180 || maxDim < 300) return null;
      const ratio = width / height;
      if (ratio < 0.4 || ratio > 2.35) return null;
    }
    // گام ۴: نوار کنسول — PS5 سفید / PS4 مشکی. اگر تصویر بوکس‌آرت عمودی است و
    // نوار قابل‌تشخیصی از کنسولِ «دیگری» دارد، رد می‌شود.
    if (opts.wantPlatform && portrait) {
      const banner = await readTopBanner(buf);
      if (banner && !matchesConsoleBanner(banner.pixels, banner.frac, url, opts.wantPlatform)) return null;
    }
    return { bytes: buf, mime, width, height, alpha };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * خواندن الگوی پیکسلی «نوار بالای» تصویر با sharp:
 * - ۱۰٪ بالایی تصویر به ۴۸ ستون میانگین گرفته می‌شود
 * - نوار واقعی (سفید PS5 / مشکی PS4) پیکسل‌های تقریباً یکنواخت دارد → frac بالا
 * - آرت تمیز/تمام‌صفحه پیکسل‌های پراکنده دارد → frac پایین (رد نمی‌شود)
 */
async function readTopBanner(
  bytes: Uint8Array
): Promise<{ pixels: { r: number; g: number; b: number }[]; frac: number } | null> {
  try {
    const { default: sharp } = await import("sharp");
    const meta = await sharp(Buffer.from(bytes)).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (!w || !h) return null;
    const bandH = Math.max(2, Math.round(h * 0.1));
    const cols = 48;
    const raw = await sharp(Buffer.from(bytes))
      .extract({ left: 0, top: 0, width: w, height: bandH })
      .resize(cols, 1, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const data = raw.data;
    const channels = raw.info.channels;
    const pixels: { r: number; g: number; b: number }[] = [];
    for (let i = 0; i < cols; i++) {
      const o = i * channels;
      pixels.push({ r: data[o] ?? 0, g: data[o + 1] ?? 0, b: data[o + 2] ?? 0 });
    }
    // یکنواختی نوار: میانگین انحراف هر پیکسل از میانگین کل
    const mean = (f: (p: { r: number; g: number; b: number }) => number) =>
      pixels.reduce((s, p) => s + f(p), 0) / pixels.length;
    const mr = mean((p) => p.r);
    const mg = mean((p) => p.g);
    const mb = mean((p) => p.b);
    const dev =
      pixels.reduce((s, p) => s + Math.abs(p.r - mr) + Math.abs(p.g - mg) + Math.abs(p.b - mb), 0) /
      (pixels.length * 3);
    // نوار واقعی انحراف کم (< 26) دارد؛ آرت تمیز انحراف بالا
    const frac = Math.max(0, Math.min(1, 1 - dev / 60));
    return { pixels, frac: frac >= 0.55 ? frac : 0 };
  } catch {
    return null; // sharp در دسترس نبود → بدون فیلتر نوار ادامه بده
  }
}

/* ---------- منبع ۱: Steam ---------- */

const STEAM_CDNS = [
  (id: number, file: string) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/${file}`,
  (id: number, file: string) => `https://cdn.akamai.steamstatic.com/steam/apps/${id}/${file}`,
];

function steamAppIdFromName(name: string): number | null {
  const key = norm(name);
  if (!key) return null;
  if (KNOWN_STEAM_APP_IDS[key]) return KNOWN_STEAM_APP_IDS[key];
  for (const [k, id] of Object.entries(KNOWN_STEAM_APP_IDS)) {
    const nk = norm(k);
    if (nk === key || (key.length >= 6 && (nk.includes(key) || key.includes(nk)))) return id;
  }
  return null;
}

/** جستجوی عمومی در استور Steam (بدون کلید) تا آیدی هر بازی پیدا شود */
async function steamSearchAppId(title: string): Promise<number | null> {
  const q = norm(title);
  if (q.length < 3) return null;
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&cc=US&l=en`;
  const text = await fetchText(url);
  if (!text) return null;
  // این کلمات یعنی نتیجه DLC/کاستوم/ساندترک است، نه خود بازی — کاورش با بازی اصلی فرق دارد
  const DLC_RE = /(costume|dlc|soundtrack|ost|demo|beta|playtest|skin|pack|upgrade|season\s*pass|content)/i;
  try {
    const data = JSON.parse(text) as { items?: Array<{ id?: number; name?: string }> };
    const items = (data.items ?? []).filter((i) => typeof i.id === "number" && i.name);
    let best: { id: number; score: number } | null = null;
    for (const item of items) {
      // قرارداد Steam: «نام بازی اصلی - نام DLC» → فقط بخش اول را مقایسه کن
      const baseName = (item.name ?? "").split(" - ")[0];
      if (DLC_RE.test(baseName)) continue;
      const nk = norm(baseName);
      let score = 0;
      if (nk === q) score = 100;
      else if (nk.startsWith(q) || q.startsWith(nk)) score = 80;
      else if (nk.includes(q) || q.includes(nk)) score = 50;
      if (score > 0 && (!best || score > best.score)) best = { id: item.id as number, score };
    }
    // تطبیق خیلی ضعیف (فقط «شامل بودن») را قبول نکن؛ کاور اشتباه بدتر از بی‌کاور است
    return best && best.score >= 80 ? best.id : null;
  } catch {
    return null;
  }
}

async function trySteamImages(appId: number, seen: Set<string>): Promise<FoundCover | null> {
  // library_600x900 = بوکس‌آرت عمودی رسمی؛ header.jpg = بنر رسمی
  const files = ["library_600x900.jpg", "header.jpg"];
  for (const file of files) {
    for (const cdn of STEAM_CDNS) {
      const url = cdn(appId, file);
      if (seen.has(url)) continue;
      seen.add(url);
      const img = await downloadImage(url);
      if (img) {
        const saved = await saveCover(img.mime, img.bytes);
        return { url: saved, source: "steam" };
      }
    }
  }
  return null;
}

/* ---------- منبع ۲: RAWG (اختیاری، فقط اگر RAWG_API_KEY تنظیم شده باشد) ---------- */

async function rawgCover(title: string, seen: Set<string>): Promise<FoundCover | null> {
  const key = process.env.RAWG_API_KEY || "";
  if (!key) return null;
  const url = `https://api.rawg.io/api/games?key=${encodeURIComponent(key)}&search=${encodeURIComponent(title)}&page_size=5`;
  const text = await fetchText(url);
  if (!text) return null;
  try {
    const data = JSON.parse(text) as { results?: Array<{ name?: string; background_image?: string }> };
    const q = norm(title);
    for (const g of data.results ?? []) {
      const img = g.background_image;
      if (!img || seen.has(img)) continue;
      const nk = norm(g.name ?? "");
      if (nk && !nk.includes(q) && !q.includes(nk)) continue;
      seen.add(img);
      const dl = await downloadImage(img);
      if (dl) return { url: await saveCover(dl.mime, dl.bytes), source: "rawg" };
    }
  } catch { /* JSON خراب */ }
  return null;
}

/* ---------- منبع ۲/۳: سایت‌های ایرانی p30day / downloadha (فقط PS5/PS4) ---------- */

/**
 * این سایت‌ها بازی‌های پلی‌استیشن را با تصویر شاخص رسمی منتشر می‌کنند.
 * روش: جستجوی داخلی سایت → برداشتن اولین تصویرِ واقعاً مرتبط با نام بازی از HTML.
 */
async function irSiteCover(
  title: string,
  seen: Set<string>,
  which: "p30day" | "downloadha"
): Promise<FoundCover | null> {
  const path =
    which === "p30day"
      ? `https://www.p30day.ir/?s=${encodeURIComponent(title)}`
      : `https://www.downloadha.com/?s=${encodeURIComponent(title)}`;
  const html = await fetchText(path);
  if (!html || html.length < 5000) return null;
  const url = extractRelatedImage(html, seen, title);
  if (!url) return null;
  const dl = await downloadImage(url, { portrait: !url.includes(".avif") });
  if (!dl) return null;
  return { url: await saveCover(dl.mime, dl.bytes), source: which };
}

/**
 * از بین همه تگ‌های img/source صفحه، تصویری را برمی‌دارد که واقعاً به نام بازی ربط دارد.
 * لوگو/بنر/تبلیغ/آواتار خود سایت‌ها و تصاویر تکراری رد می‌شوند.
 */
function extractRelatedImage(html: string, seen: Set<string>, title: string): string | null {
  const nameWords = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  const titleKey = norm(title).slice(0, 4);
  const picked = new Set<string>();
  const cands: Array<{ url: string; ctx: string }> = [];
  const tagRe = /<(img|source)\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    const tag = m[0];
    const attr =
      tag.match(/(?:srcset|data-srcset|data-src|data-lazy-src|src)\s*=\s*["']([^"']+)/i)?.[1] ?? "";
    if (!attr) continue;
    // از srcset چندتایی، بزرگ‌ترین نسخه (آخرین)
    const parts = attr
      .split(",")
      .map((s) => s.trim().split(/\s+/)[0])
      .filter(Boolean);
    let url = parts.length > 0 ? parts[parts.length - 1] : "";
    if (!url) continue;
    if (url.startsWith("//")) url = `https:${url}`;
    if (!/^https?:\/\//i.test(url)) continue;
    if (!/\.(jpe?g|png|webp|avif)(\?|#|$)/i.test(url)) continue;
    const low = url.toLowerCase();
    // لوگو/بنر/تبلیغ/آیکون خود سایت‌ها و فرمت‌های غیرعکسی
    if (/logo|icon|sprite|banner|ads|tablig|tabligh|\.gif|svg|avatar|emoji|updateicon|metacritic|mtc\d|kk-star|magnet|placeholder|loading/.test(low)) continue;
    if (picked.has(url) || seen.has(url)) continue;
    picked.add(url);
    cands.push({ url, ctx: `${low} ${tag.slice(0, 300).toLowerCase()}` });
  }
  if (cands.length === 0) return null;
  const scored = cands
    .map((c) => {
      let score = 0;
      if (titleKey && c.ctx.includes(titleKey)) score += 120;
      for (const w of nameWords) {
        if (c.ctx.includes(w)) score += w.length >= 6 ? 12 : 6;
      }
      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score);
  // آستانه شباهت تا بنر/عکس نامرتبط برداشته نشود
  const need = titleKey.length >= 6 ? 100 : 55;
  if (scored[0].score < need) return null;
  return scored[0].url;
}

/* ---------- منبع ۳: ویکی‌پدیا (بوکس‌آرت رسمی مقاله بازی) ---------- */

async function wikipediaCover(title: string, seen: Set<string>): Promise<FoundCover | null> {
  const api =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2" +
    `&generator=search&gsrsearch=${encodeURIComponent(title + " video game")}&gsrlimit=5` +
    "&prop=pageimages&piprop=original%7Cthumbnail&pithumbsize=800" +
    // بوکس‌آرت بازی‌ها fair-use است؛ بدون pilicense=any حذف می‌شوند
    "&pilicense=any";
  const text = await fetchText(api, { Accept: "application/json" });
  if (!text) return null;
  try {
    const data = JSON.parse(text) as {
      query?: { pages?: Array<{ title?: string; original?: { source?: string }; thumbnail?: { source?: string } }> };
    };
    const pages = [...(data.query?.pages ?? [])];
    const q = norm(title);
    // مقاله‌ای که عنوانش بیشترین شباهت را به نام بازی دارد اول بررسی شود
    const pageScore = (p: { title?: string }): number => {
      const t = norm(p.title ?? "");
      if (!q || !t) return 0;
      if (t === q) return 100;
      if (t.startsWith(q) || q.startsWith(t)) return 80;
      if (t.includes(q) || q.includes(t)) return 60;
      return 0;
    };
    pages.sort((a, b) => pageScore(b) - pageScore(a));
    for (const p of pages) {
      for (const candidate of [p.original?.source, p.thumbnail?.source]) {
        if (!candidate || seen.has(candidate)) continue;
        seen.add(candidate);
        const dl = await downloadImage(candidate, { portrait: true });
        if (dl) return { url: await saveCover(dl.mime, dl.bytes), source: "wikipedia" };
      }
    }
  } catch { /* JSON خراب */ }
  return null;
}

/* ---------- منابع ۴-۶: جستجوی تصویر باز وب (دسترسی کامل به اینترنت) ---------- */

/**
 * دامنه‌های معتبرِ هنر بازی: اگر تصویر از یکی از این‌ها باشد، لازم نیست نام بازی
 * داخل URL بیاید — چون کاورهای رسمی استورها اغلب آدرس هش‌شده دارند (مثل
 * image.api.playstation.com/vulcan/ap/rnd/...jpg) و رد کردن‌شان یعنی از دست دادن
 * بهترین کاور. فقط لوگو/آیکون/اسپرایت بودن حتماً چک می‌شود.
 */
const TRUSTED_ART_DOMAINS =
  /(?:^|\.)(?:image\.api\.playstation|store\.playstation|ps-ssl\.playstation|playstation\.com|steamstatic|steamusercontent|steamcommunity|akamai\.steamstatic|cloudflare\.steamstatic|metacritic|ignimgs|gamespot|giantbomb|gamefaqs|mobygames|mobygames\.com|fandom|wikimedia|wikipedia|rawg|rawg\.io|vg247|pushsquare|playstationlifestyle|videogameschronicle|dualshockers|gamerant|gfinityesports|theverge|polygon|kotaku|xbox\.com|store-images\.s-microsoft|xboxassets|images\.igdb)\./i;

/** فیلتر نتیجه‌ها: باید شبیه کاور بازی باشد، نه آیکون/لوگو/اسپرایت */
function plausibleCoverHit(hitUrl: string, title: string): boolean {
  const u = hitUrl.toLowerCase();
  if (/(?:^|\/)(?:icon|favicon|logo|avatar|sprite|emoji)[._-]/.test(u)) return false;
  const isImage = /\.(jpe?g|png|webp)(\?|#|$)/i.test(u);
  const trusted = TRUSTED_ART_DOMAINS.test(u);
  if (!isImage && !trusted) return false;
  // دامنه معتبر → قبول (حتی اگر نام بازی در URL نباشد)
  if (trusted) return true;
  const q = norm(title);
  if (!q) return true;
  let haystack = u;
  try { haystack = u + " " + decodeURIComponent(u); } catch { /* URL خراب */ }
  const probe = q.length > 12 ? q.slice(0, 12) : q.slice(0, Math.max(6, Math.ceil(q.length * 0.6)));
  return norm(haystack).includes(probe);
}

/**
 * نوار سفید PS5 / مشکی PS4 بالای بوکس‌آرت: اگر تصویر برای کنسول دیگری است، ردش کن.
 * داده: الگوی پیکسلی بالای کاور (از sharp گرفته می‌شود) + آدرس تصویر.
 * - نوار روشن (سفید/آبی روشن با لوگوی تیره): فقط PS5 قبول می‌کند
 * - نوار تیره غالباً مشکی (PS4/PS3): کنسولِ درخواست‌شده باید همان باشد
 * - آرت تمیز/تمام‌صفحه (بدون نوار): برای هر دو کنسول خوب است
 */
export function matchesConsoleBanner(
  pixels: { r: number; g: number; b: number }[],
  bannerFrac: number,
  imageUrl: string,
  wanted: "PS4" | "PS5"
): boolean {
  if (!pixels.length || bannerFrac <= 0) return true; // نوارِ قابل‌تشخیصی نیست → آرت تمیز
  const u = (imageUrl || "").toLowerCase();
  const urlSaysPs5 = /(^|[^a-z0-9])(ps5|playstation[-_ ]?5)([^a-z0-9]|$)/.test(u) && !/(^|[^a-z0-9])(ps4|playstation[-_ ]?4)([^a-z0-9]|$)/.test(u);
  const urlSaysPs4 = /(^|[^a-z0-9])(ps4|playstation[-_ ]?4)([^a-z0-9]|$)/.test(u) && !/(^|[^a-z0-9])(ps5|playstation[-_ ]?5)([^a-z0-9]|$)/.test(u);
  const n = pixels.length;
  const avg = (f: (p: { r: number; g: number; b: number }) => number) =>
    pixels.reduce((s, p) => s + f(p), 0) / n;
  const meanR = avg((p) => p.r);
  const meanG = avg((p) => p.g);
  const meanB = avg((p) => p.b);
  const bright = (meanR + meanG + meanB) / 3;
  const spread = Math.max(meanR, meanG, meanB) - Math.min(meanR, meanG, meanB);
  // پیکسل‌های «آبی سونی»: لوگوی ▲●✕■ سفید روی زمینه آبی یعنی نوار PS5/PS4 واقعی
  let blueSony = 0;
  for (const p of pixels) {
    if (p.b > 120 && p.b > p.r + 40 && p.b > p.g + 40) blueSony++;
  }
  const blueFrac = blueSony / n;
  const looksWhiteBanner = bright > 150 || (blueFrac > 0.04 && spread < 90);
  if (wanted === "PS5") {
    if (urlSaysPs4) return false; // آدرس مال PS4 است
    // نوار سفیدِ واقعی یا آبی سونی → حتماً PS5 است، قبول
    if (looksWhiteBanner) return true;
    // نوار تیره + مدرک PS5 بودن در آدرس → قبول (مثلاً نسخه Deluxe تیره)
    if (urlSaysPs5) return true;
    // نوار تیره بدون هیچ مدرکی → احتمالاً بوکس PS4/قدیمی است، رد
    return false;
  }
  // wanted === "PS4"
  if (urlSaysPs5) return false; // آدرس مال PS5 است
  if (looksWhiteBanner) return false; // نوار سفید = PS5
  // نوار تیره (مشکی PS4 یا تیره مینیمال) → قبول
  return true;
}

async function duckduckgoCover(
  title: string,
  seen: Set<string>,
  opts: { queries?: string[]; onlyPlaystation?: boolean; platform?: "PS4" | "PS5" } = {}
): Promise<FoundCover | null> {
  const queries = opts.queries ?? [`${title} game cover art`, `${title} ps5 box art`, `${title} box art`, `${title} playstation store cover`];
  const isPs = (u: string) => /(?:image\.api\.playstation|store\.playstation|ps-ssl\.playstation)\.(?:com|net)/i.test(u);
  for (const query of queries) {
    const html = await fetchText(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`
    );
    if (!html) continue;
    const vqd = html.match(/vqd=["']?([\d-]+)["']?/)?.[1] ?? html.match(/vqd=([0-9a-zA-Z-]+)/)?.[1];
    if (!vqd) continue;
    const json = await fetchText(
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,&p=1`,
      { Accept: "application/json", Referer: "https://duckduckgo.com/" }
    );
    if (!json) continue;
    type Hit = { image?: string; width?: number; height?: number; title?: string };
    let hits: Hit[] = [];
    try {
      hits = (JSON.parse(json) as { results?: Hit[] }).results ?? [];
    } catch { continue; }
    // بوکس‌آرت عمودی (نسبت ~0.7) اولویت دارد؛ نتایج افقی (لوگو/بنر) ته لیست می‌روند
    const ratioScore = (h: Hit) =>
      h.width && h.height ? Math.abs(h.width / h.height - 0.7) : 2;
    hits.sort((a, b) => ratioScore(a) - ratioScore(b));
    for (const hit of hits.slice(0, 24)) {
      const img = hit.image;
      if (!img || seen.has(img)) continue;
      seen.add(img);
      if (opts.onlyPlaystation && !isPs(img)) continue;
      if (hit.title && !plausibleCoverHit(img, title) && !plausibleCoverHit(hit.title, title)) continue;
      const dl = await downloadImage(img, { portrait: true, allowSquare: opts.onlyPlaystation === true, wantPlatform: opts.platform });
      if (dl) return { url: await saveCover(dl.mime, dl.bytes), source: "duckduckgo" };
    }
  }
  return null;
}

async function bingCover(
  title: string,
  seen: Set<string>,
  opts: { queries?: string[]; onlyPlaystation?: boolean; platform?: "PS4" | "PS5" } = {}
): Promise<FoundCover | null> {
  const queries = opts.queries ?? [`${title} video game cover`, `${title} box art`, `${title} ps5 game cover art`];
  const isPs = (u: string) => /(?:image\.api\.playstation|store\.playstation|ps-ssl\.playstation)\.(?:com|net)/i.test(u);
  for (const query of queries) {
    const html = await fetchText(
      `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1&adlt=moderate`,
      { Cookie: "SRCHHPGUSR=SRCHLANG=en" }
    );
    if (!html) continue;
    // کدک‌های Bing: m="{...murl:https://...}" به‌صورت HTML-escape شده
    const urls = [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)]
      .map((m) => m[1].replace(/\\u003d/g, "=").replace(/\\u0026/g, "&").replace(/\\\//g, "/"))
      .filter(Boolean);
    for (const url of urls.slice(0, 24)) {
      if (seen.has(url)) continue;
      seen.add(url);
      if (opts.onlyPlaystation && !isPs(url)) continue;
      if (!plausibleCoverHit(url, title)) continue;
      const dl = await downloadImage(url, { portrait: true, allowSquare: opts.onlyPlaystation === true, wantPlatform: opts.platform });
      if (dl) return { url: await saveCover(dl.mime, dl.bytes), source: "bing" };
    }
  }
  return null;
}

async function googleCover(
  title: string,
  seen: Set<string>,
  opts: { queries?: string[]; onlyPlaystation?: boolean; platform?: "PS4" | "PS5" } = {}
): Promise<FoundCover | null> {
  const queries = opts.queries ?? [`${title} game cover art`, `${title} ps5 cover metacritic`, `${title} box art cover`];
  const isPs = (u: string) => /(?:image\.api\.playstation|store\.playstation|ps-ssl\.playstation)\.(?:com|net)/i.test(u);
  for (const query of queries) {
    const html = await fetchText(
      `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&udm=2&hl=en&safe=off&nfpr=1`,
      { Cookie: "CONSENT=YES+cb.20240101-00-p0.en+FX+000" }
    );
    if (!html) continue;
    // در HTML گوگل، تصاویر تمام‌اندازه به شکل ["https://...",عرض,ارتفاع] می‌آیند
    const tuples = [...html.matchAll(/\["(https?:\/\/[^"\\]+(?:\\u003d[^"\\]*)*)",(\d{2,5}),(\d{2,5})\]/g)];
    const cands = tuples
      .map((m) => ({
        url: m[1].replace(/\\u003d/g, "=").replace(/\\u0026/g, "&").replace(/\\\//g, "/"),
        w: Number(m[2]),
        h: Number(m[3]),
      }))
      .filter((c) => c.w >= 300 && c.h >= 450)
      // بوکس‌آرت عمودی (نسبت ~0.7) اولویت دارد، نه لوگو/بنر افقی
      .sort((a, b) => Math.abs(a.w / a.h - 0.7) - Math.abs(b.w / b.h - 0.7));
    for (const c of cands.slice(0, 24)) {
      if (seen.has(c.url)) continue;
      seen.add(c.url);
      if (opts.onlyPlaystation && !isPs(c.url)) continue;
      if (!plausibleCoverHit(c.url, title)) continue;
      const dl = await downloadImage(c.url, { portrait: true, allowSquare: opts.onlyPlaystation === true, wantPlatform: opts.platform });
      if (dl) return { url: await saveCover(dl.mime, dl.bytes), source: "google" };
    }
  }
  return null;
}

/* ---------- منبع: PlayStation Store مستقیم (بدون کلید، بر اساس Concept ID) ---------- */

/**
 * جستجوی مستقیم در API استور پلی‌استیشن (keyless) و بعد جزئیات هر محصول:
 * - web.np.playstation.com/api/graphql/v1/op (operationName=searchStore با persisted hash
 *   خودکار از صفحه SPA استور) → conceptId های واقعی (نه نتایج ویدیو/تم/آواتار که همان
 *   سرچ گوگل «site:store.playstation.com» قاطی‌شان بود)
 * - concept/api/v1/products?... → بوکس‌آرت عمودی رسمی همان پلتفرم
 * برای PS4 اول تصویر مخصوص PS4 (productId های ...00) امتحان می‌شود؛ اگر فقط PS5 بود،
 * برای بازی‌های PS4 آن کاور رد می‌شود و به جای آرت عمومی/پاک PS4 ادامه داده می‌شود.
 */
type PsConcepts = { concepts: Array<{ id: string; name: string }> };

/** کش ماژولی هش persisted-query عملیات searchStore (با هربار بالا آمدن سرور یک‌بار) */
let psSearchHashCache: string | null | undefined;

/** از HTML صفحه جستجوی PS Store هش زنده searchStore را بیرون می‌کشد */
async function psLiveSearchHash(): Promise<string | null> {
  if (psSearchHashCache !== undefined) return psSearchHashCache;
  psSearchHashCache = null;
  try {
    // ۱) صفحه SPA جستجو → اسکریپت‌های chunk آن
    const page = await fetchText(
      `https://store.playstation.com/en-us/search/${encodeURIComponent("god of war")}`,
      { Accept: "text/html" }
    );
    if (!page) return null;
    const chunks = new Set<string>();
    const re = /src="(\/_next\/static\/chunks\/[^"]+\.js)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(page)) !== null) chunks.add(`https://store.playstation.com${m[1]}`);
    // ۲) داخل هر chunk دنبال operationName=searchStore + هشِ کنارش بگرد
    const hashRe = /searchStore[\s\S]{0,600}?sha256Hash"\s*:\s*"([a-f0-9]{64})|sha256Hash"\s*:\s*"([a-f0-9]{64})[\s\S]{0,600}?searchStore/;
    for (const chunkUrl of [...chunks].slice(0, 12)) {
      const js = await fetchText(chunkUrl, { Accept: "*/*" }, 8000);
      if (!js || !js.includes("searchStore")) continue;
      const hit = hashRe.exec(js);
      const hash = hit?.[1] ?? hit?.[2] ?? "";
      if (/^[a-f0-9]{64}$/.test(hash)) {
        psSearchHashCache = hash;
        return hash;
      }
    }
  } catch {
    /* استور در دسترس نبود — مسیر مستقیم رد می‌شود */
  }
  return null;
}

async function psSearchConcepts(title: string): Promise<PsConcepts["concepts"]> {
  const q = title.trim();
  if (q.length < 3) return [];
  const hash = await psLiveSearchHash();
  if (!hash) return [];
  const variables = encodeURIComponent(JSON.stringify({ searchTerm: q, pageArgs: { size: 12, offset: 0 } }));
  const extensions = encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: hash } }));
  const url = `https://web.np.playstation.com/api/graphql/v1/op?operationName=searchStore&variables=${variables}&extensions=${extensions}`;
  const text = await fetchText(url, { Accept: "application/json", Origin: "https://store.playstation.com" });
  if (!text) return [];
  try {
    const data = JSON.parse(text) as {
      data?: {
        searchStore?: {
          results?: Array<{ id?: string; name?: string }>;
        };
      };
    };
    const list = data.data?.searchStore?.results ?? [];
    const tq = norm(q);
    return (list ?? [])
      .filter((c) => c.id && c.name)
      .map((c) => {
        const nk = norm(c.name ?? "");
        let score = 0;
        if (nk === tq) score = 100;
        else if (nk.startsWith(tq) || tq.startsWith(nk)) score = 80;
        else if (nk.includes(tq) || tq.includes(nk)) score = 60;
        return { id: String(c.id), name: String(c.name), score };
      })
      .filter((c) => c.score >= 60)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  } catch {
    return [];
  }
}

type PsProductImage = { url: string; productId: string; name: string };

async function psConceptImages(conceptId: string): Promise<PsProductImage[]> {
  const url =
    `https://store.playstation.com/store/api/v1/concept/${encodeURIComponent(conceptId)}/products` +
    `?country=US&language=en&size=30`;
  const text = await fetchText(url, { Accept: "application/json", Origin: "https://store.playstation.com" });
  if (!text) return [];
  try {
    const data = JSON.parse(text) as {
      data?: { concept?: { products?: Array<{ id?: string; name?: string; media?: { screenshots?: Array<{ url?: string }> } }> } };
    };
    const products = data.data?.concept?.products ?? [];
    const out: PsProductImage[] = [];
    for (const p of products) {
      const pid = String(p.id ?? "");
      if (!pid) continue;
      // فقط خود «بازی» — نه باندل/ادیشن/افزونه/آواتار/تم/ساندترک
      if (!/^UP\d{4}-[A-Z]{4}\d{5}_00-/.test(pid) && !/^EP\d{4}-[A-Z]{4}\d{5}_00-/.test(pid)) continue;
      if (/(bundle|edition|deluxe|ultimate|collection|complete|add[- ]?on|avatar|theme|soundtrack|season[- ]?pass|starter|credits|bundle)/i.test(p.name ?? "")) continue;
      for (const s of p.media?.screenshots ?? []) {
        if (s.url) out.push({ url: s.url, productId: pid, name: String(p.name ?? "") });
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** شماره سری productId استور: ...00 = نسخه PS4/پایه؛ اعداد بالاتر = PS5/PS VR2 و… */
function psProductSuffix(productId: string): number | null {
  const m = productId.match(/_00-(\d{16})$/);
  if (!m) return null;
  const tail = m[1];
  if (!tail.startsWith("00000000")) return null;
  const n = Number(tail.slice(8));
  return Number.isFinite(n) ? n : null;
}

/** آیا این تصویر، بوکس‌آرت «خالص» همان کنسول درخواستی است؟ */
function psImageMatchesPlatform(url: string, productId: string, platform: "PS4" | "PS5"): boolean {
  const u = url.toLowerCase();
  // هنر PS با نوار سفید PS5 یا مشکی PS5 — باید با پلتفرم بازی یکی باشد
  const looksPs5 = /ps5/.test(u);
  const looksPs4 = /ps4/.test(u);
  // آرت‌های packshot رسمی سونی معمولاً «packshot» در آدرس دارند
  const isPackshot = /packshot/.test(u);
  if (platform === "PS4" && looksPs5 && !looksPs4) return false;
  if (platform === "PS5" && looksPs4 && !looksPs5) return false;
  const suffix = psProductSuffix(productId);
  if (suffix === null) return isPackshot; // شناسه ناشناس → فقط packshot واقعی
  if (platform === "PS4") return suffix < 100 || isPackshot;
  return true;
}

/**
 * بهترین کاور رسمی همان پلتفرم از استور PS:
 * برای PS4 اول نسخه‌های ...0000 تا ...0099 (خانواده PS4) امتحان می‌شوند و
 * تصاویر دارای نوار PS5 رد می‌شوند — مشکل «کاور PS5 روی بازی PS4» همین‌جا حل می‌شود.
 */
async function playstationDirectCover(
  title: string,
  seen: Set<string>,
  platform: "PS4" | "PS5"
): Promise<FoundCover | null> {
  const concepts = await psSearchConcepts(title);
  for (const concept of concepts) {
    const images = await psConceptImages(concept.id);
    const platformFirst = [...images].sort((a, b) => {
      const sa = psImageMatchesPlatform(a.url, a.productId, platform) ? 0 : 1;
      const sb = psImageMatchesPlatform(b.url, b.productId, platform) ? 0 : 1;
      return sa - sb;
    });
    for (const img of platformFirst) {
      if (!psImageMatchesPlatform(img.url, img.productId, platform)) continue;
      if (!/^https?:\/\//i.test(img.url) || seen.has(img.url)) continue;
      seen.add(img.url);
      const dl = await downloadImage(img.url, { portrait: true, allowSquare: true });
      if (dl) return { url: await saveCover(dl.mime, dl.bytes), source: "psstore-ps4" };
    }
  }
  return null;
}

/* ---------- منبع ۱: PlayStation Store (هنر رسمی پلی‌استیشن) ---------- */

/**
 * استور PS مستقیم پشت محافظت ربات است؛ ولی تصاویر رسمی آن (image.api.playstation.com)
 * در موتورهای جستجو ایندکس شده‌اند. با جستجوی محدود به دامنه استور، هنر رسمی پلی‌استیشن
 * را اول از همه برمی‌داریم.
 */
async function playstationStoreCover(
  title: string,
  seen: Set<string>,
  opts: { platform?: "PS4" | "PS5" } = {}
): Promise<FoundCover | null> {
  const psQueries =
    opts.platform === "PS4"
      ? [
          `site:store.playstation.com ${title} ps4`,
          `${title} ps4 cover art playstation store`,
          `site:image.api.playstation.com ${title} ps4`,
          `${title} ps4 playstation store game cover`,
        ]
      : [
          `site:store.playstation.com ${title}`,
          `${title} ps5 cover art playstation store`,
          `site:image.api.playstation.com ${title}`,
          `${title} ps4 playstation store game cover`,
        ];
  const engines = [duckduckgoCover, bingCover, googleCover];
  for (const engine of engines) {
    const hit = await engine(title, seen, {
      queries: psQueries,
      onlyPlaystation: true,
      platform: opts.platform,
    });
    if (hit) return { url: hit.url, source: opts.platform === "PS4" ? "playstation-ps4" : "playstation" };
  }
  return null;
}

/* ---------- منبع ۲: Xbox Store (API رسمی مایکروسافت، بوکس‌آرت عمودی) ---------- */

async function xboxStoreCover(title: string, seen: Set<string>): Promise<FoundCover | null> {
  const q = norm(title);
  if (q.length < 3) return null;
  // ۱) جستجوی کاتالوگ رسمی ایکس‌باکس (بدون کلید)
  const suggestUrl =
    `https://displaycatalog.mp.microsoft.com/v7.0/productFamilies/autosuggest` +
    `?market=US&languages=en-US&query=${encodeURIComponent(title)}&productFamilyNames=Games`;
  const suggestText = await fetchText(suggestUrl, { Accept: "application/json" });
  if (!suggestText) return null;
  let productIds: Array<{ id: string; title: string }> = [];
  try {
    const data = JSON.parse(suggestText) as {
      Results?: Array<{ Products?: Array<{ ProductId?: string; Title?: string }> }>;
    };
    for (const family of data.Results ?? []) {
      for (const p of family.Products ?? []) {
        if (p.ProductId && p.Title) productIds.push({ id: p.ProductId, title: p.Title });
      }
    }
  } catch { return null; }
  // ۲) بهترین تطابق عنوان (بدون DLC؛ مثل Steam)
  const DLC_RE = /(costume|dlc|soundtrack|ost|demo|beta|playtest|skin|upgrade|season\s*pass|bundle|gold|ultimate)/i;
  productIds = productIds.filter((p) => !DLC_RE.test(p.title));
  const scored = productIds
    .map((p) => {
      const t = norm(p.title);
      let score = 0;
      if (t === q) score = 100;
      else if (t.startsWith(q) || q.startsWith(t)) score = 80;
      else if (t.includes(q) || q.includes(t)) score = 50;
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score);
  // ۳) جزئیات محصول → بوکس‌آرت عمودی رسمی (584x800 / 1440x2160)
  for (const p of scored.slice(0, 3)) {
    if (p.score < 50) break;
    const detailUrl =
      `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${encodeURIComponent(p.id)}` +
      `&market=US&languages=en-US,neutral&fieldsTemplate=Details`;
    const detailText = await fetchText(detailUrl, { Accept: "application/json" });
    if (!detailText) continue;
    try {
      const data = JSON.parse(detailText) as {
        Products?: Array<{ LocalizedProperties?: Array<{ Images?: Array<{ Uri?: string; Width?: number; Height?: number }> }> }>;
      };
      const images = (data.Products?.[0]?.LocalizedProperties ?? []).flatMap((l) => l.Images ?? []);
      const portraits = images
        .filter((i) => i.Uri && i.Width && i.Height && i.Height > i.Width)
        .sort((a, b) => Math.abs((a.Width ?? 1) / (a.Height ?? 1) - 0.7) - Math.abs((b.Width ?? 1) / (b.Height ?? 1) - 0.7));
      for (const img of portraits.slice(0, 3)) {
        const url = img.Uri?.startsWith("//") ? `https:${img.Uri}` : (img.Uri ?? "");
        if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
        seen.add(url);
        const dl = await downloadImage(url, { portrait: true });
        if (dl) return { url: await saveCover(dl.mime, dl.bytes), source: "xbox" };
      }
    } catch { /* JSON خراب → محصول بعدی */ }
  }
  return null;
}

/* ---------- منبع: IGDB (بوکس‌آرت رسمی همه بازی‌ها — کلید رایگان Twitch) ---------- */

/**
 * IGDB پایگاه رسمی بازی‌هاست و برای «هر» بازی (PS، Xbox، PC و…) بوکس‌آرت عمودیِ
 * اصلی دارد — دقیقاً همان چیزی که سایت‌های مرجع مثل hencheats نشان می‌دهند.
 * ثبت‌نام رایگان: https://dev.twitch.tv/console → Client-ID + Client-Secret
 * متغیرها: TWITCH_CLIENT_ID و TWITCH_CLIENT_SECRET — بدون آن‌ها این منبع رد می‌شود.
 */

type IgdbToken = { token: string; expiresAt: number };
let igdbTokenCache: IgdbToken | null = null;

function igdbCredentials(): { id: string; secret: string } | null {
  const id = process.env.TWITCH_CLIENT_ID || "";
  const secret = process.env.TWITCH_CLIENT_SECRET || "";
  return id && secret ? { id, secret } : null;
}

async function igdbAppToken(): Promise<string | null> {
  const creds = igdbCredentials();
  if (!creds) return null;
  if (igdbTokenCache && igdbTokenCache.expiresAt > Date.now() + 60_000) return igdbTokenCache.token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const url =
      `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(creds.id)}` +
      `&client_secret=${encodeURIComponent(creds.secret)}&grant_type=client_credentials`;
    const res = await fetch(url, { method: "POST", signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    igdbTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + Math.max(300, data.expires_in ?? 3600) * 1000,
    };
    return igdbTokenCache.token;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function igdbCover(title: string, seen: Set<string>): Promise<FoundCover | null> {
  const creds = igdbCredentials();
  const token = await igdbAppToken();
  if (!creds || !token) return null;
  const q = norm(title);
  if (q.length < 3) return null;
  // این کلمات یعنی نتیجه DLC/ساندترک/آپدیت است، نه خود بازی اصلی
  const DLC_RE = /(costume|dlc|soundtrack|ost|demo|beta|playtest|skin|pack|upgrade|season\s*pass|content|update|expansion|original soundtrack)/i;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const body =
      `search "${title.replace(/\\/g, "").replace(/"/g, "")}";\n` +
      "fields name,cover.image_id;\n" +
      "limit 10;";
    const res = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Client-ID": creds.id,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ name?: string; cover?: { image_id?: string } }>;
    const candidates = data
      .filter((g) => g.name && g.cover?.image_id)
      .filter((g) => !DLC_RE.test(g.name ?? ""))
      .map((g) => {
        const nk = norm(g.name ?? "");
        let score = 0;
        if (nk === q) score = 100;
        else if (nk.startsWith(q) || q.startsWith(nk)) score = 80;
        else if (nk.includes(q) || q.includes(nk)) score = 50;
        return { id: g.cover?.image_id ?? "", score };
      })
      .filter((c) => c.score >= 50)
      .sort((a, b) => b.score - a.score);
    // t_cover_big_2x = بوکس‌آرت رسمی با کیفیت 528x748؛ اگر نبود t_cover_big
    for (const c of candidates.slice(0, 3)) {
      for (const size of ["t_cover_big_2x", "t_cover_big"]) {
        const url = `https://images.igdb.com/igdb/image/upload/${size}/${c.id}.jpg`;
        if (seen.has(url)) continue;
        seen.add(url);
        const dl = await downloadImage(url, { portrait: true });
        if (dl) return { url: await saveCover(dl.mime, dl.bytes), source: "igdb" };
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- API اصلی ---------- */

/**
 * ترتیب منابع کاور بر اساس پلتفرم نهایی بازی (خالص و تست‌پذیر):
 * - Xbox Offline → فقط Xbox Store (جستجوی وب حذف شده تا کاور اشتباهیِ وب/استیم برای Xbox نیاید)؛
 *   اگر استور Xbox جواب نداد، کاور خالی می‌ماند (بازی بدون عکس ذخیره می‌شود).
 * - PS5 / PS4 → استور PlayStation، بعد Steam، بعد RAWG، ویکی‌پدیا و جستجوی تصویر وب
 *   (DuckDuckGo / Bing / Google) — چون این بازی‌ها انحصاری PS نیستند و کاورشان در منابع عمومی است.
 */
export type CoverStep =
  | "playstation"
  | "playstation-ps4"
  | "psstore-ps4"
  | "igdb"
  | "p30day"
  | "downloadha"
  | "xbox"
  | "steam-known"
  | "steam-search"
  | "rawg"
  | "wikipedia"
  | "duckduckgo"
  | "bing"
  | "google";

export function coverStepsFor(platform: Platform): CoverStep[] {
  if (platform === "Xbox Offline") return ["xbox"];
  if (platform === "PS4") {
    return ["psstore-ps4", "playstation-ps4", "igdb", "p30day", "downloadha", "steam-known", "steam-search", "rawg", "wikipedia", "duckduckgo", "bing", "google"];
  }
  return ["playstation", "igdb", "p30day", "downloadha", "steam-known", "steam-search", "rawg", "wikipedia", "duckduckgo", "bing", "google"];
}

/**
 * کاور رسمی بازی را فقط از منابعِ مجازِ پلتفرمِ نهایی پیدا می‌کند.
 * فایل واقعی دانلود، اعتبارسنجی (بوکس‌آرت عمودی، نه لوگو/بنر) و در دیتابیس ذخیره می‌شود و
 * آدرس دائمی آن برمی‌گردد. اگر هیچ منبعی جواب نداد null.
 */
export async function findOfficialCover(
  coverQuery: string,
  steamAppId: number | null,
  fallbackName: string,
  platform: Platform = "PS5"
): Promise<FoundCover | null> {
  const title = (coverQuery || fallbackName || "").trim();
  if (!title) return null;
  const seen = new Set<string>();
  const steps = coverStepsFor(platform);

  try {
    // ۰) PS4: جستجوی مستقیم استور PS مخصوص همان کنسول (اول نسخه PS4، بدون نوار PS5)
    if (platform === "PS4" && steps.includes("psstore-ps4")) {
      const direct = await playstationDirectCover(title, seen, "PS4");
      if (direct) return direct;
    }

    // ۱) استور PlayStation: هنر رسمی پلی‌استیشن (تصاویر ایندکس‌شده استور)
    // برای PS4: کوئری‌ها و فیلتر نوار کنسول مخصوص همان نسخه است
    if (steps.includes("playstation") || steps.includes("playstation-ps4")) {
      const forPs4 = platform === "PS4";
      const ps = await playstationStoreCover(title, seen, forPs4 ? { platform: "PS4" } : undefined);
      if (ps) return ps;
    }

    // ۱/۵) IGDB: بوکس‌آرت رسمی و دقیق برای همه بازی‌ها (وقتی کلید رایگان Twitch تنظیم شده باشد)
    if (steps.includes("igdb")) {
      const igdb = await igdbCover(title, seen);
      if (igdb) return igdb;
    }

    // ۲) استور Xbox: بوکس‌آرت عمودی رسمی از API مایکروسافت
    // فقط و فقط برای بازی‌های Xbox Offline استفاده می‌شود — کاور استور ایکس‌باکس
    // روی هیچ بازی PS5/PS4 نمی‌نشیند.
    if (steps.includes("xbox")) {
      const xbox = await xboxStoreCover(title, seen);
      if (xbox) return xbox;
    }

    // ۲/۳) سایت‌های ایرانی p30day و downloadha (فقط برای بازی‌های PS)
    if (steps.includes("p30day")) {
      const p30 = await irSiteCover(title, seen, "p30day");
      if (p30) return p30;
    }

    if (steps.includes("downloadha")) {
      const dlha = await irSiteCover(title, seen, "downloadha");
      if (dlha) return dlha;
    }

    // ۳) Steam: آیدی معلوم → جستجوی استور
    const knownId = steamAppId ?? steamAppIdFromName(title);
    if (steps.includes("steam-known") && knownId) {
      const hit = await trySteamImages(knownId, seen);
      if (hit) return hit;
    }
    if (steps.includes("steam-search") && !knownId) {
      const searchedId = await steamSearchAppId(title);
      if (searchedId) {
        const hit = await trySteamImages(searchedId, seen);
        if (hit) return hit;
      }
    }

    // ۴) RAWG (اختیاری)
    if (steps.includes("rawg")) {
      const rawg = await rawgCover(title, seen);
      if (rawg) return rawg;
    }

    // ۵) ویکی‌پدیا
    if (steps.includes("wikipedia")) {
      const wiki = await wikipediaCover(title, seen);
      if (wiki) return wiki;
    }

    // ۶) جستجوی تصویر باز وب: DuckDuckGo → Bing → Google
    if (steps.includes("duckduckgo")) {
      const ddg = await duckduckgoCover(title, seen);
      if (ddg) return ddg;
    }

    if (steps.includes("bing")) {
      const bing = await bingCover(title, seen);
      if (bing) return bing;
    }

    if (steps.includes("google")) {
      const google = await googleCover(title, seen);
      if (google) return google;
    }
  } catch {
    // هیچ‌وقت کل مسیر را با استثنا نکُش؛ پایین null برمی‌گردد
  }

  return null;
}