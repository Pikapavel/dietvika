// Вкладка «Порции» — справочник (макет Вики 24.10): меры руками (тарелку Вика убрала 25.10: она уже есть в онбординге), плитки «По темам»
// (как в приложении Prosto), ниже — советы и пример дня. Плитка группы открывает ту же шпаргалку, что на «Сегодня».
import { useState } from "react";
import { today as todayIso } from "../dates";
import { legWeekGoal, planGoals, type Plan } from "../plan";
import type { AppData } from "../store";
import { SugarSheet } from "../components/SugarSheet";
import { HandIcon } from "../components/HandIcon";
import { Sheet } from "../components/Sheet";
import { ExampleDay, HandsGrid, Tips } from "../components/Method";
import { go } from "../store";
import { EMOJI, GroupSheet, groupEmoji } from "./Today";
import { FREE, GROUPS, WATER, type GroupId } from "../units";

/** Порядок плиток по макету Вики: фрукты и овощи, зерновые, бобовые, белки, молочные */
const TOPICS: GroupId[] = ["fv", "grain", "leg", "prot", "dairy"];

type Open = GroupId | "sugar" | "tips" | "day" | null;

export function Portions({ data, plan }: { data: AppData; plan: Plan }) {
  const [open, setOpen] = useState<Open>(null);
  const now = todayIso();
  const goals = planGoals(plan);
  const veg = !!plan.veg;
  return (
    <>
      <header className="top">
        <div><div className="eyebrow">Справочник</div><h1>Порции</h1></div>
        <button className="btn secondary" style={{ minHeight: 36, padding: "6px 12px", fontSize: ".85rem" }} onClick={() => go("#/intro")}>Как пользоваться</button>
      </header>
      <section className="stack">
        <div className="card">
          <div className="eyebrow">Как мерить порции</div>
          <HandsGrid />
          <p className="muted small">Размеры порций приблизительны и зависят от продукта. Бобовые считаем за неделю. Молочные меряем стаканом.</p>
        </div>

        <h2 className="topics-h">По темам</h2>
        <div className="topics">
          {TOPICS.map((g) => (
            <button key={g} className="topic" style={{ ["--gc" as string]: `var(--${g})` }} onClick={() => setOpen(g)} aria-haspopup="dialog">
              <span className="temoji" aria-hidden="true">{g === "prot" ? groupEmoji(g, veg) : EMOJI[g]}</span>
              <span>{g === "prot" ? "Белки" : GROUPS[g].name}</span>
            </button>
          ))}
          <button className="topic" style={{ ["--gc" as string]: "var(--free)" }} onClick={() => setOpen("sugar")} aria-haspopup="dialog">
            <span className="temoji" aria-hidden="true">🍬</span><span>Сахар</span>
          </button>
          <button className="topic wide" onClick={() => setOpen("tips")} aria-haspopup="dialog">
            <span className="temoji" aria-hidden="true">💡</span><span>Советы: масло, соль, вода, свободный приём пищи</span>
          </button>
          <button className="topic wide" onClick={() => setOpen("day")} aria-haspopup="dialog">
            <span className="temoji" aria-hidden="true">🍽️</span><span>Пример дня</span>
          </button>
        </div>
      </section>

      {open && open !== "sugar" && open !== "tips" && open !== "day" && (
        <GroupSheet g={open} date={now} isToday data={data} goal={open === "leg" ? legWeekGoal(plan) : goals[open]} veg={veg} onClose={() => setOpen(null)} />
      )}
      {open === "sugar" && <SugarSheet onClose={() => setOpen(null)} />}
      {open === "tips" && (
        <Sheet label="Советы" onClose={() => setOpen(null)}>
          <SimpleHead title="Советы" onClose={() => setOpen(null)} />
          <Tips onSugar={() => setOpen("sugar")} />
          <div className="hint">
            <HandIcon shape="drop" color="var(--water)" />
            <div><h3 style={{ color: "var(--water)" }}>{WATER.name}</h3><p style={{ marginTop: 4 }}><strong>{WATER.hint}</strong></p><p className="muted">{WATER.why}</p></div>
          </div>
          <div className="hint">
            <HandIcon shape="star" color="var(--free)" />
            <div>
              <h3 style={{ color: "var(--free)" }}>{FREE.name}</h3>
              <p style={{ marginTop: 4 }}><strong>{FREE.hint} Отмечай столько, сколько было, — без лимита.</strong></p>
              <p className="muted">{FREE.why}</p>
              <p style={{ marginTop: 4 }}>Что сюда относится: {FREE.kinds.map((k) => k.toLowerCase()).join("; ")}.</p>
            </div>
          </div>
        </Sheet>
      )}
      {open === "day" && (
        <Sheet label="Пример дня" onClose={() => setOpen(null)}>
          <SimpleHead title="Пример дня" onClose={() => setOpen(null)} />
          <p className="muted small">Как приёмы пищи за день набирают все группы. Точное число порций — в твоём плане.</p>
          <div className="card"><ExampleDay /></div>
        </Sheet>
      )}
    </>
  );
}

function SimpleHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="ghead">
      <div><h2>{title}</h2></div>
      <button className="close" onClick={onClose} aria-label="Закрыть">×</button>
    </div>
  );
}
