// بررسی دسترسی به API استور پلی‌استیشن (منبع اول کاور رسمی PS4)
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const res = await fetch("https://store.playstation.com/en-us/search/bloodborne", {
  headers: { "User-Agent": UA, Accept: "text/html" },
});
const html = await res.text();
console.log("search page:", res.status, html.length, "bytes");

const chunks = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1]);
console.log("chunk scripts found:", chunks.length);

for (const chunk of chunks.slice(0, 8)) {
  const js = await (await fetch(`https://store.playstation.com${chunk}`, { headers: { "User-Agent": UA } })).text();
  const hasName = js.includes("searchStore");
  const hash = /sha256Hash"\s*:\s*"([a-f0-9]{64})/.exec(js)?.[1] ?? null;
  console.log(`  ${chunk.slice(-28)} len=${js.length} searchStore=${hasName} hash=${hash ? hash.slice(0, 12) : "-"}`);
}
