import type React from "react";
import type { Shape } from "../units";

// Руки нарисовала Вика в Canva (24.10): светлым выделена мера. Стакан, капля и звезда — значками.
const HAND_IMG = new Set<Shape>(["fist", "cupped", "palm", "finger"]);

/** Меры руками — картинками Вики; стакан, капля, звезда — простыми значками */
export function HandIcon({ shape, color, size = 44 }: { shape: Shape; color: string; size?: number }) {
  if (HAND_IMG.has(shape)) {
    return <img className="hand-img" src={`${import.meta.env.BASE_URL}hands/${shape}.webp`} width={size} height={size} alt="" aria-hidden="true" />;
  }
  const paths: Record<Shape, React.ReactElement> = {
    fist: (
      <>
        <rect x="9" y="11" width="26" height="24" rx="10" fill={color} opacity=".88" />
        <path d="M14 18h16M14 24h16" stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" />
        <rect x="6" y="20" width="8" height="12" rx="4" fill={color} />
      </>
    ),
    palm: (
      <>
        <rect x="11" y="13" width="22" height="25" rx="9" fill={color} opacity=".88" />
        {[13, 18.5, 24, 29.5].map((x, i) => (
          <rect key={x} x={x - 2} y={i === 0 || i === 3 ? 6 : 3} width="4.5" height="14" rx="2.25" fill={color} opacity=".88" />
        ))}
      </>
    ),
    cupped: (
      <>
        <path d="M6 22a16 14 0 0 0 32 0z" fill={color} opacity=".88" />
        <ellipse cx="22" cy="20" rx="12" ry="5" fill={color} opacity=".45" />
      </>
    ),
    glass: <path d="M12 8h20l-3 30H15z" fill={color} opacity=".88" />,
    finger: (
      <>
        <rect x="16" y="4" width="12" height="34" rx="6" fill={color} opacity=".88" />
        <rect x="18.5" y="7" width="7" height="8" rx="3.5" fill="var(--surface)" opacity=".55" />
        <path d="M18 24h8" stroke="var(--surface)" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
    drop: <path d="M22 6c7 9 11 15 11 21a11 11 0 0 1-22 0c0-6 4-12 11-21z" fill={color} opacity=".88" />,
    star: <path d="M22 6l4.7 10 10.8 1.2-8 7.4 2.2 10.7L22 30l-9.7 5.3 2.2-10.7-8-7.4L17.3 16z" fill={color} opacity=".88" />,
  };
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} aria-hidden="true">
      {paths[shape]}
    </svg>
  );
}
