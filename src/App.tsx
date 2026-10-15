import type React from "react";
import { useEffect, useMemo } from "react";
import { decodePlan, demoPlan, planFromHash } from "./plan";
import { go, replaceHash, useAppData, useHash } from "./store";
import { Builder } from "./screens/Builder";
import { ConfirmPlan } from "./screens/ConfirmPlan";
import { Onboarding } from "./screens/Onboarding";
import { PlanScreen } from "./screens/PlanScreen";
import { Portions } from "./screens/Portions";
import { Today } from "./screens/Today";
import { Week } from "./screens/Week";
import { Welcome } from "./screens/Welcome";
import { useToast } from "./components/Toast";

const TABS = [
  { id: "today", label: "Сегодня", icon: <><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /></> },
  { id: "week", label: "Неделя", icon: <path d="M5 19V11M12 19V5M19 19v-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /> },
  { id: "portions", label: "Порции", icon: <path d="M4 6h7v13H4zM13 6h7v13h-7z" fill="none" stroke="currentColor" strokeWidth="2" /> },
  { id: "plan", label: "План", icon: <><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M4 20c1-4 4-6 8-6s7 2 8 6" fill="none" stroke="currentColor" strokeWidth="2" /></> },
];

export function App() {
  const data = useAppData();
  const hash = useHash();
  const toast = useToast();
  const encoded = planFromHash(hash);
  const invite = useMemo(() => (encoded ? decodePlan(encoded) : null), [encoded]);
  const route = hash.replace(/^#\/?/, "").split(/[?&]/)[0] || "today";

  useEffect(() => { window.scrollTo(0, 0); }, [route, !!data.plan]);

  let body: React.ReactNode;
  let tabs = false;

  if (encoded) {
    body = invite ? (
      <ConfirmPlan plan={invite} hasPlan={!!data.plan}
        onAccept={() => { data.setPlan(invite); replaceHash("#/today"); toast("План сохранён"); }}
        onCancel={() => replaceHash(data.plan ? "#/today" : "")} />
    ) : (
      <div className="welcome">
        <h1>Ссылка не открылась</h1>
        <p className="muted">Похоже, ссылка обрезалась при копировании. Попроси специалиста прислать её ещё раз.</p>
        <button className="btn" onClick={() => replaceHash("")}>Понятно</button>
      </div>
    );
  } else if (route === "vika") {
    body = <Builder />;
  } else if (!data.plan) {
    body = <Welcome onDemo={() => { data.setPlan(demoPlan()); go("#/today"); }} />;
  } else if (!data.onboarded || route === "intro") {
    body = <Onboarding onDone={() => { data.setOnboarded(); go(route === "intro" ? "#/portions" : "#/today"); }} />;
  } else {
    tabs = true;
    const plan = data.plan;
    body =
      route === "week" ? <Week data={data} plan={plan} /> :
      route === "portions" ? <Portions /> :
      route === "plan" ? <PlanScreen data={data} plan={plan} /> :
      <Today data={data} plan={plan} />;
  }
  const active = TABS.some((t) => t.id === route) ? route : "today";

  return (
    <>
      <main className={tabs ? "app" : "app notabs"}>{body}</main>
      {tabs && (
        <nav className="tabs" aria-label="Разделы">
          <div>
            {TABS.map((t) => (
              <a key={t.id} href={`#/${t.id}`} aria-current={t.id === active ? "page" : undefined}>
                <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>{t.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
