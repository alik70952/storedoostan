import { test, expect } from "@playwright/test";

// کاتالوگ ۵۰۰ بازی PS4: کاور رسمی استاتیک داخل ریپو (public/covers/ps4) — بعد از دیپلوی روی
// Vercel هم بدون دیتابیس اضافه نمایش داده می‌شود.

test("تب PS4 کل کاتالوگ را با کاور استاتیک نشان می‌دهد", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^PS4/ }).click();
  await expect(page.getByRole("heading", { name: "بازی‌های PS4 کپی‌خور" })).toBeVisible();

  // حداقل ۴۰۰ کارت از لیست ۵۰۰ بازی (به‌جز چند عنوان تکراری با seed دستی)
  const cards = page.locator(".game-card");
  expect(await cards.count()).toBeGreaterThan(400);

  // کاور بازی‌های کاتالوگ از مسیر استاتیک خود سایت سرو می‌شود.
  // (بسیاری از بازی‌های کاتالوگ کاور استاتیک دارند؛ برخی هم کاور خارجی/آپلودی seed را دارند.)
  const covers = page.locator('.game-card .cover[src^="/covers/ps4/"]');
  expect(await covers.count()).toBeGreaterThan(0);
});

test("جستجو در کاتالوگ PS4 کار می‌کند", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^PS4/ }).click();
  await page
    .getByPlaceholder("دنبال چه بازی می‌گردی؟ نام بازی یا ژانر را بنویس…")
    .fill("آخرین بازمانده");
  // «آخرین بازمانده از ما ریمستر» (کاتالوگ PS4) جزو نتایج است
  const cards = page.locator(".game-card");
  expect(await cards.count()).toBeGreaterThanOrEqual(1);
});

test("بازی‌های دو نفره کاتالوگ در تب دو نفره دیده می‌شوند", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^دو نفره/ }).click();
  await expect(page.getByRole("heading", { name: "بازی‌های دو نفره" })).toBeVisible();
  expect(await page.locator(".game-card").count()).toBeGreaterThan(0);
});
