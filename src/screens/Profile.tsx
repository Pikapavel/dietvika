// Вкладка «Профиль» (макет Вики «Вкладка План», 24.10): неделя и сводка, календарь, статистика,
// настройки и поддержка. Заменила отдельные вкладки «Неделя» и «План»: цели плана видны на «Сегодня».
import { useEffect, useRef, useState } from "react";
import { WEEKDAY_SHORT, addDays, dayMonth, rangeLabel, shortDate, today as todayIso, weekStart, type ISODate } from "../dates";
import { streak, sumDay } from "../log";
import { contactHref, supportContact, type Plan } from "../plan";
import { lastWeight, summaryText, weekStats } from "../stats";
import { canvasFile, downloadFile, drawSummary } from "../summaryImage";
import { storageWorks, KEYS, readRaw, writeRaw } from "../storage";
import type { AppData } from "../store";
import { ConfirmDialog, Sheet } from "../components/Sheet";
import { MonthCalendar } from "../components/MonthCalendar";
import { ReminderSheet } from "../components/ReminderSheet";
import { BangButton } from "../components/SugarSheet";
import { savedReminder } from "../reminder";
import { useToast } from "../components/Toast";
import { FREE, GLASS, GROUPS, DAILY_IDS, fmt, plural, toDisplay } from "../units";

type Theme = "auto" | "light" | "dark";

export function applyTheme(t: Theme) {
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
}

