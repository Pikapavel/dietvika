import { useMemo, useState } from "react";
import foodsData from "../data/foods.json";
import { addDays, longDate, today as todayIso, type ISODate } from "../dates";
import { sumDay, sumWeek, type Entry, type LogGroup } from "../log";
import { legWeekGoal, planGoals, waterGoal, type Plan } from "../plan";
import type { AppData } from "../store";
import { HandIcon } from "../components/HandIcon";
import { RingRow } from "../components/Rings";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import { BangButton, SugarSheet } from "../components/SugarSheet";
import { ReminderSheet } from "../components/ReminderSheet";
import { savedReminder } from "../reminder";
import {
  DAILY_IDS, FREE, GLASS, SUGAR, VEG_NOTE, VEG_WHY, vegProteinOrder, GROUPS, GROUP_IDS, PICKER, WATER, fmt, fromDisplay, handLines, nudgeText, plural,
  portions, portionsAcc, toDisplay, type DailyId, type GroupId,
} from "../units";

interface Food { g: GroupId | "free"; name: string; hand: string; q: number; grams?: string; note?: string }
const FOODS = foodsData as Food[];

type Open = GroupId | "water" | "free" | "sugar" | "reminder" | null;

export function Today({ data, plan }: { data: AppData; plan: Plan }) {
  const now = todayIso();
  const [date, setDate] = useState<ISODate>(now);
  const [open, setOpen] = useState<Open>(null);
  // ссылка «Напомнить вечером» внутри «Что доесть» — пока напоминание не добавляли
  const [reminder, setReminder] = useState(savedReminder);
  const isToday = date === now;
  const goals = planGoals(plan);
  const wGoal = waterGoal(plan);
  const { log } = data;

  const eaten = useMemo(() => {
    const r = {} as Record<GroupId, number>;
    for (const g of GROUP_IDS) r[g] = sumDay(log, date, g);
    return r;
  }, [log, date]);
  const progress = useMemo(() => {
    const r = {} as Record<DailyId, number>;
    for (const g of DAILY_IDS) r[g] = goals[g] > 0 ? eaten[g] / goals[g] : 1;
    return r;
  }, [eaten, goals]);
  const closed = DAILY_IDS.filter((g) => progress[g] >= 1 - 1e-9).length;
  // бобовые — счётчик за неделю (пн–вс) выбранного дня
  const legWeek = sumWeek(log, date, "leg");
  const legGoal = legWeekGoal(plan);

  // «Что доесть»: дневная группа дальше всех от цели; если день закрыт — бобовые до цели недели
  const behind = DAILY_IDS.filter((g) => progress[g] < 1 - 1e-9).sort((a, b) => progress[a] - progress[b])[0];
  const legLeft = legGoal - legWeek;

  const water = sumDay(log, date, "water");
  // свободный приём пищи — счётчик за выбранный день, без цели и лимита
  const free = sumDay(log, date, "free");

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">{longDate(date)}</div>
          <h1>{isToday ? "Сегодня" : "Вчера"}</h1>
        </div>
        <div className="seg" role="group" aria-label="Какой день заполняем">
          <button aria-pressed={!isToday} onClick={() => setDate(addDays(now, -1))}>Вчера</button>
          <button aria-pressed={isToday} onClick={() => setDate(now)}>Сегодня</button>
        </div>
      </header>

      <section className="stack">
        {!isToday && <div className="banner">Заполняешь вчерашний день: все отметки попадут во вчера.</div>}

        <div className="ring-card">
          <div className="head"><span>Закрыто колец</span><span>{closed} из {DAILY_IDS.length}</span></div>
          <RingRow items={DAILY_IDS.map((g) => ({
            id: g, value: fmt(toDisplay(g, eaten[g])), goal: fmt(toDisplay(g, goals[g])), pct: progress[g],
          }))} />
        </div>

        {isToday && (() => {
          // «Напомнить вечером» — в том же поле, что и «Что доесть»: это одно действие (Вика, 19.10)
          const remind = !reminder && (
            <button className="link small remind-in" onClick={() => setOpen("reminder")}>Напомнить вечером, что доесть</button>
          );
          return behind ? (
            <div className="nudge" role="status">
              <span className="dot" style={{ background: `var(--${behind})` }} />
              <div><strong>Что доесть.</strong> {nudgeText(behind, goals[behind] - eaten[behind], !!plan.veg)}{remind}</div>
            </div>
          ) : legLeft > 1e-9 ? (
            <div className="nudge" role="status">
              <span className="dot" style={{ background: "var(--leg)" }} />
              <div><strong>Кольца дня закрыты.</strong> {nudgeText("leg", legLeft)}{remind}</div>
            </div>
          ) : (
            <div className="nudge" role="status"><span className="dot" style={{ background: "var(--ok)" }} /><div>Все кольца закрыты. Отличный день!</div></div>
          );
        })()}

        <p className="muted small">Плюс и минус отмечают порцию сразу: например, 1 ладонь белка — это 3 порции. Нажми на название группы — там шпаргалка по порциям и продуктам.</p>

        <div className="rows">
          {GROUP_IDS.map((g) => {
            if (g === "leg") return (
              <Tile key={g} id={g} name={GROUPS[g].name} color="var(--leg)" emoji={EMOJI[g]}
                value={fmt(legWeek)} goal={legGoal ? `/${legGoal}` : ""} pct={legGoal ? legWeek / legGoal : undefined}
                sub="за неделю"
                label={legGoal && legWeek >= legGoal ? "цель недели есть" : legGoal ? `ещё ${fmt(legGoal - legWeek)} за неделю` : "за неделю"}
                canMinus={eaten[g] > 0}
                onOpen={() => setOpen(g)}
                onPlus={() => data.add(date, g, "Порция", fromDisplay(g, 1))}
                onMinus={() => data.minus(date, g, fromDisplay(g, 1))}
                unitName="порция"
              />
            );
            const n = toDisplay(g, eaten[g]);
            const goal = toDisplay(g, goals[g]);
            const done = eaten[g] >= goals[g] - 1e-9;
            return (
              <Tile key={g} id={g} name={GROUPS[g].name} color={`var(--${g})`} emoji={groupEmoji(g, !!plan.veg)}
                value={fmt(n)} goal={`/${fmt(goal)}`} pct={goal ? n / goal : 0}
                label={done ? "кольцо закрыто" : `ещё ${fmt(goal - n)}`}
                canMinus={eaten[g] > 0}
                onOpen={() => setOpen(g)}
                onPlus={() => data.add(date, g, "Порция", fromDisplay(g, 1))}
                onMinus={() => data.minus(date, g, fromDisplay(g, 1))}
                unitName="порция"
              />
            );
          })}
          <Tile id="water" name={WATER.name} color="var(--water)" emoji="💧"
            value={String(water)} goal={`/${wGoal}`} pct={water / wGoal}
            sub={`${litres(water)} л / ${litres(wGoal)} л`}
            label={water >= wGoal ? "норма воды есть" : `ещё ${wGoal - water} ${plural(wGoal - water, GLASS)}`}
            canMinus={water > 0}
            onOpen={() => setOpen("water")}
            onPlus={() => data.add(date, "water", "Стакан воды", 1)}
            onMinus={() => data.minus(date, "water", 1)}
            unitName="стакан воды"
          />
          <Tile id="free" name={FREE.name} color="var(--free)" emoji="🍰"
            value={String(free)} goal="" sub={isToday ? "сегодня" : "вчера"}
            canMinus={free > 0}
            onOpen={() => setOpen("free")}
            onPlus={() => data.add(date, "free", FREE.name, 1)}
            onMinus={() => data.minus(date, "free", 1)}
            unitName="отметка"
          />
        </div>
        <div className="sugar-line">
          <span>{SUGAR.line}</span>
          <BangButton onClick={() => setOpen("sugar")} label="Сахар: подробнее" />
        </div>
      </section>

      {open === "reminder" && <ReminderSheet onClose={() => setOpen(null)} onAdded={setReminder} />}
      {open && open !== "water" && open !== "free" && open !== "sugar" && open !== "reminder" && (
        <GroupSheet g={open} date={date} isToday={isToday} data={data} goal={open === "leg" ? legGoal : goals[open]} veg={!!plan.veg} onClose={() => setOpen(null)} />
      )}
      {open === "water" && <WaterSheet date={date} isToday={isToday} data={data} goal={wGoal} onClose={() => setOpen(null)} />}
      {open === "free" && (
        <FreeSheet date={date} isToday={isToday} data={data} count={free} onClose={() => setOpen(null)} onSugar={() => setOpen("sugar")} />
      )}
      {open === "sugar" && <SugarSheet onClose={() => setOpen(null)} />}
    </>
  );
}

