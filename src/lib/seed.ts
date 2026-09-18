import type { Game, GameInput } from "./types";

type SeedEntry = { title: string; titleFa: string; platform: Game["platform"]; genre: string; cover: string; description: string; featured?: boolean };

const entries: SeedEntry[] = [
  { title: "God of War Ragnarök", titleFa: "خدای جنگ: راگناروک", platform: "PS5", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/2322010/library_600x900.jpg", description: "سفر کریتوس و آترئوس در دنیاهای نورس پیش از پایان روزها؛ یکی از زیباترین ماجراجویی‌های پلی‌استیشن ۵.", featured: true },
  { title: "Elden Ring", titleFa: "الدن رینگ", platform: "PS5", genre: "نقش‌آفرینی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_600x900.jpg", description: "دنیای باز بی‌مانند فروم‌سافت در سرزمین میانی؛ چالش، کشف و داستانی فراموش‌نشدنی.", featured: true },
  { title: "Marvel's Spider-Man 2", titleFa: "اسپایدرمن ۲", platform: "PS5", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/2651280/library_600x900.jpg", description: "پیتر و مایلز کنار هم در شهر نیویورک؛ سرعت، تاربازی و داستانی هیجان‌انگیز روی PS5.", featured: true },
  { title: "Horizon Forbidden West", titleFa: "افق: غرب ممنوعه", platform: "PS5", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/2420110/library_600x900.jpg", description: "آلوئی در سرزمین‌های غرب ممنوعه در برابر ماشین‌های عظیم و رازهای باستانی می‌جنگد." },
  { title: "Ghost of Tsushima Director's Cut", titleFa: "روح شیماتسو", platform: "PS5", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/2215430/library_600x900.jpg", description: "نبرد سامورایی جین سایکای در برابر حمله مغول‌ها؛ با گرافیک خیره‌کننده و فضای شاعرانه." },
  { title: "Ratchet & Clank: Rift Apart", titleFa: "راکت و کلنک: جدایی", platform: "PS5", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1812870/library_600x900.jpg", description: "پرش میان دنیاها با SSD پلی‌استیشن ۵؛ نمایش واقعی قدرت کنسول نسل جدید." },
  { title: "Returnal", titleFa: "ریتورنال", platform: "PS5", genre: "ترس و بقا", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1649240/library_600x900.jpg", description: "چرخه بی‌پایان مرگ و بازگشت سیلی در سیاره‌ای بیگانه؛ شوتر روگولایت نفس‌گیر." },
  { title: "The Last of Us Part I", titleFa: "آخرین بازمانده از ما - قسمت اول", platform: "PS5", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1888930/library_600x900.jpg", description: "بازسازی کامل شاهکار ناتی داگ با گرافیک بازطراحی‌شده برای پلی‌استیشن ۵." },
  { title: "Gran Turismo 7", titleFa: "گرن توریسمو ۷", platform: "PS5", genre: "مسابقه‌ای", cover: "https://upload.wikimedia.org/wikipedia/en/1/14/Gran_Turismo_7_cover_art.jpg", description: "جامع‌ترین تجربه شبیه‌ساز رانندگی پلی‌استیشن با صدها خودرو و مسیر." },
  { title: "Demon's Souls Remake", titleFa: "شیاطین روح", platform: "PS5", genre: "نقش‌آفرینی", cover: "https://upload.wikimedia.org/wikipedia/en/1/11/Demons_Souls_remake_cover_art.jpg", description: "بازسازی خیره‌کننده اولین بازی سولزلایک جهان، انحصاری پلی‌استیشن ۵." },
  { title: "God of War (2018)", titleFa: "خدای جنگ ۲۰۱۸", platform: "PS4", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1593500/library_600x900.jpg", description: "آغاز سفر کریتوس و پسرش در اساطیر نورس؛ برنده جوایز متعدد بهترین بازی سال." },
  { title: "Marvel's Spider-Man Remastered", titleFa: "اسپایدرمن بازسازی‌شده", platform: "PS4", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1817070/library_600x900.jpg", description: "ماجراجویی تارانداز محبوب با گرافیک بهبودیافته روی پلی‌استیشن ۴." },
  { title: "Horizon Zero Dawn", titleFa: "افق: سپیده‌دم صفر", platform: "PS4", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1151640/library_600x900.jpg", description: "جهانی پسااکتشافی با ماشین‌های وحشی و داستانی جذاب از استودیو گوریلا." },
  { title: "The Last of Us Part II", titleFa: "آخرین بازمانده از ما - قسمت دوم", platform: "PS4", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/2531310/library_600x900.jpg", description: "ادامه داستانی تأثیرگذار الی و جوئل در دنیایی پساآپوکالیپتیک." },
  { title: "Death Stranding", titleFa: "دث استرندینگ", platform: "PS4", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1190460/library_600x900.jpg", description: "اثر متفاوت هیدئو کوجیما؛ اتصال دوباره دنیایی تکه‌تکه‌شده." },
  { title: "Bloodborne", titleFa: "بلادبورن", platform: "PS4", genre: "نقش‌آفرینی", cover: "https://upload.wikimedia.org/wikipedia/en/6/68/Bloodborne_Cover_Wallpaper.jpg", description: "شکارچیان شهر یارنام در تاریکی گوتیک؛ یکی از سخت‌ترین و دوست‌داشتنی‌ترین انحصاری‌های PS4." },
  { title: "Persona 5 Royal", titleFa: "پرسونا ۵ رویال", platform: "PS4", genre: "نقش‌آفرینی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1687950/library_600x900.jpg", description: "دزدانی با قلب‌های ماسک‌دار در توکیو؛ صد ساعت نقش‌آفرینی پرجزئیات و پرانرژی." },
  { title: "Days Gone", titleFa: "دیز گان", platform: "PS4", genre: "ترس و بقا", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1259420/library_600x900.jpg", description: "زنده‌ماندن دیکن سنت‌جان در میان دریای زامبی‌های شمال غرب آمریکا." },
  { title: "EA SPORTS FC 25", titleFa: "فوتبال EA اسپورتس ۲۰۲۵", platform: "PS5", genre: "ورزشی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/2669320/library_600x900.jpg", description: "جدیدترین نسخه فوتبال شرکت EA با تیم‌های محبوب و حالت‌های حرفه‌ای." },
  { title: "FIFA 23", titleFa: "فیفا ۲۳", platform: "PS4", genre: "ورزشی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1811260/library_600x900.jpg", description: "آخرین نسخه با نام فیفا، همراه با جام جهانی قطر و گیم‌پلی روان." }
];

export const seedGames: Game[] = entries.map((entry, index) => {
  const input: GameInput = {
    title: entry.title,
    titleFa: entry.titleFa,
    platform: entry.platform,
    genre: entry.genre,
    cover: entry.cover,
    description: entry.description,
    featured: entry.featured ?? false
  };
  const createdAt = new Date(Date.now() - (entries.length - index) * 86400000).toISOString();
  return { ...input, id: `seed-${entry.platform.toLowerCase()}-${index + 1}`, createdAt, updatedAt: createdAt };
});