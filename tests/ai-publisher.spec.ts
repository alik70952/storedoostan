import { test, expect } from "@playwright/test";

const USERNAME = process.env.E2E_ADMIN_USERNAME || "admin";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || "";

test("AI Game Publisher در پنل نمایش داده می‌شود", async ({ page }) => {
  test.skip(!process.env.E2E_ADMIN_PASSWORD, "رمز ادمین ست نشده است");

  await page.goto("/admin");
  await page.getByLabel("نام کاربری").fill(USERNAME);
  await page.getByLabel("رمز عبور").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const section = page.getByLabel("AI Game Publisher");
  await expect(section).toBeVisible();
  await expect(section.getByLabel("لیست بازی‌ها (هر خط یک بازی)")).toBeVisible();
  await expect(section.getByRole("button", { name: /تولید بازی‌ها/ })).toBeVisible();
});

test("API بدون احراز هویت 401 می‌دهد و کلید در فرانت‌اند نیست", async ({ page }) => {
  const res = await page.request.post("/api/admin/ai/publish", {
    data: { game: "God of War Ragnarök" },
  });
  expect(res.status()).toBe(401);

  await page.goto("/");
  const html = await page.content();
  expect(html).not.toContain("APINEX_API_KEY");
  expect(html).not.toContain("sk-apxf");
});

test("روت دیباگ کاور پشت احراز هویت است", async ({ page }) => {
  const res = await page.request.get("/api/admin/ai/cover-debug?name=Returnal");
  expect(res.status()).toBe(401);
  const body = (await res.json()) as { error?: string; cover?: unknown };
  expect(body.cover).toBeUndefined();
  expect(body.error).toBeTruthy();
});

test("بکاپ ادمین بدون احراز هویت در دسترس نیست", async ({ page }) => {
  const res = await page.request.get("/api/admin/backup");
  expect(res.status()).toBe(401);
});