/** Строка группы (как у Арнольда): эмодзи, название (i) | − счётчик + ; ниже — тонкая полоска */
function Tile(p: {
  id: string; name: string; color: string; emoji: string; value: string; goal: string; pct?: number;
  /** подпись под названием (вода: литры; свободный приём: «сегодня») */
  sub?: string;
  /** текст для скринридера: «ещё 2», «кольцо закрыто» */
  label?: string;
  canMinus: boolean; unitName: string;
  onOpen: () => void; onPlus: () => void; onMinus: () => void;
}) {
  const width = Math.max(0, Math.min(1, p.pct ?? 0)) * 100;
  return (
    <div className="gr" data-tile={p.id}>
      <span className="gemoji" onClick={p.onOpen} aria-hidden="true">{p.emoji}</span>
      <div className="gmain">
        <button className="tname" onClick={p.onOpen} aria-haspopup="dialog">
          <span>{p.name}</span><span className="info" aria-hidden="true">i</span>
          <span className="sr-only">: подсказки и продукты</span>
        </button>
        {p.sub && <small>{p.sub}</small>}
      </div>
      <button className="pmb" onClick={p.onMinus} disabled={!p.canMinus} aria-label={`Минус: ${p.unitName}, ${p.name}`}>−</button>
      <b className="gcount" aria-label={`${p.name}: ${p.value}${p.goal ? ` из ${p.goal.slice(1)}` : ""}${p.label ? `, ${p.label}` : ""}`}>
        {p.value}<span className="muted">{p.goal}</span>
      </b>
      <button className="pmb plus" onClick={p.onPlus} aria-label={`Плюс: ${p.unitName}, ${p.name}`} style={{ background: p.color }}>+</button>
      {p.pct !== undefined && <div className="bar" aria-hidden="true"><i style={{ width: `${width}%`, background: p.color }} /></div>}
    </div>
  );
}

