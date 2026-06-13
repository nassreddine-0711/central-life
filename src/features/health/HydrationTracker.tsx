import { motion } from "framer-motion";
import { Droplet, Plus, Minus, Settings2 } from "lucide-react";
import { useHealth } from "./HealthContext";
import { AnimatedNumber } from "./AnimatedNumber";
import { HydrationSettingsDialog } from "./SettingsDialogs";

const CYAN = "hsl(190 95% 55%)";

export function HydrationTracker() {
  const { glasses, hydrationGoal, glassMl, setGlasses } = useHealth();
  const pct = Math.min(100, (glasses / hydrationGoal) * 100);
  const reached = glasses >= hydrationGoal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplet
            className={`h-4 w-4 ${reached ? "" : "animate-pulse"}`}
            style={{ color: CYAN, filter: `drop-shadow(0 0 6px ${CYAN})` }}
          />
          <h3 className="text-sm font-semibold uppercase tracking-widest">Hidratación</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            <AnimatedNumber value={glasses} /> / {hydrationGoal} vasos
          </span>
          <HydrationSettingsDialog
            trigger={
              <button
                className="rounded-full border border-border/50 bg-background/30 p-1 text-muted-foreground transition hover:text-foreground"
                aria-label="Editar objetivo de hidratación"
              >
                <Settings2 className="h-3 w-3" />
              </button>
            }
          />
        </div>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-background/40">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${CYAN}, hsl(195 100% 70%))`,
            boxShadow: `0 0 18px ${CYAN}`,
          }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        />
      </div>

      <div className="mt-4 grid grid-cols-8 gap-1.5">
        {Array.from({ length: hydrationGoal }).map((_, i) => {
          const filled = i < glasses;
          return (
            <button
              key={i}
              onClick={() => setGlasses(filled && i === glasses - 1 ? glasses - 1 : i + 1)}
              className="group flex aspect-[3/4] items-end justify-center rounded-md border transition"
              style={{
                borderColor: filled ? CYAN : "hsl(var(--border))",
                background: filled ? `${CYAN.replace("hsl(", "hsl(").replace(")", " / 0.15)")}` : "hsl(var(--background) / 0.3)",
                boxShadow: filled ? `inset 0 -10px 16px -6px ${CYAN}` : undefined,
              }}
              aria-label={`Vaso ${i + 1}`}
            >
              <Droplet
                className="h-3 w-3"
                style={{
                  color: filled ? CYAN : "hsl(var(--muted-foreground))",
                  opacity: filled ? 1 : 0.4,
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {reached ? "Meta alcanzada ✓" : `${(hydrationGoal - glasses) * glassMl} ml restantes`}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setGlasses(Math.max(0, glasses - 1))}
            className="rounded-md border border-border/50 p-1 text-muted-foreground hover:text-foreground"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            onClick={() => setGlasses(Math.min(hydrationGoal, glasses + 1))}
            className="rounded-md border p-1"
            style={{ borderColor: `${CYAN}`, color: CYAN }}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
