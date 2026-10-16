import { useState } from "react";
import { HandIcon } from "../components/HandIcon";
import { ExampleDay, Plate } from "../components/Method";
import type { Shape } from "../units";

const HANDS: [Shape, string, string][] = [
  ["fist", "var(--fv)", "Кулак — 1 порция фруктов или овощей. Листового салата — 2 кулака."],
  ["fist", "var(--leg)", "Половина кулака варёной фасоли, нута или чечевицы — 1 порция бобовых. Их считаем за неделю."],
  ["cupped", "var(--grain)", "Горсть готовой крупы (ладонь лодочкой) или ломтик хлеба — 1 порция зерновых."],
  ["palm", "var(--prot)", "Ладонь мяса или рыбы — 3 порции белка. Яйцо — 1 порция."],
  ["glass", "var(--dairy)", "Стакан молока или кефира — 1 порция молочного."],
  ["thumbs", "var(--dairy)", "Сыр размером с два больших пальца — тоже 1 порция молочного."],
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const slides = [
    <div className="slide" key="0">
      <div className="eyebrow">1 из 4</div>
      <h1>Порция — это твоя рука</h1>
      <p className="muted">Весы и калории не нужны. Мерка всегда с собой и растёт вместе с тобой.</p>
      <div className="hands">
        {HANDS.map(([s, c, t]) => <div key={t}><HandIcon shape={s} color={c} size={40} /><span>{t}</span></div>)}
      </div>
    </div>,
    <div className="slide" key="1">
      <div className="eyebrow">2 из 4</div>
      <h1>Тарелка на день</h1>
      <div className="card"><Plate /></div>
      <p>Половина — овощи и фрукты, четверть — зерновые, четверть — белок. И 3 порции молочного: молоко, кефир, йогурт или сыр.</p>
      <p>Фрукты и овощи — одна группа: минимум 5 порций в день в любом сочетании, разных цветов. Бобовые — несколько порций в неделю.</p>
      <p className="muted">Масло, сахар и соль не считаем — про них есть короткие советы в разделе «Порции».</p>
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
