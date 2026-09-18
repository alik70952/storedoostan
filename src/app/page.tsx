import { listGames } from "@/lib/db";
import HomeClient from "@/components/HomeClient";
import type { Game } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let games: Game[] = [];
  try {
    games = await listGames();
  } catch {
    games = [];
  }
  return <HomeClient games={games} />;
}