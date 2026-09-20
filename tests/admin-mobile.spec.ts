import { test, expect } from "@playwright/test";

const USERNAME = process.env.E2E_ADMIN_USERNAME || "admin";

async function loginAsAdmin(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/admin");
  await page.getByLabel("نام کاربری").fill(USERNAME);
  await page.getByLabel("رمز عبور").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "پنل مدیریت بازی‌ها" })).toBeVisible();
}

test.describe("نمای موبایل", () => {
  test.use({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });

  test("بدون کشیدن افقی: هیچ سرریز افقی روی صفحه اصلی نیست", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/فروشگاه دوستان/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator(".game-card").first()).toBeVisible();
  });

  test("بدون کشیدن افقی: صفحه ورود روی موبایل سالم است", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: "ورود مدیر" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    // فیلد رمز باید استایل تیره یکدست فرم را داشته باشد، نه استایل پیش‌فرض مرورگر
    const passBg = await page.locator("#password").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(passBg).toBe("rgb(13, 17, 23)");
  });

  test("لیست بازی‌ها روی موبایل بدون سرریز افقی و در نمای اول دیده می‌شود", async ({ page }) => {
    test.skip(!process.env.E2E_ADMIN_PASSWORD, "رمز ادمین ست نشده است");
    await loginAsAdmin(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    // لیست باید همان ابتدای صفحه باشد، نه بعد از فرم طولانی
    const listTop = await page.locator(".admin-list").evaluate((el) => el.getBoundingClientRect().top);
    expect(listTop).toBeLessThan(900);
    const formTop = await page.locator(".form-card").evaluate((el) => el.getBoundingClientRect().top);
    expect(formTop).toBeGreaterThan(listTop);
    await expect(page.getByRole("heading", { name: "لیست بازی‌های فروشگاه" })).toBeVisible();
    await expect(page.locator(".admin-row").first()).toBeVisible();
  });

  test("دکمه‌های موبایل: افزودن بازی و بازگشت به لیست و کلیک روی ردیف", async ({ page }) => {
    test.skip(!process.env.E2E_ADMIN_PASSWORD, "رمز ادمین ست نشده است");
    page.on("dialog", (dialog) => dialog.accept());
    await loginAsAdmin(page);

    await page.getByRole("button", { name: "افزودن بازی جدید" }).click();
    await expect.poll(async () => page.locator(".form-card").evaluate((el) => el.getBoundingClientRect().top), { timeout: 5000 }).toBeLessThan(60);

    await page.getByRole("button", { name: "بازگشت به لیست بازی‌ها" }).click();
    await expect.poll(async () => page.locator(".admin-list").evaluate((el) => el.getBoundingClientRect().top), { timeout: 5000 }).toBeGreaterThanOrEqual(-1);

    await page.locator(".admin-row").first().click();
    await expect.poll(async () => page.locator(".form-card h2").innerText(), { timeout: 5000 }).toContain("ویرایش:");
    await expect.poll(async () => page.locator(".form-card").evaluate((el) => el.getBoundingClientRect().top), { timeout: 5000 }).toBeLessThan(60);
  });
});
