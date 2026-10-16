// Конвертирует справочник продуктов (CSV, ";" , UTF-8 BOM) в src/data/foods.json.
// Запуск: npm run foods   (или: node scripts/csv-to-foods.mjs [путь-к-csv])
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2] ?? resolve(root, "src/data/справочник-продуктов.csv");
const out = resolve(root, "src/data/foods.json");

// Фрукты и овощи — одна группа fv (16.10); старые названия групп тоже принимаем
const GROUPS = {
  "Фрукты и овощи": "fv",
  "Фрукты": "fv",
  "Овощи": "fv",
  // Бобовые (16.10): меры временные, Вика пришлёт точные числа и список продуктов
  "Бобовые": "leg",
  "Зерновые": "grain",
  "Белок": "prot",
  "Молочные": "dairy",
  "Свободный приём пищи": "free",
};

const text = readFileSync(src, "utf8").replace(/^﻿/, "");
const [header, ...rows] = text.split(/\r?\n/).filter((l) => l.trim());
if (!header.startsWith("Группа;")) throw new Error("Неожиданный заголовок CSV: " + header);

/** "3 oz-eq" → 3, "≈ 1,5 oz-eq" → 1.5, "1 cup" → 1, "1 порция" → 1, "неделя" → 1 */
function parseCount(s, g) {
  if (g === "free") return 1;
  const m = /(\d+(?:[.,]\d+)?)/.exec(s);
  return m ? Number(m[1].replace(",", ".")) : NaN;
}

// Заметки видит клиент: убираем служебные пометки и американские единицы.
function clientNote(note) {
  return note
    .replace(/или в белке — Вика решает, куда считать/, "можно считать и в белке")
    .replace(/^Великобритания.*EUFIC.*$/, "")
    .replace(/^по британскому гиду.*$/, "")
    .replace(/\s*\(как у EUFIC\)/, "")
    .replace(/миндальное и овсяное USDA не считает молочными/, "миндальное и овсяное не считаются молочными")
    .replace(/(\d+(?:[.,]\d+)?)\s*(oz-eq|cup)/g, "$1 порции")
    .trim();
}

const foods = [];
const skipped = [];
for (const line of rows) {
  // в заметке тоже бывает «;», поэтому всё после 5-го поля — заметка
  const cells = line.split(";");
  const [group, name, hand, grams, counts] = cells.slice(0, 5).map((x) => x.trim());
  const note = cells.slice(5).join(";").trim();
  const g = GROUPS[group];
  const why =
    !g ? "группа не считается" :
    hand === "?" ? "порция не уточнена" :
    /не молочное/i.test(counts) ? "не молочное" :
    hand === "—" ? "нет порции" : "";
  if (why) { skipped.push(`${group} / ${name}: ${why}`); continue; }
  const q = parseCount(counts, g);
  if (!Number.isFinite(q) || q <= 0) { skipped.push(`${group} / ${name}: не разобрано «${counts}»`); continue; }
  const food = { g, name, hand: hand.replace(/\s*\(по EUFIC\)/, ""), q };
  if (grams && grams !== "—") food.grams = grams;
  const shown = clientNote(note);
  if (shown) food.note = shown;
  foods.push(food);
}

writeFileSync(out, JSON.stringify(foods, null, 1) + "\n");
console.log(`foods.json: ${foods.length} продуктов`);
if (skipped.length) console.log("Пропущено:\n  " + skipped.join("\n  "));
