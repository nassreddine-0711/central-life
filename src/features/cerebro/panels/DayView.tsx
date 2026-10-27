import { useMemo, useRef, useState } from "react";
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
   su propia hora de inicio y fin, con huecos libres si quiere). Dentro
   de cada franja, cada línea se comporta como en un mini editor de
   texto: Intro crea una línea nueva, Ctrl+Intro continúa en la misma;
   "1. " + espacio la convierte en lista numerada, Tab la convierte en
   sub-apartado con letra; y con Alt+Shift+5 se tacha solo la frase
   seleccionada (aparte del check, que tacha la línea entera). Además:
   objetivos del día, las tareas de ese día y hábitos/actividades a
   marcar.
============================================================ */

/* ---------- Tipos propios ---------- */
type ListType = "number" | "letter";
interface HourItem {
  id: string;
  text: string;
  done: boolean;
  listType?: ListType;
  indent?: 0 | 1;
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

interface DraftItem {
  text: string;
  listType?: ListType;
  indent?: 0 | 1;
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

/** Calcula el número/letra de cada línea según su tipo de lista y su indentación,
 *  reiniciando los contadores cada vez que aparece una línea normal (sin lista). */
function computeMarkers(rows: { listType?: ListType; indent?: 0 | 1 }[]): (string | null)[] {
  let num = 0;
  let letter = 0;
  return rows.map((r) => {
    if (r.listType === "number" && (r.indent ?? 0) === 0) {
      num += 1;
      letter = 0;
      return `${num}.`;
    }
    if (r.listType === "letter" && (r.indent ?? 0) === 1) {
      letter += 1;
      return `${String.fromCharCode(96 + letter)}.`;
    }
    num = 0;
    letter = 0;
    return null;
  });
}

/** Convierte las marcas ~~frase~~ del texto guardado en tachado visual real. */
function renderStrikeMarkup(text: string): React.ReactNode {
  if (!text) return <span className="text-muted-foreground/50">Escribe algo…</span>;
  const parts = text.split(/(~~[^~]+~~)/g).filter((s) => s.length > 0);
  return parts.map((part, i) =>
    part.startsWith("~~") && part.endsWith("~~") && part.length >= 4
      ? <s key={i}>{part.slice(2, -2)}</s>
      : <span key={i}>{part}</span>,
  );
}

/* ---------- Una línea del horario (o el borrador de la siguiente) ----------
   Se comporta como una línea de un editor de texto sencillo:
   - Intro: crea una línea nueva a partir del punto donde esté el cursor.
   - Ctrl+Intro: salto de línea dentro de la misma línea/check.
   - "1. " + espacio: la convierte en línea numerada.
   - Tab / Shift+Tab: convierte una línea numerada en sub-apartado con
     letra (y viceversa).
   - Seleccionar una frase y Alt+Shift+5: tacha solo esa frase.
*/
function ItemLine({
  text, done, marker, indent, dataId, showCheckbox = true, showRemove = true, placeholder,
  onToggleDone, onTextChange, onRemove, onEnter, onMakeNumbered, onTab, onShiftTab,
}: {
  text: string;
  done: boolean;
  marker: string | null;
  indent: 0 | 1;
  dataId: string;
  showCheckbox?: boolean;
  showRemove?: boolean;
  placeholder?: string;
  onToggleDone?: () => void;
  onTextChange: (text: string) => void;
  onRemove?: () => void;
  onEnter: (caretPos: number) => void;
  onMakeNumbered: () => void;
  onTab: () => void;
  onShiftTab: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const applyStrike = () => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return; // nada seleccionado: no hay frase que tachar
    const value = el.value;
    const next = `${value.slice(0, start)}~~${value.slice(start, end)}~~${value.slice(end)}`;
    onTextChange(next);
    const pos = end + 4;
    requestAnimationFrame(() => {
      if (!ref.current) return;
      ref.current.focus();
      ref.current.selectionStart = ref.current.selectionEnd = pos;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.ctrlKey) {
      e.preventDefault();
      onEnter(e.currentTarget.selectionStart ?? text.length);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) onShiftTab(); else onTab();
      return;
    }
    if (e.altKey && e.shiftKey && (e.key === "5" || e.code === "Digit5")) {
      e.preventDefault();
      applyStrike();
      return;
    }
    if (e.key === " ") {
      const el = e.currentTarget;
      const upTo = el.value.slice(0, el.selectionStart ?? 0);
      if (/^\d+\.$/.test(upTo) && (el.selectionStart ?? 0) === el.value.length) {
        e.preventDefault();
        onMakeNumbered();
      }
    }
  };

  const showDisplay = !focused && text.includes("~~");

  return (
    <div className="group flex items-start gap-2">
      {showCheckbox && (
        <Checkbox className="mt-1.5 shrink-0" checked={done} onCheckedChange={onToggleDone} />
      )}
      {marker && (
        <span className={cn("shrink-0 pt-1.5 font-mono text-xs text-muted-foreground", indent === 1 && "ml-4")}>
          {marker}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {showDisplay ? (
          <div
            onClick={() => { setFocused(true); requestAnimationFrame(() => ref.current?.focus()); }}
            className={cn(
              "min-h-[26px] cursor-text whitespace-pre-wrap break-words py-0.5 text-sm leading-snug",
              done && "text-muted-foreground line-through",
            )}
          >
            {renderStrikeMarkup(text)}
          </div>
        ) : (
          <Textarea
            ref={ref}
            data-item-id={dataId}
            value={text}
            placeholder={placeholder}
            onChange={(e) => onTextChange(e.target.value)}
            onInput={(e) => autoGrow(e.currentTarget)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={1}
            className={cn(
              "min-h-0 flex-1 resize-none overflow-hidden rounded-none border-0 bg-transparent px-0 py-0.5 text-sm leading-snug shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0",
              done && "text-muted-foreground line-through",
            )}
          />
        )}
      </div>
      {showRemove && onRemove && (
        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" onClick={onRemove}>
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

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

  /* ---------- Horario: franjas horarias con sus líneas marcables ---------- */
  const blocks = entry.blocks;

  const itemsFor = (blockId: string) => blocks.find((b) => b.id === blockId)?.items ?? [];
  const updateBlockItems = (blockId: string, items: HourItem[]) => {
    patchEntry({ blocks: blocks.map((b) => (b.id === blockId ? { ...b, items } : b)) });
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
  const makeItemNumbered = (blockId: string, id: string) => {
    updateBlockItems(blockId, itemsFor(blockId).map((it) => (it.id === id ? { ...it, text: "", listType: "number", indent: 0 } : it)));
  };
  const tabItem = (blockId: string, id: string) => {
    updateBlockItems(blockId, itemsFor(blockId).map((it) => (it.id === id && it.listType === "number" ? { ...it, listType: "letter", indent: 1 } : it)));
  };
  const shiftTabItem = (blockId: string, id: string) => {
    updateBlockItems(blockId, itemsFor(blockId).map((it) => (it.id === id && it.listType === "letter" ? { ...it, listType: "number", indent: 0 } : it)));
  };
  const splitItem = (blockId: string, id: string, caretPos: number) => {
    const items = itemsFor(blockId);
    const idx = items.findIndex((it) => it.id === id);
    if (idx === -1) return;
    const it = items[idx];
    const before = it.text.slice(0, caretPos);
    const after = it.text.slice(caretPos);
    const newItem: HourItem = { id: uid(), text: after, done: false, listType: it.listType, indent: it.indent };
    const next = [...items];
    next[idx] = { ...it, text: before };
    next.splice(idx + 1, 0, newItem);
    updateBlockItems(blockId, next);
    requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>(`textarea[data-item-id="${newItem.id}"]`)?.focus();
    });
  };

  /* ---------- Borrador: la línea que se está escribiendo todavía ---------- */
  const [drafts, setDrafts] = useState<Record<string, DraftItem>>({});
  const draftFor = (blockId: string): DraftItem => drafts[blockId] ?? { text: "" };
  const setDraft = (blockId: string, patch: Partial<DraftItem>) => {
    setDrafts((d) => ({ ...d, [blockId]: { ...draftFor(blockId), ...patch } }));
  };
  const commitDraft = (blockId: string, caretPos: number) => {
    const draft = draftFor(blockId);
    const before = draft.text.slice(0, caretPos);
    const after = draft.text.slice(caretPos);
    if (!before.trim()) return;
    const newItem: HourItem = { id: uid(), text: before, done: false, listType: draft.listType, indent: draft.indent };
    updateBlockItems(blockId, [...itemsFor(blockId), newItem]);
    setDraft(blockId, { text: after });
    requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>(`textarea[data-item-id="__draft_${blockId}"]`)?.focus();
    });
  };

  // Límites de hora válidos para la franja de índice "index", según sus vecinas (sin
  // forzar que estén pegadas: puede haber horas sueltas entre franjas o antes de la
  // primera). Los selectores de "desde"/"hasta" nunca dejan solapar ni desordenar.
  const boundsFor = (index: number) => ({
    lower: index === 0 ? 0 : blocks[index - 1].end,
    upper: index === blocks.length - 1 ? 24 : blocks[index + 1].start,
  });

  const setBlockStart = (id: string, start: number) => {
    patchEntry({
      blocks: blocks.map((b, i) => {
        if (b.id !== id) return b;
        const upper = i === blocks.length - 1 ? 24 : blocks[i + 1].start;
        const end = start >= b.end ? Math.min(start + 1, upper) : b.end;
        return { ...b, start, end };
      }),
    });
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
              const startOptions = HOURS.filter((h) => h >= lower && h < upper);
              const endOptions = END_HOUR_OPTIONS.filter((h) => h > block.start && h <= upper);
              const items = itemsFor(block.id);
              const draft = draftFor(block.id);
              const markers = computeMarkers([...items, draft]);
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
                    {items.map((item, i) => (
                      <ItemLine
                        key={item.id}
                        dataId={item.id}
                        text={item.text}
                        done={item.done}
                        marker={markers[i]}
                        indent={item.indent ?? 0}
                        onToggleDone={() => toggleItem(block.id, item.id)}
                        onTextChange={(text) => editItemText(block.id, item.id, text)}
                        onRemove={() => removeItem(block.id, item.id)}
                        onEnter={(caretPos) => splitItem(block.id, item.id, caretPos)}
                        onMakeNumbered={() => makeItemNumbered(block.id, item.id)}
                        onTab={() => tabItem(block.id, item.id)}
                        onShiftTab={() => shiftTabItem(block.id, item.id)}
                      />
                    ))}
                    <ItemLine
                      dataId={`__draft_${block.id}`}
                      text={draft.text}
                      done={false}
                      marker={markers[markers.length - 1]}
                      indent={draft.indent ?? 0}
                      showCheckbox={false}
                      showRemove={false}
                      placeholder="Escribe algo para esta franja…"
                      onTextChange={(text) => setDraft(block.id, { text })}
                      onEnter={(caretPos) => commitDraft(block.id, caretPos)}
                      onMakeNumbered={() => setDraft(block.id, { listType: "number", indent: 0, text: "" })}
                      onTab={() => setDraft(block.id, draft.listType === "number" ? { listType: "letter", indent: 1 } : {})}
                      onShiftTab={() => setDraft(block.id, draft.listType === "letter" ? { listType: "number", indent: 0 } : {})}
                    />
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
