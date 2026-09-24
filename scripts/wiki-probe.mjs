// probe: پاسخ API ویکی‌پدیا برای عنوان‌های مشکل‌دار (کاور رسمی PS4)
const titles = process.argv.slice(2);
for (const title of titles) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2" +
    `&generator=search&gsrsearch=${encodeURIComponent(`intitle:"${title}" video game`)}&gsrlimit=6` +
    "&prop=pageimages&piprop=original%7Cthumbnail&pithumbsize=800&pilicense=any";
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } });
    const json = await res.json();
    console.log(`== ${title} (status ${res.status})`);
    const pages = json.query?.pages ?? [];
    if (!pages.length) console.log("   (بدون نتیجه)");
    for (const p of pages) {
      console.log(
        `   title=${JSON.stringify(p.title)} original=${p.original?.source?.slice(0, 80) ?? "-"} thumb=${p.thumbnail?.source?.slice(0, 60) ?? "-"}`
      );
    }
  } catch (err) {
    console.log(`== ${title} → خطا: ${err.message}`);
  }
}
