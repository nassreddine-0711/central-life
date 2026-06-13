import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, Dumbbell, Droplet, ListChecks, X } from "lucide-react";
import { useHealth, type FoodEntry, type ActivityEntry } from "./HealthContext";
import { formatISODate } from "./dateUtils";

interface GroupedFood {
  name: string;
  count: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  ids: string[];
}

export function DailySummary() {
  const { foods, activities, glasses, glassMl, hydrationGoal, selectedDate, isToday, removeFood, removeActivity } = useHealth();
  const totalMl = glasses * glassMl;
  const goalMl = hydrationGoal * glassMl;

  const groupedFoods = useMemo<GroupedFood[]>(() => {
    const map = new Map<string, GroupedFood>();
    for (const f of foods) {
      const g = map.get(f.name);
      if (g) {
        g.count += 1;
        g.kcal += f.kcal;
        g.protein += f.protein;
        g.carbs += f.carbs;
        g.fat += f.fat;
        g.ids.push(f.id);
      } else {
        map.set(f.name, {
          name: f.name,
          count: 1,
          kcal: f.kcal,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          ids: [f.id],
        });
      }
    }
    return Array.from(map.values());
  }, [foods]);

  const groupedActivities = useMemo(() => {
    const map = new Map<string, { type: string; count: number; kcal: number; ids: string[] }>();
    for (const a of activities) {
      const g = map.get(a.type);
      if (g) { g.count += 1; g.kcal += a.kcal; g.ids.push(a.id); }
      else map.set(a.type, { type: a.type, count: 1, kcal: a.kcal, ids: [a.id] });
    }
    return Array.from(map.values());
  }, [activities]);

  const round = (n: number) => Math.round(n * 10) / 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-widest">{isToday ? "Lista de Hoy" : "Lista del día"}</h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {formatISODate(selectedDate, "EEEE, d LLL")}
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Section title="Alimentos" icon={<Utensils className="h-3.5 w-3.5" />} count={foods.length}>
          <AnimatePresence>
            {groupedFoods.length === 0 && <Empty text="Sin ingestas registradas" />}
            {groupedFoods.map((g) => (
              <motion.div
                key={g.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="group rounded-lg bg-background/20 px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-primary/15 px-1.5 font-mono text-[10px] font-semibold text-primary">
                      ×{g.count}
                    </span>
                    <span className="truncate">{g.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono tabular-nums" style={{ color: "hsl(195 100% 60%)" }}>
                      {g.kcal} kcal
                    </span>
                    <button
                      onClick={() => removeFood(g.ids[g.ids.length - 1])}
                      className="text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                      aria-label="Quitar uno"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                  P {round(g.protein)}g · C {round(g.carbs)}g · G {round(g.fat)}g
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </Section>

        <Section title="Hidratación" icon={<Droplet className="h-3.5 w-3.5" />} count={glasses}>
          <div className="rounded-lg bg-background/20 px-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span>Total ingerido</span>
              <span className="font-mono tabular-nums" style={{ color: "hsl(190 95% 55%)" }}>
                {totalMl} ml
              </span>
            </div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
              {glasses} / {hydrationGoal} vasos · meta {goalMl} ml
            </div>
          </div>
        </Section>

        <Section title="Actividades" icon={<Dumbbell className="h-3.5 w-3.5" />} count={activities.length}>
          <AnimatePresence>
            {groupedActivities.length === 0 && <Empty text="Sin actividad registrada" />}
            {groupedActivities.map((g) => (
              <motion.div
                key={g.type}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="group flex items-center justify-between gap-2 rounded-lg bg-background/20 px-3 py-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-[hsl(140_90%_55%_/_0.15)] px-1.5 font-mono text-[10px] font-semibold" style={{ color: "hsl(140 90% 55%)" }}>
                    ×{g.count}
                  </span>
                  <span className="truncate">{g.type}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono tabular-nums" style={{ color: "hsl(140 90% 55%)" }}>
                    −{g.kcal} kcal
                  </span>
                  <button
                    onClick={() => removeActivity(g.ids[g.ids.length - 1])}
                    className="text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                    aria-label="Quitar uno"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </Section>
      </div>
    </motion.div>
  );
}

function Section({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {icon} {title}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border/40 px-3 py-2 text-[11px] text-muted-foreground">{text}</div>;
}
