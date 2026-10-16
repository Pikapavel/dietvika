import { useEffect, useRef, useState } from "react";
import { dayMonth, today as todayIso, weekStart, type ISODate } from "../dates";
import { LEVELS, legWeekGoal, levelNumber, planGoals, waterGoal, type Plan } from "../plan";
import { summaryText } from "../stats";
import { canvasFile, downloadFile, drawSummary } from "../summaryImage";
import { storageWorks, KEYS, readRaw, writeRaw } from "../storage";
import type { AppData } from "../store";
import { ConfirmDialog, Sheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import { GLASS, DAILY_IDS, GROUPS, plural, portions, toDisplay } from "../units";

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

export function PlanScreen({ data, plan }: { data: AppData; plan: Plan }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [summary, setSummary] = useState(false);
  const [theme, setTheme] = useState<Theme>(savedTheme);
  const goals = planGoals(plan);
  const w = waterGoal(plan);
  const now = todayIso();

  const toWhom = plan.specialist === "Вика" ? "Вике" : "специалисту";

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

  return (
    <>
      <header className="top">
        <div><div className="eyebrow">{plan.client || "Мой план"}</div><h1>План</h1></div>
        <span className="chip">Уровень {levelNumber(plan.kcal)} из {LEVELS.length}</span>
      </header>
      <section className="stack">
        <div className="card">
          <dl className="kv" style={{ margin: 0 }}>
            <dt>Специалист</dt><dd>{plan.specialist}</dd>
            <dt>Старт плана</dt><dd>{dayMonth(plan.start)}</dd>
            {plan.veg && <><dt>Питание</dt><dd>Вегетарианский план</dd></>}
          </dl>
        </div>
        <div className="card">
          <div className="eyebrow">Порций в день</div>
          {DAILY_IDS.map((g) => (
            <div className="grow" key={g}>
              <span><span className="dot" style={{ background: `var(--${g})` }} />{GROUPS[g].name}</span>
              <span className="num">{portions(toDisplay(g, goals[g]))}</span>
            </div>
          ))}
          <div className="grow"><span><span className="dot" style={{ background: "var(--leg)" }} />{GROUPS.leg.name}</span><span className="num">{portions(legWeekGoal(plan))} в неделю</span></div>
          <div className="grow"><span><span className="dot" style={{ background: "var(--water)" }} />Вода</span><span className="num">{w} {plural(w, GLASS)}</span></div>
          <p className="muted small">План меняет специалист: пришлёт новую ссылку — открой её на этом телефоне.</p>
        </div>

        <button className="btn block" onClick={() => setSummary(true)}>Отправить сводку {toWhom}</button>
        <p className="muted small" style={{ marginTop: -6 }}>Сводка за текущую неделю картинкой: какие группы в норме и чего не хватало. Можно отправить и текстом.</p>

        <div className="card">
          <div className="eyebrow">Тема</div>
          <div className="seg" role="group" aria-label="Тема оформления" style={{ alignSelf: "flex-start" }}>
            {(["auto", "light", "dark"] as Theme[]).map((t) => (
              <button key={t} aria-pressed={theme === t} onClick={() => pickTheme(t)}>{t === "auto" ? "Как в системе" : t === "light" ? "Светлая" : "Тёмная"}</button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">Данные</div>
          <p className="muted small">Отметки, вес и план хранятся только на этом телефоне.{storageWorks() ? "" : " Сейчас браузер не даёт сохранять — данные пропадут после закрытия."}</p>
          <button className="btn danger block" onClick={() => setConfirm(true)}>Сбросить данные</button>
        </div>
      </section>
      {summary && (
        <SummarySheet plan={plan} data={data} now={now} toWhom={toWhom} onText={send} onClose={() => setSummary(false)} />
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
