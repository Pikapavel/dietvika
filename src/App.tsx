import type React from "react";
import { useEffect, useMemo } from "react";
import { decodePlan, demoPlan, planFromHash } from "./plan";
import { go, replaceHash, useAppData, useHash } from "./store";
import { Builder } from "./screens/Builder";
import { ConfirmPlan } from "./screens/ConfirmPlan";
import { Onboarding } from "./screens/Onboarding";
import { Portions } from "./screens/Portions";
import { Profile } from "./screens/Profile";
import { Today } from "./screens/Today";
import { Welcome } from "./screens/Welcome";
import { useToast } from "./components/Toast";

// Три вкладки только иконками (Вика, 24.10): рабочий экран, справочник, профиль.
// Подписи остаются для скринридера.
const TABS = [
  { id: "today", label: "Сегодня", icon: <><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /></> },
  { id: "portions", label: "Порции", icon: <path d="M4 6h7v13H4zM13 6h7v13h-7z" fill="none" stroke="currentColor" strokeWidth="2" /> },
  { id: "profile", label: "Профиль", icon: <><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M4 20c1-4 4-6 8-6s7 2 8 6" fill="none" stroke="currentColor" strokeWidth="2" /></> },
];
// старые адреса вкладок «Неделя» и «План» ведут в профиль
const ALIASES: Record<string, string> = { week: "profile", plan: "profile" };

export function App() {
  const data = useAppData();
  const hash = useHash();
  const toast = useToast();
  const encoded = planFromHash(hash);
  const invite = useMemo(() => (encoded ? decodePlan(encoded) : null), [encoded]);
  const raw = hash.replace(/^#\/?/, "").split(/[?&]/)[0] || "today";
  const route = ALIASES[raw] ?? raw;

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
      route === "portions" ? <Portions data={data} plan={plan} /> :
      route === "profile" ? <Profile data={data} plan={plan} /> :
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
              <a key={t.id} href={`#/${t.id}`} aria-current={t.id === active ? "page" : undefined} aria-label={t.label} title={t.label}>
                <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>
              </a>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
