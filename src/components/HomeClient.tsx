"use client";

import { useMemo, useState } from "react";
import type { Game, Platform } from "@/lib/types";
import { ACCOUNT_PLATFORM, persianNumber } from "@/lib/types";
import GameCard from "./GameCard";
import Logo from "./Logo";

type PlatformFilter = Platform | "two-player" | "all";
type SortKey = "newest" | "oldest" | "alpha" | "featured";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "جدیدترین" },
  { value: "alpha", label: "بر اساس نام" },
  { value: "featured", label: "منتخب‌ها اول" },
  { value: "oldest", label: "قدیمی‌ترین" }
];

// تب‌های دسته‌ها — شامل دسته «PS5 اکانتی» و دسته عرضی «دو نفره» (بازی‌های PS5/PS4)
const PLATFORM_TABS: { value: PlatformFilter; label: string }[] = [
  { value: "PS5", label: "PS5 کپی‌خور" },
  { value: "PS4", label: "PS4 کپی‌خور" },
  { value: ACCOUNT_PLATFORM, label: ACCOUNT_PLATFORM },
  { value: "Xbox Offline", label: "Xbox آفلاین" },
  { value: "two-player", label: "دو نفره" },
  { value: "all", label: "همه" }
];

const PLATFORM_HEADINGS: Record<PlatformFilter, string> = {
  PS5: "بازی‌های PS5 کپی‌خور",
  PS4: "بازی‌های PS4 کپی‌خور",
  [ACCOUNT_PLATFORM]: "بازی‌های PS5 اکانتی",
  "Xbox Offline": "بازی‌های Xbox آفلاین",
  "two-player": "بازی‌های دو نفره",
  all: "همه بازی‌ها"
};

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
    const account = games.filter((g) => g.platform === ACCOUNT_PLATFORM).length;
    const xbox = games.filter((g) => g.platform === "Xbox Offline").length;
    const twoPlayer = games.filter((g) => g.twoPlayer).length;
    return { total: games.length, ps5, ps4, account, xbox, twoPlayer };
  }, [games]);

  const visible = useMemo(() => {
    const q = query.trim();
    // دسته «دو نفره» عرضی است: بازی‌های دو نفره از همه پلتفرم‌ها (PS5/PS4 و…) را نشان می‌دهد
    let list = games.filter((g) => (platform === "all" ? true : platform === "two-player" ? g.twoPlayer : g.platform === platform));
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

  const counts: Record<PlatformFilter, number> = {
    PS5: stats.ps5,
    PS4: stats.ps4,
    [ACCOUNT_PLATFORM]: stats.account,
    "Xbox Offline": stats.xbox,
    "two-player": stats.twoPlayer,
    all: stats.total
  };
  const heading = PLATFORM_HEADINGS[platform];

  function selectPlatform(next: PlatformFilter) {
    setPlatform(next);
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand"
            onClick={() => {
              setQuery("");
              selectPlatform("PS5");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span className="brand-logo">
              <Logo size={40} />
            </span>
            <span className="brand-copy">
              <strong>فروشگاه دوستان</strong>
              <small>PS4 · PS5 · PS5 اکانتی · Xbox Offline</small>
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
          <p>مجموعه بازی‌های کپی‌خور PS5 و PS4، بازی اکانتی PS5 و بازی آفلاین Xbox. بازی کن، به سبک خودت.</p>
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
              <strong>{persianNumber(stats.account)}</strong>
              <span>PS5 اکانتی</span>
            </div>
            <div>
              <strong>{persianNumber(stats.twoPlayer)}</strong>
              <span>دو نفره</span>
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
            {PLATFORM_TABS.map((tab) => (
              <button key={tab.value} className={platform === tab.value ? "active" : ""} onClick={() => selectPlatform(tab.value)}>
                {tab.label} <span>{persianNumber(counts[tab.value])}</span>
              </button>
            ))}
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
