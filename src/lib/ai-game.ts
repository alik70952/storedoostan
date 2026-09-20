import type { Platform } from "./types";
import { GENRES } from "./types";

export const AINEX_BASE_URL = (
  process.env.AINEX_BASE_URL || "https://api.apinex.bond/v1"
).replace(/\/$/, "");
export const AINEX_MODEL = process.env.AINEX_MODEL || "glm-5.3-flash";

// قانون فروشگاه: پسوند پلتفرم آخر نام بازی (مثل «… xbox» یا «… ps5» یا «… ps4») تعیین می‌کند
// بازی در کدام دسته ثبت شود. این پسوند قبل از ارسال به مدل و جستجوی کاور جدا می‌شود تا نام تمیز بماند.
const SUFFIX_SEP = String.raw`[\s\-–—_()\[\]{}،,.:;!؟?/\\|~«»""''` + "*#]";
export const PLATFORM_SUFFIX_RE = {
  xbox: new RegExp(`${SUFFIX_SEP}+xbox${SUFFIX_SEP}*$`, "i"),
  ps5: new RegExp(`${SUFFIX_SEP}+ps5${SUFFIX_SEP}*$`, "i"),
  ps4: new RegExp(`${SUFFIX_SEP}+ps4${SUFFIX_SEP}*$`, "i"),
} as const;
// برای سازگاری با کدهای قبلی
export const XBOX_SUFFIX_RE = PLATFORM_SUFFIX_RE.xbox;

export type ForcedPlatform = Platform | null;

export function splitPlatformSuffix(rawName: string): { cleanName: string; forced: ForcedPlatform } {
  const name = (rawName ?? "").trim().slice(0, 120);
  if (PLATFORM_SUFFIX_RE.xbox.test(name)) {
    return { cleanName: name.replace(PLATFORM_SUFFIX_RE.xbox, "").trim().slice(0, 120), forced: "Xbox Offline" };
  }
  if (PLATFORM_SUFFIX_RE.ps5.test(name)) {
    return { cleanName: name.replace(PLATFORM_SUFFIX_RE.ps5, "").trim().slice(0, 120), forced: "PS5" };
  }
  if (PLATFORM_SUFFIX_RE.ps4.test(name)) {
    return { cleanName: name.replace(PLATFORM_SUFFIX_RE.ps4, "").trim().slice(0, 120), forced: "PS4" };
  }
  return { cleanName: name, forced: null };
}

export function splitXboxSuffix(rawName: string): { cleanName: string; forceXbox: boolean } {
  const { cleanName, forced } = splitPlatformSuffix(rawName);
  return { cleanName, forceXbox: forced === "Xbox Offline" };
}

export const AI_SYSTEM_PROMPT = `You are a precise video-game metadata assistant for a Persian game store.
Rules:
- Identify the EXACT game edition the user names (e.g. "Resident Evil 4" original 2005 vs Remake 2023 are different; "God of War Ragnarok" is the 2022 Santa Monica game). Never confuse editions.
- NEVER hallucinate. If you are not confident about a field, return null for it instead of guessing.
- Keep the official English title exactly (including subtitles, accents like o with diaeresis).
- Write "titleFa" as a natural Persian title.
- Write "descriptionFa" as 2-4 natural Persian sentences for shoppers (no English, no markdown, max 400 chars).
- The "xbox", "ps5" and "ps4" words are NEVER part of any game title (users append them to choose the store category). The store sells only PS5, PS4 and Xbox Offline games.
- "platform" must be exactly one of: "PS5", "PS4", "Xbox Offline". Prefer PS5 > PS4 when multi-platform. Return "Xbox Offline" ONLY when the game is an Xbox exclusive (for example: Halo, Gears of War, Forza); never for games that also exist on PlayStation.
- "genre" must be exactly one of the Persian genres listed below.
- NEVER invent a cover URL. Return "coverCandidateQuery" = official English title, and "steamAppId" = numeric Steam app id ONLY if 100 percent sure, else null.
- Output VALID JSON ONLY, no markdown, exactly these keys:
{"title": string, "titleFa": string|null, "platform": "PS5"|"PS4"|"Xbox Offline"|null, "genre": string|null, "descriptionFa": string|null, "coverCandidateQuery": string|null, "steamAppId": number|null}`;

export type AiGameJson = {
  title?: unknown;
  titleFa?: unknown;
  platform?: unknown;
  genre?: unknown;
  descriptionFa?: unknown;
  description?: unknown;
  coverCandidateQuery?: unknown;
  steamAppId?: unknown;
};

export type ResolvedAiGame = {
  title: string;
  titleFa: string;
  platform: Platform;
  genre: string;
  description: string;
  coverQuery: string;
  steamAppId: number | null;
  forceXbox: boolean;
  forced: ForcedPlatform;
  xboxOnlyNames: string[];
};

const PERSIAN_GENRES = new Set<string>(GENRES as unknown as string[]);

function cleanStr(v: unknown, max = 120): string {
  if (typeof v !== "string") return "";
  return v.trim().replace(/\s+/g, " ").slice(0, max);
}

