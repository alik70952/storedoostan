import { redirect } from "next/navigation";
import { listGames } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import AdminPanel from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

export const metadata = { title: "پنل مدیریت", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");
  const games = await listGames();
  return <AdminPanel games={games} />;
}