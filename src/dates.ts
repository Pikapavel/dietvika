// Даты храним как локальные "YYYY-MM-DD" (не UTC), неделя — с понедельника по воскресенье.

export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isISODate(s: unknown): s is ISODate {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISO(fromISO(s)) === s;
}

export function today(): ISODate {
  return toISO(new Date());
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86400000);
}

/** Понедельник недели, в которую попадает дата */
export function weekStart(s: ISODate): ISODate {
  const wd = (fromISO(s).getDay() + 6) % 7; // 0 = пн
  return addDays(s, -wd);
}

export function weekDays(s: ISODate): ISODate[] {
  const start = weekStart(s);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const WEEKDAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];

/** "Среда, 15 октября" */
export function longDate(s: ISODate): string {
  const d = fromISO(s);
  const w = WEEKDAYS[d.getDay()];
  return `${w[0].toUpperCase()}${w.slice(1)}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

/** "15 октября" */
export function dayMonth(s: ISODate): string {
  const d = fromISO(s);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

/** "15.10" */
export function shortDate(s: ISODate): string {
  const d = fromISO(s);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}

/** "12–18 октября" или "29 сентября – 5 октября" */
export function rangeLabel(a: ISODate, b: ISODate): string {
  const da = fromISO(a), db = fromISO(b);
  if (da.getMonth() === db.getMonth()) return `${da.getDate()}–${db.getDate()} ${MONTHS_GEN[db.getMonth()]}`;
  return `${dayMonth(a)} – ${dayMonth(b)}`;
}
