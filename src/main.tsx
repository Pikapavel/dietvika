import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { migrateUnits } from "./log";
import { ToastProvider } from "./components/Toast";
import { applyTheme, savedTheme } from "./screens/Profile";
import "./styles.css";

applyTheme(savedTheme());
migrateUnits();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
