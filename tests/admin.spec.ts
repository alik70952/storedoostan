import { test, expect } from "@playwright/test";

const USERNAME = process.env.E2E_ADMIN_USERNAME || "admin";

test("ورود مدیر و افزودن بازی جدید", async ({ page }) => {
  test.skip(!process.env.E2E_ADMIN_PASSWORD, "رمز ادمین ست نشده است");

  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/admin");
  await page.getByLabel("نام کاربری").fill(USERNAME);
  await page.getByLabel("رمز عبور").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "پنل مدیریت بازی‌ها" })).toBeVisible();

  await page.getByLabel("نام فارسی بازی *").fill("بازی تستی آزمایشی");
  await page.getByLabel("نام اصلی (انگلیسی) *").fill("Test Game E2E");
  await page.getByRole("button", { name: "افزودن بازی", exact: true }).click();
  await expect(page.getByText("بازی جدید با موفقیت اضافه شد.")).toBeVisible();
  await expect(page.locator(".admin-row", { hasText: "بازی تستی آزمایشی" }).first()).toBeVisible();

  let guard = 0;
  while ((await page.locator(".admin-row", { hasText: "Test Game E2E" }).count()) > 0 && guard < 5) {
    await page.locator(".admin-row", { hasText: "Test Game E2E" }).first().getByRole("button", { name: "حذف" }).click();
    await page.waitForTimeout(600);
    guard += 1;
  }
  await expect(page.locator(".admin-row", { hasText: "Test Game E2E" })).toHaveCount(0);
});

test("افزودن بازی در دسته PS5 اکانتی", async ({ page }) => {
  test.skip(!process.env.E2E_ADMIN_PASSWORD, "رمز ادمین ست نشده است");

  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/admin");
  await page.getByLabel("نام کاربری").fill(USERNAME);
  await page.getByLabel("رمز عبور").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByLabel("نام فارسی بازی *").fill("بازی تستی اکانتی");
  await page.getByLabel("نام اصلی (انگلیسی) *").fill("Test Account Game E2E");
  // دسته «PS5 اکانتی» بدون فیلد ظرفیت است
  await page.getByLabel("دسته / پلتفرم *").selectOption("PS5 اکانتی");
  await expect(page.getByLabel("ظرفیت (فقط دسته PS5 اکانتی) *")).toHaveCount(0);
  await page.getByRole("button", { name: "افزودن بازی", exact: true }).click();

  await expect(page.getByText("بازی جدید با موفقیت اضافه شد.")).toBeVisible();
  const row = page.locator(".admin-row", { hasText: "بازی تستی اکانتی" }).first();
  await expect(row).toBeVisible();
  await expect(row.locator(".pill.account")).toHaveText("PS5 اکانتی");
  await expect(row.locator(".pill.capacity")).toHaveCount(0);

  let guard = 0;
  while ((await page.locator(".admin-row", { hasText: "Test Account Game E2E" }).count()) > 0 && guard < 5) {
    await page.locator(".admin-row", { hasText: "Test Account Game E2E" }).first().getByRole("button", { name: "حذف" }).click();
    await page.waitForTimeout(600);
    guard += 1;
  }
  await expect(page.locator(".admin-row", { hasText: "Test Account Game E2E" })).toHaveCount(0);
});