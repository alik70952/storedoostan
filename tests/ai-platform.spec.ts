import { test, expect } from "@playwright/test";

test("قانون پسوند ایکس‌باکس و ترتیب منابع کاور (واحدی، بدون اینترنت)", async () => {
  const game = await import("../src/lib/ai-game");
  const cover = await import("../src/lib/ai-cover");

  // ۱) پسوند xbox جدا می‌شود و نام تمیز می‌ماند
  expect(game.splitXboxSuffix("Halo Infinite xbox")).toEqual({ cleanName: "Halo Infinite", forceXbox: true });
  expect(game.splitXboxSuffix("Halo Infinite XBOX")).toEqual({ cleanName: "Halo Infinite", forceXbox: true });
  expect(game.splitXboxSuffix("Halo Infinite - xbox")).toEqual({ cleanName: "Halo Infinite", forceXbox: true });
  expect(game.splitXboxSuffix("Halo Infinite (xbox)")).toEqual({ cleanName: "Halo Infinite", forceXbox: true });
  expect(game.splitXboxSuffix("God of War Ragnarök")).toEqual({ cleanName: "God of War Ragnarök", forceXbox: false });
  expect(game.splitXboxSuffix("Xbox Series")).toEqual({ cleanName: "Xbox Series", forceXbox: false });
  expect(game.splitXboxSuffix("Halo Infinite xbox extra")).toEqual({ cleanName: "Halo Infinite xbox extra", forceXbox: false });

  // ۲) با پسوند xbox، هر پاسخی از مدل هم که بیاید، پلتفرم Xbox Offline می‌شود
  expect(game.normalizeAiJson({ title: "God of War Ragnarök", platform: "PS5" }, "God of War Ragnarök", { forceXbox: true }).platform).toBe("Xbox Offline");

  // ۳) بدون پسوند: حدس «XBOX» مدل هرگز بازی را Xbox نمی‌کند (اولویت PS5)
  expect(game.normalizeAiJson({ title: "Elden Ring", platform: "XBOX" }, "Elden Ring").platform).toBe("PS5");
  // اگر مدل صراحتاً PS4 هم گفته باشد، همان PS4 می‌ماند (نه Xbox)
  expect(game.normalizeAiJson({ title: "Elden Ring", platform: "PS5, PS4, Xbox" }, "Elden Ring").platform).toBe("PS4");
  expect(game.normalizeAiJson({ title: "Bloodborne", platform: "PS4" }, "Bloodborne").platform).toBe("PS4");

  // ۴) انحصاری‌های ایکس‌باکس حتی بدون پسوند هم Xbox Offline می‌شوند
  expect(game.normalizeAiJson({ title: "Halo Infinite", platform: "PS5" }, "Halo Infinite").platform).toBe("Xbox Offline");
  expect(game.normalizeAiJson({ title: "Forza Horizon 5", platform: "PS5" }, "Forza Horizon 5").platform).toBe("Xbox Offline");

  // ۵) ترتیب منابع کاور: Xbox فقط استور Xbox؛ PS هرگز Xbox نمی‌بیند
  expect(cover.coverStepsFor("Xbox Offline")).toEqual(["xbox"]);
  expect(cover.coverStepsFor("PS5")).toEqual(["playstation", "steam-known", "steam-search", "rawg", "wikipedia", "duckduckgo", "bing", "google"]);
  expect(cover.coverStepsFor("PS4")).toEqual(cover.coverStepsFor("PS5"));
  expect(cover.coverStepsFor("PS5")).not.toContain("xbox");
});