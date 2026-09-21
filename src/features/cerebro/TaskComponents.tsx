import { useMemo, useState } from "react";
import { format, isSameDay, isToday, eachDayOfInterval, startOfDay, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths, addWeeks, subWeeks, isSameWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Flag, Trash2, Check, Award, Repeat, Pencil, Plus, Zap, Brain, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Task, CAT_COLORS, PRIO_COLORS, describeRecurrence, COMPLEXITY_LABEL } from "./types";
import { useKnowledge } from "@/features/knowledge/KnowledgeContext";
import { useCerebro } from "./CerebroContext";

export function Section({ title, children, icon, accent, action }: { title: string; children: React.ReactNode; icon?: React.ReactNode; accent?: string; action?: React.ReactNode; }) {
  return (
    <div className="rounded-xl border bg-card/80 p-3 sm:p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className={cn("flex min-w-0 items-center gap-2 text-sm font-semibold", accent)}>
          {icon}<span className="truncate">{title}</span>
        </div>
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>
      {children}
    </div>
  );
}

export function Empty({ msg }: { msg: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{msg}</p>;
}

export function TaskRow({ task, onToggle, onDelete, onUpdate, compact, fading }: { task: Task; onToggle: (id: string) => void; onDelete: (id: string) => void; onUpdate: (id: string, p: Partial<Task>) => void; compact?: boolean; fading?: boolean; }) {
  const { milestones } = useKnowledge();
  const { openTaskDialog } = useCerebro();
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const milestone = task.linkedMilestoneId ? milestones.find(m => m.id === task.linkedMilestoneId) : undefined;
  const hasExtras = !!(task.description || task.photo);
  return (
    <div className={cn(
      "group flex items-start gap-3 rounded-lg border bg-background/60 p-3 transition-all duration-300 hover:border-primary/40",
      task.done && "opacity-60",
      fading && "opacity-0 -translate-x-3 pointer-events-none",
    )}>
      <Checkbox className="mt-0.5" checked={task.done || fading} onCheckedChange={() => onToggle(task.id)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          {task.photo && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightbox(true); }}
              className="shrink-0"
              title="Ver foto"
            >
              <img
                src={task.photo}
                alt=""
                className="h-10 w-10 rounded-md border object-cover transition hover:opacity-80"
              />
            </button>
          )}
          <p
            className={cn(
              "flex-1 text-sm font-medium cursor-pointer transition-all",
              expanded ? "whitespace-pre-wrap break-words" : "truncate",
              (task.done || fading) && "line-through"
            )}
            onClick={() => setExpanded(v => !v)}
            title={task.title}
          >{task.title}</p>
        </div>

        {expanded && task.description && (
          <p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
            {task.description}
          </p>
        )}
        {!expanded && hasExtras && task.description && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {task.description}
          </p>
        )}

        {!compact && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className={cn("h-5 border", CAT_COLORS[task.category])}>{task.category}</Badge>
            <Flag className={cn("h-3 w-3", PRIO_COLORS[task.priority])} />
            {/* Complexity badge */}
            {task.complexity === "deep" ? (
              <Badge variant="outline" className="h-5 gap-1 border-purple-500/40 bg-purple-500/10 text-[10px] text-purple-500">
                <Brain className="h-2.5 w-2.5" />{COMPLEXITY_LABEL["deep"]}
              </Badge>
            ) : (
              <Badge variant="outline" className="h-5 gap-1 border-primary/30 bg-primary/10 text-[10px] text-primary">
                <Zap className="h-2.5 w-2.5" />{COMPLEXITY_LABEL["quick"]}
              </Badge>
            )}
            {task.date && <span className="text-muted-foreground">{format(new Date(task.date), "d MMM", { locale: es })}</span>}
            {task.recurrence && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="h-5 gap-1 border-primary/30 bg-primary/10 text-[10px] text-primary">
                    <Repeat className="h-2.5 w-2.5" />
                    {describeRecurrence(task.recurrence)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Tarea recurrente</TooltipContent>
              </Tooltip>
            )}
            {task.inbox && <Badge variant="secondary" className="h-5">Inbox</Badge>}
            {milestone && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="h-5 border-amber-400/40 bg-amber-400/10 text-[10px] text-amber-300">
                    <Award className="mr-1 h-2.5 w-2.5" />
                    {milestone.title}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Vinculada al hito: {milestone.title}</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
      {task.inbox && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdate(task.id, { inbox: false, date: new Date().toISOString() })}>
              <Check className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clasificar para hoy</TooltipContent>
        </Tooltip>
      )}
      <Button
        size="icon" variant="ghost"
        className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => openTaskDialog({ editId: task.id })}
        title="Editar tarea"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => onDelete(task.id)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      {lightbox && task.photo && (
        <div
          onClick={() => setLightbox(false)}
          className="fixed inset-0 z-[100] grid cursor-zoom-out place-items-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Cerrar"
          >
            <XIcon className="h-5 w-5" />
          </button>
          <img
            src={task.photo}
            alt={task.title}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] cursor-default rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

export function TaskList({ tasks, fadingIds, onToggle, onDelete, onUpdate }: { tasks: Task[]; fadingIds?: Set<string>; onToggle: (id: string) => void; onDelete: (id: string) => void; onUpdate: (id: string, p: Partial<Task>) => void; }) {
  return (
    <div className="space-y-2">
      {tasks.map(t => <TaskRow key={t.id} task={t} fading={fadingIds?.has(t.id)} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} />)}
    </div>
  );
}

