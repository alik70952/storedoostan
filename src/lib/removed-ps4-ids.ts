// PS4 rows not in the Bale channel (or duplicates) — removed 1405/08/03; full rows backed up in data/removed-games-backup.json
export const REMOVED_PS4_IDS = [
  "ps4-cat-500", // Mortal Shell
  "ps4-cat-499", // Lords of the Fallen
  "ps4-cat-498", // The Surge 2
  "ps4-cat-496", // Remnant: From the Ashes
  "ps4-cat-491", // Borderlands: The Handsome Collection
  "ps4-cat-490", // Tales from the Borderlands
  "ps4-cat-489", // Batman: The Enemy Within
  "ps4-cat-488", // Batman: The Telltale Series
  "ps4-cat-482", // The Dark Pictures: The Devil in Me
  "ps4-cat-481", // The Dark Pictures: House of Ashes
  "ps4-cat-480", // The Dark Pictures: Little Hope
  "ps4-cat-479", // The Dark Pictures: Man of Medan
  "ps4-cat-478", // Plants vs. Zombies: Battle for Neighborville
  "ps4-cat-477", // Plants vs. Zombies: Garden Warfare 2
  "ps4-cat-476", // Plants vs. Zombies: Garden Warfare
  "ps4-cat-475", // Apex Legends
  "ps4-cat-474", // Titanfall 2
  "ps4-cat-473", // Battlefield 2042
  "ps4-cat-463", // Call of Duty: Modern Warfare 2 Campaign Remastered
  "ps4-cat-461", // Call of Duty: Black Ops 4
  "ps4-cat-454", // Destiny 2
  "4a2b006e-3d4d-43f2-b89c-c0bcd70f54fc", // NBA 2K26
  "ps4-cat-453", // Destiny
  "ps4-cat-452", // Warframe
  "ps4-cat-451", // Brawlhalla
  "ps4-cat-450", // Among Us
  "ps4-cat-449", // Fall Guys
  "ps4-cat-447", // Gang Beasts
  "ps4-cat-441", // Moving Out 2
  "ps4-cat-440", // Moving Out
  "ps4-cat-437", // Payday 2
  "ps4-cat-433", // Dead by Daylight
  "ps4-cat-432", // Friday the 13th: The Game
  "ps4-cat-431", // Layers of Fear 2
  "7885b19a-fc2f-4d22-beeb-1141b8728852", // Horizon forbidden west
  "ps4-cat-430", // Layers of Fear
  "ps4-cat-429", // SOMA
  "ps4-cat-422", // Deathloop
  "ps4-cat-420", // Dishonored 2
  "ps4-cat-418", // Prey
  "ps4-cat-416", // Quake II
  "ps4-cat-415", // Quake
  "ps4-cat-410", // Wolfenstein: The Old Blood
  "ps4-cat-408", // Sniper Ghost Warrior Contracts 2
  "ps4-cat-405", // Sniper Elite 5
  "ps4-cat-402", // Hitman World of Assassination
  "ps4-cat-401", // Hitman 3
  "ps4-cat-398", // Metal Gear Survive
  "ps4-cat-395", // Darksiders Genesis
  "ps4-cat-394", // Darksiders III
  "ps4-cat-393", // Darksiders II Deathinitive Edition
  "ps4-cat-391", // Prototype 2
  "ps4-cat-386", // Saints Row
  "ps4-cat-385", // Saints Row: Gat out of Hell
  "ps4-cat-384", // Saints Row IV
  "ps4-cat-383", // Bully
  "ps4-cat-377", // Sifu
  "ps4-cat-376", // Dragon's Dogma: Dark Arisen
  "ps4-cat-375", // Okami HD
  "ps4-cat-374", // Onimusha: Warlords
  "ps4-cat-373", // Mega Man 11
  "ps4-cat-372", // Mega Man Legacy Collection 2
  "ps4-cat-371", // Mega Man Legacy Collection
  "ps4-cat-370", // Marvel vs. Capcom Fighting Collection
  "ps4-cat-364", // Resident Evil Code: Veronica X
  "ps4-cat-363", // Resident Evil Umbrella Corps
  "ps4-cat-362", // Resident Evil Operation Raccoon City
  "ps4-cat-361", // Resident Evil Resistance
  "ps4-cat-359", // Resident Evil Revelations
  "ps4-cat-357", // Resident Evil 7
  "ps4-cat-348", // Dead Rising 3
  "ps4-cat-347", // Dead Rising 2: Off the Record
  "ps4-cat-346", // Dead Rising 2
  "ps4-cat-345", // Dead Rising
  "ps4-cat-343", // Dead Island Definitive Edition
  "ps4-cat-342", // Dying Light 2 Stay Human
  "ps4-cat-341", // Dying Light
  "ps4-cat-339", // Skull and Bones
  "ps4-cat-337", // Starlink: Battle for Atlas
  "ps4-cat-336", // Avatar: Frontiers of Pandora
  "ps4-cat-333", // Trials Rising
  "ps4-cat-331", // South Park: The Fractured but Whole
  "ps4-cat-330", // South Park: The Stick of Truth
  "ps4-cat-329", // The Crew Motorfest
  "ps4-cat-328", // Rainbow Six Extraction
  "ps4-cat-327", // Rainbow Six Siege
  "ps4-cat-326", // Ghost Recon Breakpoint
  "ps4-cat-324", // The Division 2
  "ps4-cat-323", // Tom Clancy's The Division
  "ps4-cat-320", // Watch Dogs
  "ps4-cat-319", // Far Cry 6
  "ps4-cat-315", // Far Cry 4
  "ps4-cat-305", // Assassin's Creed IV: Black Flag
  "ps4-cat-304", // Mount & Blade II: Bannerlord
  "ps4-cat-303", // Kingdom Come: Deliverance
  "ps4-cat-301", // The Elder Scrolls Online
  "ps4-cat-299", // Fallout Shelter
  "ps4-cat-298", // Fallout 76
  "ps4-cat-295", // Wasteland 2
  "ps4-cat-294", // Pillars of Eternity II
  "ps4-cat-293", // Pillars of Eternity
  "ps4-cat-292", // Divinity: Original Sin 2
  "ps4-cat-291", // Divinity: Original Sin
  "ps4-cat-290", // Path of Exile
  "ps4-cat-289", // Torchlight III
  "ps4-cat-288", // Torchlight II
  "ps4-cat-287", // Diablo IV
  "ps4-cat-286", // Diablo II: Resurrected
  "ps4-cat-284", // Civilization VI
  "ps4-cat-283", // XCOM 2
  "ps4-cat-282", // Deadpool
  "ps4-cat-281", // Marvel's Midnight Suns
  "ps4-cat-279", // Marvel's Guardians of the Galaxy
  "ps4-cat-278", // Suicide Squad: Kill the Justice League
  "ps4-cat-277", // Batman: Arkham VR
  "ps4-cat-272", // Middle-earth: Shadow of Mordor
  "ps4-cat-263", // LEGO Marvel Super Heroes
  "ps4-cat-262", // LEGO Star Wars: The Skywalker Saga
  "ps4-cat-261", // Star Wars: Republic Commando
  "ps4-cat-259", // Star Wars Jedi: Survivor
  "ps4-cat-257", // Star Wars Battlefront II
  "ps4-cat-256", // Star Wars Battlefront
  "ps4-cat-255", // Mass Effect Legendary Edition
  "ps4-cat-254", // Dragon Age: Inquisition
  "ps4-cat-252", // Two Point Hospital
  "ps4-cat-251", // Planet Coaster
  "ps4-cat-250", // Jurassic World Evolution
  "ps4-cat-248", // Don't Starve Together
  "ps4-cat-247", // Don't Starve
  "ps4-cat-246", // Stardew Valley
  "ps4-cat-244", // Terraria
  "ps4-cat-243", // The Escapists 2
  "ps4-cat-242", // The Escapists
  "ps4-cat-241", // The Swapper
  "ps4-cat-240", // The Talos Principle
  "ps4-cat-239", // The Witness
  "ps4-cat-238", // Fez
  "ps4-cat-237", // Owlboy
  "ps4-cat-236", // Shantae and the Pirate's Curse
  "ps4-cat-235", // Shantae: Half-Genie Hero
  "ps4-cat-234", // Guacamelee! 2
  "ps4-cat-233", // Guacamelee!
  "ps4-cat-232", // Broforce
  "ps4-cat-231", // Trine 4
  "ps4-cat-230", // Trine 3
  "ps4-cat-229", // Trine 2
  "ps4-cat-228", // Trine Enchanted Edition
  "ps4-cat-226", // Flower
  "ps4-cat-225", // Abzu
  "ps4-cat-224", // Journey
  "ps4-cat-220", // Little Nightmares
  "ps4-cat-219", // A Hat in Time
  "ps4-cat-218", // The Binding of Isaac: Rebirth
  "ps4-cat-217", // Enter the Gungeon
  "ps4-cat-216", // Hades
  "ps4-cat-215", // Dead Cells
  "ps4-cat-214", // Ori and the Will of the Wisps
  "ps4-cat-213", // Ori and the Blind Forest
  "ps4-cat-212", // Hollow Knight
  "ps4-cat-211", // Celeste
  "ps4-cat-210", // Cuphead
  "ps4-cat-209", // Shovel Knight
  "ps4-cat-208", // Yooka-Laylee and the Impossible Lair
  "ps4-cat-207", // Yooka-Laylee
  "ps4-cat-205", // Spyro Reignited Trilogy
  "ps4-cat-196", // Hot Wheels Unleashed 2
  "ps4-cat-193", // Need for Speed Unbound
  "ps4-cat-190", // Need for Speed
  "ps4-cat-188", // The Crew 2
  "ps4-cat-187", // The Crew
  "ps4-cat-184", // Assetto Corsa
  "ps4-cat-183", // Project CARS 3
  "ps4-cat-182", // Project CARS 2
  "ps4-cat-181", // Project CARS
  "ps4-cat-180", // WRC Generations
  "ps4-cat-178", // WRC 9
  "ps4-cat-177", // WRC 8
  "ps4-cat-176", // WRC 7
  "ps4-cat-175", // WRC 6
  "ps4-cat-174", // WRC 5
  "ps4-cat-172", // Dirt 4
  "ps4-cat-170", // Dirt Rally
  "ps4-cat-169", // F1 24
  "ps4-cat-167", // F1 22
  "ps4-cat-166", // F1 2021
  "ps4-cat-165", // F1 2020
  "ps4-cat-163", // F1 2018
  "ps4-cat-162", // F1 2017
  "ps4-cat-161", // F1 2016
  "ps4-cat-160", // F1 2015
  "ps4-cat-159", // MLB The Show 24
  "ps4-cat-158", // MLB The Show 23
  "ps4-cat-157", // MLB The Show 22
  "ps4-cat-156", // MLB The Show 21
  "ps4-cat-155", // MLB The Show 20
  "ps4-cat-154", // MLB The Show 19
  "ps4-cat-153", // Madden NFL 24
  "ps4-cat-152", // Madden NFL 23
  "ps4-cat-151", // Madden NFL 22
  "ps4-cat-150", // Madden NFL 21
  "ps4-cat-149", // Madden NFL 20
  "ps4-cat-148", // Madden NFL 19
  "ps4-cat-145", // NBA 2K22
  "ps4-cat-144", // NBA 2K21
  "ps4-cat-142", // NBA 2K19
  "ps4-cat-141", // NBA 2K18
  "ps4-cat-140", // NBA 2K17
  "ps4-cat-139", // NBA 2K16
  "ps4-cat-137", // PES 2018
  "ps4-cat-136", // PES 2017
  "seed-ps4-17", // Persona 5 Royal
  "ps4-cat-130", // FIFA 19
  "ps4-cat-128", // FIFA 17
  "ps4-cat-127", // FIFA 16
  "ps4-cat-126", // FIFA 15
  "ps4-cat-125", // FIFA 14
  "ps4-cat-124", // EA Sports FC 26
  "ps4-cat-119", // UFC 2
  "ps4-cat-118", // UFC
  "ps4-cat-113", // WWE 2K19
  "ps4-cat-111", // WWE 2K17
  "ps4-cat-110", // WWE 2K16
  "ps4-cat-108", // Injustice: Gods Among Us
  "ps4-cat-105", // Street Fighter 30th Anniversary Collection
  "ps4-cat-102", // Soulcalibur VI
  "ps4-cat-101", // Jump Force
  "ps4-cat-100", // My Hero One's Justice 2
  "ps4-cat-99", // My Hero One's Justice
  "ps4-cat-98", // Demon Slayer: The Hinokami Chronicles
  "ps4-cat-97", // Attack on Titan 2
  "ps4-cat-96", // Attack on Titan
  "ps4-cat-95", // One Piece World Seeker
  "ps4-cat-94", // One Piece: Pirate Warriors 4
  "ps4-cat-93", // One Piece: Pirate Warriors 3
  "ps4-cat-92", // Naruto Shippuden: Ultimate Ninja Storm Trilogy
  "ps4-cat-91", // Naruto Shippuden: Ultimate Ninja Storm 4
  "ps4-cat-90", // Dragon Ball: The Breakers
  "ps4-cat-87", // Dragon Ball Xenoverse 2
  "ps4-cat-86", // Dragon Ball Xenoverse
  "ps4-cat-85", // Ni no Kuni: Wrath of the White Witch
  "ps4-cat-84", // Ni no Kuni II
  "ps4-cat-83", // Star Ocean: The Divine Force
  "ps4-cat-82", // Star Ocean: Integrity and Faithlessness
  "ps4-cat-81", // Tales of Arise
  "ps4-cat-80", // Tales of Zestiria
  "ps4-cat-79", // Tales of Berseria
  "ps4-cat-78", // NieR Replicant
  "ps4-cat-77", // NieR: Automata
  "ps4-cat-76", // Lost Judgment
  "ps4-cat-74", // Yakuza: Like a Dragon
  "ps4-cat-72", // Yakuza 5 Remastered
  "ps4-cat-71", // Yakuza 4 Remastered
  "ps4-cat-70", // Yakuza 3 Remastered
  "ps4-cat-69", // Yakuza Kiwami 2
  "ps4-cat-68", // Yakuza Kiwami
  "ps4-cat-67", // Yakuza 0
  "ps4-cat-66", // Persona 3 Reload
  "ps4-cat-65", // Persona 4 Arena Ultimax
  "ps4-cat-64", // Persona 5 Strikers
  "ps4-cat-61", // Dragon Quest XI S
  "ps4-cat-60", // Kingdom Hearts HD 2.8 Final Chapter Prologue
  "ps4-cat-59", // Kingdom Hearts HD 1.5+2.5 Remix
  "ps4-cat-58", // Kingdom Hearts III
  "ps4-cat-57", // Final Fantasy Type-0 HD
  "ps4-cat-56", // Final Fantasy IX
  "ps4-cat-55", // Final Fantasy VIII Remastered
  "ps4-cat-54", // Final Fantasy X/X-2 HD Remaster
  "ps4-cat-53", // Final Fantasy XII: The Zodiac Age
  "ps4-cat-50", // Monster Hunter World: Iceborne
  "ps4-cat-47", // Nioh
  "ps4-cat-45", // Dark Souls III
  "ps4-cat-44", // Dark Souls II: Scholar of the First Sin
  "ps4-cat-43", // Dark Souls Remastered
  "ps4-cat-42", // Elden Ring
  "ps4-cat-41", // Cyberpunk 2077
  "ps4-cat-38", // MediEvil
  "ps4-cat-37", // Astro Bot Rescue Mission
  "ps4-cat-36", // Everybody's Golf
  "ps4-cat-35", // Gravity Rush 2
  "ps4-cat-32", // Beyond: Two Souls
  "ps4-cat-27", // Concrete Genie
  "ps4-cat-12", // Horizon Forbidden West
  "seed-ps4-12", // Marvel's Spider-Man Remastered
  "ps4-cat-462", // Call of Duty: Modern Warfare
  "ps4-cat-17", // Death Stranding Director's Cut
  "ps4-cat-358", // Resident Evil Village
  "ps4-cat-353", // Resident Evil 3
  "ps4-cat-352", // Resident Evil 2
  "ps4-cat-389", // Just Cause 4
  "ps4-cat-197", // Crash Team Racing Nitro-Fueled
  "ps4-cat-46", // Sekiro: Shadows Die Twice
];
