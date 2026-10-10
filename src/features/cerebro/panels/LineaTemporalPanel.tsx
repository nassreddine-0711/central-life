import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Hourglass, ChevronLeft, ChevronRight, Mountain, FolderKanban, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCerebro } from "../CerebroContext";
import { Empty } from "../TaskComponents";

/* ============================================================
   Línea temporal: una regla escolar regida por tu edad, desde tu
   fecha de nacimiento. Las marcas cuelgan del borde de la regla
   como en una de verdad: marca larga con número ("centímetros") y
   marcas cortas ("milímetros"):
   - Vista general: 3 periodos de 5 años seguidos (el de tu edad, el
     anterior y el siguiente). Larga y gruesa cada 5 años, corta cada
     año. Se avanza de 5 en 5 o se abre toda la vida.
   - Periodo de 5 años: larga cada año (con edad y año natural), media
     a mitad de año y corta cada mes.
   - Año: larga cada mes (con su nombre) y cortas cada 5 días.
   Los sueños (arriba, con miniatura de su foto) y los proyectos
   (abajo) se colocan en su fecha con una flecha al punto exacto.
   Si muchos proyectos coinciden en una época, se ven como puntitos
   y se expanden al pasar el ratón; con más zoom se ven uno a uno.
============================================================ */

const YEAR_MS = 365.25 * 86400000;
const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTHS_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const HOVER_DELAY_MS = 400;
const DEFAULT_WINDOW_YEARS = 15; // 3 periodos de 5 años
const BIG_BTN_HALF_YEARS = 1; // el botón de entrada a un periodo de 5 años mide 2 años de ancho

// Geometría de las cajas (px)
const DREAM_W = 196, DREAM_H = 58, DREAM_ARROW = 14, DREAM_LANE = DREAM_H + 8;
const PROJ_W = 118, PROJ_H = 38, PROJ_ARROW = 12, PROJ_LANE = PROJ_H + 6;

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

interface Marker { id: string; title: string; pct: number; kind: "dream" | "project"; color?: string; image?: string; dateLabel: string; }
interface Band { pct0: number; pct1: number; label: string; onClick?: () => void; }
type TickKind = "short" | "mid" | "long";
interface Tick { pct: number; kind: TickKind; }
interface RulerLabel { pct: number; text: string; sub?: string; top: number; strong?: boolean; }
interface BigButton { pct: number; pct0: number; pct1: number; label: string; onClick: () => void; }

const TICK_CLASS: Record<TickKind, string> = {
  short: "h-2.5 w-px bg-foreground/45",
  mid: "h-4 w-px bg-foreground/60",
  long: "h-6 w-[2px] bg-foreground/90",
};

