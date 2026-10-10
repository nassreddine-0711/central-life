import { useMemo, useRef, useState } from "react";
import { Hourglass, ChevronLeft, Mountain, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCerebro } from "../CerebroContext";
import { Empty } from "../TaskComponents";

/* ============================================================
   Línea temporal: una regla regida por la edad del usuario, desde
   su fecha de nacimiento. Marca grande cada 5 años, marca pequeña
   cada año. Clic en una marca de 5 años -> zoom a ese periodo de 5
   años (por años). Clic en una marca de 1 año (dentro de ese zoom,
   o directamente desde la vista completa) -> zoom a ese año en
   concreto, dividido por meses. Al pasar el ratón y quedarse un
   rato quieto sobre la regla, se ve qué año natural es ese punto.
   Los sueños y proyectos con fecha se ven como cajas sobre la
   regla, más grandes los sueños; al hacer clic llevan a su sitio.
============================================================ */

const YEAR_MS = 365.25 * 86400000;
const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const HOVER_DELAY_MS = 450;

type ZoomState =
  | { level: "life" }
  | { level: "five"; startAge: number }
  | { level: "year"; calYear: number };

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Posición 0..1 (o null si está fuera de rango) de una fecha dentro de la vista actual. */
function pctForDate(zoom: ZoomState, birth: Date, maxAge: number, date: Date): number | null {
  if (zoom.level === "life") {
    const age = (date.getTime() - birth.getTime()) / YEAR_MS;
    if (age < 0 || age > maxAge) return null;
    return age / maxAge;
  }
  if (zoom.level === "five") {
    const startCalYear = birth.getFullYear() + zoom.startAge;
    const offset = (date.getFullYear() - startCalYear) + date.getMonth() / 12 + date.getDate() / 372;
    if (offset < 0 || offset > 5) return null;
    return offset / 5;
  }
  if (date.getFullYear() !== zoom.calYear) return null;
  const dim = daysInMonth(date.getFullYear(), date.getMonth());
  const offset = date.getMonth() + (date.getDate() - 1) / dim;
  return offset / 12;
}

/** Fecha correspondiente a una posición 0..1 dentro de la vista actual (para el hover). */
function dateForPct(zoom: ZoomState, birth: Date, maxAge: number, pct: number): Date {
  if (zoom.level === "life") {
    return new Date(birth.getTime() + pct * maxAge * YEAR_MS);
  }
  if (zoom.level === "five") {
    const startCalYear = birth.getFullYear() + zoom.startAge;
    const totalMonths = pct * 5 * 12;
    return new Date(startCalYear, Math.round(totalMonths), 1);
  }
  const totalMonths = pct * 12;
  return new Date(zoom.calYear, Math.min(11, Math.floor(totalMonths)), 1);
}

interface Marker { id: string; title: string; pct: number; kind: "dream" | "project"; color?: string; }

