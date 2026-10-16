import { dayMonth } from "../dates";
import { legWeekGoal, planGoals, waterGoal, type Plan } from "../plan";
import { GLASS, DAILY_IDS, GROUPS, plural, toDisplay, portions } from "../units";

export function ConfirmPlan({ plan, hasPlan, onAccept, onCancel }: { plan: Plan; hasPlan: boolean; onAccept: () => void; onCancel: () => void }) {
  const goals = planGoals(plan);
  const w = waterGoal(plan);
  return (
    <div className="welcome">
      <div className="eyebrow">Новый план</div>
      <h1>{plan.specialist} назначила тебе план{plan.client ? `, ${plan.client}` : ""}</h1>
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
        <p className="muted small">Старт: {dayMonth(plan.start)}.{plan.veg ? " Вегетарианский план: белка в полтора раза больше." : ""}</p>
      </div>
      {hasPlan && <div className="banner">Этот план заменит текущий. Твои отметки и вес сохранятся.</div>}
      <div className="row-btns">
        <button className="btn secondary" onClick={onCancel}>Не сейчас</button>
        <button className="btn" onClick={onAccept}>Принять план</button>
      </div>
    </div>
  );
}
