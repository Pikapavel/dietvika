import { Sheet } from "./Sheet";
import { SUGAR } from "../units";

/** Круглая кнопка «!» — как «i», но для предупреждающего совета */
export function BangButton({ onClick, label, light }: { onClick: () => void; label: string; light?: boolean }) {
  return (
    <button className={light ? "bang light" : "bang"} onClick={onClick} aria-label={label} aria-haspopup="dialog">!</button>
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
      <div className="card sugar-top">
        <b>{SUGAR.top}</b>
        <p className="muted">{SUGAR.topSub}</p>
        <p className="small">{SUGAR.natural}</p>
      </div>
      <div className="card">
        <div className="eyebrow">Где прячется сахар</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{SUGAR.hidden.map((h) => <li key={h}>{h}</li>)}</ul>
      </div>
      <div className="card">
        <div className="eyebrow">Многоликий сахар</div>
        <p className="muted small">Так добавленный сахар пишут в составе:</p>
        {SUGAR.names.map((n) => <p className="sugar-names" key={n}>{n}</p>)}
      </div>
      <div className="card">
        <div className="eyebrow">Как читать этикетку</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{SUGAR.label.map((l) => <li key={l}>{l}</li>)}</ul>
      </div>
      <div className="card ginfo">
        <div className="ginfo-h">Полезно знать</div>
        <p>{SUGAR.info}</p>
        {SUGAR.note.map((n) => <p className="small" key={n}>{n}</p>)}
      </div>
    </Sheet>
  );
}
