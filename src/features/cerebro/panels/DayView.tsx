import { useMemo, useState } from "react";
import { addDays, format, isSameDay, isToday, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Target, X, ListChecks, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSupabaseSync } from "@/hooks/useSupabaseSync";
import { useCerebro } from "../CerebroContext";
import { Empty, TaskList } from "../TaskComponents";
import { DayPart, DAY_PART_LABEL, DAY_PART_ORDER } from "../types";

/* ============================================================
   Vista diaria: un único cuadro con el horario del día, dividido en
   franjas horarias que el propio usuario define (cada "párrafo" tiene
   su propia hora de inicio y fin). Las franjas van siempre en orden
   cronológico de arriba a abajo y nunca pueden solaparse: los
   selectores de hora solo ofrecen las horas que quedan libres según
   las franjas vecinas. Además: objetivos del día, las tareas de ese
   día y hábitos/actividades a marcar.
============================================================ */

/* ---------- Tipos propios ---------- */
interface HourItem {
  id: string;
  text: string;
  done: boolean;
}
interface TimeBlock {
  id: string;
  start: number; // hora de inicio (0-23)
  end: number; // hora de fin (1-24)
  items: HourItem[];
}
interface DailyPlanEntry {
  blocks: TimeBlock[];
  goals: string[];
  habitChecks: string[];
}
type DailyPlanState = Record<string, DailyPlanEntry>;

interface HabitItem {
  id: string;
  label: string;
}

const EMPTY_ENTRY: DailyPlanEntry = { blocks: [], goals: [], habitChecks: [] };
const isDailyPlanEmpty = (v: DailyPlanState) => Object.keys(v ?? {}).length === 0;
const isHabitsEmpty = (v: HabitItem[]) => (v ?? []).length === 0;

const uid = () => Math.random().toString(36).slice(2, 10);
const dateKey = (d: Date) => format(d, "yyyy-MM-dd");
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23
const END_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i + 1); // 1..24 (24 = hasta medianoche)
const hourLabel = (h: number) => `${h.toString().padStart(2, "0")}:00`;

