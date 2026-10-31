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
import { PasteLink } from "../components/PasteLink";
import { ReminderSheet } from "../components/ReminderSheet";
import { BangButton } from "../components/SugarSheet";
import { savedReminder } from "../reminder";
import { useToast } from "../components/Toast";
import { FAT, FREE, GLASS, GROUPS, DAILY_IDS, fmt, plural, toDisplay } from "../units";

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
  const [myGoal, setMyGoal] = useState(() => readRaw(KEYS.goal) ?? "");
  const [goalEdit, setGoalEdit] = useState(false);
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

  // столбцы: каждая группа даёт до 1/N высоты; сетка как в образце Вики (25.10):
  // горизонтальные линии 0/50/100% и пунктир между днями, верх столбца скруглён
  const W = 320, H = 150, bw = W / 7, top = 10, ch = H - 30, r = 5;
  const name = plan.client || "Профиль";
  const goalText = myGoal || plan.goal || "";
  return (
    <>
      <header className="top profile-head">
        <Avatar letter={(plan.client || "Я").slice(0, 1).toUpperCase()} />
        <div>
          <h1>{name}</h1>
          <div className="muted small">{plan.self ? "План подобран самостоятельно" : `Специалист: ${plan.specialist}`} · с {dayMonth(plan.start)}</div>
        </div>
      </header>
      <section className="stack">
        <button className="goal-card" onClick={() => setGoalEdit(true)} aria-haspopup="dialog">
          <span>
            <span className="goal-label">Моя цель</span>
            <span className={goalText ? "goal-text" : "goal-text empty"}>{goalText || "Напиши свою цель"}</span>
          </span>
          <Lighthouse />
        </button>

        <div className="card">
          <div className="weekbar">
            <div className="eyebrow">Неделя {rangeLabel(s.days[0], s.days[6])}</div>
            <div className="weekbar">
              <button className="iconbtn" onClick={() => setAnchor(addDays(weekStart(anchor), -7))} aria-label="Предыдущая неделя">‹</button>
              <button className="iconbtn" disabled={isCurrent} onClick={() => setAnchor(addDays(weekStart(anchor), 7))} aria-label="Следующая неделя">›</button>
            </div>
          </div>
          <svg className="week" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Столбцы по дням недели: доля закрытия каждой группы">
            {[0, 0.5, 1].map((f) => (
              <line key={f} x1="0" x2={W} y1={top + ch * (1 - f)} y2={top + ch * (1 - f)} stroke="var(--line)" strokeWidth={f === 0 ? 1.5 : 1} />
            ))}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <line key={i} x1={i * bw} x2={i * bw} y1={0} y2={H} stroke="var(--line)" strokeDasharray="3 3" />
            ))}
            {s.days.map((d, i) => {
              const x = i * bw + 8, w = bw - 16;
              let y = top + ch;
              const future = d > now;
              const parts = future ? [] : DAILY_IDS.map((g) => {
                const goal = s.goals[g];
                const h = (goal ? Math.min(sumDay(data.log, d, g) / goal, 1) : 0) * ch / DAILY_IDS.length;
                y -= h;
                return { g, y, h };
              });
              const total = top + ch - y;
              return (
                <g key={d}>
                  {total > 0 && (
                    <>
                      <clipPath id={`bar-${i}`}>
                        <path d={`M${x} ${top + ch}V${y + Math.min(r, total)}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + Math.min(r, total)}V${top + ch}Z`} />
                      </clipPath>
                      <g clipPath={`url(#bar-${i})`}>
                        {parts.map((p) => (p.h > 0 ? <rect key={p.g} x={x} y={p.y} width={w} height={p.h} fill={`var(--${p.g})`} /> : null))}
                      </g>
                    </>
                  )}
                  <text x={i * bw + bw / 2} y={H - 5} textAnchor="middle" className={d === now ? "today" : undefined}>{WEEKDAY_SHORT[i]}</text>
                </g>
              );
            })}
          </svg>
          <p className="muted small">Столбец до верхней линии — все кольца дня закрыты.</p>
        </div>

        <div className="streak">
          <div><b>{series}</b> <span className="streak-days">{plural(series, ["день", "дня", "дней"])}</span></div>
          <div className="streak-sub">подряд со всеми кольцами</div>
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
          <div className="grow">
            <span><span className="dot" style={{ background: "var(--fat)" }} />{FAT.name}</span>
            <span className="num">{fmt(s.fatAvg)} в день · норма 2–3</span>
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
          {/* «!» слева от заголовка, светлый, как «Что такое Пауза?» в Prosto (Вика, 25.10) */}
          <div className="support-head">
            <BangButton onClick={() => setHelp(true)} label="Консультация специалиста" light />
            <h2>Поддержка</h2>
          </div>
          <p>Нужна помощь, есть сомнения или идея?</p>
          {contactLink
            ? <a className="support-link" href={contactLink} target="_blank" rel="noopener noreferrer">Напиши нам</a>
            : <span className="muted">Контакт появится в следующей версии.</span>}
        </div>

        <details className="card paste">
          <summary>Новый план от специалиста</summary>
          <PasteLink compact />
        </details>

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
      {goalEdit && (
        <GoalSheet value={goalText} fromPlan={plan.goal ?? ""} onClose={() => setGoalEdit(false)}
          onSave={(v) => { setMyGoal(v); writeRaw(KEYS.goal, v); setGoalEdit(false); }} />
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

/** Аватар: буква или фото. Фото уменьшаем до 192×192 и храним на телефоне */
function Avatar({ letter }: { letter: string }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState(() => readRaw(KEYS.avatar) ?? "");
  const pick = async (f: File | undefined) => {
    if (!f) return;
    try {
      const url = await squareThumb(f, 192);
      writeRaw(KEYS.avatar, url);
      setSrc(url);
    } catch {
      toast("Не получилось открыть картинку");
    }
  };
  return (
    <button className="avatar" onClick={() => input.current?.click()} aria-label={src ? "Сменить фото профиля" : "Добавить фото профиля"}>
      {src ? <img src={src} alt="" /> : <span aria-hidden="true">{letter}</span>}
      <span className="avatar-add" aria-hidden="true">+</span>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
    </button>
  );
}

function squareThumb(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const c = document.createElement("canvas");
      c.width = c.height = size;
      c.getContext("2d")!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    img.src = url;
  });
}

