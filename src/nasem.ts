// Калькулятор для специалиста: расход энергии (TEE) по NASEM 2023 для взрослых 19+,
// нижняя граница BMR по Mifflin–St Jeor и подбор уровня плана USDA.
// Клиенту эти числа не показываются.

import { LEVELS, MAX_LEVEL, MIN_LEVEL } from "./plan";

export type Sex = "m" | "f";
export type Activity = "inactive" | "low" | "active" | "very";
export type Goal = "maintain" | "lose" | "gain";
/** Беременность и кормление: прибавка к расходу (IOM/NASEM 2005), снижение веса не применяем */
export type Status = "none" | "preg2" | "preg3" | "lact1" | "lact2";

export const STATUS_LABEL: Record<Status, string> = {
  none: "Нет",
  preg2: "Беременность, II триместр",
  preg3: "Беременность, III триместр",
  lact1: "Кормление грудью, 0–6 мес.",
  lact2: "Кормление грудью, 7–12 мес.",
};
// TODO: цифры подтверждает Вика
export const STATUS_KCAL: Record<Status, number> = { none: 0, preg2: 340, preg3: 452, lact1: 330, lact2: 400 };

export const ACTIVITY_LABEL: Record<Activity, string> = {
  inactive: "Неактивный",
  low: "Малоактивный",
  active: "Активный",
  very: "Очень активный",
};

// TODO: коэффициенты сверить с письмом Вики «Формулы BMR и таблица PAL».
// NASEM 2023, взрослые 19+: TEE = a + b·A + c·H + d·W (A — годы, H — см, W — кг).
const NASEM: Record<Sex, Record<Activity, [number, number, number, number]>> = {
  m: {
    inactive: [753.07, -10.83, 6.5, 14.1],
    low: [581.47, -10.83, 8.3, 14.94],
    active: [1004.82, -10.83, 6.52, 15.91],
    very: [-517.88, -10.83, 15.61, 19.11],
  },
  f: {
    inactive: [584.9, -7.01, 5.72, 11.71],
    low: [575.77, -7.01, 6.6, 12.14],
    active: [710.25, -7.01, 6.54, 12.34],
    very: [511.83, -7.01, 9.07, 12.56],
  },
};

export function teeNasem(sex: Sex, act: Activity, age: number, heightCm: number, weightKg: number): number {
  const [a, b, c, d] = NASEM[sex][act];
  return a + b * age + c * heightCm + d * weightKg;
}

/** Mifflin–St Jeor: только как нижняя граница при снижении веса */
export function bmrMifflin(sex: Sex, age: number, heightCm: number, weightKg: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "m" ? 5 : -161);
}

export const LOSS_DEFICIT = 500;
export const LOSS_FLOOR = 1600;
/** Набор мышечной массы: поддержание + 10% */
export const GAIN_SURPLUS = 0.1;

export interface Suggestion {
  tee: number;
  bmr: number;
  /** целевая калорийность до округления к уровню */
  target: number;
  level: number;
  note: string;
}

const clampLevel = (k: number) => Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, k));

export function suggestLevel(sex: Sex, act: Activity, age: number, h: number, w: number, goal: Goal, status: Status = "none"): Suggestion {
  const extra = sex === "f" ? STATUS_KCAL[status] : 0;
  const tee = teeNasem(sex, act, age, h, w) + extra;
  const bmr = bmrMifflin(sex, age, h, w);
  if (extra > 0) {
    const level = clampLevel(Math.round(tee / 200) * 200);
    return { tee, bmr, target: tee, level: nearest(level), note: `${STATUS_LABEL[status]}: расход + ${extra} ккал, без дефицита, округлено до ближайшего уровня.` };
  }
  if (goal === "gain") {
    const target = tee * (1 + GAIN_SURPLUS);
    // округляем ВВЕРХ до уровня таблицы, чтобы не потерять профицит
    const level = clampLevel(Math.ceil(target / 200) * 200);
    return { tee, bmr, target, level: nearest(level), note: "Набор мышечной массы: расход + 10%, округлено вверх до уровня." };
  }
  if (goal === "maintain") {
    const level = clampLevel(Math.round(tee / 200) * 200);
    return { tee, bmr, target: tee, level: nearest(level), note: "Поддержание: расход округлён до ближайшего уровня." };
  }
  const raw = tee - LOSS_DEFICIT;
  const target = Math.max(raw, bmr, LOSS_FLOOR);
  // округляем ВНИЗ до уровня таблицы (шаг 200)
  const level = clampLevel(Math.floor(target / 200) * 200);
  const why =
    target === raw ? `расход − ${LOSS_DEFICIT}` :
    target === bmr ? "подняли до BMR" : `подняли до минимума ${LOSS_FLOOR}`;
  return { tee, bmr, target, level: nearest(level), note: `Снижение веса: ${why}, округлено вниз до уровня.` };
}

function nearest(k: number): number {
  return LEVELS.includes(k) ? k : LEVELS.reduce((a, l) => (Math.abs(l - k) < Math.abs(a - k) ? l : a));
}
