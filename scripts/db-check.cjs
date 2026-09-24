// بررسی سریع وضعیت دیتابیس لوکال (توسعه‌محور)
const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync("data/doostan.db");
const rows = db.prepare("SELECT COUNT(*) c FROM games").get();
console.log("games:", JSON.stringify(rows.c));
const blood = db.prepare("SELECT id, title, substr(cover, 1, 40) AS cover FROM games WHERE title = 'Bloodborne'").get();
console.log("bloodborne:", JSON.stringify(blood));
db.close();
