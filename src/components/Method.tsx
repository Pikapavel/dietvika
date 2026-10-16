// Наглядные куски методики: гарвардская тарелка, пример дня (по модели BNF), советы.
import { GROUPS, GROUP_IDS, type GroupId } from "../units";
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

const DAY: { meal: string; food: string; g: GroupId[] }[] = [
  { meal: "Завтрак", food: "хлопья с молоком и бананом", g: ["fv", "grain", "dairy"] },
  { meal: "Перекус", food: "овсяные галеты и сыр", g: ["grain", "dairy"] },
  { meal: "Обед", food: "цельнозерновая пита с хумусом и салатом, мандарины", g: ["fv", "leg", "grain", "prot"] },
  { meal: "Перекус", food: "яблоко", g: ["fv"] },
  { meal: "Ужин", food: "спагетти болоньезе с салатом, йогурт с ягодами", g: ["fv", "grain", "prot", "dairy"] },
];
const SHORT: Record<GroupId, string> = { fv: "Ф+О", leg: "Боб", grain: "Зер", prot: "Бел", dairy: "Мол" };

export function ExampleDay() {
  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <caption className="sr-only">Пример дня: какие группы закрывает каждый приём пищи</caption>
        <thead>
          <tr>
            <th scope="col">Приём пищи</th>
            {GROUP_IDS.map((g) => (
              <th key={g} scope="col" className="c" title={GROUPS[g].name}>
                <span aria-hidden="true">{SHORT[g]}</span><span className="sr-only">{GROUPS[g].name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAY.map((r, i) => (
            <tr key={i}>
              <td><strong>{r.meal}</strong><div className="muted small">{r.food}</div></td>
              {GROUP_IDS.map((g) => (
                <td key={g} className="c">
                  {r.g.includes(g) ? <span className="dot" style={{ background: `var(--${g})`, margin: "4px 0 0" }} role="img" aria-label="да" /> : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
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
