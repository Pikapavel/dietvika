// План клиента: уровень USDA, цели по группам, вода, лимит свободного приёма пищи.
// План приходит ссылкой от специалиста: #plan=<base64url(JSON)>, сервера нет.

import plansData from "./data/plans-usda-2020.json";
import { addDays, isISODate, today, type ISODate } from "./dates";
import { GROUP_IDS, WATER, type GroupId } from "./units";
import { KEYS, readJSON, writeJSON } from "./storage";

export type Goals = Record<GroupId, number>;

export interface Plan {
  v: 1;
  client: string;
  specialist: string;
  kcal: number;
  start: ISODate;
  goals?: Partial<Goals>;
  water?: number;
}
// Старые ссылки могли содержать freeLimit — поле игнорируется:
// у свободного приёма пищи нет лимита (решение Вики 15.10).

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

/** Цели по таблице USDA для уровня */
export function tableGoals(kcal: number): Goals {
  const p = PLANS.find((x) => x.kcal === snapLevel(kcal))!;
  return {
    fruit: p.daily.fruit_cup,
    veg: p.daily.veg_cup,
    grain: p.daily.grain_ozeq,
    prot: p.daily.protein_ozeq,
    dairy: p.daily.dairy_cup,
  };
}

/** Итоговые дневные цели (таблица + поправки специалиста), в единицах USDA */
export function planGoals(plan: Plan): Goals {
  const base = tableGoals(plan.kcal);
  for (const g of GROUP_IDS) {
    const o = plan.goals?.[g];
    if (typeof o === "number" && o >= 0) base[g] = o;
  }
  return base;
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
    for (const g of GROUP_IDS) {
      const v = num((o.goals as Record<string, unknown>)[g], 0, 20);
      if (v !== undefined) goals[g] = v;
    }
    if (Object.keys(goals).length) plan.goals = goals;
  }
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