function Ruler({
  zoom, birth, maxAge, markers, onZoomFive, onZoomYear, onOpenDream, onOpenProject,
}: {
  zoom: ZoomState; birth: Date; maxAge: number; markers: Marker[];
  onZoomFive: (startAge: number) => void; onZoomYear: (calYear: number) => void;
  onOpenDream: (id: string) => void; onOpenProject: (id: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMove = (e: React.MouseEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPct(pct);
    if (!tooltipVisible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setTooltipVisible(true), HOVER_DELAY_MS);
    }
  };
  const onLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTooltipVisible(false);
    setHoverPct(null);
  };

  const ticks: { pct: number; big: boolean; label: string; onClick?: () => void }[] = [];
  if (zoom.level === "life") {
    for (let age = 0; age <= maxAge; age++) {
      const big = age % 5 === 0;
      ticks.push({
        pct: age / maxAge,
        big,
        label: String(age),
        onClick: big
          ? () => onZoomFive(Math.min(age, maxAge - 5))
          : () => onZoomYear(birth.getFullYear() + age),
      });
    }
  } else if (zoom.level === "five") {
    const startCalYear = birth.getFullYear() + zoom.startAge;
    for (let i = 0; i <= 5; i++) {
      ticks.push({
        pct: i / 5,
        big: true,
        label: i < 5 ? String(zoom.startAge + i) : "",
        onClick: i < 5 ? () => onZoomYear(startCalYear + i) : undefined,
      });
    }
  } else {
    for (let i = 0; i <= 12; i++) {
      ticks.push({ pct: i / 12, big: true, label: i < 12 ? MONTHS_ES[i] : "" });
    }
  }

  const hoverDate = hoverPct !== null ? dateForPct(zoom, birth, maxAge, hoverPct) : null;
  const dreamMarkers = markers.filter(m => m.kind === "dream");
  const projectMarkers = markers.filter(m => m.kind === "project");

  return (
    <div className="relative mt-8 select-none pb-10">
      {/* Cajas de sueños, encima de la regla */}
      <div className="relative mb-2 h-16">
        {dreamMarkers.map(m => (
          <button
            key={m.id}
            onClick={() => onOpenDream(m.id)}
            style={{ left: `${m.pct * 100}%`, borderColor: m.color }}
            className="absolute -translate-x-1/2 flex max-w-[11rem] items-center gap-1.5 rounded-xl border-2 bg-card px-3 py-2 text-xs font-semibold shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            title={m.title}
          >
            <Mountain className="h-3.5 w-3.5 shrink-0" style={{ color: m.color }} />
            <span className="truncate">{m.title}</span>
          </button>
        ))}
      </div>

      {/* Pista de la regla */}
      <div
        ref={trackRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="relative h-2.5 cursor-crosshair rounded-full bg-muted"
      >
        {ticks.map((t, i) => (
          <div
            key={i}
            style={{ left: `${t.pct * 100}%` }}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <button
              onClick={t.onClick}
              disabled={!t.onClick}
              className={cn(
                "block rounded-full bg-foreground/70 transition hover:bg-primary",
                t.big ? "h-4 w-[3px]" : "h-2.5 w-[2px]",
                t.onClick ? "cursor-pointer" : "cursor-default",
              )}
            />
          </div>
        ))}
        {hoverPct !== null && (
          <div style={{ left: `${hoverPct * 100}%` }} className="absolute top-1/2 h-4 w-[1px] -translate-x-1/2 -translate-y-1/2 bg-primary" />
        )}
      </div>

      {/* Etiquetas de cada marca */}
      <div className="relative mt-1 h-5">
        {ticks.filter(t => t.label).map((t, i) => (
          <span
            key={i}
            style={{ left: `${t.pct * 100}%` }}
            className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted-foreground"
          >
            {t.label}
          </span>
        ))}
      </div>

      {/* Tooltip de año natural / mes */}
      {tooltipVisible && hoverDate && (
        <div
          style={{ left: `${(hoverPct ?? 0) * 100}%` }}
          className="absolute -top-6 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow"
        >
          {zoom.level === "year"
            ? hoverDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
            : `Año natural: ${hoverDate.getFullYear()}`}
        </div>
      )}

      {/* Cajas pequeñas de proyectos, debajo de la regla */}
      <div className="relative mt-3 h-10">
        {projectMarkers.map(m => (
          <button
            key={m.id}
            onClick={() => onOpenProject(m.id)}
            className="absolute -translate-x-1/2 flex max-w-[8rem] items-center gap-1 rounded-md border bg-card px-2 py-1 text-[10px] font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            style={{ left: `${m.pct * 100}%` }}
            title={m.title}
          >
            <FolderKanban className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{m.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function LineaTemporalPanel({
  onOpenDream, onOpenProject,
}: { onOpenDream: (id: string) => void; onOpenProject: (id: string) => void }) {
  const { dreams, projects, dreamsConfig } = useCerebro();
  const [stack, setStack] = useState<ZoomState[]>([{ level: "life" }]);
  const zoom = stack[stack.length - 1];

  const birth = dreamsConfig.birthDate ? new Date(dreamsConfig.birthDate) : null;

  const maxAge = useMemo(() => {
    if (!birth) return 100;
    const currentAge = (Date.now() - birth.getTime()) / YEAR_MS;
    return Math.ceil(Math.max(100, currentAge + 10) / 5) * 5;
  }, [birth]);

  const markers = useMemo<Marker[]>(() => {
    if (!birth) return [];
    const list: Marker[] = [];
    dreams.forEach(d => {
      if (!d.deadline) return;
      const pct = pctForDate(zoom, birth, maxAge, new Date(d.deadline));
      if (pct !== null) list.push({ id: d.id, title: d.title, pct, kind: "dream", color: d.color });
    });
    projects.forEach(p => {
      if (!p.dueDate) return;
      const pct = pctForDate(zoom, birth, maxAge, new Date(p.dueDate));
      if (pct !== null) list.push({ id: p.id, title: p.title, pct, kind: "project" });
    });
    return list;
  }, [dreams, projects, zoom, birth, maxAge]);

  if (!birth) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Hourglass className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Línea temporal</h2>
        </div>
        <Empty msg="Configura tu fecha de nacimiento desde la pestaña Sueños (el botón de destino) para ver tu línea temporal." />
      </div>
    );
  }

  const zoomLabel = zoom.level === "life" ? "Toda tu vida" : zoom.level === "five" ? `De ${zoom.startAge} a ${zoom.startAge + 5} años` : `Año ${zoom.calYear}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Hourglass className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Línea temporal</h2>
        </div>
        <div className="flex items-center gap-2">
          {stack.length > 1 && (
            <button
              onClick={() => setStack(s => s.slice(0, -1))}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Volver
            </button>
          )}
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{zoomLabel}</span>
        </div>
      </div>

      <div className="overflow-x-hidden rounded-2xl border bg-card p-5 sm:p-7">
        <Ruler
          zoom={zoom}
          birth={birth}
          maxAge={maxAge}
          markers={markers}
          onZoomFive={(startAge) => setStack(s => [...s, { level: "five", startAge }])}
          onZoomYear={(calYear) => setStack(s => [...s, { level: "year", calYear }])}
          onOpenDream={onOpenDream}
          onOpenProject={onOpenProject}
        />
      </div>
    </div>
  );
}
