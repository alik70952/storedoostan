import { test, expect } from "@playwright/test";

test("صفحه اصلی با نمایش PS5 باز می‌شود", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/فروشگاه دوستان/);
  await expect(page.getByRole("heading", { name: "فروشگاه دوستان" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^PS5 کپی‌خور/ })).toHaveClass(/active/);
  await expect(page.locator(".game-card").first()).toBeVisible();
});

test("تب PS4 بازی‌های PS4 را نشان می‌دهد", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^PS4/ }).click();
  await expect(page.getByRole("heading", { name: "بازی‌های PS4" })).toBeVisible();
  await expect(page.locator(".platform-ps4").first()).toBeVisible();
});

test("دسته PS5 اکانتی در سایت نمایش داده می‌شود (بدون ظرفیت)", async ({ page }) => {
  await page.goto("/");
  const tab = page.getByRole("button", { name: /^PS5 اکانتی/ });
  await tab.click();
  await expect(tab).toHaveClass(/active/);
  await expect(page.getByRole("heading", { name: "بازی‌های PS5 اکانتی" })).toBeVisible();
  // ظرفیت‌ها حذف شده‌اند: چیپ ظرفیتی دیگر وجود ندارد
  await expect(page.getByRole("group", { name: "انتخاب ظرفیت اکانتی" })).toHaveCount(0);

  // برگشت به دسته‌های دیگر کار می‌کند
  await page.getByRole("button", { name: /^PS4/ }).click();
  await expect(page.getByRole("heading", { name: "بازی‌های PS4" })).toBeVisible();
});

test("دسته دو نفره در سایت نمایش داده می‌شود (بازی‌های PS5/PS4)", async ({ page }) => {
  await page.goto("/");
  const tab = page.getByRole("button", { name: /^دو نفره/ });
  await tab.click();
  await expect(tab).toHaveClass(/active/);
  await expect(page.getByRole("heading", { name: "بازی‌های دو نفره" })).toBeVisible();

  // اگر بازی دو نفره‌ای موجود باشد، متای کارت آن «دو نفره» را نشان می‌دهد
  const cardCount = await page.locator(".game-card").count();
  if (cardCount > 0) {
    await expect(page.locator(".game-card .card-meta").first()).toContainText("دو نفره");
  }

  // برگشت به تب PS5 کار می‌کند
  await page.getByRole("button", { name: /^PS5 کپی‌خور/ }).click();
  await expect(page.getByRole("heading", { name: "بازی‌های PS5 کپی‌خور" })).toBeVisible();
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