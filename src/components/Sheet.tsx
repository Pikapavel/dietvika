import { useEffect, useRef, type ReactNode } from "react";

/** Нижняя шторка: закрывается по фону, крестику и Esc; фокус уходит внутрь и возвращается назад */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>("button, [href], input");
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const items = panel.current.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input, select");
        if (!items.length) return;
        const a = items[0], b = items[items.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
        else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.({ preventScroll: true });
    };
  }, []);
  return (
    <div className="sheet" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel" role="dialog" aria-modal="true" aria-label={label} ref={panel}>
        {children}
      </div>
    </div>
  );
}

/** Модальный диалог подтверждения (вместо window.confirm) */
export function ConfirmDialog(props: {
  title: string; text: string; confirm: string; cancel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [props]);
  return (
    <div className="dialog" onClick={(e) => e.target === e.currentTarget && props.onCancel()}>
      <div className="box" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-d" ref={box}>
        <h2 id="dlg-t">{props.title}</h2>
        <p id="dlg-d" className="muted">{props.text}</p>
        <div className="row-btns">
          <button className="btn secondary" onClick={props.onCancel}>{props.cancel ?? "Отмена"}</button>
          <button className={props.danger ? "btn danger" : "btn"} onClick={props.onConfirm}>{props.confirm}</button>
        </div>
      </div>
    </div>
  );
}
