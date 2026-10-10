import { useMemo, useRef, useState } from "react";
import { Hourglass, ChevronLeft, ChevronRight, Mountain, FolderKanban, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCerebro } from "../CerebroContext";
import { Empty } from "../TaskComponents";

/* ============================================================
   Línea temporal: una regla regida por la edad del usuario, desde
   su fecha de nacimiento. Por defecto se ven 3 periodos de 5 años
   seguidos (el que contiene tu edad actual, el anterior y el
   siguiente — p.ej. con 21 años: 15-20, 20-25, 25-30), y se puede
   avanzar o retroceder de 5 en 5 años, o abrir "Ver toda tu vida".
   La regla dibuja una marca pequeña cada año y una marca grande y
   gruesa cada 5 años; la marca grande, además, tiene alrededor una
   banda ancha clicable para abrir ese periodo de 5 años en detalle
   (p.ej. al hacer clic en la marca del año 5 se abre el periodo de
   5 a 10). Dentro de un periodo de 5 años, y dentro de un año
   concreto, cada año se ve dividido por meses (rayitas finas); al
   pasar el ratón y quedarse un rato quieto se ve qué mes/año
   natural es ese punto. Los sueños y proyectos con fecha se ven
   como cajas con una flecha que señala el punto exacto de la
   regla; al hacer clic llevan a su sitio.
============================================================ */

const YEAR_MS = 365.25 * 86400000;
const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTHS_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const HOVER_DELAY_MS = 400;
const DEFAULT_WINDOW_YEARS = 15; // 3 periodos de 5 años
const BIG_BTN_HALF_YEARS = 1; // el botón de entrada a un periodo de 5 años mide 2 años de ancho

type ZoomState =
  | { level: "default"; shift: number }
  | { level: "life" }
  | { level: "five"; startAge: number }
  | { level: "year"; calYear: number };

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }

/** Ventana [min,max] (en años) de 15 años, alineada a múltiplos de 5, centrada en el periodo
 *  de 5 años de la edad actual + un desplazamiento ("shift") de periodos de 5 años. */
function defaultWindowForShift(shift: number, currentAge: number, maxAge: number) {
  const naturalAnchor = Math.floor(currentAge / 5) * 5;
  const rawAnchor = naturalAnchor + shift * 5;
  let min = rawAnchor - 5;
  if (min < 0) min = 0;
  if (min > maxAge - DEFAULT_WINDOW_YEARS) min = Math.max(0, maxAge - DEFAULT_WINDOW_YEARS);
  return { min, max: min + DEFAULT_WINDOW_YEARS };
}

/** Ventana [min,max] en años de edad que cubre la regla, para los niveles "default" y "life". */
function ageWindow(zoom: ZoomState, maxAge: number, currentAge: number): { min: number; max: number } | null {
  if (zoom.level === "life") return { min: 0, max: maxAge };
  if (zoom.level === "default") return defaultWindowForShift(zoom.shift, currentAge, maxAge);
  return null;
}

/** Posición 0..1 (o null si está fuera de rango) de una fecha dentro de la vista actual. */
function pctForDate(zoom: ZoomState, birth: Date, maxAge: number, currentAge: number, date: Date): number | null {
  const win = ageWindow(zoom, maxAge, currentAge);
  if (win) {
    const age = (date.getTime() - birth.getTime()) / YEAR_MS;
    if (age < win.min || age > win.max) return null;
    return (age - win.min) / (win.max - win.min);
  }
  if (zoom.level === "five") {
    const startCalYear = birth.getFullYear() + zoom.startAge;
    const dim = daysInMonth(date.getFullYear(), date.getMonth());
    const offset = (date.getFullYear() - startCalYear) + date.getMonth() / 12 + (date.getDate() - 1) / (dim * 12);
    if (offset < 0 || offset > 5) return null;
    return offset / 5;
  }
  if (zoom.level !== "year") return null;
  if (date.getFullYear() !== zoom.calYear) return null;
  const dim = daysInMonth(date.getFullYear(), date.getMonth());
  const offset = date.getMonth() + (date.getDate() - 1) / dim;
  return offset / 12;
}

