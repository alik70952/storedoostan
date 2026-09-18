import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

if (existsSync(envPath)) {
  console.log("فایل .env.local از قبل موجود است؛ چیزی تغییر نکرد.");
  console.log("اگر رمز را فراموش کرده‌اید، فایل .env.local را حذف و دوباره npm run setup را اجرا کنید.");
} else {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || randomBytes(6).toString("base64url").slice(0, 10) + "Aa1!";
  const lines = [
    "# تنظیمات پنل مدیریت فروشگاه دوستان",
    `ADMIN_USERNAME=${username}`,
    `ADMIN_PASSWORD_HASH=${hashPassword(password)}`,
    `SESSION_SECRET=${randomBytes(32).toString("hex")}`,
    "# اگر سایت روی HTTPS است true بگذارید",
    "COOKIE_SECURE=false"
  ];
  writeFileSync(envPath, lines.join("\n"), "utf8");
  mkdirSync(path.join(root, "data"), { recursive: true });
  console.log("✅ راه‌اندازی کامل شد.");
  console.log(`   نام کاربری: ${username}`);
  console.log(`   رمز عبور:   ${password}`);
  console.log("   (این رمز فقط همین یک بار نمایش داده می‌شود؛ آن را جایی نگه دارید)");
}