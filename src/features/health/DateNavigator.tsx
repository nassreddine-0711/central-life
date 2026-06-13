import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarIcon, RotateCcw, History } from "lucide-react";
import { format, parseISO, addDays, isAfter, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHealth } from "./HealthContext";

const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function DateNavigator() {
  const { selectedDate, setSelectedDate, goToToday, isToday, today } = useHealth();
  const [open, setOpen] = useState(false);

  const date = useMemo(() => parseISO(selectedDate), [selectedDate]);
  const todayDate = useMemo(() => parseISO(today), [today]);

  const goPrev = () => setSelectedDate(toISO(addDays(date, -1)));
  const goNext = () => {
    const next = addDays(date, 1);
    if (!isAfter(startOfDay(next), startOfDay(todayDate))) {
      setSelectedDate(toISO(next));
    }
  };

  const canGoNext = !isToday;
  const label = format(date, "EEEE, d 'de' MMMM yyyy", { locale: es });
  const labelShort = isToday
    ? "Hoy"
    : selectedDate === toISO(addDays(todayDate, -1))
      ? "Ayer"
      : format(date, "d MMM yyyy", { locale: es });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3",
        isToday
          ? "border-border/40"
          : "border-[hsl(45_100%_60%_/_0.4)] bg-[hsl(45_100%_60%_/_0.04)]"
      )}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          className="rounded-full border border-border/50 bg-background/40 p-1.5 text-muted-foreground transition hover:text-foreground"
          aria-label="Día anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto gap-2 px-3 py-1.5 text-left font-mono text-xs uppercase tracking-widest"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{labelShort}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (d) {
                  setSelectedDate(toISO(d));
                  setOpen(false);
                }
              }}
              disabled={(d) => isAfter(startOfDay(d), startOfDay(todayDate))}
              initialFocus
              locale={es}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          className="rounded-full border border-border/50 bg-background/40 p-1.5 text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Día siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {!isToday && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(45_100%_60%_/_0.5)] bg-[hsl(45_100%_60%_/_0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[hsl(45_100%_65%)]">
            <History className="h-3 w-3" /> Editando histórico
          </span>
        )}
        {!isToday && (
          <Button
            size="sm"
            variant="outline"
            onClick={goToToday}
            className="h-8 gap-1.5 rounded-full text-[10px] uppercase tracking-widest"
          >
            <RotateCcw className="h-3 w-3" /> Hoy
          </Button>
        )}
      </div>
    </motion.div>
  );
}
