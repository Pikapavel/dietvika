import { useState } from "react";
import { SugarSheet } from "../components/SugarSheet";
import { HandIcon } from "../components/HandIcon";
import { ExampleDay, Plate, Tips } from "../components/Method";
import { go } from "../store";
import { FREE, GROUPS, GROUP_IDS, VEG_NOTE, WATER, handLines } from "../units";

export function Portions() {
  const [sugar, setSugar] = useState(false);
  return (
    <>
      <header className="top">
        <div><div className="eyebrow">Метод рук</div><h1>Что такое порция</h1></div>
        <button className="btn secondary" style={{ minHeight: 36, padding: "6px 12px", fontSize: ".85rem" }} onClick={() => go("#/intro")}>Как пользоваться</button>
      </header>
      <section className="stack">
        <div className="card">
          <div className="eyebrow">Тарелка на день</div>
          <Plate />
          <p className="muted small">Половина — овощи и фрукты (овощей больше), четверть — зерновые, четверть — белок, плюс 3 порции молочного в день.</p>
        </div>
        {GROUP_IDS.map((g) => (
          <div className="hint" key={g}>
            <HandIcon shape={GROUPS[g].shape} color={`var(--${g})`} />
            <div>
              <h3 style={{ color: `var(--${g})` }}>{GROUPS[g].name}</h3>
              <ul>{handLines(g).map((l) => <li key={l}>{l}</li>)}</ul>
              <p className="muted" style={{ marginTop: 6 }}>{GROUPS[g].why}</p>
              {g === "prot" && <p style={{ marginTop: 6 }}>{VEG_NOTE}</p>}
            </div>
          </div>
        ))}
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
        <Tips onSugar={() => setSugar(true)} />
        <div className="card">
          <div className="eyebrow">Пример дня</div>
          <p className="muted small">Так выглядит день, где закрыты все группы. Точное число порций — в твоём плане.</p>
          <ExampleDay />
        </div>
      </section>
      {sugar && <SugarSheet onClose={() => setSugar(false)} />}
    </>
  );
}