function mapGenre(v: unknown): string {
  const s = cleanStr(v, 60);
  if (PERSIAN_GENRES.has(s)) return s;
  const lower = s.toLowerCase();
  const pairs: Array<[RegExp, string]> = [
    [/action|adventure|stealth|platform|hack|open world|souls/i, "اکشن و ماجراجویی"],
    [/rpg|role|persona|elden|fantasy/i, "نقش‌آفرینی"],
    [/sport|football|soccer|fifa|basketball/i, "ورزشی"],
    [/rac|drive|forza|gran turismo|need for speed/i, "مسابقه‌ای"],
    [/fight|mortal kombat|tekken/i, "مبارزه‌ای"],
    [/horror|survival|zombie|resident evil|returnal|days gone|last of us/i, "ترس و بقا"],
    [/family|party|lego/i, "خانوادگی"],
    [/shooter|fps|tps|call of duty|halo|gears|doom/i, "شوتر"],
  ];
  for (const [re, fa] of pairs) {
    if (re.test(s) || re.test(lower)) return fa;
  }
  return GENRES[0];
}

// بازی‌هایی که فقط روی Xbox هستند (انحصاری ایکس‌باکس) — بدون پسوند xbox هم در همین دسته می‌روند.
const XBOX_ONLY_NAMES = new Set([
  "halo",
  "haloinfinite",
  "halo5guardians",
  "halothemasterchiefcollection",
  "gearsofwar",
  "gears5",
  "gears",
  "forza",
  "forzahorizon",
  "forzahorizon5",
  "forzahorizon4",
  "forzamotorsport",
  "seaofthieves",
  "starfield",
  "fable",
  "avowed",
  "hellblade",
  "hellblade2",
  "senua",
  "ori",
  "stateofdecay",
  "stateofdecay2",
  "stateofdecay3",
  "grounded",
  "pentiment",
  "hi-fi",
  "hifirush",
  "redfall",
  "perfectdark",
  "everwild",
  "clockworkrevolution",
  "south",
  "southofmidnight",
  "indianajones",
  "indianajonesandthegreatcircle",
  "microsoftflightsimulator",
  "flightsimulator",
  "ageofempires",
  "psychonauts",
  "psychonauts2",
  "outerworlds",
  "outerworlds2",
  "sunsetoverdrive",
  "recore",
  "crackdown",
  "quantum break",
  "quantum",
  "quantum",
  "sunsetoverdrive",
  "bleedingedge",
]);

function normName(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function isXboxOnlyName(title: string, fallbackName: string): boolean {
  const t = normName(title);
  if (!t || normName(fallbackName) === "") return XBOX_ONLY_NAMES.has(t);
  if (XBOX_ONLY_NAMES.has(t)) return true;
  for (const n of XBOX_ONLY_NAMES) {
    if (t.startsWith(n) || n.startsWith(t)) return true;
  }
  return false;
}

function mapPlatform(v: unknown, forced: ForcedPlatform, xboxByName: boolean): Platform {
  // حرف اول و آخر قانون فروشگاه را خودِ کاربر با پسوند می‌زند (مثل «… xbox» یا «… ps5»)
  if (forced) return forced;
  // وگرنه بازی انحصاری ایکس‌باکس → فقط Xbox Offline
  if (xboxByName) return "Xbox Offline";
  const s = String(v ?? "").trim().toUpperCase();
  // مدل گاهی چند پلتفرم یا فقط XBOX برمی‌گرداند؛ چون چندپلتفرمه‌ها روی پلی‌استیشن هم
  // فروخته می‌شوند، اولویت با PS5 و بعد PS4 است — هرگز بر اساس حدس مدل، Xbox ثبت نمی‌شود.
  if (s.includes("PS4") || s.includes("PLAYSTATION 4")) return "PS4";
  return "PS5";
}

export function normalizeAiJson(
  raw: AiGameJson,
  fallbackName: string,
  opts: { forceXbox?: boolean; forced?: ForcedPlatform } = {}
): ResolvedAiGame {
  const title = cleanStr(raw.title, 120) || fallbackName.trim().slice(0, 120);
  const titleFa = cleanStr(raw.titleFa, 120) || title;
  const description = cleanStr(raw.descriptionFa ?? raw.description, 800);
  const steamAppId =
    typeof raw.steamAppId === "number" &&
    Number.isInteger(raw.steamAppId) &&
    raw.steamAppId > 0
      ? raw.steamAppId
      : null;
  const forced: ForcedPlatform = opts.forced ?? (opts.forceXbox === true ? "Xbox Offline" : null);
  const xboxByName = isXboxOnlyName(title, fallbackName);
  return {
    title,
    titleFa,
    platform: mapPlatform(raw.platform, forced, xboxByName),
    genre: mapGenre(raw.genre),
    description,
    coverQuery: cleanStr(raw.coverCandidateQuery, 120) || title,
    steamAppId,
    forceXbox: forced === "Xbox Offline",
    forced,
    xboxOnlyNames: [normName(title), normName(fallbackName)].filter((n) => n.length >= 3),
  };
}

export function extractJsonObject(text: string): AiGameJson {
  const trimmed = (text ?? "").trim();
  try {
    return JSON.parse(trimmed) as AiGameJson;
  } catch { /* fallthrough */ }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim()) as AiGameJson;
    } catch { /* fallthrough */ }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1)) as AiGameJson;
  }
  throw new Error("پاسخ مدل JSON معتبر نبود.");
}
