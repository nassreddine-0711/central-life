import { useMemo, useState } from "react";
import { format, isToday, isYesterday, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { History, RotateCcw, Clock, Trash2, Check, Search, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Task, CAT_COLORS } from "./types";

type RangePreset = "all" | "today" | "yesterday" | "7d" | "month" | "lastMonth" | "custom";

export function HistorialView({ tasks, onUncomplete, onDelete }: { tasks: Task[]; onUncomplete: (id: string) => void; onDelete: (id: string) => void; }) {
  const [range, setRange] = useState<RangePreset>("7d");
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());
  const [query, setQuery] = useState("");

  const interval = useMemo(() => {
    const now = new Date();
    switch (range) {
      case "today": return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday": { const y = subDays(now, 1); return { start: startOfDay(y), end: endOfDay(y) }; }
      case "7d": return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case "month": return { start: startOfMonth(now), end: endOfDay(now) };
      case "lastMonth": { const lm = subMonths(now, 1); return { start: startOfMonth(lm), end: endOfMonth(lm) }; }
      case "custom": return customDate ? { start: startOfDay(customDate), end: endOfDay(customDate) } : null;
      default: return null;
    }
  }, [range, customDate]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return tasks
      .filter(t => {
        if (!t.completedAt) return false;
        if (interval && !isWithinInterval(parseISO(t.completedAt), interval)) return false;
        if (q && !t.title.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (b.completedAt! < a.completedAt! ? -1 : 1));
  }, [tasks, interval, query]);

  const grouped = useMemo(() => {
    const m = new Map<string, Task[]>();
    filtered.forEach(t => {
      const k = format(parseISO(t.completedAt!), "yyyy-MM-dd");
      const arr = m.get(k) ?? [];
      arr.push(t);
      m.set(k, arr);
    });
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const dayLabel = (key: string) => {
    const d = parseISO(key);
    if (isToday(d)) return "Hoy";
    if (isYesterday(d)) return "Ayer";
    return format(d, "EEEE, d 'de' MMMM yyyy", { locale: es });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card/80 p-4 shadow-sm space-y-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          {([
            ["today", "Hoy"],
            ["yesterday", "Ayer"],
            ["7d", "Últimos 7 días"],
            ["month", "Este mes"],
            ["lastMonth", "Mes anterior"],
            ["all", "Todo"],
          ] as [RangePreset, string][]).map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setRange(k)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                range === k
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {lbl}
            </button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <button
                onClick={() => setRange("custom")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  range === "custom"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                {range === "custom" && customDate ? format(customDate, "d MMM yyyy", { locale: es }) : "Día concreto"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customDate} onSelect={(d) => { setCustomDate(d); setRange("custom"); }} locale={es} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar en historial…" className="pl-8" />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} {filtered.length === 1 ? "tarea completada" : "tareas completadas"}</span>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border bg-card/80 p-10 text-center backdrop-blur-sm">
          <History className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No hay tareas completadas en este periodo.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
          <div className="relative pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
            {grouped.map(([dayKey, items]) => (
              <div key={dayKey} className="mb-6 last:mb-0">
                <div className="relative mb-3 flex items-center gap-3">
                  <span className="absolute -left-[18px] flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-4 ring-card" />
                  <h4 className="text-sm font-semibold capitalize">{dayLabel(dayKey)}</h4>
                  <span className="text-xs text-muted-foreground">· {items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map(t => (
                    <div key={t.id} className="group relative flex items-center gap-3 rounded-lg border bg-background/60 p-3 transition-colors hover:border-primary/40">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium line-through text-muted-foreground">{t.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline" className={cn("h-5 border", CAT_COLORS[t.category])}>{t.category}</Badge>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(t.completedAt!), "HH:mm")}
                          </span>
                        </div>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => onUncomplete(t.id)}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reabrir tarea</TooltipContent>
                      </Tooltip>
                      <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => onDelete(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
