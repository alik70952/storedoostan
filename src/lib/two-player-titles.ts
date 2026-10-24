// بازی‌هایی که روی یک کنسول و آفلاین دو نفره بازی می‌شوند (هم‌صفحه، اسپلیت‌اسکرین یا رودررو).
// منبع: تعداد بازیکن آفلاین در PlayStation Store (NO_OF_PLAYERS) + بررسی وب برای موارد حذف‌شده از استور.
// بازی‌های فقط-آنلاین عمداً اینجا نیستند (کنسول کپی‌خور آفلاین است).
// مقدار اولیه دسته «دو نفره» است؛ بعد از آن تیک پنل ادمین ملاک است. تطبیق با catalog.ts/normTitle.
export const TWO_PLAYER_TITLES = [
  // همکاری داستانی و پلتفرمر
  "A Way Out", "It Takes Two", "Split Fiction", "Brothers: A Tale of Two Sons", "Unravel Two", "Big Helmet Heroes",
  "Overcooked", "Overcooked 2", "Moving Out", "Moving Out 2", "Human: Fall Flat", "Gang Beasts",
  "Cuphead", "Rayman Legends", "LittleBigPlanet 3", "Sackboy: A Big Adventure", "Knack", "Knack 2",
  "Trine 2", "Trine 3", "Trine 4", "Trine Enchanted Edition", "Child of Light", "A Hat in Time",
  "Crash Bandicoot 4", "Sonic Mania", "Sonic Origins Plus", "Shovel Knight", "Guacamelee!", "Guacamelee! 2",
  "Enter the Gungeon", "The Binding of Isaac: Rebirth", "Broforce", "Terraria", "Don't Starve Together",
  "The Escapists 2", "Nikoderiko: The Magical World", "Starlink: Battle for Atlas",
  "Contra Anniversary Collection", "Contra: Operation Galuga", "Streets of Rage 4",
  "Teenage Mutant Ninja Turtles: Shredder's Revenge", "9 Monkeys of Shaolin", "Kung Fu Panda: Showdown of Legendary Legends",
  "Darksiders Genesis",
  // لگو
  "LEGO 2K Drive", "LEGO Batman 3", "LEGO Batman: Legacy of the Dark Knight", "LEGO City Undercover", "LEGO DC Super-Villains",
  "LEGO Harry Potter Collection", "LEGO Jurassic World", "LEGO Marvel Super Heroes", "LEGO Marvel Super Heroes 2", "LEGO Party!",
  "LEGO Star Wars: The Force Awakens", "LEGO Star Wars: The Skywalker Saga", "LEGO The Hobbit", "LEGO The Incredibles",
  "LEGO Voyagers", "The LEGO Ninjago Movie Video Game", "Minecraft",
  // نقش‌آفرینی و شوتر با کوآپ محلی
  "Borderlands 3", "Borderlands: The Handsome Collection", "Tiny Tina's Wonderlands", "Diablo II: Resurrected",
  "Diablo III: Eternal Collection", "Divinity: Original Sin", "Divinity: Original Sin 2", "Baldur's Gate 3",
  "Resident Evil 5", "Resident Evil 6", "Resident Evil Revelations 2", "Halo: The Master Chief Collection", "Gears 5",
  "Gears of War: Reloaded", "Star Wars Battlefront", "Plants vs. Zombies: Garden Warfare", "Plants vs. Zombies: Garden Warfare 2",
  "Plants vs. Zombies: Battle for Neighborville", "Plants vs. Zombies: Replanted",
  "Call of Duty: Ghosts", "Call of Duty: Advanced Warfare", "Call of Duty: Black Ops III", "Call of Duty: Infinite Warfare",
  "Call of Duty: WWII", "Call of Duty: Modern Warfare Remastered",
  // مبارزه‌ای
  "Brawlhalla", "Dragon Ball FighterZ", "Dragon Ball Xenoverse", "Dragon Ball Xenoverse 2", "Demon Slayer: The Hinokami Chronicles",
  "Injustice 2", "Injustice: Gods Among Us", "Jump Force", "Marvel vs. Capcom: Infinite", "Marvel vs. Capcom Fighting Collection",
  "Mortal Kombat X", "Mortal Kombat 11", "Mortal Kombat 1: Definitive Edition", "My Hero One's Justice", "My Hero One's Justice 2",
  "Naruto Shippuden: Ultimate Ninja Storm 4", "Naruto Shippuden: Ultimate Ninja Storm Trilogy", "One Piece: Pirate Warriors 3",
  "One Piece: Pirate Warriors 4", "Persona 4 Arena Ultimax", "Soulcalibur VI", "Street Fighter V", "Street Fighter 6",
  "Street Fighter 30th Anniversary Collection", "Tekken 7", "Tekken 8", "The King of Fighters XIV",
  "UFC", "UFC 2", "UFC 3", "UFC 4", "EA Sports UFC 6",
  // ورزشی
  "FIFA 14", "FIFA 15", "FIFA 16", "FIFA 17", "FIFA 18", "FIFA 19", "FIFA 20", "FIFA 21", "FIFA 22", "FIFA 23",
  "EA Sports FC 24", "EA SPORTS FC 25", "EA Sports FC 26", "EA SPORTS FC 27", "Fc 27", "Fc 27 ps4",
  "PES 2017", "PES 2018", "PES 2019", "eFootball PES 2020", "eFootball PES 2021", "eFootball 2024", "Winning Eleven 3: Final Ver.",
  "Captain Tsubasa: Rise of New Champions",
  "NBA 2K16", "NBA 2K17", "NBA 2K18", "NBA 2K19", "NBA 2K20", "NBA 2K21", "NBA 2K22", "NBA 2K23", "NBA 2K24", "NBA 2K25", "NBA 2K26",
  "WWE 2K16", "WWE 2K17", "WWE 2K18", "WWE 2K19", "WWE 2K20", "WWE 2K22", "WWE 2K23", "WWE 2K24", "WWE 2K26", "WWE 2K Battlegrounds",
  "Madden NFL 19", "Madden NFL 20", "Madden NFL 21", "Madden NFL 22", "Madden NFL 23", "Madden NFL 24",
  "MLB The Show 19", "MLB The Show 20", "MLB The Show 21", "MLB The Show 22", "MLB The Show 23", "MLB The Show 24",
  "Tennis World Tour 2", "TopSpin 2K25", "Spike Volleyball", "Everybody's Golf", "Olympic Games Tokyo 2020",
  "Just Dance 2020", "Just Dance 2021",
  // مسابقه‌ای با اسپلیت‌اسکرین
  "Crash Team Racing Nitro-Fueled", "Team Sonic Racing", "Sonic Racing: CrossWorlds", "Nickelodeon Kart Racers 2: Grand Prix",
  "DreamWorks All-Star Kart Racing", "Beach Buggy Racing", "Hot Wheels Unleashed", "Hot Wheels Unleashed 2",
  "Gran Turismo Sport", "Gran Turismo 7", "Dirt 5", "Gear.Club Unlimited 2",
  "F1 2016", "F1 2017", "F1 2018", "F1 2019", "F1 2020", "F1 2021", "F1 22", "F1 23", "F1 24",
  "MX vs ATV All Out", "MX vs ATV Legends", "Monster Jam Showdown", "Road Redemption", "Trials Fusion", "Trials Rising",
  "Rocket League",
  // مهمانی
  "Rabbids: Party of Legends", "PAW Patrol World",
  // تأییدشده با تعداد بازیکن آفلاین PlayStation Store (۲ نفر یا بیشتر)
  "Beyond: Two Souls", "Call of Duty: Vanguard", "Dreams", "God of War: Sons of Sparta", "Halo: Campaign Evolved",
  "Judgment", "Lost Judgment", "Quake", "Quake II", "REANIMAL", "RiMS Racing", "Shadow of the Ninja: Reborn",
  "Sonic Colors: Ultimate", "SpongeBob SquarePants: Battle for Bikini Bottom - Rehydrated", "Stardew Valley",
  "Star Wars Battlefront II", "Tales of Berseria", "Tales of Zestiria", "The Ascent", "The House of the Dead: Remake",
  "The Smurfs 2: The Prisoner of the Green Stone", "Yooka-Laylee",
  "WRC 5", "WRC 6", "WRC 7", "WRC 8", "WRC 9", "WRC 10", "WRC Generations",
  // حالت «Movie Night» دست‌به‌دست دسته، آفلاین
  "The Quarry", "The Dark Pictures Anthology: Little Hope", "The Dark Pictures: Little Hope", "The Dark Pictures: Man of Medan",
  "The Dark Pictures: House of Ashes", "The Dark Pictures: The Devil in Me",
];
