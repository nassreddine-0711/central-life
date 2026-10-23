import { useEffect, useMemo, useState } from "react";
import { addDays, format, isSameDay, isToday, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Target, X, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSync } from "@/hooks/useSupabaseSync";
import { useCerebro } from "../CerebroContext";
import { Empty, TaskList } from "../TaskComponents";
import { DayPart, DAY_PART_LABEL, DAY_PART_ORDER } from "../types";
import {
  RoutinesState,
  RoutineCategory,
  normalizeState,
  DEFAULT_PERIODS,
  DEFAULT_VISIBLE_RANGE,
  slotLabel,
} from "./RutinasPanel";

/* ============================================================
   Vista diaria: horario de un solo día (pintado de fondo según la
   rutina seleccionada en el Gestor de Rutinas), con sitio para escribir
   encima lo que harás de verdad, objetivos del día, tareas del día y
   hábitos/actividades a marcar.
============================================================ */

/* ---------- Tipos propios ---------- */
interface DailyPlanEntry {
  notes: Partial<Record<DayPart, string>>;
  goals: string[];
  habitChecks: string[];
}
type DailyPlanState = Record<string, DailyPlanEntry>;

interface HabitItem {
  id: string;
  label: string;
}

const EMPTY_ENTRY: DailyPlanEntry = { notes: {}, goals: [], habitChecks: [] };
const isDailyPlanEmpty = (v: DailyPlanState) => Object.keys(v ?? {}).length === 0;
const isHabitsEmpty = (v: HabitItem[]) => (v ?? []).length === 0;

const uid = () => Math.random().toString(36).slice(2, 10);
const dateKey = (d: Date) => format(d, "yyyy-MM-dd");
const ROW_PX = 20;
const ALL_SLOTS = Array.from({ length: 48 }, (_, i) => i);

/** Lee el horario de Rutinas en modo SOLO LECTURA. No usa useSupabaseSync aquí a
 *  propósito: ese hook ya se usa, para este mismo módulo, dentro del Gestor de
 *  Rutinas. Tener dos sincronizadores activos sobre el mismo dato a la vez es
 *  justo el tipo de cosa que puede pisar datos; aquí solo hace falta leer, nunca
 *  escribir, así que una simple lectura puntual es más segura. */
function useRoutinesReadOnly(): RoutinesState | null {
  const { user } = useAuth();
  const [routines, setRoutines] = useState<RoutinesState | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("user_data")
      .select("data")
      .eq("user_id", user.id)
      .eq("module", "cerebro_routines")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.data) return;
        setRoutines(normalizeState(data.data as unknown as RoutinesState));
      });
    return () => {
      cancelled = true;
    };
  }, [user]);
  return routines;
}