const EMOJI: Record<GroupId, string> = { fv: "🥦", leg: "🫘", grain: "🍞", prot: "🍗", dairy: "🥛" };
function groupEmoji(g: GroupId, veg: boolean): string {
  return g === "prot" && veg ? "🥚" : EMOJI[g];
}
/** стаканы → литры: 0,25 л на стакан, «1,5» */
function litres(glasses: number): string {
  return (glasses * WATER.ml / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function SheetHead({ eyebrow, title, color, onClose }: { eyebrow: string; title: string; color: string; onClose: () => void }) {
  return (
    <div className="ghead">
      <div><div className="eyebrow">{eyebrow}</div><h2 style={{ color }}>{title}</h2></div>
      <button className="close" onClick={onClose} aria-label="Закрыть">×</button>
    </div>
  );
}

function Marks({ title, items, label, onRemove }: {
  title: string; items: { e: Entry; i: number; d: ISODate }[]; label: (e: Entry, d: ISODate) => string;
  onRemove: (d: ISODate, i: number) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="card marks">
      <div className="eyebrow">{title}</div>
      {items.map(({ e, i, d }) => (
        <div className="mrow" key={`${d}-${i}-${e.t}`}>
          <span>{label(e, d)}</span>
          <button className="link" onClick={() => onRemove(d, i)} aria-label={`Убрать: ${label(e, d)}`}>убрать</button>
        </div>
      ))}
    </div>
  );
}

function entriesOf(data: AppData, d: ISODate, g: LogGroup) {
  return (data.log[d] ?? []).map((e, i) => ({ e, i, d })).filter((x) => x.e.g === g);
}

function GroupSheet({ g, date, isToday, data, goal, veg, onClose }: {
  g: GroupId; date: ISODate; isToday: boolean; data: AppData; goal: number; veg: boolean; onClose: () => void;
}) {
  const [sel, setSel] = useState(1);
  const toast = useToast();
  const color = `var(--${g})`;
  // бобовые: в заголовке — сумма за неделю и цель недели
  const n = g === "leg" ? sumWeek(data.log, date, g) : sumDay(data.log, date, g);
  const groupFoods = FOODS.filter((f) => f.g === g);
  const foods = veg && g === "prot" ? vegProteinOrder(groupFoods) : groupFoods;
  const add = (name: string, usda: number) => {
    data.add(date, g, name, usda);
    toast(`${name}: +${portions(toDisplay(g, usda))}`);
  };
  return (
    <Sheet label={GROUPS[g].name} onClose={onClose}>
      <SheetHead eyebrow={`${g === "leg" ? "За неделю" : isToday ? "Сегодня" : "Вчера"} ${fmt(toDisplay(g, n))} из ${fmt(toDisplay(g, goal))}`}
        title={GROUPS[g].name} color={color} onClose={onClose} />
      <div className="hint">
        <HandIcon shape={GROUPS[g].shape} color={color} />
        <div>
          <strong>Одна порция рукой</strong>
          <ul>{handLines(g, veg).map((l) => <li key={l}>{l}</li>)}</ul>
          <p className="muted" style={{ marginTop: 6 }}>{veg && g === "prot" ? VEG_WHY : GROUPS[g].why}</p>
          {veg && g === "prot" && <p style={{ marginTop: 6 }}><strong>Вегетарианский план.</strong> {VEG_NOTE}</p>}
        </div>
      </div>
      <div>
        <div className="eyebrow" style={{ marginBottom: 6 }} id={`pick-${g}`}>Сколько</div>
        <div className="picker" role="group" aria-labelledby={`pick-${g}`}>
          {PICKER.map((v) => (
            <button key={v} aria-pressed={v === sel} onClick={() => setSel(v)} style={v === sel ? { background: color } : undefined}>{fmt(v)}</button>
          ))}
        </div>
      </div>
      <button className="btn block" style={{ background: color, color: "var(--on-color)" }} onClick={() => add("Порция", fromDisplay(g, sel))}>
        Отметить {portionsAcc(sel)}
      </button>
      <Marks title={isToday ? "Отмечено сегодня" : "Отмечено вчера"} items={entriesOf(data, date, g)}
        label={(e) => `${e.f} · ${portions(toDisplay(g, e.q))}`} onRemove={data.removeAt} />
      <div>
        <h3 className="list-h">Продукты · 1 мера рукой × «Сколько»</h3>
        {foods.map((f) => {
          const usda = f.q * sel;
          return (
            <div className="food" key={f.name}>
              <span>
                {f.name}
                <small>{f.hand}{f.grams ? ` · ${f.grams.startsWith("≈") ? "" : "≈ "}${f.grams}` : ""}{f.note ? ` · ${f.note}` : ""}</small>
              </span>
              <button className="add" style={{ background: color }} onClick={() => add(f.name, usda)}
                aria-label={`${f.name}: плюс ${portions(toDisplay(g, usda))}`}>
                +{fmt(toDisplay(g, usda))}
              </button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

function WaterSheet({ date, isToday, data, goal, onClose }: { date: ISODate; isToday: boolean; data: AppData; goal: number; onClose: () => void }) {
  const n = sumDay(data.log, date, "water");
  return (
    <Sheet label={WATER.name} onClose={onClose}>
      <SheetHead eyebrow={`${isToday ? "Сегодня" : "Вчера"} ${n} из ${goal}`} title={WATER.name} color="var(--water)" onClose={onClose} />
      <div className="hint">
        <HandIcon shape="drop" color="var(--water)" />
        <div><strong>{WATER.hint}</strong><p className="muted" style={{ marginTop: 4 }}>{WATER.why} Цель — {goal} {plural(goal, GLASS)} в день.</p></div>
      </div>
      <div className="row-btns">
        {[1, 2].map((k) => (
          <button key={k} className="btn" style={{ background: "var(--water)", color: "var(--on-color)" }}
            onClick={() => data.add(date, "water", k === 1 ? "Стакан воды" : "2 стакана воды", k)}>
            + {k} {plural(k, GLASS)}
          </button>
        ))}
      </div>
      <Marks title="Отмечено" items={entriesOf(data, date, "water")} label={(e) => `${e.f}`} onRemove={data.removeAt} />
    </Sheet>
  );
}

function FreeSheet({ date, isToday, data, count, onClose, onSugar }: {
  date: ISODate; isToday: boolean; data: AppData; count: number; onClose: () => void; onSugar: () => void;
}) {
  const toast = useToast();
  const items = entriesOf(data, date, "free");
  return (
    <Sheet label={FREE.name} onClose={onClose}>
      <SheetHead eyebrow={`${isToday ? "Сегодня" : "Вчера"}: ${count}`} title={FREE.name} color="var(--free)" onClose={onClose} />
      <div className="hint">
        <HandIcon shape="star" color="var(--free)" />
        <div>
          <strong>{FREE.hint}</strong>
          <p className="muted" style={{ marginTop: 4 }}>{FREE.why}</p>
        </div>
      </div>
      <div>
        <h3 className="list-h">Что сюда относится</h3>
        {FREE.kinds.map((k) => (
          <div className="food" key={k}>
            <span>{k}</span>
            <button className="add" style={{ background: "var(--free)" }} aria-label={`Отметить: ${k}`}
              onClick={() => { data.add(date, "free", k, 1); toast("Отмечено: свободный приём пищи"); }}>+1</button>
          </div>
        ))}
      </div>
      <div className="sugar-line">
        <span>{SUGAR.line}</span>
        <BangButton onClick={onSugar} label="Сахар: подробнее" />
      </div>
      <Marks title={isToday ? "Отмечено сегодня" : "Отмечено вчера"} items={items} label={(e) => e.f} onRemove={data.removeAt} />
    </Sheet>
  );
}
