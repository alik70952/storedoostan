import { AINEX_BASE_URL, AINEX_MODEL, AI_SYSTEM_PROMPT } from "./ai-game";
import { extractJsonObject, type AiGameJson } from "./ai-game";

// فقط server-side: فراخوانی GLM از طریق APInex (OpenAI-compatible).

export async function callGlmForGame(gameName: string): Promise<AiGameJson> {
  const apiKey = process.env.APINEX_API_KEY || "";
  if (!apiKey) {
    throw new Error("APINEX_API_KEY تنظیم نشده است. آن را در Environment Variables قرار دهید.");
  }
  void AI_SYSTEM_PROMPT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(`${AINEX_BASE_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AINEX_MODEL,
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: `Game name: "${gameName}"\nReturn JSON only.` },
        ],
      }),
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error("کلید APInex نامعتبر است (401/403).");
    }
    if (res.status === 429) {
      throw new Error("محدودیت نرخ API (429). کمی بعد دوباره تلاش کنید.");
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`خطای APInex (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content.trim()) throw new Error("پاسخ خالی از مدل دریافت شد.");
    return extractJsonObject(content);
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error("زمان پاسخ مدل تمام شد (timeout).");
    }
    throw err instanceof Error ? err : new Error("خطای ارتباط با APInex.");
  } finally {
    clearTimeout(timer);
  }
}
