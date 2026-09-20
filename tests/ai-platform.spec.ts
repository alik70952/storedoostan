import { test, expect } from "@playwright/test";

test("قانون پسوند پلتفرم و ترتیب منابع کاور (واحدی، بدون اینترنت)", async () => {
  const game = await import("../src/lib/ai-game");
  const cover = await import("../src/lib/ai-cover");

  // ۱) جداسازی پسوندها و تمیز ماندن نام
  expect(game.splitPlatformSuffix("Halo Infinite xbox")).toEqual({ cleanName: "Halo Infinite", forced: "Xbox Offline" });
  expect(game.splitPlatformSuffix("Hi-Fi Rush ps5")).toEqual({ cleanName: "Hi-Fi Rush", forced: "PS5" });
  expect(game.splitPlatformSuffix("Hi-Fi Rush ps4")).toEqual({ cleanName: "Hi-Fi Rush", forced: "PS4" });
  expect(game.splitPlatformSuffix("Hi-Fi Rush (ps5)")).toEqual({ cleanName: "Hi-Fi Rush", forced: "PS5" });
  expect(game.splitPlatformSuffix("God of War Ragnarök")).toEqual({ cleanName: "God of War Ragnarök", forced: null });
  expect(game.splitPlatformSuffix("Xbox Series")).toEqual({ cleanName: "Xbox Series", forced: null });
  expect(game.splitPlatformSuffix("God of War Ragnarök ps5 extra")).toEqual({ cleanName: "God of War Ragnarök ps5 extra", forced: null });

  // ۲) پسوند تعیین‌کننده دسته است (حتی با پاسخ مدل، حتی با نام انحصاری)
  expect(game.normalizeAiJson({ title: "Hi-Fi Rush", platform: "Xbox Offline" }, "Hi-Fi Rush", { forced: "PS5" }).platform).toBe("PS5");
  expect(game.normalizeAiJson({ title: "God of War Ragnarök", platform: "PS5" }, "God of War Ragnarök", { forced: "Xbox Offline" }).platform).toBe("Xbox Offline");
  expect(game.normalizeAiJson({ title: "God of War Ragnarök", platform: "PS5" }, "God of War Ragnarök", { forced: "PS4" }).platform).toBe("PS4");
  expect(game.normalizeAiJson({ title: "Elden Ring", platform: "PS5, PS4, Xbox" }, "Elden Ring", { forced: null }).platform).toBe("PS4");
  expect(game.normalizeAiJson({ title: "Elden Ring", platform: "XBOX" }, "Elden Ring", { forced: null }).platform).toBe("PS5");

  // ۳) بدون پسوند: انحصاری‌های واقعی Xbox همچنان Xbox Offline می‌شوند
  expect(game.normalizeAiJson({ title: "Halo Infinite", platform: "PS5" }, "Halo Infinite", { forced: null }).platform).toBe("Xbox Offline");
  expect(game.normalizeAiJson({ title: "Forza Horizon 5", platform: "PS5" }, "Forza Horizon 5", { forced: null }).platform).toBe("Xbox Offline");

  // ۴) سازگاری با API قدیمی forceXbox
  expect(game.normalizeAiJson({ title: "Hi-Fi Rush", platform: "Xbox Offline" }, "Hi-Fi Rush", { forceXbox: true }).platform).toBe("Xbox Offline");
  expect(game.normalizeAiJson({ title: "Hi-Fi Rush", platform: "Xbox Offline" }, "Hi-Fi Rush", { forceXbox: true }).forceXbox).toBe(true);

  // ۵) ترتیب منابع کاور
  expect(cover.coverStepsFor("Xbox Offline")).toEqual(["xbox"]);
  const ps5Steps = cover.coverStepsFor("PS5");
  expect(ps5Steps).toEqual(["playstation", "p30day", "downloadha", "steam-known", "steam-search", "rawg", "wikipedia", "duckduckgo", "bing", "google"]);
  expect(cover.coverStepsFor("PS4")).toEqual(ps5Steps);
  expect(ps5Steps).not.toContain("xbox");
  expect(ps5Steps.indexOf("p30day")).toBeLessThan(ps5Steps.indexOf("google"));
});