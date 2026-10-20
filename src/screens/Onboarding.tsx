import { useState } from "react";
import { HandIcon } from "../components/HandIcon";
import { ExampleDay, Plate } from "../components/Method";
import type { Shape } from "../units";

// Четыре меры руками (правки Вики 20.10): стакан убрали, вместо него палец для сыра
const HANDS: [Shape, string, string, string][] = [
  ["fist", "var(--fv)", "Кулак", "1 порция фруктов или овощей"],
  ["cupped", "var(--grain)", "Горсть", "1 порция зерновых"],
  ["palm", "var(--prot)", "Ладонь", "3 порции белка: мясо, птица, рыба"],
  ["finger", "var(--dairy)", "Палец", "1 порция сыра"],
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  // Тарелка — первой: это суть, а порции руками — инструмент к ней (Вика, 19.10)
  const slides = [
    <div className="slide" key="0">
      <div className="eyebrow">1 из 4</div>
      <h1>Тарелка на день</h1>
      <p>Рекомендации разных стран различаются в деталях, но суть одна: питание должно быть сбалансированным и разнообразным.</p>
      <div className="card"><Plate /></div>
      <p>Половина — овощи и фрукты, четверть — зерновые, четверть — белок, а также 3 порции молочных продуктов (или альтернативы).</p>
      <p className="muted">Масло, сахар и соль — про них есть короткие советы в разделе «Порции».</p>
    </div>,
    <div className="slide" key="1">
      <div className="eyebrow">2 из 4</div>
      <h1>Твоя рука — ориентир для порций</h1>
      <p className="muted">Необязательно каждый раз взвешивать еду. Ладонь, кулак, горсть и палец помогают приблизительно оценивать количество продуктов прямо в тарелке.</p>
      <div className="hands4">
        {HANDS.map(([s, c, name, t]) => (
          <div key={name}><HandIcon shape={s} color={c} size={64} /><strong>{name}</strong><span className="muted">{t}</span></div>
        ))}
      </div>
      <p className="muted small">Размеры порций приблизительны и зависят от продукта. Бобовые — ½ кулака, их считаем за неделю.</p>
    </div>,
    <div className="slide" key="2">
      <div className="eyebrow">3 из 4</div>
      <h1>Пример дня</h1>
      <p className="muted">Каждый приём пищи закрывает несколько групп. Так набираются все кольца.</p>
      <div className="card"><ExampleDay /></div>
    </div>,
    <div className="slide" key="3">
      <div className="eyebrow">4 из 4</div>
      <h1>Как отмечать</h1>
      <div className="gr demo-tile" aria-hidden="true">
        <span className="gemoji">🍗</span>
        <div className="gmain"><div className="tname"><span>Белок</span><span className="info">i</span></div></div>
        <button className="pmb" tabIndex={-1}>−</button>
        <b className="gcount">3<span className="muted">/5</span></b>
        <button className="pmb plus" tabIndex={-1} style={{ background: "var(--prot)" }}>+</button>
        <div className="bar"><i style={{ width: "60%", background: "var(--prot)" }} /></div>
      </div>
      <ul className="stack" style={{ paddingLeft: 18, margin: 0, gap: 8 }}>
        <li><strong>+ и −</strong> добавляют или убирают одну порцию.</li>
        <li><strong>Нажми на название группы</strong> — там подсказки руками, выбор количества и продукты: «Курица (ладонь)» сразу даст +3.</li>
        <li><strong>Забыла отметить?</strong> Переключись на «Вчера» вверху экрана.</li>
        <li><strong>Свободный приём пищи</strong> — любимая еда на свой выбор: одна отметка на приём, без лимита.</li>
      </ul>
    </div>,
  ];
  const last = i === slides.length - 1;
  return (
    <div className="onb">
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="link" onClick={onDone}>Пропустить</button>
      </div>
      {slides[i]}
      <div className="dots" aria-hidden="true">{slides.map((_, k) => <i key={k} className={k === i ? "on" : undefined} />)}</div>
      <div className="row-btns">
        {i > 0 && <button className="btn secondary" onClick={() => setI(i - 1)}>Назад</button>}
        <button className="btn" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? "Начать" : "Далее"}</button>
      </div>
    </div>
  );
}
