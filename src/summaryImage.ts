// Сводка недели картинкой (PNG 1080×1350) — для мессенджера: светлый фон, крупный текст, без ккал.
// Рисуем на <canvas> сами, без библиотек. Цвета — светлая тема из styles.css (картинка всегда светлая).

import { rangeLabel, type ISODate } from "./dates";
import type { Log } from "./log";
import type { Plan } from "./plan";
import { weekStats, type WeekStats } from "./stats";
import { DAILY_IDS, FREE, GLASS, GROUPS, fmt, plural, toDisplay, type GroupId } from "./units";

export const SUMMARY_W = 1080;
export const SUMMARY_H = 1350;

const C = {
  bg: "#EEF3EF", surface: "#FFFFFF", ink: "#1D2A24", muted: "#5E6E66", track: "#E1E9E4", line: "#D6E0DA",
  ok: "#3F9B5A", warn: "#B8741A", water: "#1F9AA0", free: "#D95C9A",
  fv: "#3F9B5A", leg: "#96643A", grain: "#D98B1F", prot: "#7A4BB3", dairy: "#3A86C8",
} as const;

const FONT = `"Manrope", system-ui, -apple-system, "Segoe UI", sans-serif`;
const DISPLAY = `"Unbounded", "Manrope", system-ui, sans-serif`;

