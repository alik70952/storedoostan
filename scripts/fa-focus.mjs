// چاپ نام فارسی چند عنوان مهم برای بازبینی (خروجی در فایل؛ برای دور زدن محدودیت انکدینگ ترمینال)
import fs from "node:fs";

const cache = JSON.parse(fs.readFileSync("data/ps4-fa-cache.json", "utf8"));
const picks = [
  "Red Dead Redemption 2",
  "Horizon Zero Dawn",
  "Horizon Forbidden West",
  "Elden Ring",
  "Ratchet & Clank",
  "Days Gone",
  "Until Dawn",
  "Knack",
  "eFootball PES 2020",
  "eFootball PES 2021",
  "NBA 2K16",
  "WWE 2K19",
  "F1 2016",
  "Madden NFL 19",
  "MLB The Show 19",
  "LittleBigPlanet 3",
  "MediEvil",
  "Sackboy: A Big Adventure",
  "Dreams",
  "Driveclub",
  "Persona 5",
  "Yakuza 0",
  "Judgment",
  "NieR: Automata",
  "Dark Souls II: Scholar of the First Sin",
  "Monster Hunter World: Iceborne",
  "Kingdom Hearts HD 1.5+2.5 Remix",
  "Game of Thrones",
];
const lines = picks.map((t) => {
  const c = cache[t];
  return `${t}  =>  ${c ? `${c.titleFa} [${c.genre}]` : "(کش ندارد)"}`;
});
fs.writeFileSync("data/ps4-fa-focus.txt", `${lines.join("\n")}\n`, "utf8");
console.log(`wrote ${lines.length} lines`);
