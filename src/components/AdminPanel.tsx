"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import type { ActionResult, Game, Platform } from "@/lib/types";
import { GENRES, persianNumber, platformClass } from "@/lib/types";
import { saveGameAction, deleteGameAction, toggleFeaturedAction, logoutAction } from "@/app/admin/actions";
import AiGamePublisher from "@/components/AiGamePublisher";
import CoverCropper from "@/components/CoverCropper";
import { compressImageFile } from "@/lib/image-compress";
import { persianDate } from "./GameCard";

const PLATFORMS: Platform[] = ["PS5", "PS4", "PS5 اکانتی", "Xbox Offline"];
type ListPlatform = Platform | "two-player" | "all";

const EMPTY_FORM = {
  title: "",
  titleFa: "",
  platform: "PS5" as Platform,
  twoPlayer: false,
  genre: GENRES[0] as string,
  cover: "",
  description: "",
  featured: false
};

export default function AdminPanel({ games }: { games: Game[] }) {
  const [editing, setEditing] = useState<Game | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [listQuery, setListQuery] = useState("");
  const [listPlatform, setListPlatform] = useState<ListPlatform>("all");
  const [preview, setPreview] = useState("");
  const [previewError, setPreviewError] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [saveState, saveAction, saving] = useActionState<ActionResult, FormData>(saveGameAction, {});
  const [deleteState, deleteFormAction, deleting] = useActionState<ActionResult, FormData>(deleteGameAction, {});
  const [toggleState, toggleAction, toggling] = useActionState<ActionResult, FormData>(toggleFeaturedAction, {});

    const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    return {
      total: games.length,
      ps5: games.filter((g) => g.platform === "PS5").length,
      ps4: games.filter((g) => g.platform === "PS4").length,
      account: games.filter((g) => g.platform === "PS5 اکانتی").length,
      xbox: games.filter((g) => g.platform === "Xbox Offline").length,
      week: games.filter((g) => new Date(g.createdAt).getTime() >= weekAgo).length
    };
  }, [games]);

  useEffect(() => {
    if (saveState?.success) {
      setEditing(null);
      setForm((prev) => ({ ...EMPTY_FORM, platform: prev.platform }));
      setPreview("");
      setPreviewError(false);
      formRef.current?.reset();
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [saveState]);

  // پیش‌نمایش زنده: اگر فایل انتخاب شده، همان را نشان بده؛ وگرنه لینک متنی
  async function refreshPreviewFromFile() {
    const file = fileRef.current?.files?.[0];
    if (file && file.size > 0) {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));
      setPreviewError(false);
      // فشرده‌سازی خودکار عکس قبل از آپلود (تا ۱۲۰۰ پیکسل، WebP)
      setCompressing(true);
      try {
        const result = await compressImageFile(file);
        if (result) {
          const compressed = new File([result.bytes as unknown as BlobPart], file.name, { type: result.mime });
          const dt = new DataTransfer();
          dt.items.add(compressed);
          if (fileRef.current) {
            fileRef.current.files = dt.files;
          }
        }
      } catch {
        // اگر فشرده‌سازی نشد، همان فایل اصلی آپلود می‌شود
      } finally {
        setCompressing(false);
      }
    } else {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreviewError(false);
      setPreview(form.cover.trim());
    }
  }

  useEffect(() => {
    const file = fileRef.current?.files?.[0];
    if (file && file.size > 0) return; // فایل انتخاب شده اولویت دارد
    setPreviewError(false);
    setPreview(form.cover.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cover, editing]);

  const filtered = useMemo(() => {
    const q = listQuery.trim();
    return [...games]
      .filter((g) => (listPlatform === "all" ? true : listPlatform === "two-player" ? g.twoPlayer : g.platform === listPlatform))
      .filter((g) => !q || g.titleFa.includes(q) || g.title.toLowerCase().includes(q.toLowerCase()) || g.genre.includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [games, listQuery, listPlatform]);

  const counts = useMemo(() => {
    const q = listQuery.trim();
    const base = games.filter((g) => !q || g.titleFa.includes(q) || g.title.toLowerCase().includes(q.toLowerCase()) || g.genre.includes(q));
    return {
      all: base.length,
      ps5: base.filter((g) => g.platform === "PS5").length,
      ps4: base.filter((g) => g.platform === "PS4").length,
      account: base.filter((g) => g.platform === "PS5 اکانتی").length,
      xbox: base.filter((g) => g.platform === "Xbox Offline").length,
      twoPlayer: base.filter((g) => g.twoPlayer).length
    };
  }, [games, listQuery]);

  function update<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function fillForm(game: Game) {
    setForm({
      title: game.title,
      titleFa: game.titleFa,
      platform: game.platform,
      twoPlayer: game.twoPlayer,
      genre: game.genre,
      cover: game.cover,
      description: game.description,
      featured: game.featured
    });
  }

  function scrollToForm() {
    const el = formRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // اگر فرم از قبل جلوی چشم است، صفحه را جابه‌جا نکن
    if (rect.top >= 0 && rect.top < window.innerHeight * 0.35) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // کراپ دستی کاور: عکسِ پیش‌نمایش/فایل در کراپر باز می‌شود؛ نتیجه جایگزین
  // فایل انتخابی می‌شود تا با همان «ذخیره بازی» در جدول covers ذخیره شود.
  // اگر هنوز هیچ فایل/پیش‌نمایشی نیست ولی بازی در حال ویرایش کاور دارد، کاور
  // فعلی از سرور گرفته و در کراپر باز می‌شود (برای برش کاورهای ذخیره‌شده AI).
  async function openCropperFromExisting() {
    const existing = editing?.cover ?? "";
    if (!existing) {
      openCropper();
      return;
    }
    try {
      const res = await fetch(existing);
      if (!res.ok) {
        openCropper();
        return;
      }
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) {
        openCropper();
        return;
      }
      const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      const file = new File([blob], `cover.${ext}`, { type: blob.type });
      if (cropSrc.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
      setCropSrc(URL.createObjectURL(file));
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileRef.current) {
        fileRef.current.files = dt.files;
      }
      setCropOpen(true);
    } catch {
      openCropper();
    }
  }

  function openCropper() {
    const file = fileRef.current?.files?.[0];
    if (file && file.size > 0) {
      if (cropSrc.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
      setCropSrc(URL.createObjectURL(file));
      setCropOpen(true);
      return;
    }
    if (preview && !previewError) {
      setCropSrc(preview);
      setCropOpen(true);
    }
  }

  function applyCrop(file: File) {
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileRef.current) {
      fileRef.current.files = dt.files;
    }
    if (cropSrc.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    const url = URL.createObjectURL(file);
    setCropSrc("");
    setCropOpen(false);
    setPreview(url);
    setPreviewError(false);
    // کراپ دستی اولویت دارد — لینک متنی را خالی کن تا همان فایل ذخیره شود
    setForm((prev) => ({ ...prev, cover: "" }));
  }

  function startEdit(game: Game) {
    setEditing(game);
    fillForm(game);
    scrollToForm();
  }

  function startDuplicate(game: Game) {
    setEditing(null);
    fillForm(game);
    scrollToForm();
  }

  // روی موبایل لیست بالا و فرم پایین است؛ این دکمه مستقیم به فرم می‌برد
  function startNewGame() {
    const el = formRef.current;
    if ((isDirty || editing) && !window.confirm("فرم فعلی پاک شود و از نو شروع شود؟")) {
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    resetForm();
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function backToList() {
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPreview("");
    setPreviewError(false);
    formRef.current?.reset();
    if (fileRef.current) fileRef.current.value = "";
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);

  return (
    <div className="admin-page">
      <div className="admin-top">
        <div>
          <h1>پنل مدیریت بازی‌ها</h1>
          <p>افزودن، ویرایش و مدیریت بازی‌های فروشگاه</p>
        </div>
        <div className="admin-actions">
          <button className="button add-mobile" type="button" onClick={startNewGame}>➕ افزودن بازی جدید</button>
          <a className="button ghost" href="/" target="_blank">مشاهده سایت</a>
          <a className="button ghost" href="/api/admin/backup" title="دریافت فایل پشتیبان JSON">⬇ پشتیبان</a>
          <form action={logoutAction}>
            <button className="button ghost" type="submit">خروج</button>
          </form>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card"><strong>{persianNumber(stats.total)}</strong><span>کل بازی‌ها</span></div>
        <div className="stat-card"><strong>{persianNumber(stats.ps5)}</strong><span>بازی PS5</span></div>
                <div className="stat-card"><strong>{persianNumber(stats.ps4)}</strong><span>بازی PS4</span></div>
        <div className="stat-card"><strong>{persianNumber(stats.account)}</strong><span>بازی PS5 اکانتی</span></div>
        <div className="stat-card"><strong>{persianNumber(stats.xbox)}</strong><span>بازی Xbox Offline</span></div>
        <div className="stat-card"><strong>{persianNumber(stats.week)}</strong><span>افزوده این هفته</span></div>
      </div>

      <div className="admin-grid">
        <form ref={formRef} className={`form-card${editing ? " editing" : ""}`} action={saveAction}>
          <h2>{editing ? `ویرایش: ${editing.titleFa || editing.title}` : "افزودن بازی جدید"}</h2>
          {saveState?.error ? <div className="alert error">{saveState.error}</div> : null}
          {saveState?.success ? <div className="alert success">{saveState.success}</div> : null}
          {toggleState?.error ? <div className="alert error">{toggleState.error}</div> : null}
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="field">
            <label htmlFor="titleFa">نام فارسی بازی *</label>
            <input id="titleFa" name="titleFa" type="text" value={form.titleFa} onChange={(e) => update("titleFa", e.target.value)} placeholder="مثلاً: خدای جنگ راگناروک" />
          </div>
          <div className="field">
            <label htmlFor="title">نام اصلی (انگلیسی) *</label>
            <input id="title" name="title" type="text" dir="ltr" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="God of War Ragnarök" />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="platform">دسته / پلتفرم *</label>
              <select id="platform" name="platform" value={form.platform} onChange={(e) => update("platform", e.target.value as Platform)}>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="genre">ژانر</label>
              <select id="genre" name="genre" value={form.genre} onChange={(e) => update("genre", e.target.value)}>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="cover">لینک کاور (اختیاری — می‌توانید خالی بگذارید)</label>
            <input id="cover" name="cover" type="text" inputMode="url" dir="ltr" value={form.cover} onChange={(e) => {
              // نرمال‌سازی خودکار: حذف فاصله‌ها و افزودن https:// اگر جا افتاده باشد
              const raw = e.target.value;
              const trimmed = raw.trim();
              if (trimmed && !/^https?:\/\//i.test(trimmed) && !/^\//.test(trimmed) && /^(www\.)?[^/\s]+\.[a-z]{2,}(\/\S*)?$/i.test(trimmed)) {
                update("cover", `https://${trimmed}`);
              } else {
                update("cover", raw);
              }
            }} placeholder="خالی = بدون عکس، یا https://…/cover.jpg" />
            {form.cover.trim() && !/^https?:\/\//i.test(form.cover.trim()) && !form.cover.trim().startsWith("/api/covers/") ? (
              <p className="field-help" style={{ color: "#ffb0b0" }}>⚠️ لینک باید با https:// شروع شود.</p>
            ) : (
              <p className="field-help">پر کردن کاور اجباری نیست. اگر لینک خراب باشد، بازی بدون عکس ذخیره می‌شود. فایل انتخاب‌شده بر لینک اولویت دارد.</p>
            )}
          </div>
          <div className="field">
            <label htmlFor="coverFile">بارگذاری فایل کاور (اختیاری)</label>
            <input
              ref={fileRef}
              id="coverFile"
              name="coverFile"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={() => refreshPreviewFromFile()}
            />
            <p className="field-help">
              فقط JPG / PNG / WebP تا ۳ مگابایت. عکس به‌طور خودکار فشرده و به WebP تبدیل می‌شود تا سریع‌تر آپلود شود.
              {compressing ? " ⏳ در حال فشرده‌سازی عکس…" : ""}
            </p>
          </div>
          {preview && !previewError ? (
            <div className="field">
              <div className="cover-preview">
                <img
                  src={preview}
                  alt="پیش‌نمایش کاور"
                  onError={() => setPreviewError(true)}
                />
              </div>
              <div className="crop-open-row">
                <button className="button ghost small" type="button" onClick={openCropper}>
                  ✂ برش کاور (حذف نوار کنسول بالای عکس)
                </button>
              </div>
            </div>
          ) : null}
          {preview && previewError ? (
            <div className="field">
              <div className="alert error">این لینک در مرورگر نمایش داده نشد، ولی مشکلی نیست — بازی بدون عکس ذخیره می‌شود. اگر می‌خواهید عکس داشته باشد آدرس https معتبر وارد کنید.</div>
            </div>
          ) : null}
          {editing?.cover ? (
            <div className="field">
              <button className="button ghost small" type="button" onClick={openCropperFromExisting}>
                ✂ برش کاور فعلی بازی (مثلاً حذف نوار PS5 بالای عکس)
              </button>
              <p className="field-help">کاور فعلی بازی از سرور گرفته می‌شود تا برش بزنی؛ نتیجه با ذخیره بازی جایگزین همان کاور می‌شود.</p>
            </div>
          ) : null}
          {editing?.cover ? (
            <div className="field checkbox-row">
              <input
                id="removeCover"
                name="removeCover"
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    setForm((prev) => ({ ...prev, cover: "" }));
                    if (fileRef.current) fileRef.current.value = "";
                    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
                    setPreview("");
                    setPreviewError(false);
                  }
                }}
              />
              <label htmlFor="removeCover">حذف عکس فعلی (ذخیره بدون عکس)</label>
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="description">توضیحات</label>
            <textarea id="description" name="description" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="چند جمله درباره بازی…" />
          </div>
          <div className="field checkbox-row">
            <input id="twoPlayer" name="twoPlayer" type="checkbox" checked={form.twoPlayer} onChange={(e) => update("twoPlayer", e.target.checked)} />
            <label htmlFor="twoPlayer">نمایش در دسته «بازی‌های دو نفره» (PS5 / PS4)</label>
          </div>
          <div className="field checkbox-row">
            <input id="featured" name="featured" type="checkbox" checked={form.featured} onChange={(e) => update("featured", e.target.checked)} />
            <label htmlFor="featured">نمایش ستاره «منتخب» روی کارت</label>
          </div>
          <div className="form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "در حال ذخیره…" : editing ? "ذخیره تغییرات" : "افزودن بازی"}
            </button>
            {isDirty || editing ? (
              <button className="button ghost" type="button" onClick={resetForm}>{editing ? "انصراف" : "پاک کردن"}</button>
            ) : null}
            <button className="button ghost back-to-list" type="button" onClick={backToList}>↓ بازگشت به لیست بازی‌ها</button>
          </div>
        </form>

        <div ref={listRef}>
          {deleteState?.error ? <div className="alert error">{deleteState.error}</div> : null}
          {deleteState?.success ? <div className="alert success">{deleteState.success}</div> : null}
          {toggleState?.success ? <div className="alert success">{toggleState.success}</div> : null}

          <div className="list-head">
            <h2>لیست بازی‌های فروشگاه</h2>
            <span>{persianNumber(filtered.length)} از {persianNumber(games.length)}</span>
          </div>

          <div className="list-toolbar">
            <div className="list-tabs">
              <button className={listPlatform === "all" ? "active" : ""} onClick={() => setListPlatform("all")}>همه <span>{persianNumber(counts.all)}</span></button>
              <button className={listPlatform === "PS5" ? "active" : ""} onClick={() => setListPlatform("PS5")}>PS5 <span>{persianNumber(counts.ps5)}</span></button>
                            <button className={listPlatform === "PS4" ? "active" : ""} onClick={() => setListPlatform("PS4")}>PS4 <span>{persianNumber(counts.ps4)}</span></button>
              <button className={listPlatform === "PS5 اکانتی" ? "active" : ""} onClick={() => setListPlatform("PS5 اکانتی")}>PS5 اکانتی <span>{persianNumber(counts.account)}</span></button>
              <button className={listPlatform === "Xbox Offline" ? "active" : ""} onClick={() => setListPlatform("Xbox Offline")}>Xbox Offline <span>{persianNumber(counts.xbox)}</span></button>
              <button className={listPlatform === "two-player" ? "active" : ""} onClick={() => setListPlatform("two-player")}>دو نفره <span>{persianNumber(counts.twoPlayer)}</span></button>
            </div>
            <input
              className="list-search"
              type="search"
              placeholder="جستجو در لیست…"
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              aria-label="جستجوی لیست بازی‌ها"
            />
          </div>

          <div className="admin-list">
            {filtered.length === 0 ? (
              <div className="empty-inline"><strong>چیزی پیدا نشد</strong><br />بازی‌ای با این جستجو یا فیلتر پیدا نشد.</div>
            ) : (
              filtered.map((game) => (
                <div
                  className={`admin-row${game.id === editing?.id ? " current" : ""}`}
                  key={game.id}
                  onClick={() => startEdit(game)}
                  role="button"
                  tabIndex={0}
                  title="کلیک برای ویرایش"
                  style={{ cursor: "pointer" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      startEdit(game);
                    }
                  }}
                >
                  {game.cover ? (
                    <img className="admin-cover" src={game.cover} alt="" loading="lazy" />
                  ) : (
                    <div className="admin-cover"><span>🎮</span></div>
                  )}
                  <div className="admin-row-info" title="کلیک برای ویرایش">
                    <strong>{game.titleFa || game.title}</strong>
                    <small>
                      <span className={`pill ${platformClass(game.platform)}`}>{game.platform}</span>
                      {game.twoPlayer ? <span className="pill two-player">دو نفره</span> : null}
                      {game.genre ? <span>{game.genre}</span> : null}
                      {game.featured ? <span className="pill featured">منتخب</span> : null}
                      <span>{persianDate(game.createdAt)}</span>
                    </small>
                  </div>
                  <div
                    className="admin-row-actions"
                    onClick={(e) => {
                      const target = e.target as HTMLElement | null;
                      // کلیک روی دکمه‌ها/فرم‌ها به ردیف نرسد؛ ولی ضربه روی فضای خالیِ این خط، مثل ضربه روی خود ردیف عمل کند (ورود به ویرایش)
                      if (target && target.closest("button,input,label,select,textarea,a,form")) e.stopPropagation();
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <form action={toggleAction}>
                      <input type="hidden" name="id" value={game.id} />
                      <button
                        className={`star-btn${game.featured ? " on" : ""}`}
                        type="submit"
                        disabled={toggling}
                        title={game.featured ? "برداشتن ستاره منتخب" : "افزودن به منتخب‌ها"}
                      >
                        {game.featured ? "★" : "☆"}
                      </button>
                    </form>
                    <button className="button ghost small" type="button" onClick={() => startEdit(game)} title="ویرایش">✎</button>
                    <button className="button ghost small" type="button" onClick={() => startDuplicate(game)} title="کپی برای افزودن بازی مشابه">⧉</button>
                    <form
                      action={deleteFormAction}
                      onSubmit={(e) => {
                        if (!window.confirm(`حذف «${game.titleFa || game.title}» مطمئن هستید؟`)) e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="id" value={game.id} />
                      <button className="button danger small" type="submit" disabled={deleting} title="حذف">🗑</button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="list-count">{persianNumber(filtered.length)} بازی در این نما از {persianNumber(games.length)} بازی</p>
        </div>
      </div>
      <AiGamePublisher />
      {cropOpen && cropSrc ? (
        <CoverCropper
          imageSrc={cropSrc}
          onApply={applyCrop}
          onClose={() => {
            if (cropSrc.startsWith("blob:") && cropSrc !== preview) URL.revokeObjectURL(cropSrc);
            setCropSrc("");
            setCropOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}