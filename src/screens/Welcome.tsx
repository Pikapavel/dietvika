import { Rings } from "../components/Rings";

export function Welcome({ onDemo }: { onDemo: () => void }) {
  const p = { fruit: 0.8, veg: 0.65, grain: 0.9, prot: 0.55, dairy: 0.75 };
  return (
    <div className="welcome">
      <Rings progress={p} size={96} label="DietVika" />
      <div className="stack" style={{ gap: 8 }}>
        <h1>DietVika</h1>
        <p>Отмечай порции методом рук: фрукты, овощи, зерновые, белок и молочное. Без калорий и весов.</p>
      </div>
      <div className="card">
        <strong>Нужна ссылка от специалиста</strong>
        <p className="muted">Твой план — сколько порций каждой группы в день — приходит ссылкой от диетолога. Открой её на этом телефоне, и план сохранится здесь.</p>
        <p className="muted small">Все отметки хранятся только на твоём телефоне. Сервера нет.</p>
      </div>
      <button className="btn block" onClick={onDemo}>Посмотреть демо</button>
      <p className="muted small" style={{ textAlign: "center" }}>Для специалиста: <a href="#/vika">собрать ссылку для клиента</a></p>
    </div>
  );
}
