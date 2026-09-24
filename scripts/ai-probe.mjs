// probe: بررسی قالب پاسخ مدل برای ترجمه گروهی نام بازی‌ها به فارسی
import fs from "node:fs";
import path from "node:path";

function readEnvFile(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch {
    /* بدون فایل */
  }
  return out;
}

const env = { ...readEnvFile(path.join(process.cwd(), ".env.local")), ...process.env };
const base = (env.AINEX_BASE_URL || "https://api.apinex.bond/v1").replace(/\/$/, "");
const model = env.AINEX_MODEL || "glm-5.3-flash";
const titles = process.argv.slice(2);

const system = `You translate PlayStation game titles for a Persian game store catalog.
Return STRICT JSON only, no markdown, no extra text:
{"games":[{"title":"<exact input title>","titleFa":"<Persian name>","genre":"<genre>"}]}
Rules:
- Keep the SAME ORDER and the EXACT input titles in "title".
- "titleFa" must be the natural Persian name Persian gamers use. Persian script only, no Latin letters.
- "genre" must be exactly one of: اکشن و ماجراجویی | نقش‌آفرینی | ورزشی | مسابقه‌ای | مبارزه‌ای | ترس و بقا | خانوادگی | شوتر
- Never invent a different game; if unsure, transliterate the title.`;

const started = Date.now();
const res = await fetch(`${base}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.APINEX_API_KEY}` },
  body: JSON.stringify({
    model,
    temperature: 0.1,
    max_tokens: 4000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Games (${titles.length}):\n${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}` },
    ],
  }),
});
console.log("status", res.status, `${((Date.now() - started) / 1000).toFixed(1)}s`);
const text = await res.text();
try {
  const parsed = JSON.parse(text);
  const content = parsed?.choices?.[0]?.message?.content ?? "";
  console.log("content:", content.slice(0, 1200));
  const games = JSON.parse(content)?.games ?? [];
  console.log(`\nتعداد ردیف: ${games.length} از ${titles.length}`);
  console.log(JSON.stringify(games, null, 1).slice(0, 1500));
} catch (err) {
  console.log("پاسخ غیر JSON:", text.slice(0, 500));
}