export function savedTheme(): Theme {
  const t = readRaw(KEYS.theme);
  return t === "light" || t === "dark" ? t : "auto";
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function Profile({ data, plan }: { data: AppData; plan: Plan }) {
  const toast = useToast();
  const now = todayIso();
  const [anchor, setAnchor] = useState<ISODate>(now);
  const [confirm, setConfirm] = useState(false);
  const [summary, setSummary] = useState(false);
  const [remind, setRemind] = useState(false);
  const [help, setHelp] = useState(false);
  const [reminder, setReminder] = useState(savedReminder);
  const [theme, setTheme] = useState<Theme>(savedTheme);
  const s = weekStats(plan, data.log, anchor, now);
  const isCurrent = weekStart(anchor) === weekStart(now);
  const series = streak(data.log, now, s.goals);
  const weakest = s.logged.length ? [...DAILY_IDS].sort((a, b) => s.ratio[a] - s.ratio[b])[0] : null;
  const toWhom = plan.specialist === "Вика" ? "Вике" : "специалисту";
  const contact = supportContact(plan);
  const contactLink = contact ? contactHref(contact) : null;

  /** Текст сводки: поделиться или скопировать (запасной путь к картинке) */
  const send = async () => {
    const text = summaryText(plan, data.log, data.weights, now);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "DietVika — сводка за неделю", text });
        return;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
      }
    }
    toast((await copyText(text)) ? `Сводка скопирована — вставь её в чат с ${plan.specialist === "Вика" ? "Викой" : "специалистом"}` : "Не получилось скопировать");
  };

  const pickTheme = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
    writeRaw(KEYS.theme, t);
  };

  // столбцы: каждая группа даёт до 1/N высоты; сзади сетка 25/50/75/100%
  const W = 320, H = 150, bw = W / 7, top = 10, ch = H - 30;
  const name = plan.client || "Профиль";
  return (
    <>
      <header className="top profile-head">
        <div className="avatar" aria-hidden="true">{(plan.client || "Я").slice(0, 1).toUpperCase()}</div>
        <div>
          <h1>{name}</h1>
          <div className="muted small">Специалист: {plan.specialist} · план с {dayMonth(plan.start)}</div>
        </div>
      </header>
      <section className="stack">
        <div className="card">
          <div className="weekbar">
            <div className="eyebrow">Неделя {rangeLabel(s.days[0], s.days[6])}</div>
            <div className="weekbar">
              <button className="iconbtn" onClick={() => setAnchor(addDays(weekStart(anchor), -7))} aria-label="Предыдущая неделя">‹</button>
              <button className="iconbtn" disabled={isCurrent} onClick={() => setAnchor(addDays(weekStart(anchor), 7))} aria-label="Следующая неделя">›</button>
            </div>
          </div>
          <svg className="week" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Столбцы по дням недели: доля закрытия каждой группы">
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <line key={f} x1="0" x2={W} y1={top + ch * (1 - f)} y2={top + ch * (1 - f)} stroke="var(--line)" strokeDasharray={f === 1 ? "3 3" : undefined} />
            ))}
            {s.days.map((d, i) => {
              const x = i * bw + 10, w = bw - 20;
              let y = top + ch;
              const future = d > now;
              return (
                <g key={d}>
                  {!future && DAILY_IDS.map((g) => {
                    const goal = s.goals[g];
                    const h = (goal ? Math.min(sumDay(data.log, d, g) / goal, 1) : 0) * ch / DAILY_IDS.length;
                    y -= h;
                    return h > 0 ? <rect key={g} x={x} y={y} width={w} height={h} fill={`var(--${g})`} /> : null;
                  })}
                  <text x={x + w / 2} y={H - 5} textAnchor="middle" className={d === now ? "today" : undefined}>{WEEKDAY_SHORT[i]}</text>
                </g>
              );
            })}
          </svg>
          <p className="muted small">Полный столбец до пунктира — все кольца дня закрыты.</p>
        </div>

        <div className="streak">
          <b>{series}</b><span>{plural(series, ["день", "дня", "дней"])} подряд со всеми кольцами</span>
        </div>

        <button className="btn block" onClick={() => setSummary(true)}>Создать сводку</button>
        <p className="muted small" style={{ marginTop: -6 }}>Сводка за текущую неделю картинкой: какие группы в норме и чего не хватало. Можно отправить {toWhom} или сохранить.</p>

        <MonthCalendar log={data.log} plan={plan} now={now} />

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
          <div className="grow">
            <span><span className="dot" style={{ background: "var(--water)" }} />Вода</span>
            <span className="num">{fmt(s.waterAvg)} из {s.waterGoal} {plural(s.waterGoal, GLASS)}</span>
          </div>
          <div className="grow" data-testid="free-week">
            <span><span className="dot" style={{ background: "var(--free)" }} />{FREE.name}</span>
            <span className="num">{s.free} за неделю</span>
          </div>
        </div>

        {weakest && s.ratio[weakest] < 1 && (
          <div className="nudge">
            <span className="dot" style={{ background: `var(--${weakest})` }} />
            <div>Чаще всего не хватает: <strong>{GROUPS[weakest].name.toLowerCase()}</strong>. Попробуй добавить одну порцию в привычный приём пищи.</div>
          </div>
        )}

        <WeightCard data={data} />

        <div className="card">
          <div className="eyebrow">Напоминание</div>
          {reminder
            ? <p data-testid="plan-reminder">Напоминание: {reminder} ✓ <span className="muted small">— если добавили в календарь</span></p>
            : <p className="muted small">Календарь телефона раз в день напомнит заглянуть в «Что доесть».</p>}
          <button className="btn secondary block" onClick={() => setRemind(true)}>{reminder ? "Изменить время" : "Напомнить вечером"}</button>
        </div>

        <div className="card">
          <div className="eyebrow">Тема</div>
          <div className="seg" role="group" aria-label="Тема оформления" style={{ alignSelf: "flex-start" }}>
            {(["auto", "light", "dark"] as Theme[]).map((t) => (
              <button key={t} aria-pressed={theme === t} onClick={() => pickTheme(t)}>{t === "auto" ? "Как в системе" : t === "light" ? "Светлая" : "Тёмная"}</button>
            ))}
          </div>
        </div>

        {/* Поддержка — как в PumpClub: одна строка и ссылка; «!» — про консультацию специалиста */}
        <div className="card support">
          <div className="weekbar">
            <h2>Поддержка</h2>
            <BangButton onClick={() => setHelp(true)} label="Консультация специалиста" />
          </div>
          <p>Нужна помощь, есть сомнения или идея?</p>
          {contactLink
            ? <a className="support-link" href={contactLink} target="_blank" rel="noopener noreferrer">Напиши нам</a>
            : <span className="muted">Контакт появится в следующей версии.</span>}
        </div>

        <div className="card">
          <div className="eyebrow">Данные</div>
          <p className="muted small">Отметки, вес и план хранятся только на этом телефоне.{storageWorks() ? "" : " Сейчас браузер не даёт сохранять — данные пропадут после закрытия."}</p>
          <button className="btn danger block" onClick={() => setConfirm(true)}>Сбросить данные</button>
        </div>
      </section>
      {remind && <ReminderSheet onClose={() => setRemind(false)} onAdded={setReminder} />}
      {summary && (
        <SummarySheet plan={plan} data={data} now={now} toWhom={toWhom} onText={send} onClose={() => setSummary(false)} />
      )}
      {help && (
        <Sheet label="Консультация специалиста" onClose={() => setHelp(false)}>
          <div className="ghead">
            <div><h2>Если запутался</h2></div>
            <button className="close" onClick={() => setHelp(false)} aria-label="Закрыть">×</button>
          </div>
          {/* TODO: текст пишет Вика (25.10) — это черновик */}
          <p>Приложение даёт ориентиры, но не заменяет специалиста. Если непонятно, что есть, как собрать рацион под себя или почему план не работает, — это задача для консультации.</p>
          <p>Специалист разберёт твой дневник питания, подберёт план и поправит порции под твою ситуацию.</p>
          {contactLink && <a className="btn block" href={contactLink} target="_blank" rel="noopener noreferrer">Записаться на консультацию</a>}
          <p className="muted small">Вопросы и идеи по приложению — через «Напиши нам» в блоке поддержки.</p>
        </Sheet>
      )}
      {confirm && (
        <ConfirmDialog
          title="Сбросить все данные?"
          text="Удалятся план, все отметки и вес на этом телефоне. Вернуть их будет нельзя."
          confirm="Сбросить" danger
          onCancel={() => setConfirm(false)}
          onConfirm={() => { setConfirm(false); data.reset(); toast("Данные удалены"); }}
        />
      )}
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

