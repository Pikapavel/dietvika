// Калькулятор для специалиста: расход энергии (TEE) по NASEM 2023 для взрослых 19+,
// нижняя граница BMR по Mifflin–St Jeor и подбор уровня плана (таблица Вики 1600–3200).
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

/** Что значит каждый уровень активности (категории PAL NASEM 2023). Черновик: Вика пришлёт свой текст по образцу сайта США */
export const ACTIVITY_HINT: Record<Activity, string> = {
  inactive: "Сидячая работа, передвигаешься в основном на транспорте, тренировок почти нет.",
  low: "Сидячая работа, но каждый день есть 30–60 минут ходьбы или лёгкая тренировка 1–3 раза в неделю.",
  active: "Много двигаешься: работа на ногах или около часа активности в день (быстрая ходьба, тренировки 3–5 раз в неделю).",
  very: "Физический труд или интенсивные тренировки почти каждый день, больше 1,5–2 часов активности в день.",
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

/** Нижняя граница плана при снижении веса */
export const LOSS_FLOOR = 1600;

export interface Suggestion {
  /** расход при текущем весе (с прибавкой при беременности и кормлении) */
  tee: number;
  bmr: number;
  /** калорийность, от которой выбираем уровень: расход при целевом весе (снижение, набор) или при текущем */
  target: number;
  level: number;
  note: string;
}

const clampLevel = (k: number) => Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, k));
/** Уровень плана — вниз до шага таблицы: расчёт 2284 → план 2200 (Вика, 24.10) */
const floorLevel = (k: number) => nearest(clampLevel(Math.floor(k / 200) * 200));

// Решение Вики 24.10: «−500» убрали. При снижении и наборе считаем те же формулы с целевым весом,
// который вводит человек; при поддержании — с текущим.
export function suggestLevel(sex: Sex, act: Activity, age: number, h: number, w: number, goal: Goal, status: Status = "none", targetW?: number): Suggestion {
  const extra = sex === "f" ? STATUS_KCAL[status] : 0;
  const tee = teeNasem(sex, act, age, h, w) + extra;
  const bmr = bmrMifflin(sex, age, h, w);
  if (extra > 0) {
    return { tee, bmr, target: tee, level: floorLevel(tee), note: `${STATUS_LABEL[status]}: расход + ${extra} ккал, при текущем весе, округлено вниз до уровня.` };
  }
  if (goal === "maintain" || !targetW) {
    return { tee, bmr, target: tee, level: floorLevel(tee), note: "Поддержание: расход при текущем весе, округлено вниз до уровня." };
  }
  const atTarget = teeNasem(sex, act, age, h, targetW);
  if (goal === "gain") {
    return { tee, bmr, target: atTarget, level: floorLevel(atTarget), note: `Набор: расход при целевом весе ${targetW} кг, округлено вниз до уровня.` };
  }
  const target = Math.max(atTarget, LOSS_FLOOR);
  const why = target === atTarget ? `расход при целевом весе ${targetW} кг` : `подняли до минимума ${LOSS_FLOOR}`;
  return { tee, bmr, target, level: floorLevel(target), note: `Снижение: ${why}, округлено вниз до уровня.` };
}

function nearest(k: number): number {
  return LEVELS.includes(k) ? k : LEVELS.reduce((a, l) => (Math.abs(l - k) < Math.abs(a - k) ? l : a));
}
