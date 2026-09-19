"use client";
import { useMemo, useRef, useState } from "react";
import { persianNumber } from "@/lib/types";
type ItemStatus = "idle" | "working" | "done" | "duplicate" | "error";
type Item = { id: number; name: string; status: ItemStatus; detail: string; cover?: string };
const CONCURRENCY = 2;
async function publishOne(name: string) {
  const res = await fetch("/api/admin/ai/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game: name }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean; skipped?: boolean; error?: string; coverSource?: string; warning?: string | null;
    game?: { id?: string; cover?: string; titleFa?: string; title?: string };
  };
  if (res.ok && data.ok) {
    const label = data.game?.titleFa || data.game?.title || name;
    if (data.skipped) return { ok: true, dup: true, detail: `"${label}" تکراری بود — رد شد.`, cover: data.game?.cover };
    const src = data.coverSource ?? "web";
    const detail = data.warning
      ? `${data.warning}`
      : `اطلاعات + کاور از ${src} — «${label}» اضافه شد.`;
    return { ok: true, dup: false, detail, cover: data.game?.cover };
  }
  return { ok: false, dup: false, detail: data.error || `خطای ${res.status}` };
}
export default function AiGamePublisher() {
  const [raw, setRaw] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const idRef = useRef(0);
  const names = useMemo(() => raw.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 30), [raw]);
  const doneCount = items.filter((i) => i.status === "done" || i.status === "duplicate").length;
  const failCount = items.filter((i) => i.status === "error").length;
  async function runTargets(targets: Item[]) {
    setRunning(true);
    const queue = [...targets];
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length > 0) {
        const cur = queue.shift();
        if (!cur) return;
        setItems((prev) => prev.map((it) => it.id === cur.id ? { ...it, status: "working", detail: "تولید اطلاعات با GLM…" } : it));
        try {
          const r = await publishOne(cur.name);
          setItems((prev) => prev.map((it) => it.id === cur.id ? { ...it, status: r.ok ? (r.dup ? "duplicate" : "done") : "error", detail: r.detail, cover: r.cover } : it));
        } catch {
          setItems((prev) => prev.map((it) => it.id === cur.id ? { ...it, status: "error", detail: "خطای شبکه. Retry بزنید." } : it));
        }
      }
    });
    await Promise.all(workers);
    setRunning(false);
  }
  async function handleGenerate() {
    if (running || names.length === 0) return;
    const list: Item[] = names.map((name) => ({ id: ++idRef.current, name, status: "idle", detail: "در انتظار پردازش" }));
    setItems(list);
    try {
      const st = (await fetch("/api/admin/ai/publish").then((r) => r.json())) as { configured?: boolean };
      setNoKey(!st.configured);
    } catch { /* ignore */ }
    await runTargets(list);
  }
  async function retryFailed() {
    if (running) return;
    const failed = items.filter((i) => i.status === "error");
    if (!failed.length) return;
    setItems((prev) => prev.map((it) => it.status === "error" ? { ...it, status: "idle", detail: "در انتظار تلاش مجدد" } : it));
    await runTargets(failed);
  }
  async function retryOne(id: number) {
    if (running) return;
    const t = items.find((i) => i.id === id);
    if (!t) return;
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, status: "idle", detail: "در انتظار تلاش مجدد" } : it));
    await runTargets([{ ...t, status: "idle" }]);
  }
  return (
    <section className="form-card ai-publisher" aria-label="AI Game Publisher">
      <h2 className="ai-title">هوش مصنوعی — افزودن گروهی بازی</h2>
      <p className="field-help">هر خط یک نام بازی (حداکثر ۳۰ بازی). مدل <code dir="ltr">glm-5.3-flash</code> اطلاعات فارسی می‌سازد و کاور رسمی به ترتیب از استور PlayStation، استور Xbox، Steam و کل اینترنت (ویکی‌پدیا، متاکریتیک، گوگل/Bing/DuckDuckGo) دانلود و ذخیره می‌شود.</p>
      {noKey ? <div className="alert error">APINEX_API_KEY تنظیم نشده است؛ در Environment Variables بگذارید.</div> : null}
      <div className="field">
        <label htmlFor="ai-games">لیست بازی‌ها (هر خط یک بازی)</label>
        <textarea id="ai-games" dir="ltr" rows={5} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={"God of War Ragnarök\nResident Evil 4\nBlack Myth: Wukong"} />
        <p className="field-help">{persianNumber(names.length)} بازی در لیست</p>
      </div>
      <div className="form-actions">
        <button className="button" type="button" disabled={running || names.length === 0} onClick={handleGenerate}>{running ? "در حال تولید…" : "تولید بازی‌ها (Generate Games)"}</button>
        {failCount > 0 ? <button className="button ghost" type="button" disabled={running} onClick={retryFailed}>تلاش مجدد ناموفق‌ها ({persianNumber(failCount)})</button> : null}
      </div>
      {items.length > 0 ? (
        <div className="ai-progress">
          <p className="field-help">پیشرفت: {persianNumber(doneCount)} موفق از {persianNumber(items.length)}{failCount > 0 ? ` — ${persianNumber(failCount)} ناموفق` : ""}</p>
          <div className="ai-bar" aria-hidden="true"><div className="ai-bar-fill" style={{ width: `${items.length ? Math.round(((doneCount + failCount) / items.length) * 100) : 0}%` }} /></div>
          <ul className="ai-list">
            {items.map((it) => (
              <li key={it.id} className={`ai-row ${it.status}`}>
                <span className="ai-mark" aria-hidden="true">{it.status === "done" ? "✓" : it.status === "duplicate" ? "═" : it.status === "error" ? "✕" : it.status === "working" ? "…" : "○"}</span>
                <div className="ai-row-info"><strong dir="ltr">{it.name}</strong><small>{it.detail}</small></div>
                {it.cover ? <img className="admin-cover" src={it.cover} alt="" loading="lazy" /> : null}
                {it.status === "error" ? <button className="button ghost small" type="button" disabled={running} onClick={() => retryOne(it.id)}>Retry</button> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
