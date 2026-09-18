import { NextResponse } from "next/server";
import { listGames } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const games = await listGames();
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), count: games.length, games }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="doostan-backup-${new Date().toISOString().slice(0, 10)}.json"`
    }
  });
}