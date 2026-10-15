// #/vika — конструктор ссылки для специалиста. Без входа, только для теста.
import { useMemo, useState } from "react";
import { today as todayIso } from "../dates";
import { ACTIVITY_LABEL, suggestLevel, type Activity, type Goal, type Sex } from "../nasem";
import { LEVELS, inviteLink, suggestedGoals, type Goals, type Plan } from "../plan";
import { useToast } from "../components/Toast";
import { copyText } from "./PlanScreen";
import { GROUPS, GROUP_IDS, WATER, type GroupId } from "../units";

const kcal = (n: number) => Math.round(n).toLocaleString("ru-RU");

export function Builder() {
  const toast = useToast();
  const [client, setClient] = useState("");
  const [specialist, setSpecialist] = useState("Вика");
  const [sex, setSex] = useState<Sex>("f");
  const [age, setAge] = useState("35");
  const [height, setHeight] = useState("165");
  const [weight, setWeight] = useState("70");
  const [act, setAct] = useState<Activity>("low");
  const [goal, setGoal] = useState<Goal>("lose");
  const [start, setStart] = useState(todayIso());
  const [veg, setVeg] = useState(false);
  const [levelOverride, setLevelOverride] = useState<number | null>(null);
  const [goalEdits, setGoalEdits] = useState<Partial<Record<GroupId, string>>>({});
  const [water, setWater] = useState(String(WATER.defaultGoal));
  const [link, setLink] = useState("");

  const A = Number(age), H = Number(height), W = Number(weight);
  const valid = A >= 19 && A <= 100 && H >= 120 && H <= 230 && W >= 30 && W <= 300;
  const sug = useMemo(() => (valid ? suggestLevel(sex, act, A, H, W, goal) : null), [valid, sex, act, A, H, W, goal]);
  const level = levelOverride ?? sug?.level ?? 1800;
  // предложенные цели: таблица USDA, у вегетарианца белок ×1,5
  const table = suggestedGoals(level, veg);

  const effective = (g: GroupId) => {
    const v = goalEdits[g];
    const n = v === undefined || v === "" ? NaN : Number(v.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : table[g];
  };

  const make = () => {
    const overrides: Partial<Goals> = {};
    for (const g of GROUP_IDS) if (effective(g) !== table[g]) overrides[g] = effective(g);
    const plan: Plan = { v: 1, client: client.trim(), specialist: specialist.trim() || "Вика", kcal: level, start };
    if (veg) plan.veg = true;
    if (Object.keys(overrides).length) plan.goals = overrides;
    const wn = Math.round(Number(water));
    if (wn > 0 && wn !== WATER.defaultGoal) plan.water = wn;
    setLink(inviteLink(plan));
  };

  const reset = () => setLink("");

  return (
    <>
      <header className="top">
        <div><div className="eyebrow">Для специалиста · тест</div><h1>Ссылка для клиента</h1></div>
        <a className="chip" href="#/today">В приложение</a>
      </header>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); make(); }} onChange={reset}>
        <div className="note">Тестовая версия: только взрослые 19+, без беременности и кормления грудью. Вход не нужен — ссылку может собрать любой.</div>

        <div className="card">
          <div className="grid2">
            <label className="field"><span>Имя клиента</span><input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Анна" /></label>
            <label className="field"><span>Специалист</span><input value={specialist} onChange={(e) => setSpecialist(e.target.value)} /></label>
          </div>
          <div className="grid2">
            <label className="field"><span>Пол</span>
              <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}><option value="f">Женский</option><option value="m">Мужской</option></select></label>
            <label className="field"><span>Возраст, лет</span><input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} aria-invalid={A < 19} /></label>
          </div>
          {A > 0 && A < 19 && <p className="small" style={{ color: "var(--bad)" }}>Тест только для взрослых 19+.</p>}
          <div className="grid2">
            <label className="field"><span>Рост, см</span><input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} /></label>
            <label className="field"><span>Вес, кг</span><input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value.replace(",", "."))} /></label>
          </div>
          <div className="grid2">
            <label className="field"><span>Активность</span>
              <select value={act} onChange={(e) => setAct(e.target.value as Activity)}>
                {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => <option key={a} value={a}>{ACTIVITY_LABEL[a]}</option>)}
              </select></label>
            <label className="field"><span>Цель</span>
              <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
                <option value="maintain">Поддержание</option><option value="lose">Снижение веса</option>
              </select></label>
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">Расчёт (NASEM 2023)</div>
          {sug ? (
            <>
              <dl className="kv" style={{ margin: 0 }}>
                <dt>Расход (TEE)</dt><dd>{kcal(sug.tee)} ккал</dd>
                <dt>BMR (Mifflin–St Jeor)</dt><dd>{kcal(sug.bmr)} ккал</dd>
                {goal === "lose" && <><dt>Цель после −500</dt><dd>{kcal(sug.target)} ккал</dd></>}
                <dt>Предложенный уровень</dt><dd>{sug.level} ккал</dd>
              </dl>
              <p className="muted small">{sug.note} Снижение: не ниже BMR и не ниже 1600.</p>
            </>
          ) : <p className="muted">Заполни возраст (19+), рост и вес.</p>}
          <label className="field"><span>Уровень плана</span>
            <select value={level} onChange={(e) => { setLevelOverride(Number(e.target.value)); setGoalEdits({}); }}>
              {LEVELS.map((l) => <option key={l} value={l}>{l} ккал{l === sug?.level ? " — предложено" : ""}</option>)}
            </select></label>
        </div>

        <div className="card">
          <div className="eyebrow">Цели в день (можно поправить)</div>
          <label className="check">
            <input type="checkbox" checked={veg} onChange={(e) => setVeg(e.target.checked)} />
            <span>Вегетарианец (белок ×1,5)</span>
          </label>
          <div className="grid3">
            {GROUP_IDS.map((g) => (
              <label className="field" key={g}><span>{GROUPS[g].name}</span>
                <input inputMode="decimal" value={goalEdits[g] ?? String(table[g]).replace(".", ",")}
                  onChange={(e) => setGoalEdits({ ...goalEdits, [g]: e.target.value })} /></label>
            ))}
            <label className="field"><span>Вода, стаканов</span><input inputMode="numeric" value={water} onChange={(e) => setWater(e.target.value)} /></label>
          </div>
          <p className="muted small">Фрукты, овощи, молочные — в чашках (cup), зерновые и белок — в oz-eq. Клиент видит это как «порции».</p>
          <label className="field"><span>Старт плана</span><input type="date" value={start} onChange={(e) => setStart(e.target.value || todayIso())} /></label>
        </div>

        <button className="btn block" type="submit" disabled={!valid}>Собрать ссылку</button>

        {link && (
          <div className="card" id="invite">
            <div className="eyebrow">Ссылка готова</div>
            <div className="linkbox" data-testid="invite-link">{link}</div>
            <div className="row-btns">
              <button type="button" className="btn" onClick={async () => toast((await copyText(link)) ? "Ссылка скопирована" : "Не получилось скопировать")}>Скопировать</button>
              <a className="btn secondary" href={link}>Открыть</a>
            </div>
            <p className="muted small">Отправь ссылку клиенту. План сохранится у него на телефоне при открытии.</p>
          </div>
        )}
      </form>
    </>
  );
}
