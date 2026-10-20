import { DAILY_IDS, GROUPS, type DailyId } from "../units";

/** Концентрические кольца дневных групп (бобовые — за неделю, без кольца): доля закрытия 0…1 */
export function Rings({ progress, size = 150, label }: { progress: Record<DailyId, number>; size?: number; label: string }) {
  const c = 75;
  return (
    <svg viewBox="0 0 150 150" width={size} height={size} role="img" aria-label={label}>
      {DAILY_IDS.map((g, i) => {
        const r = 64 - i * 15;
        const L = 2 * Math.PI * r;
        const p = Math.max(0, Math.min(progress[g], 1));
        return (
          <g key={g}>
            <circle cx={c} cy={c} r={r} fill="none" stroke="var(--track)" strokeWidth="11" />
            {p > 0 && (
              <circle
                className="ring" cx={c} cy={c} r={r} fill="none" stroke={`var(--${g})`} strokeWidth="11" strokeLinecap="round"
                strokeDasharray={`${(p * L).toFixed(1)} ${L.toFixed(1)}`} transform={`rotate(-90 ${c} ${c})`}
              >
                <title>{GROUPS[g].name}</title>
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Четыре отдельных кольца в ряд (Вика, 19.10: концентрические читаются сложно): в центре «съедено/цель», ниже название */
export function RingRow({ items }: { items: { id: DailyId; value: string; goal: string; pct: number }[] }) {
  const c = 36, r = 29, L = 2 * Math.PI * r;
  return (
    <div className="ring-row">
      {items.map(({ id, value, goal, pct }) => {
        const p = Math.max(0, Math.min(pct, 1));
        return (
          <div key={id}>
            <svg viewBox="0 0 72 72" role="img" aria-label={`${GROUPS[id].name}: ${value} из ${goal}`}>
              <circle cx={c} cy={c} r={r} fill="none" stroke="var(--track)" strokeWidth="7" />
              {p > 0 && (
                <circle className="ring" cx={c} cy={c} r={r} fill="none" stroke={`var(--${id})`} strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={`${(p * L).toFixed(1)} ${L.toFixed(1)}`} transform={`rotate(-90 ${c} ${c})`} />
              )}
              <text x={c} y={c + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ink)" fontFamily="var(--display)">
                {value}<tspan fontSize="11" fill="var(--muted)">/{goal}</tspan>
              </text>
            </svg>
            <span>{GROUPS[id].name}</span>
          </div>
        );
      })}
    </div>
  );
}
