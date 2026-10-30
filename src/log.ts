// Журнал отметок по датам: { "2026-10-15": [{g, f, q, t}, ...] }.
// q — в порциях («1 рука = 1 порция») для групп, в стаканах для воды, 1 — для свободного приёма пищи.

import { addDays, isISODate, weekDays, type ISODate } from "./dates";
import { DAILY_IDS, GROUP_IDS, type GroupId } from "./units";
import { KEYS, readJSON, readRaw, writeJSON, writeRaw } from "./storage";
import type { Goals } from "./plan";

export type LogGroup = GroupId | "water" | "free";
export const LOG_GROUPS: LogGroup[] = [...GROUP_IDS, "water", "free"];

export interface Entry {
  g: LogGroup;
  /** продукт или «Порция» */
  f: string;
  q: number;
  /** время отметки, мс */
  t: number;
}

export type Log = Record<ISODate, Entry[]>;

/** Старые группы журнала → новые: фрукты и овощи слились в fv (16.10), количество в cup то же */
const LEGACY_GROUP: Record<string, LogGroup> = { fruit: "fv", veg: "fv" };
export type Weights = Record<ISODate, number>;

/** Один раз: белок из oz-eq USDA (ладонь = 3) в ладони. Остальные группы и раньше считались 1:1 */
export function migrateUnits(): void {
  if (readRaw(KEYS.units) === "hands1") return;
  const raw = readJSON<unknown>(KEYS.log, null);
  if (raw && typeof raw === "object") {
    const out: Record<string, unknown> = {};
    for (const [d, arr] of Object.entries(raw as Record<string, unknown>)) {
      out[d] = Array.isArray(arr)
        ? arr.map((e) => (e && typeof e === "object" && (e as Entry).g === "prot" && typeof (e as Entry).q === "number"
          ? { ...(e as Entry), q: (e as Entry).q / 3 } : e))
        : arr;
    }
    writeJSON(KEYS.log, out);
  }
  writeRaw(KEYS.units, "hands1");
}

export function loadLog(): Log {
  const raw = readJSON<unknown>(KEYS.log, {});
  const out: Log = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [d, arr] of Object.entries(raw as Record<string, unknown>)) {
    if (!isISODate(d) || !Array.isArray(arr)) continue;
    const list = arr.map((e) => {
      const g = e && typeof e === "object" ? LEGACY_GROUP[(e as Entry).g] : undefined;
      return g ? { ...(e as Entry), g } : e;
    }).filter(
      (e): e is Entry =>
        !!e && typeof e === "object" &&
        LOG_GROUPS.includes((e as Entry).g) &&
        typeof (e as Entry).q === "number" && (e as Entry).q > 0,
    ).map((e) => ({ g: e.g, f: typeof e.f === "string" ? e.f : "Порция", q: e.q, t: typeof e.t === "number" ? e.t : 0 }));
    if (list.length) out[d] = list;
  }
  return out;
}

export function saveLog(log: Log): void {
  writeJSON(KEYS.log, log);
}

export function loadWeights(): Weights {
  const raw = readJSON<unknown>(KEYS.weight, {});
  const out: Weights = {};
  if (raw && typeof raw === "object") {
    for (const [d, v] of Object.entries(raw as Record<string, unknown>)) {
      if (isISODate(d) && typeof v === "number" && v > 20 && v < 400) out[d] = v;
    }
  }
  return out;
}

export function saveWeights(w: Weights): void {
  writeJSON(KEYS.weight, w);
}

export function sumDay(log: Log, date: ISODate, g: LogGroup): number {
  return (log[date] ?? []).reduce((a, e) => (e.g === g ? a + e.q : a), 0);
}

/** Сумма за неделю (пн–вс), в которую попадает дата — для бобовых */
export function sumWeek(log: Log, anyDay: ISODate, g: LogGroup): number {
  return weekDays(anyDay).reduce((a, d) => a + sumDay(log, d, g), 0);
}

export function hasEntries(log: Log, date: ISODate): boolean {
  return (log[date] ?? []).length > 0;
}

/** Все кольца дня закрыты (дневные группы; бобовые — за неделю, сюда не входят) */
export function allClosed(log: Log, date: ISODate, goals: Goals): boolean {
  return DAILY_IDS.every((g) => sumDay(log, date, g) >= goals[g] - 1e-9);
}

/** День в календаре ровных дней: все группы дня в норме / что-то отмечено / пусто */
export type DayLevel = "full" | "part" | "none";

export function dayLevel(log: Log, date: ISODate, goals: Goals): DayLevel {
  if (!hasEntries(log, date)) return "none";
  return allClosed(log, date, goals) ? "full" : "part";
}

/** Самая ранняя дата с отметками (или null) */
export function firstLogDate(log: Log): ISODate | null {
  const keys = Object.keys(log).sort();
  return keys[0] ?? null;
}

/** Серия дней подряд со всеми кольцами (до сегодня; незакрытый сегодня серию не рвёт) */
export function streak(log: Log, todayIso: ISODate, goals: Goals): number {
  let d = allClosed(log, todayIso, goals) ? todayIso : addDays(todayIso, -1);
  let n = 0;
  while (n < 1000 && allClosed(log, d, goals)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
