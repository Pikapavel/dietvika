// План клиента: уровень USDA, цели по группам, вода, лимит свободного приёма пищи.
// План приходит ссылкой от специалиста: #plan=<base64url(JSON)>, сервера нет.

import plansData from "./data/plans-usda-2020.json";
import { addDays, isISODate, today, type ISODate } from "./dates";
import { DAILY_IDS, WATER, type DailyId } from "./units";
import { KEYS, readJSON, writeJSON } from "./storage";

/** Дневные цели, в единицах USDA. Бобовые — отдельно, за неделю (legWeek). */
export type Goals = Record<DailyId, number>;

export interface Plan {
  v: 1;
  client: string;
  specialist: string;
  kcal: number;
  start: ISODate;
  goals?: Partial<Goals>;
  water?: number;
  /** вегетарианский план: белок ×1,5 к обычной цели (если Вика не задала число сама) */
  veg?: boolean;
  /** бобовые: порций за неделю (0–14), без поля — LEG_WEEK_DEFAULT */
  legWeek?: number;
}
// Старые ссылки могли содержать freeLimit — поле игнорируется:
// у свободного приёма пищи нет лимита (решение Вики 15.10).
// Старые ссылки с goals.fruit / goals.veg: цель fv = их сумма (недостающее — из таблицы),
// не меньше 5 (решение Вики 16.10). Новые ссылки пишут goals.fv.

interface UsdaPlan {
  kcal: number;
  daily: { fruit_cup: number; veg_cup: number; grain_ozeq: number; protein_ozeq: number; dairy_cup: number };
}

const PLANS = (plansData as { plans: UsdaPlan[] }).plans;
export const LEVELS: number[] = PLANS.map((p) => p.kcal).sort((a, b) => a - b);
export const MIN_LEVEL = LEVELS[0];
export const MAX_LEVEL = LEVELS[LEVELS.length - 1];

/** Номер уровня для клиента (1…12) — ккал клиенту не показываем */
export function levelNumber(kcal: number): number {
  return LEVELS.indexOf(snapLevel(kcal)) + 1;
}

export function snapLevel(kcal: number): number {
  let best = LEVELS[0];
  for (const l of LEVELS) if (Math.abs(l - kcal) < Math.abs(best - kcal)) best = l;
  return best;
}

/** Фрукты и овощи — минимум 5 порций в день (5 a day, ВОЗ) */
export const FV_MIN = 5;

/** Цель «Фрукты и овощи»: сумма фруктов и овощей, округление до 0,5, не меньше 5 */
export function fvGoal(fruitCup: number, vegCup: number): number {
  return Math.max(FV_MIN, Math.round((fruitCup + vegCup) * 2) / 2);
}

function usdaDaily(kcal: number): UsdaPlan["daily"] {
  return PLANS.find((x) => x.kcal === snapLevel(kcal))!.daily;
}

/** Цели по таблице USDA для уровня */
export function tableGoals(kcal: number): Goals {
  const d = usdaDaily(kcal);
  return {
    fv: fvGoal(d.fruit_cup, d.veg_cup),
    grain: d.grain_ozeq,
    prot: d.protein_ozeq,
    dairy: d.dairy_cup,
  };
}

export const VEG_PROTEIN_FACTOR = 1.5;

/** Цели по таблице с учётом вегетарианского плана (белок ×1,5, округление до 0,5) */
export function suggestedGoals(kcal: number, veg: boolean): Goals {
  const base = tableGoals(kcal);
  if (veg) base.prot = Math.round(base.prot * VEG_PROTEIN_FACTOR * 2) / 2;
  return base;
}

/** Итоговые дневные цели (таблица, вегетарианский белок, поправки специалиста), в единицах USDA */
export function planGoals(plan: Plan): Goals {
  const base = suggestedGoals(plan.kcal, !!plan.veg);
  for (const g of DAILY_IDS) {
    const o = plan.goals?.[g];
    if (typeof o === "number" && o >= 0) base[g] = o;
  }
  return base;
}

/** Бобовые по умолчанию — 3 порции в неделю (решение Вики 16.10) */
export const LEG_WEEK_DEFAULT = 4;

export function legWeekGoal(plan: Plan): number {
  return plan.legWeek ?? LEG_WEEK_DEFAULT;
}

export function waterGoal(plan: Plan): number {
  return plan.water && plan.water > 0 ? plan.water : WATER.defaultGoal;
}

// ---------- ссылка ----------

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodePlan(plan: Plan): string {
  return b64urlEncode(JSON.stringify(plan));
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, lo: number, hi: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined;

/** Проверяет и чистит план из ссылки или хранилища. null — если план негодный. */
export function sanitizePlan(raw: unknown): Plan | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return null;
  const kcal = num(o.kcal, 500, 5000);
  if (kcal === undefined) return null;
  const plan: Plan = {
    v: 1,
    client: str(o.client, 60),
    specialist: str(o.specialist, 60) || "Вика",
    kcal: snapLevel(kcal),
    start: isISODate(o.start) ? o.start : today(),
  };
  if (o.goals && typeof o.goals === "object") {
    const goals: Partial<Goals> = {};
    const og = o.goals as Record<string, unknown>;
    for (const g of DAILY_IDS) {
      const v = num(og[g], 0, 20);
      if (v !== undefined) goals[g] = v;
    }
    // старая ссылка: отдельные фрукты и овощи → одна цель fv
    const fruit = num(og.fruit, 0, 20), veg = num(og.veg, 0, 20);
    if (goals.fv === undefined && (fruit !== undefined || veg !== undefined)) {
      const t = usdaDaily(plan.kcal);
      goals.fv = fvGoal(fruit ?? t.fruit_cup, veg ?? t.veg_cup);
    }
    if (Object.keys(goals).length) plan.goals = goals;
  }
  if (o.veg === true) plan.veg = true;
  const legWeek = num(o.legWeek, 0, 14);
  if (legWeek !== undefined) plan.legWeek = Math.round(legWeek);
  const water = num(o.water, 1, 20);
  if (water !== undefined) plan.water = Math.round(water);
  return plan;
}

export function decodePlan(encoded: string): Plan | null {
  try {
    return sanitizePlan(JSON.parse(b64urlDecode(encoded)));
  } catch {
    return null;
  }
}

/** Ссылка-приглашение на текущий адрес приложения */
export function inviteLink(plan: Plan): string {
  const base = window.location.href.split("#")[0];
  return `${base}#plan=${encodePlan(plan)}`;
}

/** Достаёт закодированный план из хэша вида #plan=... (или #/что-то?plan=...) */
export function planFromHash(hash: string): string | null {
  const m = /[#&?]plan=([A-Za-z0-9_-]+)/.exec(hash);
  return m ? m[1] : null;
}

// ---------- хранение ----------

export function loadPlan(): Plan | null {
  return sanitizePlan(readJSON<unknown>(KEYS.plan, null));
}

export function savePlan(plan: Plan): void {
  writeJSON(KEYS.plan, plan);
}

export function demoPlan(): Plan {
  return { v: 1, client: "Демо", specialist: "Вика", kcal: 1800, start: addDays(today(), -21) };
}
