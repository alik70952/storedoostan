import { test, expect } from "@playwright/test";

test("صفحه اصلی با نمایش PS5 باز می‌شود", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/فروشگاه دوستان/);
  await expect(page.getByRole("heading", { name: "فروشگاه دوستان" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^PS5/ })).toHaveClass(/active/);
  await expect(page.locator(".game-card").first()).toBeVisible();
});

test("تب PS4 بازی‌های PS4 را نشان می‌دهد", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^PS4/ }).click();
  await expect(page.getByRole("heading", { name: "بازی‌های PS4" })).toBeVisible();
  await expect(page.locator(".platform-ps4").first()).toBeVisible();
});

test("جستجو کار می‌کند", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("دنبال چه بازی می‌گردی؟ نام بازی یا ژانر را بنویس…").fill("راگناروک");
  await expect(page.locator(".game-card")).toHaveCount(1);
});

test("ادمین بدون ورود به صفحه ورود هدایت می‌شود", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: "ورود مدیر" })).toBeVisible();
});