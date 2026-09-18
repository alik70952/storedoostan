import { randomBytes, scryptSync } from "node:crypto";

// کمکی برای استقرار روی Vercel:
//   node scripts/vercel-env.mjs "رمز-ادمین-دلخواه"
// خروجی را در Vercel → Settings → Environment Variables کپی کنید.

const password = process.argv[2];
if (!password || password.length < 6) {
  console.error("طرز استفاده: node scripts/vercel-env.mjs \"رمز-ادمین-حداقل-۶-کاراکتری\"");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");

console.log("# ↓ این‌ها را در Vercel → Settings → Environment Variables بگذارید ↓");
console.log(`ADMIN_USERNAME=admin`);
console.log(`ADMIN_PASSWORD_HASH=${salt}:${hash}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString("hex")}`);
console.log(`COOKIE_SECURE=true`);
console.log(`# DATABASE_URL را از Vercel Storage (Neon Postgres) بگیرید و اینجا بگذارید`);
console.log(`# DATABASE_URL=postgresql://user:pass@host/db?sslmode=require`);
