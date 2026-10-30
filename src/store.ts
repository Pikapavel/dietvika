// Состояние приложения: план, журнал, вес. Каждое изменение сразу пишется в localStorage.
import { useCallback, useEffect, useState } from "react";
import { type ISODate } from "./dates";
import { loadLog, loadWeights, saveLog, saveWeights, type Entry, type Log, type LogGroup, type Weights } from "./log";
import { loadPlan, savePlan, type Plan } from "./plan";
import { KEYS, clearAll, readRaw, writeRaw } from "./storage";

export function useAppData() {
  const [plan, setPlanState] = useState<Plan | null>(() => loadPlan());
  const [log, setLog] = useState<Log>(() => loadLog());
  const [weights, setWeights] = useState<Weights>(() => loadWeights());
  const [onboarded, setOnboardedState] = useState<boolean>(() => readRaw(KEYS.onboarded) === "1");

  const updateLog = useCallback((fn: (l: Log) => Log) => {
    setLog((prev) => {
      const next = fn(prev);
      saveLog(next);
      return next;
    });
  }, []);

  const add = useCallback((date: ISODate, g: LogGroup, f: string, q: number) => {
    const e: Entry = { g, f, q, t: Date.now() };
    updateLog((l) => ({ ...l, [date]: [...(l[date] ?? []), e] }));
  }, [updateLog]);

  const removeAt = useCallback((date: ISODate, index: number) => {
    updateLog((l) => {
      const list = (l[date] ?? []).filter((_, i) => i !== index);
      const next = { ...l };
      if (list.length) next[date] = list; else delete next[date];
      return next;
    });
  }, [updateLog]);

  /** «−» на плитке: уменьшает последнюю отметку группы за день на amount (или убирает её) */
  const minus = useCallback((date: ISODate, g: LogGroup, amount: number) => {
    updateLog((l) => {
      const list = [...(l[date] ?? [])];
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].g !== g) continue;
        if (list[i].q > amount + 1e-9) list[i] = { ...list[i], q: list[i].q - amount };
        else list.splice(i, 1);
        break;
      }
      const next = { ...l };
      if (list.length) next[date] = list; else delete next[date];
      return next;
    });
  }, [updateLog]);

  const setWeight = useCallback((date: ISODate, kg: number | null) => {
    setWeights((prev) => {
      const next = { ...prev };
      if (kg === null) delete next[date]; else next[date] = kg;
      saveWeights(next);
      return next;
    });
  }, []);

  const setPlan = useCallback((p: Plan) => {
    savePlan(p);
    setPlanState(p);
  }, []);

  const setOnboarded = useCallback(() => {
    writeRaw(KEYS.onboarded, "1");
    setOnboardedState(true);
  }, []);

  const reset = useCallback(() => {
    clearAll();
    writeRaw(KEYS.units, "hands1");
    setPlanState(null);
    setLog({});
    setWeights({});
    setOnboardedState(false);
  }, []);

  return { plan, log, weights, onboarded, add, removeAt, minus, setWeight, setPlan, setOnboarded, reset };
}

export type AppData = ReturnType<typeof useAppData>;

/** Приложение открыто с иконки на экране «Домой», а не в браузере */
export function isStandalone(): boolean {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

/** Текущий хэш адреса */
export function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

export function go(route: string) {
  if (window.location.hash !== route) window.location.hash = route;
}

/** Убирает хэш без новой записи в истории (после приёма плана) */
export function replaceHash(route: string) {
  const url = window.location.href.split("#")[0] + route;
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
