// План клиента: уровень плана Вики (ккал), цели по группам, вода. Цели — в порциях «1 рука = 1 порция» (с 30.10).
// План приходит ссылкой от специалиста: #plan=<base64url(JSON)>, сервера нет.

import { VIKA_PLANS } from "./data/plans-vika";
import { addDays, isISODate, today, type ISODate } from "./dates";
import { DAILY_IDS, WATER, type DailyId } from "./units";
import { KEYS, readJSON, writeJSON } from "./storage";

/** Дневные цели в порциях. Бобовые — отдельно, за неделю (legWeek). */
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
  /** контакт специалиста для кнопки «Написать»: @ник Telegram, телефон, почта или https-ссылка */
  contact?: string;
  /** цель клиента для блока «Моя цель» в профиле: «Снизить вес до 65 кг» (из калькулятора конструктора) */
  goal?: string;
  /** 2 — цели в порциях «1 рука = 1 порция». Без поля — старая ссылка в единицах USDA (белок ×3) */
  u?: 2;
}
// Старые ссылки могли содержать freeLimit — поле игнорируется:
// у свободного приёма пищи нет лимита (решение Вики 15.10).
// Старые ссылки с goals.fruit / goals.veg: цель fv = их сумма (недостающее — из таблицы),
// не меньше 5 (решение Вики 16.10). Новые ссылки пишут goals.fv.

export const LEVELS: number[] = VIKA_PLANS.map((p) => p.kcal).sort((a, b) => a - b);
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

/** Цели по таблице Вики «версия 2» для уровня */
export function tableGoals(kcal: number): Goals {
  const d = VIKA_PLANS.find((x) => x.kcal === snapLevel(kcal))!;
  return { fv: Math.max(FV_MIN, d.fv), grain: d.grain, prot: d.prot, dairy: d.dairy };
}

/** Белок в старых ссылках и журнале — в oz-eq USDA: ладонь = 3. Теперь ладонь = 1 */
export const USDA_PROT_PER_PORTION = 3;

export const VEG_PROTEIN_FACTOR = 1.5;

/** Цели по таблице с учётом вегетарианского плана (белок ×1,5, округление до 0,5) */
export function suggestedGoals(kcal: number, veg: boolean): Goals {
  const base = tableGoals(kcal);
  if (veg) base.prot = Math.round(base.prot * VEG_PROTEIN_FACTOR * 2) / 2;
  return base;
}

/** Итоговые дневные цели (таблица, вегетарианский белок, поправки специалиста), в порциях */
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
    // старая ссылка: отдельные фрукты и овощи → одна цель fv (недостающее — 2,5)
    const fruit = num(og.fruit, 0, 20), veg = num(og.veg, 0, 20);
    if (goals.fv === undefined && (fruit !== undefined || veg !== undefined)) {
      goals.fv = fvGoal(fruit ?? 2.5, veg ?? 2.5);
    }
    // ссылка до 30.10: белок в oz-eq (ладонь = 3) → порции, округление до ½
    if (o.u !== 2 && goals.prot !== undefined) goals.prot = Math.round((goals.prot / USDA_PROT_PER_PORTION) * 2) / 2;
    if (Object.keys(goals).length) plan.goals = goals;
  }
  if (o.veg === true) plan.veg = true;
  const legWeek = num(o.legWeek, 0, 14);
  if (legWeek !== undefined) plan.legWeek = Math.round(legWeek);
  const water = num(o.water, 1, 20);
  if (water !== undefined) plan.water = Math.round(water);
  const contact = str(o.contact, 100);
  if (contact && contactHref(contact)) plan.contact = contact;
  const goal = str(o.goal, 80);
  if (goal) plan.goal = goal;
  plan.u = 2;
  return plan;
}

/** Контакт Вики по умолчанию (25.10): им же пользуется блок «Поддержка», если в плане контакта нет */
export const VIKA_CONTACT = "@raiseyouup";

/** Куда ведёт «Напиши нам» в профиле: контакт из плана, у плана Вики — её Telegram */
export function supportContact(plan: Plan): string | null {
  return plan.contact ?? (plan.specialist === "Вика" ? VIKA_CONTACT : null);
}

/** Ссылка для кнопки «Написать специалисту». null — если контакт не распознан. */
export function contactHref(contact: string): string | null {
  const c = contact.trim();
  if (/^https:\/\/[^\s]+$/i.test(c)) return c;
  const tg = /^(?:@|(?:https?:\/\/)?t\.me\/)([A-Za-z0-9_]{4,32})$/i.exec(c);
  if (tg) return `https://t.me/${tg[1]}`;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return `mailto:${c}`;
  const digits = c.replace(/[\s()-]/g, "");
  if (/^\+?\d{10,15}$/.test(digits)) return `tel:${digits}`;
  return null;
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

/** План из любого вставленного текста: ссылка целиком, с подписью или без https:// */
export function planFromText(text: string): string | null {
  const m = /plan=([A-Za-z0-9_-]{8,})/.exec(text.trim());
  return m && decodePlan(m[1]) ? m[1] : null;
}

// ---------- хранение ----------

export function loadPlan(): Plan | null {
  return sanitizePlan(readJSON<unknown>(KEYS.plan, null));
}

export function savePlan(plan: Plan): void {
  writeJSON(KEYS.plan, plan);
}

export function demoPlan(): Plan {
  return { v: 1, client: "Демо", specialist: "Вика", kcal: 1800, start: addDays(today(), -21), u: 2 };
}
