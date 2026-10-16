// Календарь ровных дней (для мотивации, без наказаний): зелёный — все группы дня в норме,
// светлый — что-то отмечено, пусто — отметок нет. Красного нет. Нажатие на день — итоги дня.
import { useState } from "react";
import { WEEKDAY_SHORT, addMonths, dayMonth, fromISO, longDate, monthDays, monthLabel, monthStart, type ISODate } from "../dates";
import { dayLevel, firstLogDate, sumDay, sumWeek, type DayLevel, type Log } from "../log";
import { legWeekGoal, planGoals, waterGoal, type Plan } from "../plan";
import { DAILY_IDS, FREE, GLASS, GROUPS, fmt, plural, toDisplay } from "../units";
import { Sheet } from "./Sheet";

const LEVEL_TEXT: Record<DayLevel, string> = {
  full: "все группы в норме",
  part: "есть отметки",
  none: "нет отметок",
};

export function MonthCalendar({ log, plan, now }: { log: Log; plan: Plan; now: ISODate }) {
  const [month, setMonth] = useState<ISODate>(monthStart(now));
  const [open, setOpen] = useState<ISODate | null>(null);
  const goals = planGoals(plan);
  const days = monthDays(month);
  // пустые клетки до первого числа (неделя с понедельника)
  const lead = (fromISO(month).getDay() + 6) % 7;
  const first = firstLogDate(log);
  const earliest = monthStart(first && first < plan.start ? first : plan.start);
  const levels = days.map((d) => (d > now ? null : dayLevel(log, d, goals)));
  const even = levels.filter((l) => l === "full").length;

  return (
    <div className="card" data-testid="calendar">
      <div className="weekbar">
        <div>
          <div className="eyebrow">Ровные дни</div>
          <h2 className="cal-month">{monthLabel(month)}</h2>
        </div>
        <div className="weekbar">
          <button className="iconbtn" disabled={month <= earliest} onClick={() => setMonth(addMonths(month, -1))} aria-label="Предыдущий месяц">‹</button>
          <button className="iconbtn" disabled={month >= monthStart(now)} onClick={() => setMonth(addMonths(month, 1))} aria-label="Следующий месяц">›</button>
        </div>
      </div>
      <div className="cal" role="group" aria-label={`Календарь: ${monthLabel(month)}`}>
        {WEEKDAY_SHORT.map((w) => <span key={w} className="cal-wd" aria-hidden="true">{w}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`e${i}`} aria-hidden="true" />)}
        {days.map((d, i) => {
          const l = levels[i];
          const n = fromISO(d).getDate();
          if (!l) return <span key={d} className="cal-day future" aria-hidden="true">{n}</span>;
          return (
            <button key={d} className={`cal-day ${l}${d === now ? " today" : ""}`} data-level={l}
              onClick={() => setOpen(d)} aria-label={`${dayMonth(d)}: ${LEVEL_TEXT[l]}`}>{n}</button>
          );
        })}
      </div>
      <div className="cal-legend" aria-hidden="true">
        <span><i className="full" />все группы в норме</span>
        <span><i className="part" />есть отметки</span>
        <span><i className="none" />пусто</span>
      </div>
      <p className="muted small">
        {even ? `Ровных дней в этом месяце: ${even}. ` : ""}Ровный день — когда закрыты все кольца дня. Нажми на день, чтобы посмотреть его итоги.
      </p>
      {open && <DaySheet date={open} log={log} plan={plan} goals={goals} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** Итоги одного дня — только просмотр */
function DaySheet({ date, log, plan, goals, onClose }: {
  date: ISODate; log: Log; plan: Plan; goals: ReturnType<typeof planGoals>; onClose: () => void;
}) {
  const level = dayLevel(log, date, goals);
  const water = sumDay(log, date, "water");
  const wGoal = waterGoal(plan);
  const leg = sumDay(log, date, "leg");
  const free = sumDay(log, date, "free");
  return (
    <Sheet label={`Итоги дня: ${dayMonth(date)}`} onClose={onClose}>
      <div className="ghead">
        <div><div className="eyebrow">{LEVEL_TEXT[level]}</div><h2>{longDate(date)}</h2></div>
        <button className="close" onClick={onClose} aria-label="Закрыть">×</button>
      </div>
      <div className="card" data-testid="day-totals">
        {DAILY_IDS.map((g) => {
          const eaten = sumDay(log, date, g);
          const pct = goals[g] ? Math.min(1, eaten / goals[g]) * 100 : 0;
          return (
            <div className="grow" key={g}>
              <span><span className="dot" style={{ background: `var(--${g})` }} />{GROUPS[g].name}</span>
              <span className="num">{fmt(toDisplay(g, eaten))} из {fmt(toDisplay(g, goals[g]))}</span>
              <div className="bar" aria-hidden="true"><i style={{ width: `${pct}%`, background: `var(--${g})` }} /></div>
            </div>
          );
        })}
        <div className="grow">
          <span><span className="dot" style={{ background: "var(--leg)" }} />{GROUPS.leg.name}</span>
          <span className="num">за день {fmt(leg)}, за неделю {fmt(sumWeek(log, date, "leg"))} из {legWeekGoal(plan)}</span>
        </div>
        <div className="grow">
          <span><span className="dot" style={{ background: "var(--water)" }} />Вода</span>
          <span className="num">{water} из {wGoal} {plural(wGoal, GLASS)}</span>
        </div>
        <div className="grow">
          <span><span className="dot" style={{ background: "var(--free)" }} />{FREE.name}</span>
          <span className="num">{free}</span>
        </div>
      </div>
      <p className="muted small">Чтобы поправить отметки, открой «Сегодня»: там можно выбрать сегодня или вчера.</p>
    </Sheet>
  );
}
