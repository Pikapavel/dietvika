// Наглядные куски методики: гарвардская тарелка, пример дня (по модели BNF), советы.
import type React from "react";
import { DAILY_IDS, GROUPS, type DailyId } from "../units";
import { BangButton } from "./SugarSheet";

export function Plate() {
  const t = { fontSize: 8.5, fill: "var(--on-color)", textAnchor: "middle" as const, fontWeight: 700, fontFamily: "var(--body)" };
  return (
    <svg className="plate" viewBox="0 0 210 124" role="img"
      aria-label="Тарелка на день: половина — овощи и фрукты, четверть — зерновые, четверть — белок, и три порции молочного">
      <circle cx="80" cy="62" r="60" fill="var(--track)" />
      <path d="M80 8A54 54 0 0 0 80 116Z" fill="var(--fv)" />
      <path d="M80 62L80 8A54 54 0 0 1 134 62Z" fill="var(--grain)" />
      <path d="M80 62L134 62A54 54 0 0 1 80 116Z" fill="var(--prot)" />
      <text x="53" y="58" {...t}>овощи</text>
      <text x="53" y="70" {...t}>и фрукты</text>
      <text x="104" y="44" {...t}>зерновые</text>
      <text x="104" y="86" {...t}>белок</text>
      {[150, 168, 186].map((x) => (
        <path key={x} d={`M${x} 46h14l-2 34h-10z`} fill="var(--dairy)" />
      ))}
      <text x="175" y="96" fontSize="8.5" fill="var(--muted)" textAnchor="middle" fontFamily="var(--body)" fontWeight="700">молочные ×3</text>
    </svg>
  );
}

// Пример дня по образцу британского гида (BNF), блюда — вариант Вики 19.10.
// Бобовые отдельно не выделяем; в строке «Итого» — сколько раз группа встретилась за день.
const DAY: { meal: string; food: string; g: Partial<Record<DailyId, number>> }[] = [
  { meal: "Завтрак", food: "овсянка с молоком, банан", g: { fv: 1, grain: 1, dairy: 1 } },
  { meal: "Перекус", food: "хлебец с сыром", g: { grain: 1, dairy: 1 } },
  { meal: "Обед", food: "борщ, цельнозерновой хлеб, мандарины", g: { fv: 2, grain: 1, prot: 1 } },
  { meal: "Перекус", food: "йогурт, ягоды", g: { fv: 1, dairy: 1 } },
  { meal: "Ужин", food: "спагетти болоньезе, салат", g: { fv: 1, grain: 1, prot: 1 } },
];
const SHORT: Record<DailyId, string> = { fv: "Фр/Ов", grain: "Зер", prot: "Бел", dairy: "Мол" };

/** Значки групп для примера дня: яблоко, колос, ножка, бутылочка */
function Glyph({ g }: { g: DailyId }) {
  const c = `var(--${g})`;
  const shapes: Record<DailyId, React.ReactElement> = {
    fv: (
      <>
        <path d="M8 5.2C6.6 4 3.6 4 2.8 6.6c-.8 2.6.6 6 2.4 7 .9.5 1.6 0 2.8 0s1.9.5 2.8 0c1.8-1 3.2-4.4 2.4-7C12.4 4 9.4 4 8 5.2z" fill={c} />
        <path d="M8 5.2c0-1.6.7-3 2.4-3.6" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </>
    ),
    grain: (
      <>
        <path d="M8 15V4" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
        {[4.5, 7.5, 10.5].map((y) => (
          <g key={y} fill={c}>
            <ellipse cx="5.6" cy={y} rx="1.5" ry="2.4" transform={`rotate(-35 5.6 ${y})`} />
            <ellipse cx="10.4" cy={y} rx="1.5" ry="2.4" transform={`rotate(35 10.4 ${y})`} />
          </g>
        ))}
        <ellipse cx="8" cy="2.6" rx="1.3" ry="2" fill={c} />
      </>
    ),
    prot: (
      <>
        <ellipse cx="10" cy="6" rx="4.6" ry="4" transform="rotate(-40 10 6)" fill={c} />
        <path d="M7 9.3L3.8 12.5" stroke={c} strokeWidth="2" strokeLinecap="round" />
        <circle cx="2.8" cy="12.3" r="1.3" fill={c} />
        <circle cx="3.7" cy="13.6" r="1.3" fill={c} />
      </>
    ),
    dairy: (
      <path d="M6 1.5h4v2.2l1.6 2.4V14a.8.8 0 0 1-.8.8H5.2a.8.8 0 0 1-.8-.8V6.1L6 3.7z M4.6 8.5h6.8"
        fill="none" stroke={c} strokeWidth="1.3" strokeLinejoin="round" />
    ),
  };
  return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">{shapes[g]}</svg>;
}

export function ExampleDay() {
  const total = (g: DailyId) => DAY.reduce((s, r) => s + (r.g[g] ?? 0), 0);
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="example-day">
        <caption className="sr-only">Пример дня: какие группы закрывает каждый приём пищи</caption>
        <thead>
          <tr>
            <th scope="col">Приём пищи</th>
            {DAILY_IDS.map((g) => (
              <th key={g} scope="col" className="c gchip" style={{ background: `var(--${g})` }} title={GROUPS[g].name}>
                <span aria-hidden="true">{SHORT[g]}</span><span className="sr-only">{GROUPS[g].name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAY.map((r, i) => (
            <tr key={i}>
              <td><strong>{r.meal}</strong><div className="muted small">{r.food}</div></td>
              {DAILY_IDS.map((g) => {
                const n = r.g[g] ?? 0;
                return (
                  <td key={g} className="c" aria-label={n ? String(n) : undefined}>
                    {Array.from({ length: n }, (_, k) => <Glyph key={k} g={g} />)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Итого</td>
            {DAILY_IDS.map((g) => <td key={g} className="c total" style={{ color: `var(--${g})` }}>{total(g)}</td>)}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function Tips({ onSugar }: { onSugar: () => void }) {
  return (
    <div className="card">
      <div className="eyebrow">Советы</div>
      <div className="sugar-line" style={{ fontSize: "inherit", color: "inherit" }}>
        <p><strong>Сахар.</strong> Добавленного сахара — не больше 30 г в день для взрослого (≈ 6 чайных ложек), включая сладкие напитки, соусы и йогурты с сахаром.</p>
        <BangButton onClick={onSugar} label="Сахар: где прячется и как читать этикетку" />
      </div>
      <p><strong>Сок и смузи.</strong> Не больше 150 мл в день (маленький стакан, рекомендация ВОЗ) и максимум 1 порция фруктов и овощей, сколько бы ни выпить. Целый фрукт лучше: в нём есть клетчатка.</p>
      <p><strong>Соль.</strong> Не больше 5 г соли в день (рекомендация ВОЗ) — это чайная ложка без горки, вместе с солью в готовых продуктах.</p>
      <p><strong>Масло.</strong> Лучше растительное. Порция — кончик большого пальца (≈ 1 чайная ложка). Отдельно не считаем, но и лить «на глаз» не стоит.</p>
      <p><strong>Орехи и семечки.</strong> Около 30 г в день — две маленькие горсти. Засчитываются в белок: маленькая горсть = 1 порция.</p>
      <p><strong>Вода.</strong> Около 8 стаканов в день (по 250 мл), больше в жару и при нагрузке. Сладкие напитки водой не считаются.</p>
    </div>
  );
}
