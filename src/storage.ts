// Безопасная обёртка над localStorage: любое обращение в try/catch.
// Если хранилище недоступно (приватный режим, запрет сайта), данные живут в памяти до перезагрузки.

export const PREFIX = "dv2-";
export const KEYS = {
  plan: PREFIX + "plan",
  log: PREFIX + "log",
  weight: PREFIX + "weight",
  onboarded: PREFIX + "onboarded",
  theme: PREFIX + "theme",
  /** время вечернего напоминания "20:00", если клиент добавлял его в календарь */
  reminder: PREFIX + "reminder",
  /** фото профиля: JPEG data URL 192×192 */
  avatar: PREFIX + "avatar",
  /** цель, которую клиент написал сам (перекрывает цель из плана) */
  goal: PREFIX + "goal",
  /** подсказку «Приложение на экране Домой» скрыли */
  installHint: PREFIX + "installHint",
  /** "hands1" — журнал уже в порциях «1 рука = 1 порция» (белок переведён из oz-eq) */
  units: PREFIX + "units",
} as const;

const memory = new Map<string, string>();
let persistent = true;

export function storageWorks(): boolean {
  return persistent;
}

export function readRaw(key: string): string | null {
  try {
    const v = window.localStorage.getItem(key);
    if (v !== null) return v;
  } catch {
    persistent = false;
  }
  return memory.get(key) ?? null;
}

export function writeRaw(key: string, value: string): void {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    persistent = false;
  }
}

export function removeKey(key: string): void {
  memory.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    persistent = false;
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  writeRaw(key, JSON.stringify(value));
}

/** Удаляет все ключи приложения (dv2-*) */
export function clearAll(): void {
  for (const k of Object.values(KEYS)) removeKey(k);
  try {
    const extra: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX)) extra.push(k);
    }
    extra.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    persistent = false;
  }
  memory.clear();
}
