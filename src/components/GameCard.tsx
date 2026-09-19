"use client";

import type { Game } from "@/lib/types";

export function persianDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default function GameCard({ game }: { game: Game }) {
  return (
    <article className="game-card">
      <div className="cover-wrap">
        <span className={`platform-badge platform-${game.platform.toLowerCase().split(" ")[0]}`}>{game.platform}</span>
        {game.featured ? <span className="featured-badge" title="منتخب">★</span> : null}
        {game.cover ? (
          <img className="cover" src={game.cover} alt={game.titleFa || game.title} loading="lazy" />
        ) : (
          <div className="cover-fallback">
            <span>{game.titleFa || game.title}</span>
          </div>
        )}
      </div>
      <div className="game-card-body">
        <h2>{game.titleFa || game.title}</h2>
        <p className="card-meta">{game.platform} · {game.genre}</p>
        <p className="card-date">{persianDate(game.createdAt)}</p>
      </div>
    </article>
  );
}