export function DayView() {
  const { tasks, fadingIds, toggleTask, delTask, updateTask, openTaskDialog } = useCerebro();
  const routines = useRoutinesReadOnly();

  const [selected, setSelected] = useState(() => new Date());
  const key = dateKey(selected);

  const [dailyPlan, setDailyPlan] = useState<DailyPlanState>({});
  useSupabaseSync<DailyPlanState>("cerebro_daily_plan", dailyPlan, setDailyPlan, { isDefault: isDailyPlanEmpty });
  const [habits, setHabits] = useState<HabitItem[]>([]);
  useSupabaseSync<HabitItem[]>("cerebro_habits", habits, setHabits, { isDefault: isHabitsEmpty });

  const entry = dailyPlan[key] ?? EMPTY_ENTRY;

  const patchEntry = (patch: Partial<DailyPlanEntry>) => {
    setDailyPlan((prev) => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY_ENTRY), ...patch } }));
  };
  const setNote = (part: DayPart, text: string) => {
    setDailyPlan((prev) => {
      const cur = prev[key] ?? EMPTY_ENTRY;
      return { ...prev, [key]: { ...cur, notes: { ...cur.notes, [part]: text } } };
    });
  };

  /* ---------- Objetivos del día ---------- */
  const [goalDraft, setGoalDraft] = useState("");
  const addGoal = () => {
    if (!goalDraft.trim()) return;
    patchEntry({ goals: [...entry.goals, goalDraft.trim()] });
    setGoalDraft("");
  };
  const removeGoal = (i: number) => patchEntry({ goals: entry.goals.filter((_, idx) => idx !== i) });

  /* ---------- Hábitos / actividades ---------- */
  const [habitDraft, setHabitDraft] = useState("");
  const addHabit = () => {
    if (!habitDraft.trim()) return;
    setHabits((h) => [...h, { id: uid(), label: habitDraft.trim() }]);
    setHabitDraft("");
  };
  const removeHabit = (id: string) => setHabits((h) => h.filter((x) => x.id !== id));
  const toggleHabit = (id: string) => {
    const checked = entry.habitChecks.includes(id);
    patchEntry({ habitChecks: checked ? entry.habitChecks.filter((x) => x !== id) : [...entry.habitChecks, id] });
  };

  /* ---------- Tareas del día, repartidas por franja ---------- */
  const dayTasks = useMemo(
    () => tasks.filter((t) => !t.done && t.date && isSameDay(new Date(t.date), selected)),
    [tasks, selected],
  );
  const dayTasksByPart = useMemo(() => {
    const map = new Map<DayPart, typeof dayTasks>();
    DAY_PART_ORDER.forEach((dp) => map.set(dp, []));
    dayTasks.forEach((t) => {
      const dp = t.dayPart ?? "morning";
      (map.get(dp) ?? map.get("morning")!).push(t);
    });
    return map;
  }, [dayTasks]);

  /* ---------- Horario de fondo: categoría pintada en cada media hora ---------- */
  const weekday = (selected.getDay() + 6) % 7; // 0=Lun..6=Dom
  const version = routines
    ? routines.versions.find((v) => v.id === routines.currentId) ?? routines.versions[0]
    : undefined;
  const catById = (id?: string): RoutineCategory | undefined =>
    id ? routines?.categories.find((c) => c.id === id) : undefined;
  const periods = routines?.periodBoundaries ?? DEFAULT_PERIODS;
  const visibleRange = routines?.visibleRange ?? DEFAULT_VISIBLE_RANGE;

  const visibleSlots = useMemo(() => {
    const startSlot = Math.round(visibleRange.startHour * 2);
    const endSlot = Math.round(visibleRange.endHour * 2);
    const filtered = ALL_SLOTS.filter((s) => s >= startSlot && s < endSlot);
    return filtered.length > 0 ? filtered : ALL_SLOTS;
  }, [visibleRange.startHour, visibleRange.endHour]);

  /** A qué franja (mañana/mediodía/tarde/noche) pertenece una media hora, según los
   *  límites configurados en Rutinas. Antes de que empiece "mi día" se considera que
   *  sigue siendo de noche (igual que en el Gestor de Rutinas). */
  const partForSlot = (slot: number): DayPart => {
    const h = slot / 2;
    if (h >= periods.nightStart) return "evening";
    if (h >= periods.afternoonStart) return "afternoon";
    if (h >= periods.middayStart) return "midday";
    if (h >= periods.morningStart) return "morning";
    return "evening";
  };

  /** Tramos contiguos de una misma franja dentro del rango visible. Normalmente son 4
   *  (uno por franja), pero si "noche" cruza la medianoche dentro del rango visible
   *  puede aparecer dos veces (madrugada + noche); solo el tramo más largo de cada
   *  franja lleva cuadro de texto, el otro solo se ve de fondo. */
  const partSegments = useMemo(() => {
    const segs: { dp: DayPart; start: number; end: number }[] = [];
    visibleSlots.forEach((slot, i) => {
      const dp = partForSlot(slot);
      const last = segs[segs.length - 1];
      if (last && last.dp === dp) last.end = i + 2;
      else segs.push({ dp, start: i + 1, end: i + 2 });
    });
    return segs;
  }, [visibleSlots, periods]);

  const editableSegmentKeys = useMemo(() => {
    const best = new Map<DayPart, { start: number; end: number }>();
    partSegments.forEach((seg) => {
      const cur = best.get(seg.dp);
      if (!cur || seg.end - seg.start > cur.end - cur.start) best.set(seg.dp, { start: seg.start, end: seg.end });
    });
    return new Set(Array.from(best.entries()).map(([dp, r]) => `${dp}-${r.start}`));
  }, [partSegments]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* ---------- IZQUIERDA: horario grande del día ---------- */}
      <div className="min-w-0 rounded-2xl border bg-card/50 p-4 shadow-sm backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected((d) => subDays(d, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected((d) => addDays(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday(selected) && (
              <Button variant="outline" size="sm" className="h-8" onClick={() => setSelected(new Date())}>
                Hoy
              </Button>
            )}
          </div>
          <h3 className="text-sm font-semibold capitalize text-foreground">
            {format(selected, "EEEE d MMMM", { locale: es })}
          </h3>
        </div>

        {routines && routines.categories.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {routines.categories.map((c) => (
              <span key={c.id} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </span>
            ))}
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-border/60">
          <div
            className="grid"
            style={{ gridTemplateColumns: "48px 1fr", gridTemplateRows: `repeat(${visibleSlots.length}, ${ROW_PX}px)` }}
          >
            {/* Columna de horas */}
            {visibleSlots.map((slot, i) => {
              const isHourMark = slot % 2 === 0;
              return (
                <div
                  key={`h-${slot}`}
                  style={{ gridRow: i + 1, gridColumn: 1 }}
                  className={cn(
                    "flex items-start justify-end border-r border-border/40 px-1.5 font-mono text-[9px] text-muted-foreground/60",
                    isHourMark ? "border-t border-t-border/40" : "border-t border-t-transparent",
                  )}
                >
                  {isHourMark ? slotLabel(slot) : ""}
                </div>
              );
            })}

            {/* Fondo de color según la rutina */}
            {visibleSlots.map((slot, i) => {
              const cat = catById(version?.blocks[`${weekday}-${slot}`]);
              const isHourMark = slot % 2 === 0;
              return (
                <div
                  key={`bg-${slot}`}
                  style={{ gridRow: i + 1, gridColumn: 2, backgroundColor: cat?.color, opacity: cat ? 0.16 : 1 }}
                  className={cn("border-t", isHourMark ? "border-t-border/30" : "border-t-border/10")}
                />
              );
            })}

            {/* Cuadros para escribir qué harás, uno por franja (hereda los límites de Rutinas) */}
            {partSegments.map((seg) => {
              const editable = editableSegmentKeys.has(`${seg.dp}-${seg.start}`);
              return (
                <div
                  key={`${seg.dp}-${seg.start}`}
                  style={{ gridRow: `${seg.start} / ${seg.end}`, gridColumn: 2 }}
                  className="relative z-10 flex flex-col overflow-hidden border-t border-dashed border-border/50 p-1.5"
                >
                  <span className="mb-1 shrink-0 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    {DAY_PART_LABEL[seg.dp]}
                  </span>
                  {editable ? (
                    <Textarea
                      value={entry.notes[seg.dp] ?? ""}
                      onChange={(e) => setNote(seg.dp, e.target.value)}
                      placeholder="¿Qué vas a hacer?"
                      className="h-full min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
                    />
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50">· sigue en {DAY_PART_LABEL[seg.dp]} ·</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------- DERECHA: objetivos, tareas y hábitos ---------- */}
      <aside className="space-y-4">
        {/* Objetivos del día */}
        <div className="rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-primary" /> Objetivos de hoy
          </div>
          <div className="space-y-1.5">
            {entry.goals.map((g, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border bg-background/60 px-2 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{g}</span>
                <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => removeGoal(i)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {entry.goals.length === 0 && (
              <p className="text-xs text-muted-foreground">Sin objetivos. Apunta 3-5 para hoy.</p>
            )}
          </div>
          <div className="mt-2 flex gap-1.5">
            <Input
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGoal()}
              placeholder="Nuevo objetivo…"
              className="h-8 text-sm"
            />
            <Button size="icon" className="h-8 w-8 shrink-0" disabled={!goalDraft.trim()} onClick={addGoal}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tareas del día */}
        <div className="rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Tareas de hoy</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => openTaskDialog({ defaultDate: selected.toISOString() })}
              title="Nueva tarea este día"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {dayTasks.length === 0 ? (
            <Empty msg="Sin tareas." />
          ) : (
            <div className="space-y-3">
              {DAY_PART_ORDER.map((dp) => {
                const items = dayTasksByPart.get(dp) ?? [];
                if (items.length === 0) return null;
                return (
                  <div key={dp}>
                    <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {DAY_PART_LABEL[dp]} · {items.length}
                    </h4>
                    <TaskList tasks={items} fadingIds={fadingIds} onToggle={toggleTask} onDelete={delTask} onUpdate={updateTask} compact />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hábitos y actividades */}
        <div className="rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="h-4 w-4 text-primary" /> Hábitos y actividades
          </div>
          <div className="space-y-1">
            {habits.map((h) => (
              <label key={h.id} className="group flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm hover:bg-accent/40">
                <Checkbox checked={entry.habitChecks.includes(h.id)} onCheckedChange={() => toggleHabit(h.id)} />
                <span className="min-w-0 flex-1 truncate">{h.label}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => removeHabit(h.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </label>
            ))}
            {habits.length === 0 && (
              <p className="text-xs text-muted-foreground">Añade los hábitos o actividades que quieras marcar cada día.</p>
            )}
          </div>
          <div className="mt-2 flex gap-1.5">
            <Input
              value={habitDraft}
              onChange={(e) => setHabitDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addHabit()}
              placeholder="Nuevo hábito/actividad…"
              className="h-8 text-sm"
            />
            <Button size="icon" className="h-8 w-8 shrink-0" disabled={!habitDraft.trim()} onClick={addHabit}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