/** Autoajusta la altura del textarea a su contenido (sin límite de texto visible). */
const autoGrow = (el: HTMLTextAreaElement) => {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

export function DayView() {
  const { tasks, fadingIds, toggleTask, delTask, updateTask, openTaskDialog } = useCerebro();

  const [selected, setSelected] = useState(() => new Date());
  const key = dateKey(selected);

  const [dailyPlan, setDailyPlan] = useState<DailyPlanState>({});
  useSupabaseSync<DailyPlanState>("cerebro_daily_plan", dailyPlan, setDailyPlan, { isDefault: isDailyPlanEmpty });
  const [habits, setHabits] = useState<HabitItem[]>([]);
  useSupabaseSync<HabitItem[]>("cerebro_habits", habits, setHabits, { isDefault: isHabitsEmpty });

  // Si había un día guardado con la forma antigua (de antes de este cambio), le
  // rellenamos los campos que falten en vez de asumir que ya los tiene: así nunca
  // revienta al leer un día guardado con una versión anterior de esta pantalla.
  const entry: DailyPlanEntry = { ...EMPTY_ENTRY, ...(dailyPlan[key] ?? {}) };

  const patchEntry = (patch: Partial<DailyPlanEntry>) => {
    setDailyPlan((prev) => ({ ...prev, [key]: { ...EMPTY_ENTRY, ...(prev[key] ?? {}), ...patch } }));
  };

  /* ---------- Horario: franjas horarias con sus puntos marcables ---------- */
  const blocks = entry.blocks;

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const itemsFor = (blockId: string) => blocks.find((b) => b.id === blockId)?.items ?? [];
  const updateBlockItems = (blockId: string, items: HourItem[]) => {
    patchEntry({ blocks: blocks.map((b) => (b.id === blockId ? { ...b, items } : b)) });
  };
  const addItem = (blockId: string) => {
    const text = (drafts[blockId] ?? "").trim();
    if (!text) return;
    const item: HourItem = { id: uid(), text, done: false };
    updateBlockItems(blockId, [...itemsFor(blockId), item]);
    setDrafts((d) => ({ ...d, [blockId]: "" }));
  };
  const toggleItem = (blockId: string, id: string) => {
    updateBlockItems(blockId, itemsFor(blockId).map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  };
  const removeItem = (blockId: string, id: string) => {
    updateBlockItems(blockId, itemsFor(blockId).filter((it) => it.id !== id));
  };
  const editItemText = (blockId: string, id: string, text: string) => {
    updateBlockItems(blockId, itemsFor(blockId).map((it) => (it.id === id ? { ...it, text } : it)));
  };

  // Límites de hora válidos para la franja de índice "index", según sus vecinas:
  // así los selectores de "desde"/"hasta" nunca dejan solapar ni desordenar.
  const boundsFor = (index: number) => ({
    lower: index === 0 ? 0 : blocks[index - 1].end,
    upper: index === blocks.length - 1 ? 24 : blocks[index + 1].start,
  });

  const setBlockStart = (id: string, start: number) => {
    patchEntry({ blocks: blocks.map((b) => (b.id === id ? { ...b, start } : b)) });
  };
  const setBlockEnd = (id: string, end: number) => {
    patchEntry({ blocks: blocks.map((b) => (b.id === id ? { ...b, end } : b)) });
  };
  const addBlock = () => {
    const start = blocks.length ? blocks[blocks.length - 1].end : 0;
    if (start >= 24) return;
    const block: TimeBlock = { id: uid(), start, end: Math.min(start + 1, 24), items: [] };
    patchEntry({ blocks: [...blocks, block] });
  };
  const removeBlock = (id: string) => patchEntry({ blocks: blocks.filter((b) => b.id !== id) });
  const dayFull = blocks.length > 0 && blocks[blocks.length - 1].end >= 24;

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

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* ---------- IZQUIERDA: horario del día, en un único cuadro con franjas ---------- */}
      <div className="min-w-0 border-2 border-foreground/30 bg-card/50 p-4 shadow-sm backdrop-blur-sm">
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

        {blocks.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Sin franjas horarias todavía. Añade la primera para empezar a organizar el día.
          </p>
        ) : (
          <div className="divide-y-2 divide-foreground/30 border-t-2 border-foreground/30">
            {blocks.map((block, index) => {
              const { lower, upper } = boundsFor(index);
              const startOptions = HOURS.filter((h) => h >= lower && h < block.end);
              const endOptions = END_HOUR_OPTIONS.filter((h) => h > block.start && h <= upper);
              const items = itemsFor(block.id);
              return (
                <div key={block.id} className="py-2.5">
                  <div className="mb-2 flex items-center gap-2">
                    <Select value={String(block.start)} onValueChange={(v) => setBlockStart(block.id, Number(v))}>
                      <SelectTrigger className="h-7 w-[84px] font-mono text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {startOptions.map((h) => <SelectItem key={h} value={String(h)}>{hourLabel(h)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">–</span>
                    <Select value={String(block.end)} onValueChange={(v) => setBlockEnd(block.id, Number(v))}>
                      <SelectTrigger className="h-7 w-[84px] font-mono text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {endOptions.map((h) => <SelectItem key={h} value={String(h)}>{hourLabel(h)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeBlock(block.id)}
                      title="Eliminar esta franja"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="min-w-0 space-y-1">
                    {items.map((item) => (
                      <div key={item.id} className="group flex items-start gap-2">
                        <Checkbox
                          className="mt-1.5 shrink-0"
                          checked={item.done}
                          onCheckedChange={() => toggleItem(block.id, item.id)}
                        />
                        <Textarea
                          value={item.text}
                          onChange={(e) => editItemText(block.id, item.id, e.target.value)}
                          onInput={(e) => autoGrow(e.currentTarget)}
                          rows={1}
                          className={cn(
                            "min-h-0 flex-1 resize-none overflow-hidden border-0 bg-transparent px-0 py-0.5 text-sm leading-snug shadow-none focus-visible:ring-0",
                            item.done && "text-muted-foreground line-through",
                          )}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => removeItem(block.id, item.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 shrink-0" />
                      <Input
                        value={drafts[block.id] ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [block.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addItem(block.id)}
                        placeholder="Escribe algo para esta franja…"
                        className="h-7 flex-1 border-0 bg-transparent px-0 text-sm shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button
          variant="outline"
          className="mt-3 w-full rounded-none border-dashed"
          disabled={dayFull}
          onClick={addBlock}
        >
          <Plus className="h-4 w-4" /> {dayFull ? "Día completo" : "Añadir franja horaria"}
        </Button>
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
