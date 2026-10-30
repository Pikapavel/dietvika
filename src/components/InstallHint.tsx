// Подсказка в браузере: как перенести план в приложение на экране «Домой».
// На iPhone приложение с иконки не видит данных Safari, поэтому ссылку нужно вставить в нём ещё раз.
import { useState } from "react";
import { inviteLink, type Plan } from "../plan";
import { KEYS, readRaw, writeRaw } from "../storage";
import { isStandalone } from "../store";
import { copyText } from "../screens/Profile";
import { useToast } from "./Toast";

export function InstallHint({ plan }: { plan: Plan }) {
  const toast = useToast();
  const [hidden, setHidden] = useState(() => readRaw(KEYS.installHint) === "1" || isStandalone() || !isIOS());
  if (hidden || plan.client === "Демо") return null;
  const copy = async () => {
    toast((await copyText(inviteLink(plan))) ? "Ссылка скопирована" : "Не получилось скопировать");
  };
  const hide = () => { writeRaw(KEYS.installHint, "1"); setHidden(true); };
  return (
    <div className="card install">
      <div className="eyebrow">Приложение на экране «Домой»</div>
      <ol>
        <li>Скопируй ссылку на свой план.</li>
        <li>В Safari нажми «Поделиться» → «На экран „Домой“».</li>
        <li>Открой приложение с иконки, нажми «Вставить» и «Открыть план».</li>
      </ol>
      <p className="muted small">На iPhone приложение с иконки не видит данных браузера, поэтому план нужно открыть в нём ещё раз.</p>
      <div className="row-btns">
        <button className="btn secondary" onClick={hide}>Скрыть</button>
        <button className="btn" onClick={copy}>Скопировать ссылку</button>
      </div>
    </div>
  );
}

/** Только iPhone и iPad: на Android приложение с иконки видит данные Chrome */
function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}
