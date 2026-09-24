// پیدا کردن کاور Steam (library_600x900) برای عنوان‌هایی که ویکی‌پدیا ندارد
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OVERRIDES_FILE = path.join(ROOT, "data/ps4-cover-overrides.json");
const RETRY_FILE = path.join(ROOT, "data/ps4-retry-titles.txt");

const TITLES = [
  "My Hero One's Justice",
  "Fall Guys",
  "Assassin's Creed The Ezio Collection",
];

function norm(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function fetchOk(url, accept) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: accept } });
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        continue;
      }
      return null;
    } catch {
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  return null;
}

const overrides = JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf8").replace(/^﻿/, ""));

for (const title of TITLES) {
  const q = norm(title);
  const res = await fetchOk(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&cc=US&l=en`,
    "application/json"
  );
  if (!res) {
    console.log(`✗ ${title} → storesearch fail`);
    continue;
  }
  const data = await res.json();
  const items = data.items ?? [];
  const exact = items.find((i) => norm(i.name ?? "") === q) || items[0];
  if (!exact?.id) {
    console.log(`✗ ${title} → no steam item`);
    continue;
  }
  const cover = `https://cdn.cloudflare.steamstatic.com/steam/apps/${exact.id}/library_600x900.jpg`;
  const img = await fetchOk(cover, "image/*");
  if (!img) {
    console.log(`✗ ${title} → no library art (app ${exact.id} ${exact.name})`);
    continue;
  }
  const buf = Buffer.from(await img.arrayBuffer());
  const sharp = (await import("sharp")).default;
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h || w / h > 0.85) {
    console.log(`✗ ${title} → bad art ${w}×${h} (app ${exact.id})`);
    continue;
  }
  overrides[title] = cover;
  console.log(`✓ ${title} → ${w}×${h} app=${exact.id} «${exact.name}»`);
  await new Promise((r) => setTimeout(r, 500));
}

fs.writeFileSync(OVERRIDES_FILE, `${JSON.stringify(overrides, null, 2)}\n`, "utf8");
const retryTitles = Object.keys(overrides).filter((t) => {
  try {
    const failed = JSON.parse(fs.readFileSync(path.join(ROOT, "data/ps4-cover-failures.json"), "utf8"));
    return failed[t];
  } catch {
    return false;
  }
});
fs.writeFileSync(RETRY_FILE, `${retryTitles.join("\n")}\n`, "utf8");
console.log(`retry titles: ${retryTitles.length}`);