/** Reparte cajas en "carriles" para que no se solapen (carril 0 = el más cercano a la regla). */
function packLanes<T extends { cx: number }>(items: T[], w: number, gap = 8): (T & { lane: number })[] {
  const sorted = [...items].sort((a, b) => a.cx - b.cx);
  const laneEnds: number[] = [];
  return sorted.map(it => {
    const start = it.cx - w / 2;
    let lane = laneEnds.findIndex(end => end + gap <= start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
    laneEnds[lane] = it.cx + w / 2;
    return { ...it, lane };
  });
}

interface Placed { m: Marker; x: number; cx: number; shift: number; }

function place(markers: Marker[], width: number, boxW: number): Placed[] {
  return markers.map(m => {
    const x = m.pct * width;
    const cx = Math.min(Math.max(x, boxW / 2), Math.max(boxW / 2, width - boxW / 2));
    return { m, x, cx, shift: cx - x };
  });
}

/** Grupo de proyectos muy juntos: puntitos que se expanden en una lista al pasar el ratón. */
function ProjectCluster({ items, onOpenProject }: { items: Placed[]; onOpenProject: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const minX = items[0].x;
  const maxX = items[items.length - 1].x;
  const left = minX - 12;
  const w = maxX - minX + 24;
  return (
    <div
      className="absolute top-0 z-20"
      style={{ left, width: w }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="relative h-7">
        {items.map(it => (
          <div key={it.m.id} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: it.x - left }}>
            <div className="h-2.5 w-px bg-muted-foreground/50" />
            <span className="h-2.5 w-2.5 rounded-full border border-background bg-muted-foreground/80 shadow-sm" />
          </div>
        ))}
      </div>
      <div className="absolute left-1/2 top-[28px] -translate-x-1/2 whitespace-nowrap text-[10px] text-muted-foreground">
        {items.length} proyectos
      </div>
      {open && (
        <div className="absolute left-1/2 top-full z-30 -translate-x-1/2 pt-5">
          <div className="max-h-52 w-64 overflow-y-auto rounded-lg border bg-card p-1.5 shadow-lg">
            {items.map(it => (
              <button
                key={it.m.id}
                onClick={() => onOpenProject(it.m.id)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-muted"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <FolderKanban className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{it.m.title}</span>
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{it.m.dateLabel}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Ruler({
  level, markers, bands, ticks, labels, bigButtons, onOpenDream, onOpenProject, hoverLabel,
}: {
  level: ZoomState["level"];
  markers: Marker[]; bands: Band[]; ticks: Tick[]; labels: RulerLabel[]; bigButtons: BigButton[];
  onOpenDream: (id: string) => void; onOpenProject: (id: string) => void;
  hoverLabel: (pct: number) => string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || 900);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  /* ---- Sueños: cajas grandes con miniatura, en carriles hacia arriba ---- */
  const dreams = useMemo(
    () => packLanes(place(markers.filter(m => m.kind === "dream"), width, DREAM_W), DREAM_W),
    [markers, width],
  );
  const dreamLanes = dreams.reduce((mx, d) => Math.max(mx, d.lane + 1), 0);
  const dreamAreaH = dreams.length ? DREAM_H + DREAM_ARROW + (dreamLanes - 1) * DREAM_LANE : 0;

  /* ---- Proyectos: cajas pequeñas; si coinciden varios, puntitos (salvo a nivel de año) ---- */
  const projLayout = useMemo(() => {
    const placed = place(markers.filter(m => m.kind === "project"), width, PROJ_W);
    if (level === "year") {
      return { boxes: packLanes(placed, PROJ_W), clusters: [] as Placed[][] };
    }
    const sorted = [...placed].sort((a, b) => a.x - b.x);
    const groups: Placed[][] = [];
    sorted.forEach(it => {
      const last = groups[groups.length - 1];
      if (last && it.x - last[last.length - 1].x < PROJ_W + 6) last.push(it);
      else groups.push([it]);
    });
    return {
      boxes: groups.filter(g => g.length === 1).map(g => ({ ...g[0], lane: 0 })),
      clusters: groups.filter(g => g.length > 1),
    };
  }, [markers, width, level]);
  const projLanes = projLayout.boxes.reduce((mx, b) => Math.max(mx, b.lane + 1), 0);
  const boxesH = projLanes ? PROJ_H + PROJ_ARROW + (projLanes - 1) * PROJ_LANE : 0;
  const clustersH = projLayout.clusters.length ? 44 : 0;
  const projAreaH = Math.max(boxesH, clustersH);

  return (
    <div className="relative select-none pb-4">
      {/* Sueños (arriba): caja grande con miniatura y flecha al punto exacto */}
      <div className="relative mt-2" style={{ height: dreamAreaH }}>
        {dreams.map(d => (
          <div key={d.m.id} style={{ left: d.x }} className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center">
            <button
              onClick={() => onOpenDream(d.m.id)}
              style={{ borderColor: d.m.color, width: DREAM_W, height: DREAM_H, transform: `translateX(${d.shift}px)` }}
              className="relative z-10 flex items-center gap-2 rounded-xl border-2 bg-card p-1.5 pr-3 text-left shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              title={d.m.title}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                style={{ backgroundColor: `${d.m.color ?? "#6366f1"}22` }}
              >
                {d.m.image
                  ? <img src={d.m.image} alt="" className="h-full w-full object-cover" />
                  : <Mountain className="h-5 w-5" style={{ color: d.m.color }} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold leading-tight">{d.m.title}</span>
                <span className="block text-[10px] leading-tight text-muted-foreground">{d.m.dateLabel}</span>
              </span>
            </button>
            <div className="w-px" style={{ height: DREAM_ARROW - 6 + d.lane * DREAM_LANE, backgroundColor: d.m.color ?? "currentColor" }} />
            <div className="h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent" style={{ borderTopColor: d.m.color ?? "currentColor" }} />
          </div>
        ))}
      </div>

      {/* La regla */}
      <div
        ref={trackRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="relative h-[76px] cursor-crosshair rounded-md border bg-gradient-to-b from-muted to-muted/40 shadow-inner"
      >
        {/* Bandas clicables (una por año) */}
        {bands.map((b, i) => (
          <button
            key={i}
            onClick={b.onClick}
            disabled={!b.onClick}
            title={b.label}
            style={{ left: `${b.pct0 * 100}%`, width: `${(b.pct1 - b.pct0) * 100}%` }}
            className={cn(
              "absolute inset-y-0 transition-colors",
              b.onClick ? "cursor-pointer hover:bg-primary/10" : "cursor-default",
            )}
          />
        ))}

        {/* Marcas que cuelgan del borde superior */}
        {ticks.map((t, i) => (
          <div key={i} style={{ left: `${t.pct * 100}%` }} className={cn("pointer-events-none absolute top-0 -translate-x-1/2", TICK_CLASS[t.kind])} />
        ))}

        {/* Zonas anchas de entrada a un periodo de 5 años + su marca gruesa */}
        {bigButtons.map((b, i) => (
          <button
            key={i}
            onClick={b.onClick}
            title={`Ver de ${b.label}`}
            style={{ left: `${b.pct0 * 100}%`, width: `${(b.pct1 - b.pct0) * 100}%` }}
            className="absolute inset-y-0 z-10 rounded-sm transition-colors hover:bg-primary/15"
          />
        ))}
        {bigButtons.map((b, i) => (
          <div
            key={`bar${i}`}
            style={{ left: `${b.pct * 100}%` }}
            className="pointer-events-none absolute top-0 z-[11] h-9 w-1 -translate-x-1/2 rounded-b bg-primary"
          />
        ))}

        {/* Números de la regla */}
        {labels.map((l, i) => (
          <div
            key={i}
            style={{ left: `${l.pct * 100}%`, top: l.top }}
            className="pointer-events-none absolute z-[11] -translate-x-1/2 text-center leading-none"
          >
            <span className={cn("font-mono text-[11px] tabular-nums", l.strong ? "font-semibold text-foreground" : "text-foreground/80")}>{l.text}</span>
            {l.sub && <span className="mt-0.5 block font-mono text-[9px] text-muted-foreground">{l.sub}</span>}
          </div>
        ))}

        {hoverPct !== null && (
          <div style={{ left: `${hoverPct * 100}%` }} className="pointer-events-none absolute inset-y-0 z-20 w-px -translate-x-1/2 bg-primary/70" />
        )}

        {tooltipVisible && hoverPct !== null && (
          <div
            style={{ left: `${hoverPct * 100}%` }}
            className="pointer-events-none absolute -top-9 z-30 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow"
          >
            {hoverLabel(hoverPct)}
          </div>
        )}
      </div>

      {/* Proyectos (abajo): cajas pequeñas, o puntitos si coinciden muchos */}
      <div className="relative" style={{ height: projAreaH, marginTop: projAreaH ? 0 : 0 }}>
        {projLayout.boxes.map(b => (
          <div key={b.m.id} style={{ left: b.x }} className="absolute top-0 flex -translate-x-1/2 flex-col items-center">
            <div className="h-0 w-0 border-x-[4px] border-b-[5px] border-x-transparent border-b-muted-foreground/60" />
            <div className="w-px bg-muted-foreground/50" style={{ height: PROJ_ARROW - 5 + b.lane * PROJ_LANE }} />
            <button
              onClick={() => onOpenProject(b.m.id)}
              style={{ width: PROJ_W, height: PROJ_H, transform: `translateX(${b.shift}px)` }}
              className="relative z-10 flex flex-col justify-center rounded-md border bg-card px-2 text-left shadow-sm transition hover:translate-y-0.5 hover:shadow"
              title={b.m.title}
            >
              <span className="flex items-center gap-1 text-[11px] font-medium leading-tight">
                <FolderKanban className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{b.m.title}</span>
              </span>
              <span className="text-[10px] leading-tight text-muted-foreground">{b.m.dateLabel}</span>
            </button>
          </div>
        ))}
        {projLayout.clusters.map((g, i) => (
          <ProjectCluster key={i} items={g} onOpenProject={onOpenProject} />
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

  /** Marcas, números, bandas clicables y zonas de 5 años, según el nivel de zoom. */
  const { bands, ticks, labels, bigButtons, hoverLabel } = useMemo(() => {
    const empty = { bands: [] as Band[], ticks: [] as Tick[], labels: [] as RulerLabel[], bigButtons: [] as BigButton[], hoverLabel: (_: number) => "" };
    if (!birth) return empty;

    const win = ageWindow(zoom, maxAge, currentAge);
    if (win) {
      const span = win.max - win.min;
      const bs: Band[] = [];
      const tk: Tick[] = [];
      const lb: RulerLabel[] = [];
      const big: BigButton[] = [];
      for (let age = Math.floor(win.min); age < Math.ceil(win.max); age++) {
        const pct0 = clamp01((age - win.min) / span);
        const pct1 = clamp01((age + 1 - win.min) / span);
        if (pct1 <= pct0) continue;
        bs.push({ pct0, pct1, label: `Ver el año ${birth.getFullYear() + age}`, onClick: () => pushYear(birth.getFullYear() + age) });
      }
      for (let age = Math.ceil(win.min); age <= Math.floor(win.max); age++) {
        const pct = clamp01((age - win.min) / span);
        if (age % 5 === 0) lb.push({ pct, text: String(age), top: 42, strong: true });
        else tk.push({ pct, kind: "short" });
      }
      for (let age5 = Math.ceil(win.min / 5) * 5; age5 <= win.max; age5 += 5) {
        const pct = (age5 - win.min) / span;
        const pct0 = clamp01((age5 - BIG_BTN_HALF_YEARS - win.min) / span);
        const pct1 = clamp01((age5 + BIG_BTN_HALF_YEARS - win.min) / span);
        if (pct1 <= pct0) continue;
        const startAge = Math.max(0, Math.min(age5, maxAge - 5));
        big.push({ pct, pct0, pct1, label: `${startAge}-${startAge + 5} años`, onClick: () => pushFive(startAge) });
      }
      return {
        bands: bs, ticks: tk, labels: lb, bigButtons: big,
        hoverLabel: (pct: number) => `Año natural: ${birth.getFullYear() + Math.floor(win.min + pct * span)}`,
      };
    }

    if (zoom.level === "five") {
      const startCalYear = birth.getFullYear() + zoom.startAge;
      const bs: Band[] = [];
      const tk: Tick[] = [];
      const lb: RulerLabel[] = [];
      for (let y = 0; y <= 5; y++) {
        tk.push({ pct: y / 5, kind: "long" });
        lb.push({ pct: y / 5, text: String(zoom.startAge + y), sub: String(startCalYear + y), top: 30, strong: true });
      }
      for (let y = 0; y < 5; y++) {
        bs.push({ pct0: y / 5, pct1: (y + 1) / 5, label: `Ver el año ${startCalYear + y}`, onClick: () => pushYear(startCalYear + y) });
        for (let m = 1; m < 12; m++) tk.push({ pct: (y + m / 12) / 5, kind: m === 6 ? "mid" : "short" });
      }
      return {
        bands: bs, ticks: tk, labels: lb, bigButtons: [] as BigButton[],
        hoverLabel: (pct: number) => {
          const totalMonths = Math.min(59, Math.floor(pct * 60));
          const y = startCalYear + Math.floor(totalMonths / 12);
          const m = totalMonths % 12;
          return `${MONTHS_FULL[m]} ${y}`;
        },
      };
    }

    // year
    const calYear = (zoom as { level: "year"; calYear: number }).calYear;
    const tk: Tick[] = [];
    const lb: RulerLabel[] = [];
    for (let m = 0; m <= 12; m++) tk.push({ pct: m / 12, kind: "long" });
    for (let m = 0; m < 12; m++) {
      lb.push({ pct: (m + 0.5) / 12, text: MONTHS_SHORT[m], top: 34, strong: true });
      const dim = daysInMonth(calYear, m);
      for (const day of [5, 10, 15, 20, 25]) {
        if (day > dim) continue;
        tk.push({ pct: (m + (day - 1) / dim) / 12, kind: day === 15 ? "mid" : "short" });
      }
    }
    return {
      bands: [] as Band[], ticks: tk, labels: lb, bigButtons: [] as BigButton[],
      hoverLabel: (pct: number) => `${MONTHS_FULL[Math.min(11, Math.floor(pct * 12))]} ${calYear}`,
    };
  }, [zoom, birth, maxAge, currentAge]);

  const markers = useMemo<Marker[]>(() => {
    if (!birth) return [];
    const list: Marker[] = [];
    dreams.forEach(d => {
      if (!d.deadline) return;
      const date = new Date(d.deadline);
      const pct = pctForDate(zoom, birth, maxAge, currentAge, date);
      if (pct !== null) list.push({ id: d.id, title: d.title, pct, kind: "dream", color: d.color, image: d.image, dateLabel: format(date, "d MMM yyyy", { locale: es }) });
    });
    projects.forEach(p => {
      if (!p.dueDate) return;
      const date = new Date(p.dueDate);
      const pct = pctForDate(zoom, birth, maxAge, currentAge, date);
      if (pct !== null) list.push({ id: p.id, title: p.title, pct, kind: "project", dateLabel: format(date, "d MMM yyyy", { locale: es }) });
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
        <Empty msg="Configura tu fecha de nacimiento desde la pestaña Sueños (el botón de ajustes del contador) para ver tu línea temporal." />
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

      <div className="overflow-x-clip rounded-2xl border bg-card p-5 sm:p-7">
        <Ruler
          level={zoom.level}
          markers={markers}
          bands={bands}
          ticks={ticks}
          labels={labels}
          bigButtons={bigButtons}
          hoverLabel={hoverLabel}
          onOpenDream={onOpenDream}
          onOpenProject={onOpenProject}
        />
      </div>
    </div>
  );
}
