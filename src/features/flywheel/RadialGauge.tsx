import { useEffect, useId, useMemo, useState, type ReactNode } from "react";

/* ============================================================
   Anillo de progreso radial — el lenguaje visual base de Panorama.
   Un solo componente SVG, sin WebGL: arco de fondo tenue + arco de
   color que se rellena hasta el %, extremos redondeados, brillo
   sutil a juego con el color del área. Se usa tanto para el
   indicador grande ("Mi vida") como para cada volante individual.
============================================================ */
interface RadialGaugeProps {
  pct: number;
  size: number;
  strokeWidth?: number;
  color: string;
  /** Si se pasa, el arco usa un degradado de "color" a "colorTo" en vez de un color plano (solo para el anillo hero). */
  colorTo?: string;
  trackOpacity?: number;
  glow?: boolean;
  children?: ReactNode;
  className?: string;
}

export function RadialGauge({
  pct,
  size,
  strokeWidth = 8,
  color,
  colorTo,
  trackOpacity = 0.12,
  glow = false,
  children,
  className,
}: RadialGaugeProps) {
  const gradId = useId();
  const glowId = useId();
  const clamped = Math.max(0, Math.min(100, pct));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  // Animación de entrada: el arco "se llena" desde 0 hasta el valor real.
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(clamped));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped]);

  const offset = useMemo(() => circumference * (1 - animated / 100), [circumference, animated]);
  const stroke = colorTo ? `url(#${gradId})` : color;

  return (
    <div className={className} style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {colorTo && (
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={colorTo} />
            </linearGradient>
          )}
          {glow && (
            <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation={strokeWidth * 0.55} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {/* Pista de fondo */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={colorTo ? "currentColor" : color}
            strokeOpacity={trackOpacity}
            strokeWidth={strokeWidth}
          />
          {/* Arco de progreso */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            filter={glow ? `url(#${glowId})` : undefined}
            style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        </g>
      </svg>
      {children && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ color: colorTo ? undefined : color }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
