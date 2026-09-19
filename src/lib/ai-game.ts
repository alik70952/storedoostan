import type { Platform } from "./types";
import { GENRES } from "./types";

export const AINEX_BASE_URL = (
  process.env.AINEX_BASE_URL || "https://api.apinex.bond/v1"
).replace(/\/$/, "");
export const AINEX_MODEL = process.env.AINEX_MODEL || "glm-5.3-flash";

export const AI_SYSTEM_PROMPT = `You are a precise video-game metadata assistant for a Persian game store.
Rules:
- Identify the EXACT game edition the user names (e.g. "Resident Evil 4" original 2005 vs Remake 2023 are different; "God of War Ragnarok" is the 2022 Santa Monica game). Never confuse editions.
- NEVER hallucinate. If you are not confident about a field, return null for it instead of guessing.
- Keep the official English title exactly (including subtitles, accents like o with diaeresis).
- Write "titleFa" as a natural Persian title.
- Write "descriptionFa" as 2-4 natural Persian sentences for shoppers (no English, no markdown, max 400 chars).
- "platform" must be exactly one of: "PS5", "PS4", "Xbox Offline". Prefer PS5 > PS4 > Xbox Offline when multi-platform.
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

function mapPlatform(v: unknown): Platform {
  const s = String(v ?? "").trim().toUpperCase();
  // اولویت فروشگاه: PS5 > PS4 > Xbox (اگر مدل چند پلتفرم برگرداند، PS5 انتخاب می‌شود)
  if (s.includes("XBOX") && !s.includes("PS5") && !s.includes("PS4") && !s.includes("PLAYSTATION")) return "Xbox Offline";
  if (s.includes("PS4") || s.includes("PLAYSTATION 4")) return "PS4";
  return "PS5";
}

export function normalizeAiJson(raw: AiGameJson, fallbackName: string): ResolvedAiGame {
  const title = cleanStr(raw.title, 120) || fallbackName.trim().slice(0, 120);
  const titleFa = cleanStr(raw.titleFa, 120) || title;
  const description = cleanStr(raw.descriptionFa ?? raw.description, 800);
  const steamAppId =
    typeof raw.steamAppId === "number" &&
    Number.isInteger(raw.steamAppId) &&
    raw.steamAppId > 0
      ? raw.steamAppId
      : null;
  return {
    title,
    titleFa,
    platform: mapPlatform(raw.platform),
    genre: mapGenre(raw.genre),
    description,
    coverQuery: cleanStr(raw.coverCandidateQuery, 120) || title,
    steamAppId,
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
