// موتور پیدا کردن کاور رسمی هر بازی از کل اینترنت — بدون حدس و بدون ساخت تصویر AI.
// منابع به ترتیب: PlayStation Store (هنر رسمی PS از جستجوی محدود به استور) →
// Xbox Store (API رسمی مایکروسافت، بوکس‌آرت عمودی) → Steam → RAWG (اگر کلید باشد) →
// ویکی‌پدیا → جستجوی تصویر وب: DuckDuckGo → Bing → Google (متاکریتیک/IGN و… هم از همین راه).
// خروجی همیشه یک فایل واقعیِ دانلودشده است که در جدول covers ذخیره می‌شود (/api/covers/<uuid>.<ext>).

import { saveCover } from "./cover-store";
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
 */
async function downloadImage(url: string, opts: { portrait?: boolean; allowSquare?: boolean } = {}): Promise<Downloaded | null> {
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
    return { bytes: buf, mime, width, height, alpha };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
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

/** فیلتر نتیجه‌ها: باید شبیه کاور بازی باشد، نه آیکون/لوگو/اسپرایت */
function plausibleCoverHit(hitUrl: string, title: string): boolean {
  const u = hitUrl.toLowerCase();
  if (/(?:^|\/)(?:icon|favicon|logo|avatar|sprite|emoji)[._-]/.test(u)) return false;
  if (!/\.(jpe?g|png|webp)(\?|#|$)/i.test(u) && !/(steampowered|metacritic|media-?cdn|gamespot|ign|cloudflare)/.test(u)) return false;
  const q = norm(title);
  if (!q) return true;
  let haystack = u;
  try { haystack = u + " " + decodeURIComponent(u); } catch { /* URL خراب */ }
  const probe = q.length > 12 ? q.slice(0, 12) : q.slice(0, Math.max(6, Math.ceil(q.length * 0.6)));
  return norm(haystack).includes(probe);
}

async function duckduckgoCover(
  title: string,
  seen: Set<string>,
  opts: { queries?: string[]; onlyPlaystation?: boolean } = {}
): Promise<FoundCover | null> {
  const queries = opts.queries ?? [`${title} game cover art`, `${title} ps5 box art`];
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
    for (const hit of hits.slice(0, 12)) {
      const img = hit.image;
      if (!img || seen.has(img)) continue;
      seen.add(img);
      if (opts.onlyPlaystation && !isPs(img)) continue;
      if (hit.title && !plausibleCoverHit(img, title) && !plausibleCoverHit(hit.title, title)) continue;
      const dl = await downloadImage(img, { portrait: true, allowSquare: opts.onlyPlaystation === true });
      if (dl) return { url: await saveCover(dl.mime, dl.bytes), source: "duckduckgo" };
    }
  }
  return null;
}

async function bingCover(
  title: string,
  seen: Set<string>,
  opts: { queries?: string[]; onlyPlaystation?: boolean } = {}
): Promise<FoundCover | null> {
  const queries = opts.queries ?? [`${title} video game cover`, `${title} box art`];
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
    for (const url of urls.slice(0, 12)) {
      if (seen.has(url)) continue;
      seen.add(url);
      if (opts.onlyPlaystation && !isPs(url)) continue;
      if (!plausibleCoverHit(url, title)) continue;
      const dl = await downloadImage(url, { portrait: true, allowSquare: opts.onlyPlaystation === true });
      if (dl) return { url: await saveCover(dl.mime, dl.bytes), source: "bing" };
    }
  }
  return null;
}

async function googleCover(
  title: string,
  seen: Set<string>,
  opts: { queries?: string[]; onlyPlaystation?: boolean } = {}
): Promise<FoundCover | null> {
  const queries = opts.queries ?? [`${title} game cover art`, `${title} ps5 cover metacritic`];
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
    for (const c of cands.slice(0, 12)) {
      if (seen.has(c.url)) continue;
      seen.add(c.url);
      if (opts.onlyPlaystation && !isPs(c.url)) continue;
      if (!plausibleCoverHit(c.url, title)) continue;
      const dl = await downloadImage(c.url, { portrait: true, allowSquare: opts.onlyPlaystation === true });
      if (dl) return { url: await saveCover(dl.mime, dl.bytes), source: "google" };
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
async function playstationStoreCover(title: string, seen: Set<string>): Promise<FoundCover | null> {
  const psQueries = [`site:store.playstation.com ${title}`, `${title} ps5 cover art playstation store`];
  const engines = [duckduckgoCover, bingCover, googleCover];
  for (const engine of engines) {
    const hit = await engine(title, seen, { queries: psQueries, onlyPlaystation: true });
    if (hit) return { url: hit.url, source: "playstation" };
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

/* ---------- API اصلی ---------- */

/**
 * کاور رسمی بازی را به این ترتیب پیدا می‌کند: PlayStation Store → Xbox Store (API رسمی) →
 * Steam → RAWG → ویکی‌پدیا → جستجوی تصویر وب (DuckDuckGo / Bing / Google — شامل متاکریتیک).
 * فایل واقعی دانلود، اعتبارسنجی (بوکس‌آرت عمودی، نه لوگو/بنر) و در دیتابیس ذخیره می‌شود و
 * آدرس دائمی آن برمی‌گردد. اگر هیچ منبعی جواب نداد null.
 */
export async function findOfficialCover(
  coverQuery: string,
  steamAppId: number | null,
  fallbackName: string
): Promise<FoundCover | null> {
  const title = (coverQuery || fallbackName || "").trim();
  if (!title) return null;
  const seen = new Set<string>();

  try {
    // ۱) PlayStation Store: هنر رسمی پلی‌استیشن (تصاویر ایندکس‌شده استور)
    const ps = await playstationStoreCover(title, seen);
    if (ps) return ps;

    // ۲) Xbox Store: بوکس‌آرت عمودی رسمی از API مایکروسافت
    const xbox = await xboxStoreCover(title, seen);
    if (xbox) return xbox;

    // ۳) Steam: آیدی معلوم → جستجوی استور
    const knownId = steamAppId ?? steamAppIdFromName(title);
    if (knownId) {
      const hit = await trySteamImages(knownId, seen);
      if (hit) return hit;
    }
    if (!knownId) {
      const searchedId = await steamSearchAppId(title);
      if (searchedId) {
        const hit = await trySteamImages(searchedId, seen);
        if (hit) return hit;
      }
    }

    // ۴) RAWG (اختیاری)
    const rawg = await rawgCover(title, seen);
    if (rawg) return rawg;

    // ۵) ویکی‌پدیا
    const wiki = await wikipediaCover(title, seen);
    if (wiki) return wiki;

    // ۶) جستجوی تصویر باز وب: DuckDuckGo → Bing → Google
    const ddg = await duckduckgoCover(title, seen);
    if (ddg) return ddg;

    const bing = await bingCover(title, seen);
    if (bing) return bing;

    const google = await googleCover(title, seen);
    if (google) return google;
  } catch {
    // هیچ‌وقت کل مسیر را با استثنا نکُش؛ پایین null برمی‌گردد
  }

  return null;
}