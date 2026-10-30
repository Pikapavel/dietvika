// Планы Вики «версия 2» (письмо 25.10.2026): 1 рука = 1 порция, одно число в клетке.
// Белок — ладони, зерновые — горсти, фрукты и овощи — кулаки, молочные — стаканы.
// Масло — граммы в день (пока только справочно: трекер жиров ждёт ответа Вики).
// 1600 Вика ещё не досчитала; посчитано по «мужскому» размеру рук — будет перепроверять.
export interface VikaPlan { kcal: number; prot: number; grain: number; fv: number; dairy: number; oilG: number }

export const VIKA_PLANS: VikaPlan[] = [
  { kcal: 1600, prot: 2, grain: 3, fv: 5, dairy: 3, oilG: 30 },
  { kcal: 1800, prot: 2, grain: 4, fv: 5, dairy: 3, oilG: 20 },
  { kcal: 2000, prot: 3, grain: 5, fv: 5, dairy: 3, oilG: 30 },
  { kcal: 2200, prot: 3, grain: 6, fv: 5, dairy: 3, oilG: 30 },
  { kcal: 2400, prot: 4, grain: 6, fv: 5, dairy: 3, oilG: 30 },
  { kcal: 2600, prot: 4, grain: 6, fv: 6, dairy: 3, oilG: 30 },
  { kcal: 2800, prot: 5, grain: 7, fv: 6, dairy: 3, oilG: 30 },
  { kcal: 3000, prot: 5, grain: 8, fv: 6, dairy: 3, oilG: 30 },
  { kcal: 3200, prot: 5, grain: 8, fv: 6, dairy: 3, oilG: 30 },
];
