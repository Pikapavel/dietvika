// Сводка недели (пн–вс): для экрана «Неделя» и текста для специалиста.

import { WEEKDAY_SHORT, addDays, rangeLabel, shortDate, weekDays, type ISODate } from "./dates";
import { allClosed, hasEntries, sumDay, type Log, type Weights } from "./log";
import { LEVELS, legWeekGoal, levelNumber, planGoals, waterGoal, type Goals, type Plan } from "./plan";
import { DAILY_IDS, FAT, FREE, GROUPS, fmt, plural, GLASS, toDisplay, type DailyId } from "./units";

export interface WeekStats {
  days: ISODate[];
  /** дни недели, которые уже наступили */
  past: ISODate[];
  /** дни с хотя бы одной отметкой */
  logged: ISODate[];
  goals: Goals;
  /** среднее съеденное за день по дням с отметками, в порциях */
  avg: Record<DailyId, number>;
  /** avg / goal */
  ratio: Record<DailyId, number>;
  /** цель группы достигнута в этот день (по дням недели пн…вс; будущие — false) */
  reached: Record<DailyId, boolean[]>;
  /** бобовые: порций за неделю и цель недели */
  leg: number;
  legGoal: number;
  free: number;
  /** свободные приёмы пищи по дням недели (пн…вс) */
  freeByDay: number[];
  waterAvg: number;
  waterGoal: number;
  /** масла и жиры: среднее порций в день по дням с отметками (без цели) */
  fatAvg: number;
  fullDays: number;
}

export function weekStats(plan: Plan, log: Log, anyDay: ISODate, todayIso: ISODate): WeekStats {
  const days = weekDays(anyDay);
  const past = days.filter((d) => d <= todayIso);
  const logged = past.filter((d) => hasEntries(log, d));
  const goals = planGoals(plan);
  const avg = {} as Record<DailyId, number>;
  const ratio = {} as Record<DailyId, number>;
  const reached = {} as Record<DailyId, boolean[]>;
  for (const g of DAILY_IDS) {
    reached[g] = days.map((d) => d <= todayIso && sumDay(log, d, g) >= goals[g] - 1e-9 && hasEntries(log, d));
    const total = logged.reduce((a, d) => a + sumDay(log, d, g), 0);
    avg[g] = logged.length ? total / logged.length : 0;
    ratio[g] = goals[g] > 0 ? avg[g] / goals[g] : 0;
  }
  const freeByDay = days.map((d) => sumDay(log, d, "free"));
  const free = freeByDay.reduce((a, n) => a + n, 0);
  const water = logged.reduce((a, d) => a + sumDay(log, d, "water"), 0);
  const fat = logged.reduce((a, d) => a + sumDay(log, d, "fat"), 0);
  return {
    days, past, logged, goals, avg, ratio, reached, free, freeByDay,
    leg: days.reduce((a, d) => a + sumDay(log, d, "leg"), 0),
    legGoal: legWeekGoal(plan),
    waterAvg: logged.length ? water / logged.length : 0,
    waterGoal: waterGoal(plan),
    fatAvg: logged.length ? fat / logged.length : 0,
    fullDays: past.filter((d) => allClosed(log, d, goals)).length,
  };
}

/** Последний вес не позже даты */
export function lastWeight(w: Weights, upto: ISODate): [ISODate, number] | null {
  const keys = Object.keys(w).filter((d) => d <= upto).sort();
  const k = keys[keys.length - 1];
  return k ? [k, w[k]] : null;
}

const kg = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });

/** Текст сводки для специалиста (без лишних эмодзи, читается в любом мессенджере) */
export function summaryText(plan: Plan, log: Log, weights: Weights, todayIso: ISODate): string {
  const s = weekStats(plan, log, todayIso, todayIso);
  const lines: string[] = [];
  lines.push(`DietVika — сводка за неделю ${rangeLabel(s.days[0], s.days[6])}`);
  if (plan.client) lines.push(`Клиент: ${plan.client}`);
  lines.push(`Уровень плана: ${levelNumber(plan.kcal)} из ${LEVELS.length}, старт ${shortDate(plan.start)}`);
  if (plan.veg) lines.push("Вегетарианский план");
  lines.push(`Дней с отметками: ${s.logged.length} из ${s.past.length}`);
  lines.push("");
  lines.push("В среднем за день (съедено / цель):");
  for (const g of DAILY_IDS) {
    const eaten = toDisplay(g, s.avg[g]);
    const goal = toDisplay(g, s.goals[g]);
    lines.push(`• ${GROUPS[g].name}: ${fmt(eaten)} / ${fmt(goal)} — ${Math.round(s.ratio[g] * 100)}%`);
  }
  lines.push(`• ${GROUPS.leg.name}: ${fmt(s.leg)} из ${s.legGoal} за неделю`);
  lines.push(`• Вода: ${fmt(s.waterAvg)} / ${s.waterGoal} ${plural(s.waterGoal, GLASS)}`);
  lines.push(`• ${FAT.name}: ${fmt(s.fatAvg)} в день`);
  lines.push("");
  lines.push(`Дней со всеми кольцами: ${s.fullDays}`);
  const byDay = s.past.map((_, i) => `${WEEKDAY_SHORT[i].toLowerCase()} ${s.freeByDay[i]}`).join(", ");
  lines.push(`${FREE.name}: ${s.free} за неделю (по дням: ${byDay})`);
  const now = lastWeight(weights, todayIso);
  if (now) {
    const before = lastWeight(weights, addDays(s.days[0], -1));
    lines.push(`Вес: ${kg(now[1])} кг (${shortDate(now[0])})` + (before ? `, раньше ${kg(before[1])} кг (${shortDate(before[0])})` : ""));
  } else {
    lines.push("Вес: не отмечен");
  }
  return lines.join("\n");
}
