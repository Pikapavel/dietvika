// Вставка ссылки с планом прямо в приложение. Нужна на iPhone: приложение с экрана «Домой»
// хранит данные отдельно от Safari и от браузера внутри Telegram, поэтому план, принятый там,
// сюда не попадает (баг из теста Вики 29.10). Клиент копирует ссылку в чате и вставляет её здесь.
import { useState } from "react";
import { planFromText } from "../plan";
import { go } from "../store";

export function PasteLink({ compact }: { compact?: boolean }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const open = (t: string) => {
    const enc = planFromText(t);
    if (!enc) { setErr("Не нашёл план в ссылке. Скопируй ссылку из сообщения целиком."); return; }
    setErr("");
    go("#plan=" + enc);
  };
  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      setText(t);
      open(t);
    } catch {
      setErr("Телефон не дал вставить автоматически. Нажми на поле и выбери «Вставить».");
    }
  };
  return (
    <form className="stack" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); open(text); }}>
      {!compact && <p className="muted small">Скопируй ссылку из сообщения специалиста и вставь её сюда. Так план сохранится именно в этом приложении.</p>}
      <label className="field"><span>Ссылка на план</span>
        <input value={text} onChange={(e) => { setText(e.target.value); setErr(""); }} placeholder="https://…#plan=…"
          inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-invalid={!!err} aria-describedby="paste-err" /></label>
      {err && <p className="small" id="paste-err" style={{ color: "var(--bad)", margin: 0 }}>{err}</p>}
      <div className="row-btns">
        <button type="button" className="btn secondary" onClick={paste}>Вставить</button>
        <button type="submit" className="btn" disabled={!text.trim()}>Открыть план</button>
      </div>
    </form>
  );
}
