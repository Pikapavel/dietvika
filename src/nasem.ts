// Калькулятор для специалиста: расход энергии (TEE) по NASEM 2023 для взрослых 19+,
// нижняя граница BMR по Mifflin–St Jeor и подбор уровня плана USDA.
// Клиенту эти числа не показываются.

import { LEVELS, MAX_LEVEL, MIN_LEVEL } from "./plan";

export type Sex = "m" | "f";
export type Activity = "inactive" | "low" | "active" | "very";
export type Goal = "maintain" | "lose";

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

export interface Suggestion {
  tee: number;
  bmr: number;
  /** целевая калорийность до округления к уровню */
  target: number;
  level: number;
  note: string;
}

const clampLevel = (k: number) => Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, k));

export function suggestLevel(sex: Sex, act: Activity, age: number, h: number, w: number, goal: Goal): Suggestion {
  const tee = teeNasem(sex, act, age, h, w);
  const bmr = bmrMifflin(sex, age, h, w);
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
