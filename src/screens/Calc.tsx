// #/calc — подбор плана самим клиентом, без специалиста (Вика, 25 и 31.10): пошаговая анкета,
// по вопросу на экран, как в Lifesum и Pump Club. Формулы те же, что в конструкторе (NASEM 2023).
import { useEffect, useState } from "react";
import { today as todayIso } from "../dates";
import { ACTIVITY_HINT, ACTIVITY_LABEL, STATUS_LABEL, suggestLevel, type Activity, type Goal, type Sex, type Status } from "../nasem";
import { VIKA_CONTACT, planGoals, type Plan } from "../plan";
import { go } from "../store";
import { DAILY_IDS, GROUPS, portions, toDisplay } from "../units";

type Step = "goal" | "sex" | "status" | "age" | "height" | "weight" | "target" | "act" | "veg" | "name" | "result";

const GOALS: [Goal, string, string][] = [
  ["lose", "Снизить вес", "Постепенно и без жёстких запретов"],
  ["maintain", "Сохранить вес", "Есть сбалансированно и разнообразно"],
  ["gain", "Набрать мышечную массу", "Вместе с тренировками"],
];

const num = (s: string) => Number(s.replace(",", "."));

export function Calc({ onAccept }: { onAccept: (p: Plan) => void }) {
  const [step, setStep] = useState<Step>("goal");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [status, setStatus] = useState<Status>("none");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [target, setTarget] = useState("");
  const [act, setAct] = useState<Activity | null>(null);
  const [veg, setVeg] = useState<boolean | null>(null);
  const [name, setName] = useState("");

  const W = num(weight), T = num(target), A = num(age), H = num(height);
  const st: Status = sex === "f" ? status : "none";
  const needTarget = goal !== "maintain" && st === "none";
  const steps: Step[] = ["goal", "sex", ...(sex === "f" ? ["status" as Step] : []), "age", "height", "weight",
    ...(needTarget ? ["target" as Step] : []), "act", "veg", "name", "result"];
  const i = steps.indexOf(step);
  const next = () => setStep(steps[Math.min(i + 1, steps.length - 1)]);
  const back = () => (i > 0 ? setStep(steps[i - 1]) : go(""));
  // шаг вперёд — после перерисовки, чтобы список шагов уже учёл выбор (например, пол → шаг «беременность»)
  const [adv, setAdv] = useState(0);
  useEffect(() => { if (adv) next(); }, [adv]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = <T,>(set: (v: T) => void, v: T) => { set(v); setTimeout(() => setAdv((n) => n + 1), 120); };

  const err =
    step === "age" ? (!age ? "" : A < 19 ? "Пока приложение только для взрослых, от 19 лет." : A > 100 ? "Проверь возраст." : "") :
    step === "height" ? (!height ? "" : H < 120 || H > 230 ? "Рост в сантиметрах, от 120 до 230." : "") :
    step === "weight" ? (!weight ? "" : W < 30 || W > 300 ? "Вес в килограммах, от 30 до 300." : "") :
    step === "target" ? (!target ? "" : T < 30 || T > 300 ? "Вес в килограммах, от 30 до 300." :
      goal === "lose" && T >= W ? "Для снижения цель должна быть меньше текущего веса." :
      goal === "gain" && T <= W ? "Для набора цель должна быть больше текущего веса." : "") : "";
  const filled = step === "age" ? !!age : step === "height" ? !!height : step === "weight" ? !!weight : step === "target" ? !!target : true;

  const goalText = st !== "none" ? "" : goal === "maintain" ? "Сохранить текущий вес"
    : `${goal === "lose" ? "Снизить вес" : "Набрать вес"} до ${(Math.round(T * 10) / 10).toLocaleString("ru-RU")} кг`;
  const plan: Plan | null = step === "result" && goal && sex && act ? {
    v: 1, client: name.trim().slice(0, 60), specialist: "Вика", contact: VIKA_CONTACT, self: true, u: 2, start: todayIso(),
    kcal: suggestLevel(sex, act, A, H, W, goal, st, needTarget ? T : undefined).level,
    ...(veg ? { veg: true as const } : {}),
    ...(goalText ? { goal: goalText } : {}),
  } : null;

  const field = (label: string, value: string, set: (v: string) => void, unit: string, mode: "numeric" | "decimal") => (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); if (filled && !err) next(); }}>
      <label className="field calc-num"><span>{label}</span>
        <span className="calc-input"><input autoFocus inputMode={mode} value={value} onChange={(e) => set(e.target.value)} aria-invalid={!!err} aria-describedby="calc-err" /><b>{unit}</b></span></label>
      {err && <p className="small" id="calc-err" style={{ color: "var(--bad)" }}>{err}</p>}
      <button className="btn block" type="submit" disabled={!filled || !!err}>Далее</button>
    </form>
  );

  return (
    <div className="calc">
      <div className="calc-top">
        <button className="iconbtn" onClick={back} aria-label="Назад">‹</button>
        <div className="calc-bar" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1} aria-label="Шаг анкеты">
          <i style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      {step === "goal" && <Choice title="Какая у тебя цель?" items={GOALS.map(([v, t, s]) => [v, t, s])} value={goal} onPick={(v) => pick(setGoal, v as Goal)} />}
      {step === "sex" && <Choice title="Твой пол" hint="Нужен для расчёта: расход энергии у женщин и мужчин считается по-разному."
        items={[["f", "Женский"], ["m", "Мужской"]]} value={sex} onPick={(v) => pick(setSex, v as Sex)} />}
      {step === "status" && <Choice title="Беременность или кормление?" hint="В это время план считаем с прибавкой и без снижения веса."
        items={(Object.keys(STATUS_LABEL) as Status[]).map((s) => [s, STATUS_LABEL[s]])} value={status} onPick={(v) => pick(setStatus, v as Status)} />}
      {step === "age" && <><h1>Сколько тебе лет?</h1>{field("Возраст", age, setAge, "лет", "numeric")}</>}
      {step === "height" && <><h1>Твой рост</h1>{field("Рост", height, setHeight, "см", "numeric")}</>}
      {step === "weight" && <><h1>Сколько ты весишь сейчас?</h1>{field("Вес", weight, setWeight, "кг", "decimal")}</>}
      {step === "target" && <><h1>Сколько хочешь весить?</h1><p className="muted">План посчитаем по весу, к которому идёшь.</p>{field("Целевой вес", target, setTarget, "кг", "decimal")}</>}
      {step === "act" && <Choice title="Насколько ты активен в обычный день?"
        items={(Object.keys(ACTIVITY_LABEL) as Activity[]).map((a) => [a, ACTIVITY_LABEL[a], ACTIVITY_HINT[a]])} value={act} onPick={(v) => pick(setAct, v as Activity)} />}
      {step === "veg" && <Choice title="Ты ешь мясо и рыбу?" hint="Вегетарианцам белка нужно примерно в полтора раза больше."
        items={[["no", "Да, ем"], ["yes", "Нет, я вегетарианец"]]} value={veg === null ? null : veg ? "yes" : "no"} onPick={(v) => pick(setVeg, v === "yes")} />}
      {step === "name" && (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); next(); }}>
          <h1>Как тебя зовут?</h1>
          <label className="field"><span>Имя (можно пропустить)</span><input autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
          <button className="btn block" type="submit">{name.trim() ? "Далее" : "Пропустить"}</button>
        </form>
      )}
      {step === "result" && plan && (
        <div className="stack">
          <div className="eyebrow">Твой план готов</div>
          <h1>{goal === "maintain" || st !== "none" ? "Для поддержания веса" : "Для твоей цели"} может подойти план на {plan.kcal} ккал</h1>
          <p className="muted">Считать калории не нужно: план уже переведён в порции руками.</p>
          <div className="card">
            <div className="eyebrow">Порций в день</div>
            {DAILY_IDS.map((g) => (
              <div className="grow" key={g}>
                <span><span className="dot" style={{ background: `var(--${g})` }} />{GROUPS[g].name}</span>
                <span className="num">{portions(toDisplay(g, planGoals(plan)[g]))}</span>
              </div>
            ))}
          </div>
          <p className="muted small">Это ориентир по формулам. Точнее план подберёт специалист по твоему дневнику питания — написать можно в профиле, в блоке «Поддержка».</p>
          <button className="btn block" onClick={() => onAccept(plan)}>Начать</button>
        </div>
      )}
    </div>
  );
}

function Choice({ title, hint, items, value, onPick }: {
  title: string; hint?: string; items: [string, string, string?][]; value: string | null; onPick: (v: string) => void;
}) {
  return (
    <div className="stack">
      <h1>{title}</h1>
      {hint && <p className="muted">{hint}</p>}
      <div className="calc-opts" role="radiogroup" aria-label={title}>
        {items.map(([v, t, s]) => (
          <button key={v} role="radio" aria-checked={value === v} className="calc-opt" onClick={() => onPick(v)}>
            <b>{t}</b>{s && <span>{s}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