export function WeekView({ tasks, fadingIds, onToggle, onDelete, onUpdate }: { tasks: Task[]; fadingIds?: Set<string>; onToggle: (id: string) => void; onDelete: (id: string) => void; onUpdate: (id: string, p: Partial<Task>) => void; }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const isCurrentWeek = isSameWeek(weekStart, new Date(), { weekStartsOn: 1 });

  const sameMonth = isSameMonth(weekStart, weekEnd);
  const rangeLabel = sameMonth
    ? `${format(weekStart, "d", { locale: es })} – ${format(weekEnd, "d MMM yyyy", { locale: es })}`
    : `${format(weekStart, "d MMM", { locale: es })} – ${format(weekEnd, "d MMM yyyy", { locale: es })}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekStart(w => subWeeks(w, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekStart(w => addWeeks(w, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentWeek && (
            <Button variant="outline" size="sm" className="h-8" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Hoy
            </Button>
          )}
        </div>
        <h3 className="text-sm font-semibold capitalize text-foreground">{rangeLabel}</h3>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="grid grid-flow-col auto-cols-[minmax(180px,1fr)] items-start gap-3 xl:auto-cols-fr">
          {days.map(d => {
            const list = tasks.filter(t => !t.done && t.date && isSameDay(new Date(t.date), d));
            const today = isToday(d);
            return (
              <div
                key={d.toISOString()}
                className={cn(
                  "flex flex-col rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur-sm",
                  today && "border-primary/50 ring-1 ring-primary/20",
                )}
              >
                <div className="mb-3 text-sm font-semibold capitalize text-foreground">
                  {format(d, "EEE d MMM", { locale: es })}
                </div>
                <div className="flex-1 space-y-2">
                  {list.length === 0 ? <Empty msg="Sin tareas." /> : <TaskList tasks={list} fadingIds={fadingIds} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PriorityDot({ color, count }: { color: string; count: number }) {
  if (count <= 1) return <span className={cn("h-1.5 w-1.5 rounded-full", color)} />;
  return (
    <span className={cn("flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white", color)}>
      {count}
    </span>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}

export function MonthView({ tasks, fadingIds, onToggle, onDelete, onUpdate, onNewTask }: { tasks: Task[]; fadingIds?: Set<string>; onToggle: (id: string) => void; onDelete: (id: string) => void; onUpdate: (id: string, p: Partial<Task>) => void; onNewTask?: () => void; }) {
  const [month, setMonth] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date>(new Date());

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(t => {
      if (!t.date) return;
      const k = format(new Date(t.date), "yyyy-MM-dd");
      const arr = map.get(k) ?? [];
      arr.push(t);
      map.set(k, arr);
    });
    return map;
  }, [tasks]);

  const countsFor = (d: Date) => {
    const list = tasksByDay.get(format(d, "yyyy-MM-dd")) ?? [];
    const pending = list.filter(t => !t.done);
    return {
      total: pending.length,
      high: pending.filter(t => t.priority === "high").length,
      med: pending.filter(t => t.priority === "med").length,
      low: pending.filter(t => t.priority === "low").length,
    };
  };

  const dayList = tasks.filter(t => !t.done && t.date && isSameDay(new Date(t.date), selected));
  const weekDays = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold capitalize">{format(month, "MMMM yyyy", { locale: es })}</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(m => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1">
          {weekDays.map(d => (
            <div key={d} className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map(d => {
            const inMonth = isSameMonth(d, month);
            const isSel = isSameDay(d, selected);
            const today = isToday(d);
            const c = countsFor(d);
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelected(d)}
                className={cn(
                  "group relative flex aspect-square flex-col items-center justify-start rounded-lg border border-transparent p-1.5 text-sm transition-all",
                  "hover:border-primary/50 hover:bg-accent/40",
                  inMonth ? "bg-background" : "bg-muted/20 text-muted-foreground/50",
                  isSel && "border-primary bg-primary/10 ring-2 ring-primary/30",
                  !isSel && today && "border-primary/60",
                )}
              >
                <span className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  today && "bg-primary text-primary-foreground",
                  isSel && !today && "font-bold text-primary",
                )}>
                  {format(d, "d")}
                </span>
                {c.total > 0 && (
                  <div className="mt-auto flex items-center gap-1 pt-1">
                    {c.high > 0 && <PriorityDot color="bg-rose-500" count={c.high} />}
                    {c.med > 0 && <PriorityDot color="bg-amber-500" count={c.med} />}
                    {c.low > 0 && <PriorityDot color="bg-sky-500" count={c.low} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t pt-3 text-[11px] text-muted-foreground">
          <LegendItem color="bg-rose-500" label="Alta" />
          <LegendItem color="bg-amber-500" label="Media" />
          <LegendItem color="bg-sky-500" label="Normal" />
        </div>
      </div>
      <Section title={format(selected, "EEEE d MMMM", { locale: es })} action={
        onNewTask && (
          <Button variant="outline" size="sm" onClick={onNewTask}>
            <Plus className="h-4 w-4" /> Nueva tarea
          </Button>
        )
      }>
        {dayList.length === 0 ? <Empty msg="Sin tareas en este día." /> : <TaskList tasks={dayList} fadingIds={fadingIds} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} />}
      </Section>
    </div>
  );
}