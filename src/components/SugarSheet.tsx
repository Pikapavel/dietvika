import { Sheet } from "./Sheet";
import { SUGAR } from "../units";

/** Круглая кнопка «!» — как «i», но для предупреждающего совета */
export function BangButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="bang" onClick={onClick} aria-label={label} aria-haspopup="dialog">!</button>
  );
}

/** Лист «Сахар»: сколько, где прячется, как называется в составе, как читать этикетку */
export function SugarSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet label="Сахар" onClose={onClose}>
      <div className="ghead">
        <div><div className="eyebrow">Совет</div><h2>Сахар</h2></div>
        <button className="close" onClick={onClose} aria-label="Закрыть">×</button>
      </div>
      <div className="hint"><div><strong>{SUGAR.line}</strong><p className="muted" style={{ marginTop: 4 }}>{SUGAR.limit}</p></div></div>
      <div className="card">
        <div className="eyebrow">Где прячется сахар</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{SUGAR.hidden.map((h) => <li key={h}>{h}</li>)}</ul>
      </div>
      <div className="card">
        <div className="eyebrow">Тысяча имён сахара</div>
        <p className="muted small">Так добавленный сахар пишут в составе:</p>
        <div className="tags">{SUGAR.names.map((n) => <span className="chip" key={n}>{n}</span>)}</div>
      </div>
      <div className="card">
        <div className="eyebrow">Как читать этикетку</div>
        <p>{SUGAR.label}</p>
      </div>
    </Sheet>
  );
}