/** Маяк вместо кубка (идея из отзыва Андрея, 25.10) */
function Lighthouse() {
  return (
    <svg className="lighthouse" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
      <path d="M8 16l14 4M8 28l14-4M56 16l-14 4M56 28l-14-4" stroke="var(--grain)" />
      <path d="M26 14h12v12H26z" />
      <path d="M24 14l8-7 8 7" />
      <path d="M26 26l-4 30h20l-4-30" />
      <path d="M24.5 38h15M23.3 47h17.4" />
      <path d="M14 56h36" />
    </svg>
  );
}

function GoalSheet({ value, fromPlan, onSave, onClose }: { value: string; fromPlan: string; onSave: (v: string) => void; onClose: () => void }) {
  const [v, setV] = useState(value);
  return (
    <Sheet label="Моя цель" onClose={onClose}>
      <div className="ghead">
        <div><h2>Моя цель</h2></div>
        <button className="close" onClick={onClose} aria-label="Закрыть">×</button>
      </div>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); onSave(v.trim().slice(0, 80)); }}>
        <label className="field"><span>Ради чего я ем по плану</span>
          <input value={v} maxLength={80} onChange={(e) => setV(e.target.value)} placeholder="например, снизить вес до 65 кг" /></label>
        {fromPlan && <p className="muted small">Цель из плана: {fromPlan}. Если поле оставить пустым, покажем её.</p>}
        <button className="btn block" type="submit">Сохранить</button>
      </form>
    </Sheet>
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
