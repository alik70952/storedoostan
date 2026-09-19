import { randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// کمکی برای استقرار روی Vercel:
//   node scripts/vercel-env.mjs "پسورد-دلخواه"   (یا بدون آرگومان = admin123)
// یه فایل .env.production می‌سازه که می‌توني مقاديرش رو در
// Vercel → Settings → Environment Variables (Production) paste کني.

const password = process.argv[2] || "admin123";
if (typeof password !== "string" || password.length < 6) {
  console.error("طرز استفاده: node scripts/vercel-env.mjs \"پسورد-حداقل-۶-کاراکتر\"  (یا خالی بگذار = admin123)");
  process.exit(1);
}

function hashPassword(p) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(p, salt, 64).toString("hex")}`;
}

const values = {
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD_HASH: hashPassword(password),
  SESSION_SECRET: randomBytes(32).toString("hex"),
  COOKIE_SECURE: "true"
};

const content = Object.entries(values)
  .map(([k, v]) => `${k}=${v}`)
  .join("\n") + "\n";

fs.writeFileSync(path.join(process.cwd(), ".env.production"), content, "utf8");

console.log("✅ فایل .env.production ساخته شد.");
console.log("   پسورد انتخابی: " + password);
console.log("");
console.log("# ↓ مقادير زیر را در Vercel → Settings → Environment Variables → Production (و Preview) کپی کنید:");
console.log(content);
console.log("# DATABASE_URL را از Vercel Storage (Neon Postgres) بگیريد و اضافه کنيد.");

