"use client";

import { useMemo, useState } from "react";
import type { Game } from "@/lib/types";
import { persianNumber } from "@/lib/types";
import GameCard from "./GameCard";
import Logo from "./Logo";

type PlatformFilter = "PS5" | "PS4" | "Xbox Offline" | "all";
type SortKey = "newest" | "oldest" | "alpha" | "featured";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "جدیدترین" },
  { value: "alpha", label: "بر اساس نام" },
  { value: "featured", label: "منتخب‌ها اول" },
  { value: "oldest", label: "قدیمی‌ترین" }
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export default function HomeClient({ games }: { games: Game[] }) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("PS5");
  const [sort, setSort] = useState<SortKey>("newest");

  const stats = useMemo(() => {
    const ps5 = games.filter((g) => g.platform === "PS5").length;
    const ps4 = games.filter((g) => g.platform === "PS4").length;
    const xbox = games.filter((g) => g.platform === "Xbox Offline").length;
    return { total: games.length, ps5, ps4, xbox };
  }, [games]);

  const visible = useMemo(() => {
    const q = query.trim();
    let list = games.filter((g) => (platform === "all" ? true : g.platform === platform));
    if (q) {
      list = list.filter(
        (g) =>
          g.titleFa.includes(q) ||
          g.title.toLowerCase().includes(q.toLowerCase()) ||
          g.genre.includes(q)
      );
    }
    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.updatedAt.localeCompare(a.updatedAt));
    if (sort === "oldest") sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (sort === "alpha") sorted.sort((a, b) => (a.titleFa || a.title).localeCompare(b.titleFa || b.title, "fa"));
    if (sort === "featured") sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt));
    return sorted;
  }, [games, platform, query, sort]);

  const heading = platform === "PS5" ? "بازی‌های PS5 کپی‌خور" : platform === "PS4" ? "بازی‌های PS4 کپی‌خور" : platform === "Xbox Offline" ? "بازی‌های Xbox آفلاین" : "همه بازی‌ها";

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand"
            onClick={() => {
              setQuery("");
              setPlatform("PS5");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span className="brand-logo">
              <Logo size={40} />
            </span>
            <span className="brand-copy">
              <strong>فروشگاه دوستان</strong>
              <small>PS4 · PS5 · Xbox Offline</small>
            </span>
          </button>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="hero-inner">
          <div className="hero-logo">
            <Logo size={128} />
          </div>
          <h1>فروشگاه دوستان</h1>
          <p>مجموعه بازی‌های کپی‌خور PS5 و PS4 و بازی آفلاین Xbox. بازی کن، به سبک خودت.</p>
          <p className="hero-address">📍 شیراز، بلوار رحمت، خیابان لشکری، کوچه ۱ — فروشگاه دوستان</p>
          <div className="hero-search-wrap">
            <SearchIcon />
            <input
              type="search"
              placeholder="دنبال چه بازی می‌گردی؟ نام بازی یا ژانر را بنویس…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="جستجوی بازی‌ها"
            />
            {query ? (
              <button className="hero-search-clear" onClick={() => setQuery("")} aria-label="پاک کردن جستجو">✕</button>
            ) : null}
          </div>
          <div className="hero-stats">
            <div>
              <strong>{persianNumber(stats.total)}</strong>
              <span>بازی</span>
            </div>
            <div>
              <strong>{persianNumber(stats.ps5)}</strong>
              <span>PS5</span>
            </div>
            <div>
              <strong>{persianNumber(stats.ps4)}</strong>
              <span>PS4</span>
            </div>
            <div>
              <strong>{persianNumber(stats.xbox)}</strong>
              <span>Xbox آفلاین</span>
            </div>
            <div>
              <strong>{persianNumber(new Set(games.map((g) => g.genre)).size)}</strong>
              <span>ژانر</span>
            </div>
          </div>
        </div>
      </section>

      <section className="catalog-section" id="catalog">
        <div className="catalog-toolbar">
          <div className="view-switcher" role="tablist" aria-label="انتخاب پلتفرم">
            <button className={platform === "PS5" ? "active" : ""} onClick={() => setPlatform("PS5")}>
              PS5 کپی‌خور <span>{persianNumber(stats.ps5)}</span>
            </button>
            <button className={platform === "PS4" ? "active" : ""} onClick={() => setPlatform("PS4")}>
              PS4 کپی‌خور <span>{persianNumber(stats.ps4)}</span>
            </button>
            <button className={platform === "Xbox Offline" ? "active" : ""} onClick={() => setPlatform("Xbox Offline")}>
              Xbox آفلاین <span>{persianNumber(stats.xbox)}</span>
            </button>
            <button className={platform === "all" ? "active" : ""} onClick={() => setPlatform("all")}>
              همه <span>{persianNumber(stats.total)}</span>
            </button>
          </div>
          <label className="sort-select">
            <span>مرتب‌سازی:</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="catalog-heading-row">
          <h2>{heading}</h2>
          <p>{persianNumber(visible.length)} عنوان</p>
        </div>
        {visible.length > 0 ? (
          <div className="cards-grid">
            {visible.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="empty-inline">
            <strong>چیزی پیدا نشد</strong>
            <br />
            فعلاً بازی‌ای در این بخش نیست؛ به‌زودی بازی‌های جدید اضافه می‌شوند.
          </div>
        )}
      </section>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-links">
            <a href="#catalog">فهرست بازی‌ها</a>
          </div>
          <div className="footer-meta">
            <span className="footer-address">📍 شیراز، بلوار رحمت، خیابان لشکری، کوچه ۱</span>
            <span>© {new Intl.DateTimeFormat("fa-IR", { year: "numeric" }).format(new Date())} فروشگاه دوستان</span>
          </div>
        </div>
      </footer>
    </div>
  );
}