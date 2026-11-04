import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { migrateUnits } from "./log";
import { ToastProvider } from "./components/Toast";
import { applyTheme, savedTheme } from "./screens/Profile";
import "./styles.css";

applyTheme(savedTheme());
migrateUnits();
fixIosFixedAfterKeyboard();

/** iPhone: после закрытия клавиатуры (поле веса и т. п.) панель вкладок с position: fixed
 *  может остаться посреди экрана, пока страницу не прокрутят (баг у Ани, 02.11).
 *  Когда поле теряет фокус или меняется видимая область, «толкаем» прокрутку — Safari пересчитывает fixed. */
function fixIosFixedAfterKeyboard() {
  const nudge = () => {
    window.setTimeout(() => {
      const y = window.scrollY;
      window.scrollTo(window.scrollX, y + 1);
      window.scrollTo(window.scrollX, y);
    }, 60);
  };
  document.addEventListener("focusout", (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) nudge();
  });
  window.visualViewport?.addEventListener("resize", nudge);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