interface Marker { id: string; title: string; pct: number; kind: "dream" | "project"; color?: string; }
interface Band { pct0: number; pct1: number; label: string; onClick?: () => void; }
interface MinorTick { pct: number; }
interface BigButton { pct0: number; pct1: number; label: string; onClick: () => void; }

function Ruler({
  markers, bands, minorTicks, bigButtons, onOpenDream, onOpenProject, hoverLabel,
}: {
  markers: Marker[]; bands: Band[]; minorTicks: MinorTick[]; bigButtons: BigButton[];
  onOpenDream: (id: string) => void; onOpenProject: (id: string) => void;
  hoverLabel: (pct: number) => string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMove = (e: React.MouseEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = clamp01((e.clientX - rect.left) / rect.width);
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

  const dreamMarkers = markers.filter(m => m.kind === "dream");
  const projectMarkers = markers.filter(m => m.kind === "project");

  return (
    <div className="relative mt-16 select-none pb-16">
      {/* Cajas de sueños, con flecha señalando el punto exacto */}
      <div className="relative h-20">
        {dreamMarkers.map(m => (
          <div key={m.id} style={{ left: `${m.pct * 100}%` }} className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center">
            <button
              onClick={() => onOpenDream(m.id)}
              style={{ borderColor: m.color }}
              className="mb-0.5 flex max-w-[11rem] items-center gap-1.5 rounded-xl border-2 bg-card px-3 py-2 text-xs font-semibold shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              title={m.title}
            >
              <Mountain className="h-3.5 w-3.5 shrink-0" style={{ color: m.color }} />
              <span className="truncate">{m.title}</span>
            </button>
            <div className="h-4 w-px" style={{ backgroundColor: m.color ?? "currentColor" }} />
            <div className="h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent" style={{ borderTopColor: m.color ?? "currentColor" }} />
          </div>
        ))}
      </div>

      {/* Pista de la regla: marcas pequeñas por año, marcas grandes cada 5 años (con banda ancha clicable) */}
      <div
        ref={trackRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="relative h-9 cursor-crosshair"
      >
        <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-muted" />

        {/* Bandas normales: una por año (o por mes, según el nivel), resaltan al pasar el ratón */}
        {bands.map((b, i) => (
          <button
            key={i}
            onClick={b.onClick}
            disabled={!b.onClick}
            title={b.label}
            style={{ left: `${b.pct0 * 100}%`, width: `${(b.pct1 - b.pct0) * 100}%` }}
            className={cn(
              "absolute inset-y-0 rounded-md transition-colors",
              b.onClick ? "cursor-pointer hover:bg-primary/10" : "cursor-default",
            )}
          />
        ))}

        {/* Marcas pequeñas: una por año (o por mes, dentro de un periodo de 5 años) */}
        {minorTicks.map((t, i) => (
          <div key={i} style={{ left: `${t.pct * 100}%` }} className="pointer-events-none absolute top-1/2 h-1.5 w-[1px] -translate-x-1/2 -translate-y-1/2 bg-foreground/30" />
        ))}

        {/* Marcas grandes: cada 5 años, gruesas y destacadas, con banda ancha clicable para abrir ese periodo */}
        {bigButtons.map((b, i) => (
          <button
            key={i}
            onClick={b.onClick}
            title={`Ver de ${b.label}`}
            style={{ left: `${b.pct0 * 100}%`, width: `${(b.pct1 - b.pct0) * 100}%` }}
            className="absolute inset-y-0 z-10 flex items-center justify-center rounded-lg transition-colors hover:bg-primary/15"
          >
            <span className="h-7 w-1 rounded-full bg-primary shadow-sm" />
          </button>
        ))}

        {hoverPct !== null && (
          <div style={{ left: `${hoverPct * 100}%` }} className="pointer-events-none absolute top-1/2 z-20 h-5 w-[1px] -translate-x-1/2 -translate-y-1/2 bg-foreground" />
        )}

        {/* Tooltip de año natural / mes */}
        {tooltipVisible && hoverPct !== null && (
          <div
            style={{ left: `${hoverPct * 100}%` }}
            className="pointer-events-none absolute -top-8 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow"
          >
            {hoverLabel(hoverPct)}
          </div>
        )}
      </div>

      {/* Etiquetas de cada marca grande */}
      <div className="relative mt-1.5 h-5">
        {bands.filter(b => b.label).map((b, i) => (
          <span
            key={i}
            style={{ left: `${((b.pct0 + b.pct1) / 2) * 100}%` }}
            className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted-foreground"
          >
            {b.label}
          </span>
        ))}
      </div>

      {/* Cajas pequeñas de proyectos, con flecha señalando hacia arriba */}
      <div className="relative mt-4 h-16">
        {projectMarkers.map(m => (
          <div key={m.id} style={{ left: `${m.pct * 100}%` }} className="absolute top-0 flex -translate-x-1/2 flex-col items-center">
            <div className="h-0 w-0 border-x-[4px] border-b-[5px] border-x-transparent border-b-muted-foreground/50" />
            <div className="h-3 w-px bg-muted-foreground/50" />
            <button
              onClick={() => onOpenProject(m.id)}
              className="mt-0.5 flex max-w-[8rem] items-center gap-1 rounded-md border bg-card px-2 py-1 text-[10px] font-medium shadow-sm transition hover:translate-y-0.5 hover:shadow"
              title={m.title}
            >
              <FolderKanban className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{m.title}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineaTemporalPanel({
  onOpenDream, onOpenProject,
}: { onOpenDream: (id: string) => void; onOpenProject: (id: string) => void }) {
  const { dreams, projects, dreamsConfig } = useCerebro();
  const [stack, setStack] = useState<ZoomState[]>([{ level: "default", shift: 0 }]);
  const zoom = stack[stack.length - 1];

  const birth = dreamsConfig.birthDate ? new Date(dreamsConfig.birthDate) : null;

  const currentAge = useMemo(() => (birth ? (Date.now() - birth.getTime()) / YEAR_MS : 0), [birth]);

  const maxAge = useMemo(() => Math.ceil(Math.max(100, currentAge + 10) / 5) * 5, [currentAge]);

  const pushFive = (startAge: number) => setStack(s => [...s, { level: "five", startAge }]);
  const pushYear = (calYear: number) => setStack(s => [...s, { level: "year", calYear }]);
  const pushLife = () => setStack(s => [...s, { level: "life" }]);
  const shiftDefault = (delta: number) => setStack(s => {
    const top = s[s.length - 1];
    if (top.level !== "default") return s;
    return [...s.slice(0, -1), { level: "default", shift: top.shift + delta }];
  });

  /** Bandas clicables, marcas finas, marcas grandes de 5 años, según el nivel de zoom. */
  const { bands, minorTicks, bigButtons, hoverLabel } = useMemo(() => {
    if (!birth) return { bands: [] as Band[], minorTicks: [] as MinorTick[], bigButtons: [] as BigButton[], hoverLabel: () => "" };

    const win = ageWindow(zoom, maxAge, currentAge);
    if (win) {
      const span = win.max - win.min;
      const bs: Band[] = [];
      const minor: MinorTick[] = [];
      const big: BigButton[] = [];
      const fromAge = Math.floor(win.min);
      const toAge = Math.ceil(win.max);
      for (let age = fromAge; age < toAge; age++) {
        const pct0 = clamp01((age - win.min) / span);
        const pct1 = clamp01((age + 1 - win.min) / span);
        if (pct1 <= pct0) continue;
        bs.push({ pct0, pct1, label: age % 5 === 0 ? String(age) : "", onClick: () => pushYear(birth.getFullYear() + age) });
        minor.push({ pct: pct0 }); // marca pequeña al inicio de cada año
      }
      minor.push({ pct: clamp01((toAge - win.min) / span) }); // marca pequeña de cierre
      for (let age5 = Math.ceil(win.min / 5) * 5; age5 <= win.max; age5 += 5) {
        const pct0 = clamp01((age5 - BIG_BTN_HALF_YEARS - win.min) / span);
        const pct1 = clamp01((age5 + BIG_BTN_HALF_YEARS - win.min) / span);
        if (pct1 <= pct0) continue;
        const startAge = Math.max(0, Math.min(age5, maxAge - 5));
        big.push({ pct0, pct1, label: `${startAge}-${startAge + 5} años`, onClick: () => pushFive(startAge) });
      }
      return {
        bands: bs, minorTicks: minor, bigButtons: big,
        hoverLabel: (pct: number) => `Año natural: ${birth.getFullYear() + Math.floor(win.min + pct * span)}`,
      };
    }

    if (zoom.level === "five") {
      const startCalYear = birth.getFullYear() + zoom.startAge;
      const bs: Band[] = [];
      const minor: MinorTick[] = [];
      for (let y = 0; y < 5; y++) {
        bs.push({ pct0: y / 5, pct1: (y + 1) / 5, label: String(zoom.startAge + y), onClick: () => pushYear(startCalYear + y) });
        for (let m = 1; m < 12; m++) minor.push({ pct: (y + m / 12) / 5 });
      }
      return {
        bands: bs, minorTicks: minor, bigButtons: [] as BigButton[],
        hoverLabel: (pct: number) => {
          const totalMonths = Math.floor(pct * 60);
          const y = startCalYear + Math.floor(totalMonths / 12);
          const m = totalMonths % 12;
          return `${MONTHS_FULL[m]} ${y}`;
        },
      };
    }

    // year
    const bs: Band[] = [];
    for (let m = 0; m < 12; m++) {
      bs.push({ pct0: m / 12, pct1: (m + 1) / 12, label: MONTHS_SHORT[m] });
    }
    return {
      bands: bs, minorTicks: [] as MinorTick[], bigButtons: [] as BigButton[],
      hoverLabel: (pct: number) => `${MONTHS_FULL[Math.min(11, Math.floor(pct * 12))]} ${(zoom as { level: "year"; calYear: number }).calYear}`,
    };
  }, [zoom, birth, maxAge, currentAge]);

  const markers = useMemo<Marker[]>(() => {
    if (!birth) return [];
    const list: Marker[] = [];
    dreams.forEach(d => {
      if (!d.deadline) return;
      const pct = pctForDate(zoom, birth, maxAge, currentAge, new Date(d.deadline));
      if (pct !== null) list.push({ id: d.id, title: d.title, pct, kind: "dream", color: d.color });
    });
    projects.forEach(p => {
      if (!p.dueDate) return;
      const pct = pctForDate(zoom, birth, maxAge, currentAge, new Date(p.dueDate));
      if (pct !== null) list.push({ id: p.id, title: p.title, pct, kind: "project" });
    });
    return list;
  }, [dreams, projects, zoom, birth, maxAge, currentAge]);

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

  const defaultWin = zoom.level === "default" ? defaultWindowForShift(zoom.shift, currentAge, maxAge) : null;
  const canGoPrev = zoom.level === "default" && defaultWindowForShift(zoom.shift - 1, currentAge, maxAge).min < defaultWin!.min;
  const canGoNext = zoom.level === "default" && defaultWindowForShift(zoom.shift + 1, currentAge, maxAge).min > defaultWin!.min;

  const zoomLabel = zoom.level === "default" ? `De ${Math.round(defaultWin!.min)} a ${Math.round(defaultWin!.max)} años`
    : zoom.level === "life" ? "Toda tu vida"
    : zoom.level === "five" ? `De ${zoom.startAge} a ${zoom.startAge + 5} años`
    : `Año ${zoom.calYear}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Hourglass className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Línea temporal</h2>
        </div>
        <div className="flex items-center gap-2">
          {zoom.level === "default" && (
            <>
              <button
                onClick={() => shiftDefault(-1)}
                disabled={!canGoPrev}
                className="inline-flex items-center justify-center rounded-full border p-1.5 text-muted-foreground transition hover:text-foreground disabled:opacity-30"
                title="5 años antes"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => shiftDefault(1)}
                disabled={!canGoNext}
                className="inline-flex items-center justify-center rounded-full border p-1.5 text-muted-foreground transition hover:text-foreground disabled:opacity-30"
                title="5 años después"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={pushLife}
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                <Maximize2 className="h-3.5 w-3.5" /> Ver toda tu vida
              </button>
            </>
          )}
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
          markers={markers}
          bands={bands}
          minorTicks={minorTicks}
          bigButtons={bigButtons}
          hoverLabel={hoverLabel}
          onOpenDream={onOpenDream}
          onOpenProject={onOpenProject}
        />
      </div>
    </div>
  );
}