/** Превью картинки-сводки перед отправкой: PNG через «Поделиться», иначе скачать; текст — запасной путь */
function SummarySheet({ plan, data, now, toWhom, onText, onClose }: {
  plan: Plan; data: AppData; now: ISODate; toWhom: string; onText: () => void; onClose: () => void;
}) {
  const toast = useToast();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      if (!canvas.current) return;
      await drawSummary(canvas.current, plan, data.log, now);
      const f = await canvasFile(canvas.current, `dietvika-svodka-${weekStart(now)}.png`);
      if (live) setFile(f);
    })();
    return () => { live = false; };
  }, [plan, data.log, now]);

  const sendImage = async () => {
    if (!file) return;
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "DietVika — сводка за неделю" });
        return;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
      }
    }
    downloadFile(file);
    toast(`Картинка сохранена — отправь её ${toWhom} в чате`);
  };

  return (
    <Sheet label="Сводка за неделю" onClose={onClose}>
      <div className="ghead">
        <div><div className="eyebrow">Сводка за неделю</div><h2>Картинка для {toWhom === "Вике" ? "Вики" : "специалиста"}</h2></div>
        <button className="close" onClick={onClose} aria-label="Закрыть">×</button>
      </div>
      <canvas ref={canvas} className="summary-img" data-testid="summary-canvas" role="img"
        aria-label="Превью сводки: группы в норме и чего не хватало за неделю" />
      <button className="btn block" onClick={sendImage} disabled={!file}>Отправить картинку</button>
      <button className="btn secondary block" onClick={onText}>Отправить текстом</button>
      <p className="muted small">Картинка без калорий: по каждой группе — сколько дней цель была набрана. В тексте — средние порции, вода и вес.</p>
    </Sheet>
  );
}
