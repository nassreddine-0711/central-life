import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Flame, Droplet, Dumbbell, Utensils, Locate } from "lucide-react";
import { useHealth } from "./HealthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toISODate, formatISODate } from "./dateUtils";

type View = "week" | "month" | "year";

const fmtISO = toISODate;

const COLOR_CAL = "hsl(140 90% 55%)";
const COLOR_HYD = "hsl(195 100% 60%)";
const COLOR_EMPTY = "hsl(var(--muted-foreground) / 0.18)";

/** Mon-first day-of-week: 0..6 */
const dow = (d: Date) => (d.getDay() + 6) % 7;
const startOfWeek = (d: Date) => {
  const x = new Date(d);
  x.setDate(d.getDate() - dow(d));
  x.setHours(0, 0, 0, 0);
  return x;
};

export function HistoryCalendar() {
  const { getDayStats, records } = useHealth();
  // Anchor date: drives which month/week/year is shown. Synced across views.
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [view, setView] = useState<View>("month");
  const [openDate, setOpenDate] = useState<string | null>(null);

  const todayISO = fmtISO(new Date());

  const periodStats = useMemo(() => {
    let from: Date, to: Date;
    if (view === "week") {
      from = startOfWeek(anchor);
      to = new Date(from); to.setDate(from.getDate() + 6);
    } else if (view === "month") {
      from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    } else {
      from = new Date(anchor.getFullYear(), 0, 1);
      to = new Date(anchor.getFullYear(), 11, 31);
    }
    const now = new Date();
    if (to > now) to = now;

    const dates: string[] = [];
    const cur = new Date(from);
    while (cur <= to) { dates.push(fmtISO(cur)); cur.setDate(cur.getDate() + 1); }

    let met = 0, hydMet = 0, calMet = 0, withData = 0;
    let kcalSum = 0, kcalDays = 0, mlSum = 0;
    dates.forEach((d) => {
      const s = getDayStats(d);
      if (s.hasData) withData++;
      if (s.caloriesGoalMet) calMet++;
      if (s.hydrationGoalMet) hydMet++;
      if (s.caloriesGoalMet && s.hydrationGoalMet) met++;
      if (s.consumed > 0) { kcalSum += s.consumed; kcalDays++; }
      mlSum += s.totalMl;
    });
    const total = dates.length;
    return {
      total, met, calMet, hydMet, withData,
      pct: total ? Math.round((met / total) * 100) : 0,
      avgKcal: kcalDays ? Math.round(kcalSum / kcalDays) : 0,
      avgMl: total ? Math.round(mlSum / total) : 0,
    };
  }, [view, anchor, records, getDayStats]);

  const goToday = () => { setAnchor(new Date()); };

  const periodLabel = useMemo(() => {
    if (view === "year") return String(anchor.getFullYear());
    if (view === "month") return anchor.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    const start = startOfWeek(anchor);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const sameMonth = start.getMonth() === end.getMonth();
    return sameMonth
      ? `${start.getDate()}–${end.getDate()} ${start.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}`
      : `${start.getDate()} ${start.toLocaleDateString("es-ES", { month: "short" })} – ${end.getDate()} ${end.toLocaleDateString("es-ES", { month: "short", year: "numeric" })}`;
  }, [view, anchor]);

  const navigate = (dir: -1 | 1) => {
    const d = new Date(anchor);
    if (view === "year") d.setFullYear(d.getFullYear() + dir);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + 7 * dir);
    setAnchor(d);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass rounded-3xl p-6 md:p-8"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-widest">Historial · Calendario</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
          >
            <Locate className="h-3 w-3" /> Hoy
          </button>
          <div className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/30 p-1">
            {(["week", "month", "year"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest transition ${
                  view === v ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "week" ? "Semana" : v === "month" ? "Mes" : "Año"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Period summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryStat label="Cumplimiento" value={`${periodStats.pct}%`} sub={`${periodStats.met}/${periodStats.total} días`} color={COLOR_CAL} />
        <SummaryStat label="Calorías OK" value={`${periodStats.calMet}`} sub="días en objetivo" color={COLOR_CAL} />
        <SummaryStat label="Hidratación OK" value={`${periodStats.hydMet}`} sub="días completos" color={COLOR_HYD} />
        <SummaryStat label="Media diaria" value={`${periodStats.avgKcal} kcal`} sub={`${(periodStats.avgMl / 1000).toFixed(1)} L agua`} color="hsl(var(--foreground))" />
      </div>

      {/* Period nav */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full border border-border/50 bg-background/30 p-2 text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{periodLabel}</span>
        <button
          onClick={() => navigate(1)}
          className="rounded-full border border-border/50 bg-background/30 p-2 text-muted-foreground transition hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === "year" && (
          <motion.div
            key="year"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <YearHeatmap
              year={anchor.getFullYear()}
              getDayStats={getDayStats}
              onPickMonth={(m) => { setAnchor(new Date(anchor.getFullYear(), m, 1)); setView("month"); }}
              onPickDay={(iso) => setOpenDate(iso)}
              todayISO={todayISO}
            />
          </motion.div>
        )}
        {view === "month" && (
          <motion.div
            key="month"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <MonthGrid
              monthDate={new Date(anchor.getFullYear(), anchor.getMonth(), 1)}
              getDayStats={getDayStats}
              onPick={(iso) => setOpenDate(iso)}
              todayISO={todayISO}
            />
          </motion.div>
        )}
        {view === "week" && (
          <motion.div
            key="week"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <WeekStrip
              anchor={anchor}
              getDayStats={getDayStats}
              onPick={(iso) => setOpenDate(iso)}
              todayISO={todayISO}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-widest text-muted-foreground">
        <LegendDot color={COLOR_CAL} label="Calorías" />
        <LegendDot color={COLOR_HYD} label="Hidratación" />
        <span className="text-muted-foreground/50">· Click en un día para ver detalle</span>
      </div>

      {/* Day detail */}
      <Sheet open={!!openDate} onOpenChange={(v) => !v && setOpenDate(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {openDate && <DayDetail date={openDate} onClose={() => setOpenDate(null)} />}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}

/* ───────────────────────── Year heatmap (12 mini-months) ──────────────────── */

function YearHeatmap({
  year, getDayStats, onPickMonth, onPickDay, todayISO,
}: {
  year: number;
  getDayStats: ReturnType<typeof useHealth>["getDayStats"];
  onPickMonth: (monthIdx: number) => void;
  onPickDay: (iso: string) => void;
  todayISO: string;
}) {
  const months = Array.from({ length: 12 }, (_, m) => m);
  return (
    <TooltipProvider delayDuration={120}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {months.map((m) => {
          const monthDate = new Date(year, m, 1);
          const cells = buildMonthGrid(monthDate);
          return (
            <div key={m} className="rounded-2xl border border-border/40 bg-background/30 p-3">
              <button
                onClick={() => onPickMonth(m)}
                className="mb-2 flex w-full items-center justify-between text-left"
              >
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/80">
                  {monthDate.toLocaleDateString("es-ES", { month: "short" }).toUpperCase()}
                </span>
                <span className="font-mono text-[9px] text-muted-foreground/60">{year}</span>
              </button>
              <div className="grid grid-cols-7 gap-[3px]">
                {cells.map((d, i) => {
                  if (!d) return <span key={i} className="aspect-square rounded-sm" />;
                  const iso = fmtISO(d);
                  const s = getDayStats(iso);
                  const isFuture = d > new Date();
                  const color = pixelColor(s, isFuture);
                  const isToday = iso === todayISO;
                  return (
                    <Tooltip key={iso}>
                      <TooltipTrigger asChild>
                        <button
                          disabled={isFuture}
                          onClick={() => s.hasData ? onPickDay(iso) : onPickMonth(m)}
                          className={`aspect-square rounded-sm transition hover:scale-125 disabled:opacity-30 ${
                            isToday ? "ring-1 ring-primary/80" : ""
                          }`}
                          style={{ background: color }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="font-mono text-[10px]">
                        <div>{iso}</div>
                        {s.hasData ? (
                          <div className="flex items-center gap-2">
                            <span style={{ color: s.balance < 0 ? COLOR_CAL : "hsl(0 80% 65%)" }}>
                              {s.balance >= 0 ? "+" : ""}{s.balance} kcal
                            </span>
                            <span style={{ color: COLOR_HYD }}>{(s.totalMl / 1000).toFixed(1)} L</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sin datos</span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function pixelColor(s: ReturnType<ReturnType<typeof useHealth>["getDayStats"]>, isFuture: boolean) {
  if (isFuture) return COLOR_EMPTY;
  if (!s.hasData) return COLOR_EMPTY;
  if (s.caloriesGoalMet && s.hydrationGoalMet) return "hsl(140 90% 55%)";
  if (s.caloriesGoalMet) return "hsl(140 90% 45% / 0.85)";
  if (s.hydrationGoalMet) return "hsl(195 100% 60% / 0.85)";
  return "hsl(var(--muted-foreground) / 0.45)";
}

/* ───────────────────────── Month grid ───────────────────── */

function MonthGrid({
  monthDate, getDayStats, onPick, todayISO,
}: {
  monthDate: Date;
  getDayStats: ReturnType<typeof useHealth>["getDayStats"];
  onPick: (iso: string) => void;
  todayISO: string;
}) {
  const cells = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  return (
    <>
      <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-medium uppercase tracking-widest text-muted-foreground/70">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (<div key={d} className="py-1">{d}</div>))}
      </div>

      <TooltipProvider delayDuration={150}>
        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const iso = fmtISO(day);
            const s = getDayStats(iso);
            const isToday = iso === todayISO;
            const isFuture = day > new Date();

            return (
              <Tooltip key={iso}>
                <TooltipTrigger asChild>
                  <button
                    disabled={isFuture}
                    onClick={() => onPick(iso)}
                    className={`group relative aspect-square rounded-xl border bg-background/30 p-1.5 text-left transition hover:border-primary/60 hover:bg-background/60 disabled:cursor-not-allowed disabled:opacity-30 ${
                      isToday ? "border-primary/70 ring-1 ring-primary/40" : "border-border/40"
                    }`}
                  >
                    <span className={`font-mono text-[11px] tabular-nums ${isToday ? "text-primary" : "text-foreground/80"}`}>
                      {day.getDate()}
                    </span>
                    {s.hasData ? (
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1">
                        {s.caloriesGoalMet && (
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR_CAL, boxShadow: `0 0 6px ${COLOR_CAL}` }} />
                        )}
                        {s.hydrationGoalMet && (
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR_HYD, boxShadow: `0 0 6px ${COLOR_HYD}` }} />
                        )}
                        {!s.caloriesGoalMet && !s.hydrationGoalMet && (
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                        )}
                      </div>
                    ) : (
                      <span className="absolute bottom-1.5 left-1.5 h-1 w-1 rounded-full bg-muted-foreground/20" />
                    )}
                  </button>
                </TooltipTrigger>
                {s.hasData && (
                  <TooltipContent side="top" className="font-mono text-[10px]">
                    <div className="flex items-center gap-2">
                      <span style={{ color: s.balance < 0 ? COLOR_CAL : "hsl(0 80% 65%)" }}>
                        {s.balance >= 0 ? "+" : ""}{s.balance} kcal
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span style={{ color: COLOR_HYD }}>{(s.totalMl / 1000).toFixed(1)} L</span>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </>
  );
}

/* ───────────────────────── Week strip ───────────────────── */

function WeekStrip({
  anchor, getDayStats, onPick, todayISO,
}: {
  anchor: Date;
  getDayStats: ReturnType<typeof useHealth>["getDayStats"];
  onPick: (iso: string) => void;
  todayISO: string;
}) {
  const days = useMemo(() => {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  }, [anchor]);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((d) => {
        const iso = fmtISO(d);
        const s = getDayStats(iso);
        const isToday = iso === todayISO;
        const isFuture = d > new Date();
        const minutes = s.activities.length * 30; // approx: 30 min per session

        return (
          <button
            key={iso}
            disabled={isFuture}
            onClick={() => onPick(iso)}
            className={`flex flex-col rounded-2xl border bg-background/30 p-3 text-left transition hover:border-primary/60 hover:bg-background/60 disabled:cursor-not-allowed disabled:opacity-30 ${
              isToday ? "border-primary/70 ring-1 ring-primary/40" : "border-border/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                {d.toLocaleDateString("es-ES", { weekday: "short" })}
              </span>
              <span className={`font-mono text-base tabular-nums ${isToday ? "text-primary" : "text-foreground/90"}`}>
                {d.getDate()}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              {s.caloriesGoalMet && (
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR_CAL, boxShadow: `0 0 6px ${COLOR_CAL}` }} />
              )}
              {s.hydrationGoalMet && (
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR_HYD, boxShadow: `0 0 6px ${COLOR_HYD}` }} />
              )}
              {!s.hasData && <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />}
            </div>

            <dl className="mt-3 space-y-1.5 font-mono text-[10px]">
              <Row label="Kcal" value={s.hasData ? `${s.consumed}` : "—"} color={COLOR_CAL} />
              <Row label="Agua" value={s.hasData ? `${(s.totalMl / 1000).toFixed(1)} L` : "—"} color={COLOR_HYD} />
              <Row label="Activ." value={s.hasData ? `${minutes} min` : "—"} color="hsl(var(--foreground))" />
            </dl>
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="tabular-nums" style={{ color }}>{value}</dd>
    </div>
  );
}

/* ───────────────────────── Shared bits ──────────────────── */

function SummaryStat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/30 p-4 backdrop-blur">
      <div className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold tabular-nums" style={{ color }}>{value}</div>
      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      {label}
    </span>
  );
}

function DayDetail({ date, onClose }: { date: string; onClose: () => void }) {
  const { getDayStats, bmr } = useHealth();
  const s = getDayStats(date);
  const totalOut = bmr + s.burned;
  const isDeficit = s.balance < 0;
  const dateLabel = formatISODate(date, "EEEE, d 'de' LLLL yyyy");

  return (
    <>
      <SheetHeader className="space-y-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground">Resumen del día</span>
        <SheetTitle className="text-xl capitalize">{dateLabel}</SheetTitle>
      </SheetHeader>

      <AnimatePresence>
        {!s.hasData ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-8 rounded-2xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground"
          >
            Sin registros para este día.
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-5"
          >
            <div className="glass rounded-2xl p-5 text-center">
              <div className="flex items-center justify-center gap-2 text-[9px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
                <Flame className="h-3 w-3" /> Balance
              </div>
              <div
                className="mt-2 font-mono text-4xl font-bold tabular-nums"
                style={{ color: isDeficit ? COLOR_CAL : "hsl(0 80% 65%)" }}
              >
                {s.balance >= 0 ? "+" : ""}{s.balance}
                <span className="ml-1 text-base text-muted-foreground">kcal</span>
              </div>
              <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                {s.consumed} − ({bmr} + {s.burned}) · gasto {totalOut}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MiniMacro label="Prot" value={s.macros.protein} color="hsl(195 100% 60%)" />
                <MiniMacro label="Carb" value={s.macros.carbs} color="hsl(45 100% 60%)" />
                <MiniMacro label="Grasa" value={s.macros.fat} color="hsl(330 80% 65%)" />
              </div>
            </div>

            <DetailBlock icon={<Droplet className="h-3.5 w-3.5" />} title="Hidratación">
              <div className="rounded-lg bg-background/30 px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span>Total ingerido</span>
                  <span className="font-mono tabular-nums" style={{ color: COLOR_HYD }}>
                    {s.totalMl} ml · {s.glasses} vasos
                  </span>
                </div>
              </div>
            </DetailBlock>

            <DetailBlock icon={<Utensils className="h-3.5 w-3.5" />} title={`Nutrición (${s.foods.length})`}>
              {s.foods.length === 0 ? (
                <Empty text="Sin ingestas" />
              ) : (
                s.foods.map((f) => (
                  <div key={f.id} className="rounded-lg bg-background/30 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{f.name}</span>
                      <span className="font-mono tabular-nums" style={{ color: "hsl(195 100% 60%)" }}>{f.kcal} kcal</span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                      P {f.protein}g · C {f.carbs}g · G {f.fat}g
                    </div>
                  </div>
                ))
              )}
            </DetailBlock>

            <DetailBlock icon={<Dumbbell className="h-3.5 w-3.5" />} title={`Actividad (${s.activities.length})`}>
              {s.activities.length === 0 ? (
                <Empty text="Sin actividad" />
              ) : (
                s.activities.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg bg-background/30 px-3 py-2 text-xs">
                    <span>{a.type}</span>
                    <span className="font-mono tabular-nums" style={{ color: COLOR_CAL }}>−{a.kcal} kcal</span>
                  </div>
                ))
              )}
            </DetailBlock>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function DetailBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {icon} {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function MiniMacro({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/30 p-2">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-semibold tabular-nums" style={{ color }}>
        {value.toFixed(1)}g
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border/40 px-3 py-2 text-[11px] text-muted-foreground">{text}</div>;
}

/** Builds a 6×7 grid (Mon-first), with nulls for empty cells. */
function buildMonthGrid(monthDate: Date): (Date | null)[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
