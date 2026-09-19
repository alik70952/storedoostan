import type { Game, GameInput } from "./types";

type SeedEntry = { title: string; titleFa: string; platform: Game["platform"]; genre: string; cover: string; description: string; featured?: boolean };

const entries: SeedEntry[] = [
  { title: "God of War Ragnarök", titleFa: "خدای جنگ: راگناروک", platform: "PS5", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/2322010/library_600x900.jpg", description: "نسخه کپی‌خور خدای جنگ راگناروک برای PS5 — نصب آفلاین و اجرای تضمینی بدون نیاز به اینترنت. سفر حماسی کریتوس و آترئوس در دنیاهای نورس با دوبله و زیرنویس فارسی در فروشگاه دوستان.", featured: true },
  { title: "Elden Ring", titleFa: "الدن رینگ", platform: "PS5", genre: "نقش‌آفرینی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_600x900.jpg", description: "نسخه کپی‌خور الدن رینگ برای PS5 — دنیای باز بی‌مانند فروم‌سافتور در سرزمین میانی؛ نصب آفلاین با تمام آپدیت‌ها و بسته الحاقی در فروشگاه دوستان.", featured: true },
  { title: "Marvel's Spider-Man 2", titleFa: "اسپایدرمن ۲", platform: "PS5", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/2651280/library_600x900.jpg", description: "نسخه کپی‌خور مرد عنکبوتی ۲ برای PS5 — پیتر پارکر و مایلز مورالز کنار هم در نیویورک؛ نصب آفلاین و اجرای روان با گرافیک نسل نهمی.", featured: true },
  { title: "Horizon Forbidden West", titleFa: "افق: غرب ممنوعه", platform: "PS5", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/2420110/library_600x900.jpg", description: "نسخه کپی‌خور هورایزن غرب ممنوعه برای PS5 — ماجراجویی ایلوی در سرزمین‌های غرب با ماشین‌های عظیم؛ نصب آفلاین در فروشگاه دوستان." },
  { title: "Ghost of Tsushima Director's Cut", titleFa: "روح سوشیما", platform: "PS5", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/2215430/library_600x900.jpg", description: "نسخه کپی‌خور گوست آو سوشیما دایرکتورز کات برای PS5 — نبرد سامورایی جین ساکای با گرافیک خیره‌کننده و جزیره ایکی؛ نصب آفلاین." },
  { title: "Ratchet & Clank: Rift Apart", titleFa: "راکت و کلنک: جدایی", platform: "PS5", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1812870/library_600x900.jpg", description: "پرش میان دنیاها با SSD پلی‌استیشن ۵؛ نمایش واقعی قدرت کنسول نسل جدید." },
  { title: "Returnal", titleFa: "ریتورنال", platform: "PS5", genre: "ترس و بقا", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1649240/library_600x900.jpg", description: "چرخه بی‌پایان مرگ و بازگشت سیلی در سیاره‌ای بیگانه؛ شوتر روگولایت نفس‌گیر." },
  { title: "The Last of Us Part I", titleFa: "آخرین بازمانده از ما - قسمت اول", platform: "PS5", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1888930/library_600x900.jpg", description: "بازسازی کامل شاهکار ناتی داگ با گرافیک بازطراحی‌شده برای پلی‌استیشن ۵." },
  { title: "Gran Turismo 7", titleFa: "گرن توریسمو ۷", platform: "PS5", genre: "مسابقه‌ای", cover: "https://upload.wikimedia.org/wikipedia/en/1/14/Gran_Turismo_7_cover_art.jpg", description: "جامع‌ترین تجربه شبیه‌ساز رانندگی پلی‌استیشن با صدها خودرو و مسیر." },
  { title: "Demon's Souls Remake", titleFa: "شیاطین روح", platform: "PS5", genre: "نقش‌آفرینی", cover: "https://upload.wikimedia.org/wikipedia/en/1/11/Demons_Souls_remake_cover_art.jpg", description: "بازسازی خیره‌کننده اولین بازی سولزلایک جهان، انحصاری پلی‌استیشن ۵." },
  { title: "God of War (2018)", titleFa: "خدای جنگ ۲۰۱۸", platform: "PS4", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1593500/library_600x900.jpg", description: "نسخه کپی‌خور خدای جنگ ۲۰۱۸ برای PS4 — آغاز سفر کریتوس و آترئوس در اساطیر نورس؛ برنده جایزه بهترین بازی سال با نصب آفلاین در فروشگاه دوستان." },
  { title: "Marvel's Spider-Man Remastered", titleFa: "اسپایدرمن", platform: "PS4", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1817070/library_600x900.jpg", description: "نسخه کپی‌خور مرد عنکبوتی برای PS4 — تاب‌خوردن در آسمان نیویورک با گرافیک بهبودیافته؛ نصب آفلاین و اجرای تضمینی." },
  { title: "Horizon Zero Dawn", titleFa: "افق: سپیده‌دم صفر", platform: "PS4", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1151640/library_600x900.jpg", description: "نسخه کپی‌خور هورایزن زیرو داون برای PS4 — دنیای پساآخرالزمانی با ماشین‌های وحشی؛ نصب آفلاین در فروشگاه دوستان." },
  { title: "The Last of Us Part II", titleFa: "آخرین بازمانده از ما ۲", platform: "PS4", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/2531310/library_600x900.jpg", description: "نسخه کپی‌خور لست آو آس پارت ۲ برای PS4 — ادامه داستان تأثیرگذار الی؛ نصب آفلاین با تمام آپدیت‌ها." },
  { title: "Death Stranding", titleFa: "دث استرندینگ", platform: "PS4", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1190460/library_600x900.jpg", description: "اثر متفاوت هیدئو کوجیما؛ اتصال دوباره دنیایی تکه‌تکه‌شده." },
  { title: "Bloodborne", titleFa: "بلادبورن", platform: "PS4", genre: "نقش‌آفرینی", cover: "https://upload.wikimedia.org/wikipedia/en/6/68/Bloodborne_Cover_Wallpaper.jpg", description: "شکارچیان شهر یارنام در تاریکی گوتیک؛ یکی از سخت‌ترین و دوست‌داشتنی‌ترین انحصاری‌های PS4." },
  { title: "Persona 5 Royal", titleFa: "پرسونا ۵ رویال", platform: "PS4", genre: "نقش‌آفرینی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1687950/library_600x900.jpg", description: "دزدانی با قلب‌های ماسک‌دار در توکیو؛ صد ساعت نقش‌آفرینی پرجزئیات و پرانرژی." },
  { title: "Days Gone", titleFa: "دیز گان", platform: "PS4", genre: "ترس و بقا", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1259420/library_600x900.jpg", description: "زنده‌ماندن دیکن سنت‌جان در میان دریای زامبی‌های شمال غرب آمریکا." },
  { title: "EA SPORTS FC 25", titleFa: "فوتبال EA اسپورتس ۲۰۲۵", platform: "PS5", genre: "ورزشی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/2669320/library_600x900.jpg", description: "نسخه کپی‌خور FC 25 برای PS5 — جدیدترین فوتبال EA با تیم‌های به‌روز و حالت آلتیمیت تیم؛ نصب آفلاین در فروشگاه دوستان." },
  { title: "FIFA 23", titleFa: "فیفا ۲۳", platform: "PS4", genre: "ورزشی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1811260/library_600x900.jpg", description: "نسخه کپی‌خور فیفا ۲۳ برای PS4 — آخرین فیفا با جام جهانی قطر و گیم‌پلی روان؛ نصب آفلاین." },
  { title: "Halo: The Master Chief Collection", titleFa: "هیلو: مجموعه مستر چیف", platform: "Xbox Offline", genre: "شوتر", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1358820/library_600x900.jpg", description: "مجموعه کامل حماسه مستر چیف؛ شش بازی افسانه‌ای شوتر اول‌شخص با داستان حماسی و نبردهای نفس‌گیر، ویژه اجرای آفلاین روی Xbox.", featured: true },
  { title: "Forza Horizon 5", titleFa: "فورتزا هورایزن ۵", platform: "Xbox Offline", genre: "مسابقه‌ای", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/library_600x900.jpg", description: "بزرگ‌ترین فستیوال اتومبیل‌رانی جهان در مکزیک؛ صدها خودرو، آب‌وهوای پویا و جاده‌های بی‌پایان برای تجربه آفلاین روی Xbox.", featured: true },
  { title: "Gears 5", titleFa: "گیرز ۵", platform: "Xbox Offline", genre: "شوتر", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1097840/library_600x900.jpg", description: "حماسه کیت دیاز در برابر ازدحام لوکاست‌ها؛ کمپین داستانی عمیق و حالت فرار هیجانی، مناسب اجرای آفلاین." },
  { title: "Red Dead Redemption 2", titleFa: "رد دد ریدمپشن ۲", platform: "Xbox Offline", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/library_600x900.jpg", description: "غرب وحشی در اوج شکوه؛ داستان آرتور مورگان و باند داچ، با دنیایی زنده و جزئیات خیره‌کننده برای بازی آفلاین." },
  { title: "Starfield", titleFa: "استارفیلد", platform: "Xbox Offline", genre: "نقش‌آفرینی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/library_600x900.jpg", description: "ماجراجویی فضایی بتسدا میان هزاران سیاره؛ کاوش، تجارت و نبردهای فضایی در بزرگ‌ترین دنیای نقش‌آفرینی Xbox." },
  { title: "Sea of Thieves", titleFa: "دریای دزدان", platform: "Xbox Offline", genre: "اکشن و ماجراجویی", cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/1172620/library_600x900.jpg", description: "دزدان دریایی در دنیای باز اقیانوسی؛ گنج‌یابی، نبرد کشتی‌ها و ماجراجویی‌های جزیره‌ای برای اجرای آفلاین." }
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