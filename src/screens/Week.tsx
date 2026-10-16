import { useState } from "react";
import { WEEKDAY_SHORT, addDays, rangeLabel, shortDate, today as todayIso, weekStart, type ISODate } from "../dates";
import { streak, sumDay } from "../log";
import type { Plan } from "../plan";
import { lastWeight, weekStats } from "../stats";
import type { AppData } from "../store";
import { MonthCalendar } from "../components/MonthCalendar";
import { useToast } from "../components/Toast";
import { FREE, GLASS, GROUPS, DAILY_IDS, fmt, plural, toDisplay } from "../units";

export function Week({ data, plan }: { data: AppData; plan: Plan }) {
  const now = todayIso();
  const [anchor, setAnchor] = useState<ISODate>(now);
  const s = weekStats(plan, data.log, anchor, now);
  const isCurrent = weekStart(anchor) === weekStart(now);
  const series = streak(data.log, now, s.goals);
  const weakest = s.logged.length ? [...DAILY_IDS].sort((a, b) => s.ratio[a] - s.ratio[b])[0] : null;

  // столбцы: каждая группа даёт до 1/N высоты
  const W = 320, H = 150, bw = W / 7;
  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">Неделя {rangeLabel(s.days[0], s.days[6])}</div>
          <h1>Неделя</h1>
        </div>
        <div className="weekbar">
          <button className="iconbtn" onClick={() => setAnchor(addDays(weekStart(anchor), -7))} aria-label="Предыдущая неделя">‹</button>
          <button className="iconbtn" disabled={isCurrent} onClick={() => setAnchor(addDays(weekStart(anchor), 7))} aria-label="Следующая неделя">›</button>
        </div>
      </header>
      <section className="stack">
        <div className="card">
          <div className="eyebrow">Выполнение по дням</div>
          <svg className="week" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Столбцы по дням недели: доля закрытия каждой группы">
            <line x1="0" x2={W} y1="10" y2="10" stroke="var(--line)" strokeDasharray="3 3" />
            {s.days.map((d, i) => {
              const x = i * bw + 8, w = bw - 16;
              let y = H - 20;
              const future = d > now;
              return (
                <g key={d}>
                  <rect x={x} y={10} width={w} height={H - 30} rx="4" fill="var(--track)" opacity={future ? 0.4 : 1} />
                  {!future && DAILY_IDS.map((g) => {
                    const goal = s.goals[g];
                    const h = (goal ? Math.min(sumDay(data.log, d, g) / goal, 1) : 0) * (H - 30) / DAILY_IDS.length;
                    y -= h;
                    return h > 0 ? <rect key={g} x={x} y={y} width={w} height={h} fill={`var(--${g})`} /> : null;
                  })}
                  <text x={x + w / 2} y={H - 5} textAnchor="middle" className={d === now ? "today" : undefined}>{WEEKDAY_SHORT[i]}</text>
                </g>
              );
            })}
          </svg>
          <p className="muted small">Полный столбец до пунктира — все группы дня закрыты.</p>
        </div>

        <div className="stats">
          <div><b>{s.fullDays}</b><span>{plural(s.fullDays, ["день", "дня", "дней"])} со всеми кольцами</span></div>
          <div><b>{series}</b><span>{plural(series, ["день", "дня", "дней"])} подряд — серия</span></div>
          <div style={{ gridColumn: "1 / -1" }}><b>{fmt(s.waterAvg)}<span className="muted small">/{s.waterGoal}</span></b><span>{plural(s.waterGoal, GLASS)} воды в среднем</span></div>
        </div>

        <MonthCalendar log={data.log} plan={plan} now={now} />

        <div className="card" data-testid="free-week">
          <div className="weekbar">
            <div className="eyebrow">{FREE.name}</div>
            <span className="small muted">за неделю: <strong className="num" style={{ color: "var(--ink)" }}>{s.free}</strong></span>
          </div>
          <div className="freedays" role="list" aria-label="Свободный приём пищи по дням">
            {s.days.map((d, i) => (
              <div key={d} role="listitem" className={d > now ? "future" : undefined} aria-label={`${WEEKDAY_SHORT[i]}: ${d > now ? "ещё не наступил" : s.freeByDay[i]}`}>
                <b>{d > now ? "·" : s.freeByDay[i]}</b><span className={d === now ? "today" : undefined}>{WEEKDAY_SHORT[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">В среднем за день · {s.logged.length} {plural(s.logged.length, ["день", "дня", "дней"])} с отметками</div>
          {DAILY_IDS.map((g) => {
            const pct = Math.round(s.ratio[g] * 100);
            return (
              <div className="grow" key={g}>
                <span><span className="dot" style={{ background: `var(--${g})` }} />{GROUPS[g].name}</span>
                <span className="num">{fmt(toDisplay(g, s.avg[g]))} из {fmt(toDisplay(g, s.goals[g]))} · {pct}%</span>
                <div className="bar" aria-hidden="true"><i style={{ width: `${Math.min(100, pct)}%`, background: `var(--${g})` }} /></div>
              </div>
            );
          })}
          <div className="grow" data-testid="leg-week">
            <span><span className="dot" style={{ background: "var(--leg)" }} />{GROUPS.leg.name}</span>
            <span className="num">{fmt(s.leg)} из {s.legGoal} за неделю</span>
            <div className="bar" aria-hidden="true"><i style={{ width: `${s.legGoal ? Math.min(100, (s.leg / s.legGoal) * 100) : 0}%`, background: "var(--leg)" }} /></div>
          </div>
        </div>

        {weakest && s.ratio[weakest] < 1 && (
          <div className="nudge">
            <span className="dot" style={{ background: `var(--${weakest})` }} />
            <div>Чаще всего не хватает: <strong>{GROUPS[weakest].name.toLowerCase()}</strong>. Попробуй добавить одну порцию в привычный приём пищи.</div>
          </div>
        )}

        <WeightCard data={data} />
      </section>
    </>
  );
}

function WeightCard({ data }: { data: AppData }) {
  const now = todayIso();
  const toast = useToast();
  const [val, setVal] = useState(() => (data.weights[now] ? String(data.weights[now]) : ""));
  const recent = Object.keys(data.weights).sort().reverse().slice(0, 5);
  const last = lastWeight(data.weights, now);
  const save = () => {
    const kg = Number(val.replace(",", "."));
    if (!Number.isFinite(kg) || kg < 30 || kg > 300) { toast("Введи вес в килограммах, например 68,5"); return; }
    data.setWeight(now, Math.round(kg * 10) / 10);
    toast("Вес сохранён");
  };
  return (
    <div className="card">
      <div className="eyebrow">Вес</div>
      <form className="inline" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="field">
          <span>Сегодня, кг</span>
          <input inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} placeholder={last ? String(last[1]).replace(".", ",") : "например, 68,5"} aria-label="Вес сегодня, кг" />
        </label>
        <button className="btn" type="submit">Сохранить</button>
      </form>
      {recent.length > 0 && (
        <div className="marks">
          {recent.map((d) => (
            <div className="mrow" key={d}>
              <span>{shortDate(d)} · <strong>{data.weights[d].toLocaleString("ru-RU")} кг</strong></span>
              <button className="link" onClick={() => data.setWeight(d, null)} aria-label={`Убрать вес за ${shortDate(d)}`}>убрать</button>
            </div>
          ))}
        </div>
      )}
      <p className="muted small">Достаточно раз в неделю, утром, до завтрака.</p>
    </div>
  );
}
