// Журнал отметок по датам: { "2026-10-15": [{g, f, q, t}, ...] }.
// q — в единицах USDA (cup / oz-eq) для групп, в стаканах для воды, 1 — для свободного приёма пищи.

import { addDays, isISODate, type ISODate } from "./dates";
import { GROUP_IDS, type GroupId } from "./units";
import { KEYS, readJSON, writeJSON } from "./storage";
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
export type Weights = Record<ISODate, number>;

export function loadLog(): Log {
  const raw = readJSON<unknown>(KEYS.log, {});
  const out: Log = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [d, arr] of Object.entries(raw as Record<string, unknown>)) {
    if (!isISODate(d) || !Array.isArray(arr)) continue;
    const list = arr.filter(
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

export function hasEntries(log: Log, date: ISODate): boolean {
  return (log[date] ?? []).length > 0;
}

/** Все 5 колец закрыты */
export function allClosed(log: Log, date: ISODate, goals: Goals): boolean {
  return GROUP_IDS.every((g) => sumDay(log, date, g) >= goals[g] - 1e-9);
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
