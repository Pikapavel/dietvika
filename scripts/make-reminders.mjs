// Вечернее напоминание через календарь телефона (сервера нет): статичные .ics на каждое время.
// Запуск: npm run reminders (входит в npm run build) → public/reminders/dv-1800.ics … dv-2230.ics
//
// Время «плавающее» (без часового пояса): 20:00 там, где сейчас телефон. UID у каждого слота свой
// и постоянный — повторное добавление того же времени не плодит события в большинстве календарей.
// Адрес приложения в описании: APP_URL, иначе в GitHub Actions — https://<owner>.github.io/<repo>/,
// иначе без ссылки. Тексты держать в согласии с src/reminder.ts (REMINDER_TITLE / REMINDER_TEXT).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../public/reminders");

const TITLE = "DietVika: что доесть сегодня?";
const TEXT = "Открой DietVika и посмотри «Что доесть».";
// первый день повтора и DTSTAMP — постоянные, чтобы файлы не менялись от сборки к сборке
const START = "20261016";
const STAMP = "20261016T000000Z";

function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;
  const repo = process.env.GITHUB_REPOSITORY; // "owner/name"
  if (repo) {
    const [owner, name] = repo.split("/");
    return `https://${owner.toLowerCase()}.github.io/${name}/`;
  }
  return "";
}

/** Слоты: 18:00 … 22:30 через 30 минут → "2000" */
export const SLOTS = Array.from({ length: 10 }, (_, i) => {
  const m = 18 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;
});

/** Экранирование TEXT по RFC 5545 */
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** Перенос строк длиннее 75 октетов (UTF-8 не режем посреди символа) */
function fold(line) {
  const parts = [];
  let cur = "", bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (parts.length ? 74 : 75)) {
      parts.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

function plus5(hhmm) {
  const m = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2)) + 5;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;
}

export function ics(hhmm, url) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DietVika//Evening reminder//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:dietvika-evening-${hhmm}@dietvika`,
    `DTSTAMP:${STAMP}`,
    `DTSTART:${START}T${hhmm}00`,
    `DTEND:${START}T${plus5(hhmm)}00`,
    "RRULE:FREQ=DAILY",
    `SUMMARY:${esc(TITLE)}`,
    `DESCRIPTION:${esc(url ? `${TEXT}\n${url}` : TEXT)}`,
    ...(url ? [`URL:${url}`] : []),
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(TITLE)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

const url = appUrl();
mkdirSync(out, { recursive: true });
for (const s of SLOTS) writeFileSync(resolve(out, `dv-${s}.ics`), ics(s, url));
console.log(`reminders: ${SLOTS.length} .ics${url ? `, ссылка ${url}` : ", без ссылки (нет APP_URL / GITHUB_REPOSITORY)"}`);
