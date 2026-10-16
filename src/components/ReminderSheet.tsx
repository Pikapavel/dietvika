// Шторка «Напомнить вечером»: выбор времени и ссылка в календарь телефона (см. src/reminder.ts).
import { useState } from "react";
import { REMINDER_DEFAULT, REMINDER_SLOTS, detectPlatform, googleHref, icsHref, saveReminder, savedReminder } from "../reminder";
import { Sheet } from "./Sheet";

export function ReminderSheet({ onClose, onAdded }: { onClose: () => void; onAdded: (time: string) => void }) {
  const [saved, setSaved] = useState(savedReminder);
  const [time, setTime] = useState(saved ?? REMINDER_DEFAULT);
  const platform = detectPlatform();
  // нажали «добавить» — запоминаем время; добавилось ли событие, проверить нельзя
  const mark = () => {
    saveReminder(time);
    setSaved(time);
    onAdded(time);
  };
  const ics = { href: icsHref(time), label: platform === "android" ? "Другой календарь" : platform === "ios" ? "Добавить в Календарь" : "Добавить в календарь (.ics)" };
  const google = { href: googleHref(time), label: platform === "android" ? "Добавить в Google Календарь" : "Google Календарь" };
  const [first, second] = platform === "android" ? [google, ics] : [ics, google];
  const link = (l: typeof ics, primary: boolean) => (
    <a className={primary ? "btn block" : "btn secondary block"} href={l.href} onClick={mark}
      data-testid={l === ics ? "reminder-ics" : "reminder-google"}
      {...(l === google ? { target: "_blank", rel: "noopener" } : {})}>{l.label}</a>
  );
  return (
    <Sheet label="Напомнить вечером" onClose={onClose}>
      <div className="ghead">
        <div><div className="eyebrow">Календарь телефона</div><h2>Напомнить вечером</h2></div>
        <button className="close" onClick={onClose} aria-label="Закрыть">×</button>
      </div>
      <p>Каждый день в это время календарь напомнит: «Что доесть сегодня?» Выключить можно в календаре.</p>
      <div>
        <div className="eyebrow" style={{ marginBottom: 6 }} id="rem-time">Время</div>
        <div className="picker times" role="group" aria-labelledby="rem-time">
          {REMINDER_SLOTS.map((t) => (
            <button key={t} aria-pressed={t === time} onClick={() => setTime(t)}
              style={t === time ? { background: "var(--ok)" } : undefined}>{t}</button>
          ))}
        </div>
      </div>
      {link(first, true)}
      {link(second, false)}
      {saved && <p className="small" data-testid="reminder-status">Напоминание: {saved} ✓ <span className="muted">— если добавили в календарь</span></p>}
      <p className="muted small">В календарь попадает только название, время и адрес приложения — без плана и отметок.</p>
    </Sheet>
  );
}
