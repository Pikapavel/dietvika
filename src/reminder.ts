// Вечернее напоминание через календарь телефона (сервера нет, решение Павла).
// iPhone: ссылка на статичный .ics с того же сайта (public/reminders, делает scripts/make-reminders.mjs) —
// Safari сам предлагает «Добавить в календарь»; Blob/data-ссылки в PWA на iOS ненадёжны.
// Android: ссылка-шаблон Google Календаря. Проверить, что событие добавили, нельзя — только запоминаем время.

import { today } from "./dates";
import { KEYS, readRaw, writeRaw } from "./storage";

/** Тексты события — как в scripts/make-reminders.mjs */
export const REMINDER_TITLE = "DietVika: что доесть сегодня?";
export const REMINDER_TEXT = "Открой DietVika и посмотри «Что доесть».";

/** 18:00 … 22:30 через 30 минут */
export const REMINDER_SLOTS: string[] = Array.from({ length: 10 }, (_, i) => {
  const m = 18 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});
export const REMINDER_DEFAULT = "20:00";

export type Platform = "ios" | "android" | "other";

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS притворяется Mac, но у него есть тач
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

/** Адрес приложения без #plan и параметров — без личных данных */
export function appAddress(): string {
  return window.location.origin + window.location.pathname;
}

/** Статичный .ics для времени "20:00" → reminders/dv-2000.ics (относительно приложения, работает под /dietvika/) */
export function icsHref(time: string): string {
  return new URL(`reminders/dv-${time.replace(":", "")}.ics`, appAddress()).href;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Ссылка-шаблон Google Календаря: сегодня в выбранное время, 5 минут, каждый день, без часового пояса */
export function googleHref(time: string, day = today()): string {
  const [h, m] = time.split(":").map(Number);
  const d = day.replace(/-/g, "");
  const end = h * 60 + m + 5;
  const dates = `${d}T${pad(h)}${pad(m)}00/${d}T${pad(Math.floor(end / 60))}${pad(end % 60)}00`;
  const q = (k: string, v: string) => `${k}=${encodeURIComponent(v)}`;
  return "https://calendar.google.com/calendar/render?" + [
    "action=TEMPLATE",
    q("text", REMINDER_TITLE),
    q("details", `${REMINDER_TEXT}\n${appAddress()}`),
    `dates=${dates}`,
    q("recur", "RRULE:FREQ=DAILY"),
  ].join("&");
}

/** Время, которое клиент добавлял в календарь (или null) */
export function savedReminder(): string | null {
  const t = readRaw(KEYS.reminder);
  return t && REMINDER_SLOTS.includes(t) ? t : null;
}

export function saveReminder(time: string): void {
  writeRaw(KEYS.reminder, time);
}
