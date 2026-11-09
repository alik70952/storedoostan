// بازی‌های پرطرفدار PS4 به ترتیب محبوبیت (درخواست مدیر فروشگاه، آبان ۱۴۰۵): در تب PS4 با مرتب‌سازی
// پیش‌فرض «جدیدترین» این‌ها اول لیست می‌آیند و بقیه بعدشان به همان ترتیب قبلی.
// تطبیق با نام انگلیسی (یا فارسی) نرمال‌شده است؛ چند نام برای یک بازی (مثل نسخه Remastered) با | جدا شده.
const POPULAR_PS4 = [
  "Grand Theft Auto V|GTA V|Grand Theft Auto V Premium Edition",
  "Red Dead Redemption 2",
  "Mortal Kombat 11|Mortal Kombat 11 Ultimate",
  "Resident Evil 4|Resident Evil 4 Remake|رزیدنت اویل ۴|رزیدنت اویل ۴ ریمیک",
  "Fc 27 ps4|EA SPORTS FC 27|Fc 27", // تازه برای PS4 آمده (از پنل ادمین با نام «Fc 27 ps4»)
  "God of War|God of War (2018)",
  "God of War Ragnarök",
  "Marvel's Spider-Man|Marvel's Spider-Man Remastered",
  "Marvel's Spider-Man: Miles Morales",
  "The Last of Us Part II",
  "The Last of Us Remastered",
  "Uncharted 4: A Thief's End",
  "Ghost of Tsushima|Ghost of Tsushima Director's Cut",
  "FIFA 23",
  "eFootball PES 2021|eFootball PES 2020",
  "Call of Duty: Black Ops 6",
  "Call of Duty: Modern Warfare III",
  "Call of Duty: Modern Warfare II",
  "Call of Duty: Black Ops Cold War",
  "Hogwarts Legacy",
  "Horizon Zero Dawn",
  "Horizon Forbidden West",
  "Days Gone",
  "Resident Evil Village",
  "Resident Evil 2",
  "Resident Evil 3",
  "Resident Evil 7|Resident Evil 7: Biohazard",
  "Mortal Kombat XL|Mortal Kombat X",
  "Injustice 2",
  "Tekken 7",
  "UFC 4",
  "WWE 2K25|WWE 2K24",
  "NBA 2K26|NBA 2K25",
  "Need for Speed Heat",
  "Need for Speed Unbound",
  "Need for Speed Payback",
  "It Takes Two",
  "A Way Out",
  "Overcooked! All You Can Eat|Overcooked 2",
  "Crash Bandicoot N. Sane Trilogy",
  "Crash Bandicoot 4|Crash Bandicoot 4: It's About Time",
  "Crash Team Racing Nitro-Fueled",
  "Minecraft",
  "Elden Ring",
  "Sekiro: Shadows Die Twice",
  "Batman: Arkham Knight",
  "Assassin's Creed Valhalla",
  "Assassin's Creed Odyssey",
  "Assassin's Creed Origins",
  "Far Cry 5",
  "Far Cry 6",
  "Cyberpunk 2077",
  "The Witcher 3: Wild Hunt",
  "Detroit: Become Human",
  "Dying Light 2 Stay Human",
  "Mafia: Definitive Edition",
  "Grand Theft Auto: San Andreas",
  "Grand Theft Auto: Vice City",
  "Red Dead Redemption",
  "Hitman 3|Hitman World of Assassination",
  "Battlefield 1",
  "Battlefield V",
  "Star Wars Jedi: Fallen Order",
  "Devil May Cry 5",
  "Naruto Shippuden: Ultimate Ninja Storm 4",
  "Dragon Ball FighterZ",
  "Metal Gear Solid V: The Phantom Pain",
  "Gran Turismo 7|Gran Turismo Sport",
  "Death Stranding",
  "Bloodborne",
  "Until Dawn",
];

export function normPopularTitle(value: string): string {
  return value
    .replace(/\(\s*\d{4}\s*\)/g, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ""); // فاصله، نیم‌فاصله و علامت‌ها حذف؛ حروف فارسی می‌مانند
}

const RANK = new Map<string, number>();
POPULAR_PS4.forEach((names, i) => names.split("|").forEach((n) => RANK.has(normPopularTitle(n)) || RANK.set(normPopularTitle(n), i)));

/** جایگاه محبوبیت (۰ = پرطرفدارترین) با نام انگلیسی یا فارسی؛ ۹۹۹۹ برای بازی‌های خارج از لیست */
export function ps4PopularRank(title: string, titleFa = ""): number {
  return Math.min(RANK.get(normPopularTitle(title)) ?? 9999, RANK.get(normPopularTitle(titleFa)) ?? 9999);
}
