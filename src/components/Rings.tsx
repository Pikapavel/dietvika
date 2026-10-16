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
