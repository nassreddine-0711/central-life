import { useEffect, useState } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculate(target: Date): TimeLeft {
  const diff = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

export function Countdown({ target, title = "Cuenta atrás", subtitle = "Destino" }: { target: Date; title?: string; subtitle?: string }) {
  const [time, setTime] = useState<TimeLeft>(() => calculate(target));

  useEffect(() => {
    const id = setInterval(() => setTime(calculate(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const units: { label: string; value: number }[] = [
    { label: "Días", value: time.days },
    { label: "Horas", value: time.hours },
    { label: "Minutos", value: time.minutes },
    { label: "Segundos", value: time.seconds },
  ];

  return (
    <section className="relative">
      {/* Halo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-aurora blur-[100px] opacity-60" />
      </div>

      <div className="glass relative overflow-hidden rounded-3xl p-8 md:p-12">
        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative flex flex-col items-center text-center">
          <span className="rounded-full border border-border/60 bg-background/40 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground backdrop-blur">
            {subtitle}
          </span>
          <h1 className="mt-4 text-2xl font-semibold md:text-3xl">
            {title.includes("años") ? (
              <>Hasta tu <span className="text-gradient">{title}</span></>
            ) : (
              <span className="text-gradient">{title}</span>
            )}
          </h1>

          <div className="mt-10 grid w-full grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {units.map((u) => (
              <div
                key={u.label}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-card p-5 md:p-7"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <div className="font-mono text-5xl font-bold tabular-nums tracking-tight text-foreground md:text-7xl lg:text-8xl">
                  {u.value.toString().padStart(2, "0")}
                </div>
                <div className="mt-3 text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground md:text-xs">
                  {u.label}
                </div>
                <div className="absolute -bottom-12 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-primary/10 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}