/** «из 1 дня», «из 7 дней» */
const ofDays = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "дня" : "дней"}`;

export interface GroupLine {
  g: GroupId;
  /** «4 из 7 дней по 5+», «2 из 3 за неделю» */
  text: string;
  ok: boolean;
  /** кружки: true — закрыт, false — нет, null — день ещё не наступил */
  marks: (boolean | null)[];
}

/** Что показываем на картинке: по каждой группе — в норме или нет, и чего не хватало */
export function summaryLines(s: WeekStats, todayIso: ISODate): { lines: GroupLine[]; short: GroupId[] } {
  const lines: GroupLine[] = [];
  for (const g of DAILY_IDS) {
    const hit = s.reached[g].filter(Boolean).length;
    const goal = fmt(toDisplay(g, s.goals[g]));
    lines.push({
      g,
      text: `${hit} из ${ofDays(s.past.length)} по ${goal}+`,
      // в норме — если в среднем за дни с отметками цель набрана
      ok: s.logged.length > 0 && s.ratio[g] >= 1 - 1e-9,
      marks: s.days.map((d, i) => (d > todayIso ? null : s.reached[g][i])),
    });
  }
  const legN = Math.max(s.legGoal, Math.ceil(s.leg));
  lines.splice(1, 0, {
    g: "leg",
    text: `${fmt(s.leg)} из ${s.legGoal} за неделю`,
    ok: s.leg >= s.legGoal - 1e-9,
    marks: Array.from({ length: Math.min(legN, 14) }, (_, i) => i < Math.floor(s.leg + 1e-9)),
  });
  return { lines, short: lines.filter((l) => !l.ok).map((l) => l.g) };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Обрезает строку с «…», чтобы влезла в ширину w */
function fit(ctx: CanvasRenderingContext2D, text: string, w: number): string {
  if (ctx.measureText(text).width <= w) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > w) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}

/** Переносит текст по словам в ширину w; возвращает y после последней строки */
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, lh: number): number {
  let line = "";
  for (const word of text.split(" ")) {
    const t = line ? `${line} ${word}` : word;
    if (ctx.measureText(t).width > w && line) {
      ctx.fillText(line, x, y);
      y += lh;
      line = word;
    } else line = t;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lh;
}

/** Рисует сводку на canvas (размер выставляет сам) */
export async function drawSummary(canvas: HTMLCanvasElement, plan: Plan, log: Log, todayIso: ISODate): Promise<void> {
  // шрифты могли ещё не догрузиться — без них canvas возьмёт системный
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch { /* ок */ }
  const s = weekStats(plan, log, todayIso, todayIso);
  const { lines, short } = summaryLines(s, todayIso);
  canvas.width = SUMMARY_W;
  canvas.height = SUMMARY_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const P = 64;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, SUMMARY_W, SUMMARY_H);
  ctx.textBaseline = "alphabetic";

  const cardW = SUMMARY_W - P * 2;
  // шапка
  ctx.fillStyle = C.ok;
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText("DIETVIKA · СВОДКА НЕДЕЛИ", P, 96);
  ctx.fillStyle = C.ink;
  ctx.font = `700 60px ${DISPLAY}`;
  ctx.fillText(fit(ctx, rangeLabel(s.days[0], s.days[6]), cardW), P, 172);
  const who = [plan.client, plan.veg ? "вегетарианский план" : ""].filter(Boolean).join(" · ");
  ctx.font = `700 36px ${FONT}`;
  if (who) ctx.fillText(fit(ctx, who, cardW), P, 230);
  ctx.fillStyle = C.muted;
  ctx.font = `600 32px ${FONT}`;
  ctx.fillText(`Дней с отметками: ${s.logged.length} из ${s.past.length}`, P, who ? 278 : 230);

  // группы
  let y = 306;
  const rowH = 146;
  for (const l of lines) {
    const color = C[l.g];
    ctx.fillStyle = C.surface;
    roundRect(ctx, P, y, cardW, rowH - 16, 28);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(P + 44, y + 50, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.font = `700 38px ${FONT}`;
    ctx.fillText(GROUPS[l.g].name, P + 72, y + 63);
    // отметка справа: «в норме» или «мало» — без красного
    ctx.font = `700 30px ${FONT}`;
    const tag = l.ok ? "✓ в норме" : "можно больше";
    const tw = ctx.measureText(tag).width;
    ctx.fillStyle = l.ok ? "#E3F1E7" : "#F7ECDC";
    roundRect(ctx, P + cardW - tw - 64, y + 24, tw + 40, 50, 25);
    ctx.fill();
    ctx.fillStyle = l.ok ? C.ok : C.warn;
    ctx.fillText(tag, P + cardW - tw - 44, y + 60);
    // строка счёта
    ctx.fillStyle = C.muted;
    ctx.font = `600 32px ${FONT}`;
    ctx.fillText(l.text, P + 72, y + 110);
    // кружки дней (или порций бобовых)
    const r = 12, gap = 34;
    let cx = P + cardW - 44 - (l.marks.length - 1) * gap;
    for (const m of l.marks) {
      ctx.beginPath();
      ctx.arc(cx, y + 100, r, 0, Math.PI * 2);
      if (m === true) { ctx.fillStyle = color; ctx.fill(); }
      else {
        ctx.lineWidth = 4;
        ctx.strokeStyle = m === null ? C.line : C.track;
        if (m === false) { ctx.fillStyle = C.track; ctx.fill(); }
        ctx.stroke();
      }
      cx += gap;
    }
    y += rowH;
  }

  // итог
  y += 8;
  ctx.fillStyle = C.surface;
  roundRect(ctx, P, y, cardW, 230, 28);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.font = `700 36px ${FONT}`;
  const verdict = !s.logged.length ? "Отметок за неделю пока нет." :
    short.length ? `Не хватало: ${short.map((g) => GROUPS[g].gen).join(", ")}.` :
    "Все группы в норме — отличная неделя!";
  let ty = wrap(ctx, fit(ctx, verdict, (cardW - 72) * 2), P + 36, y + 60, cardW - 72, 46);
  ctx.fillStyle = C.muted;
  ctx.font = `600 32px ${FONT}`;
  ctx.fillText(`Вода: в среднем ${fmt(s.waterAvg)} из ${s.waterGoal} ${plural(s.waterGoal, GLASS)} в день`, P + 36, ty + 6);
  ty += 50;
  ctx.fillText(`${FREE.name}: ${s.free} за неделю`, P + 36, ty + 6);

  ctx.fillStyle = C.muted;
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText("Кружки — дни пн…вс: закрашен, если цель дня набрана.", P, SUMMARY_H - 36);
}

/** canvas → PNG-файл для navigator.share */
export function canvasFile(canvas: HTMLCanvasElement, name: string): Promise<File | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b ? new File([b], name, { type: "image/png" }) : null), "image/png");
  });
}

/** Скачать файл (если поделиться файлом нельзя) */
export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
