// #/vika — конструктор ссылки для специалиста. Без входа, только для теста.
import { useMemo, useState } from "react";
import { today as todayIso } from "../dates";
import { ACTIVITY_HINT, ACTIVITY_LABEL, STATUS_KCAL, STATUS_LABEL, suggestLevel, type Activity, type Goal, type Sex, type Status } from "../nasem";
import { LEG_WEEK_DEFAULT, LEVELS, VIKA_CONTACT, contactHref, inviteLink, suggestedGoals, type Goals, type Plan } from "../plan";
import { useToast } from "../components/Toast";
import { copyText } from "./Profile";
import { DAILY_IDS, GROUPS, WATER, type DailyId } from "../units";

const kcal = (n: number) => Math.round(n).toLocaleString("ru-RU");

export function Builder() {
  const toast = useToast();
  const [client, setClient] = useState("");
  const [specialist, setSpecialist] = useState("Вика");
  const [contact, setContact] = useState(VIKA_CONTACT);
  const [sex, setSex] = useState<Sex>("f");
  const [age, setAge] = useState("35");
  const [height, setHeight] = useState("165");
  const [weight, setWeight] = useState("70");
  const [targetWeight, setTargetWeight] = useState("");
  const [act, setAct] = useState<Activity>("low");
  const [goal, setGoal] = useState<Goal>("lose");
  const [status, setStatus] = useState<Status>("none");
  const [start, setStart] = useState(todayIso());
  const [veg, setVeg] = useState(false);
  const [levelOverride, setLevelOverride] = useState<number | null>(null);
  const [goalEdits, setGoalEdits] = useState<Partial<Record<DailyId, string>>>({});
  const [legWeek, setLegWeek] = useState(String(LEG_WEEK_DEFAULT));
  const [water, setWater] = useState(String(WATER.defaultGoal));
  const [link, setLink] = useState("");
  const [actHelp, setActHelp] = useState(false);

  const A = Number(age), H = Number(height), W = Number(weight);
  const valid = A >= 19 && A <= 100 && H >= 120 && H <= 230 && W >= 30 && W <= 300;
  const st: Status = sex === "f" ? status : "none";
  // целевой вес — только для снижения и набора, без беременности и кормления
  const needTarget = goal !== "maintain" && st === "none";
  const T = Number(targetWeight.replace(",", "."));
  const targetErr = !needTarget || !targetWeight.trim() ? "" :
    !(T >= 30 && T <= 300) ? "Вес в килограммах, от 30 до 300." :
    goal === "lose" && T >= W ? "Для снижения целевой вес должен быть меньше текущего." :
    goal === "gain" && T <= W ? "Для набора целевой вес должен быть больше текущего." : "";
  const targetOk = needTarget && targetWeight.trim() !== "" && !targetErr;
  const sug = useMemo(() => (valid ? suggestLevel(sex, act, A, H, W, goal, st, targetOk ? T : undefined) : null),
    [valid, sex, act, A, H, W, goal, st, targetOk, T]);
  const level = levelOverride ?? sug?.level ?? 1800;
  // предложенные цели: таблица Вики (версия 2), у вегетарианца белок ×1,5
  const table = suggestedGoals(level, veg);

  const effective = (g: DailyId) => {
    const v = goalEdits[g];
    const n = v === undefined || v === "" ? NaN : Number(v.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : table[g];
  };

  const make = () => {
    const overrides: Partial<Goals> = {};
    for (const g of DAILY_IDS) if (effective(g) !== table[g]) overrides[g] = effective(g);
    const plan: Plan = { v: 1, client: client.trim(), specialist: specialist.trim() || "Вика", kcal: level, start, u: 2 };
    if (veg) plan.veg = true;
    if (Object.keys(overrides).length) plan.goals = overrides;
    const leg = Math.round(Number(legWeek));
    if (Number.isFinite(leg) && leg >= 0 && leg <= 14 && legWeek.trim() !== "" && leg !== LEG_WEEK_DEFAULT) plan.legWeek = leg;
    const wn = Math.round(Number(water));
    if (wn > 0 && wn !== WATER.defaultGoal) plan.water = wn;
    if (contactHref(contact)) plan.contact = contact.trim();
    const goalText = !valid || st !== "none" ? "" : goal === "maintain" ? "Сохранить текущий вес"
      : targetOk ? `${goal === "lose" ? "Снизить вес" : "Набрать вес"} до ${fmtKg(T)} кг` : "";
    if (goalText) plan.goal = goalText;
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
        <div className="note">Тестовая версия: только взрослые 19+. Вход не нужен — ссылку может собрать любой.</div>

        <div className="card">
          <div className="grid2">
            <label className="field"><span>Имя клиента</span><input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Анна" /></label>
            <label className="field"><span>Специалист</span><input value={specialist} onChange={(e) => setSpecialist(e.target.value)} /></label>
          </div>
          <label className="field"><span>Контакт для связи (необязательно)</span>
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="@ник в Telegram, телефон или почта" aria-describedby="contact-hint" /></label>
          {contact.trim() !== "" && !contactHref(contact)
            ? <p className="small" id="contact-hint" style={{ color: "var(--bad)" }}>Не распознал контакт: нужен @ник, телефон, почта или ссылка https://</p>
            : <p className="muted small" id="contact-hint">У клиента в профиле, в блоке «Поддержка», ссылка «Напиши нам» поведёт сюда.</p>}
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
            <label className="field"><span className="label-i">Активность
                <button type="button" className="info-i" aria-expanded={actHelp} aria-label="Что значат уровни активности" onClick={(e) => { e.preventDefault(); setActHelp(!actHelp); }}>i</button></span>
              <select value={act} onChange={(e) => setAct(e.target.value as Activity)}>
                {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => <option key={a} value={a}>{ACTIVITY_LABEL[a]}</option>)}
              </select></label>
            <label className="field"><span>Цель</span>
              <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
                <option value="maintain">Поддержание</option><option value="lose">Снижение веса</option><option value="gain">Набор мышечной массы</option>
              </select></label>
          </div>
          {actHelp && (
            <div className="card act-help" role="note">
              {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => <p key={a}><b>{ACTIVITY_LABEL[a]}.</b> {ACTIVITY_HINT[a]}</p>)}
            </div>
          )}
          {sex === "f" && (
            <label className="field"><span>Беременность и кормление</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}{STATUS_KCAL[s] ? ` (+${STATUS_KCAL[s]} ккал)` : ""}</option>)}
              </select></label>
          )}
          {needTarget && (
            <>
              <label className="field"><span>Сколько хочешь весить, кг</span>
                <input inputMode="decimal" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder={goal === "lose" ? "например, 65" : "например, 75"} aria-invalid={!!targetErr} aria-describedby="target-hint" /></label>
              {targetErr
                ? <p className="small" id="target-hint" style={{ color: "var(--bad)" }}>{targetErr}</p>
                : <p className="muted small" id="target-hint">План считаем по тем же формулам, но с целевым весом.{goal === "gain" ? " Белка при наборе обычно больше — поправь «Белок» ниже вручную." : ""}</p>}
            </>
          )}
          {st !== "none" && goal !== "maintain" && <p className="muted small">При беременности и кормлении план считается от текущего веса с прибавкой, без снижения.</p>}
        </div>

        <div className="card">
          <div className="eyebrow">Расчёт (NASEM 2023)</div>
          {sug ? (
            <>
              <dl className="kv" style={{ margin: 0 }}>
                <dt>Расход (TEE){st !== "none" ? " с прибавкой" : ""}</dt><dd>{kcal(sug.tee)} ккал</dd>
                <dt>BMR (Mifflin–St Jeor)</dt><dd>{kcal(sug.bmr)} ккал</dd>
                {targetOk && <><dt>Расход при целевом весе</dt><dd>{kcal(sug.target)} ккал</dd></>}
                <dt>Предложенный уровень</dt><dd>{sug.level} ккал</dd>
              </dl>
              <p className="result-line">{goal === "maintain" || st !== "none" ? "Для поддержания текущего веса" : "Для достижения цели"} может подойти план на <b>{sug.level} ккал</b> в день.</p>
              <p className="muted small">{sug.note}{needTarget && !targetOk ? " Введи целевой вес — пока план посчитан для текущего веса." : ""} Можно выбрать другой уровень по реальной ситуации клиента.</p>
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
            {DAILY_IDS.map((g) => (
              <label className="field" key={g}><span>{GROUPS[g].name}</span>
                <input inputMode="decimal" value={goalEdits[g] ?? String(table[g]).replace(".", ",")}
                  onChange={(e) => setGoalEdits({ ...goalEdits, [g]: e.target.value })} /></label>
            ))}
            <label className="field"><span>Бобовые, в неделю</span>
              <input inputMode="numeric" value={legWeek} onChange={(e) => setLegWeek(e.target.value)} aria-describedby="leg-hint" /></label>
            <label className="field"><span>Вода, стаканов</span><input inputMode="numeric" value={water} onChange={(e) => setWater(e.target.value)} /></label>
          </div>
          <p className="muted small">Цели — в порциях «1 рука = 1 порция» по таблице Вики (версия 2): ладони белка, горсти зерновых, кулаки фруктов и овощей, стаканы молочного. Фрукты и овощи — не меньше 5.</p>
          <p className="muted small" id="leg-hint">Бобовые — порций за неделю (0–14), 1 порция = 1 горсть варёных фасоли, нута или чечевицы (100–125 г), по умолчанию 4 в неделю. В белок и овощи не входят.</p>
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

const fmtKg = (kg: number) => (Math.round(kg * 10) / 10).toLocaleString("ru-RU");
