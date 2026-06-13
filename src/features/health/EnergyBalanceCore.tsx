import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useHealth } from "./HealthContext";
import { AnimatedNumber } from "./AnimatedNumber";
import { BmrSettingsDialog } from "./SettingsDialogs";

export function EnergyBalanceCore() {
  const { consumed, burned, bmr, balance, macros } = useHealth();
  const isDeficit = balance < 0;
  const totalOut = bmr + burned;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass relative overflow-hidden rounded-3xl p-8 md:p-10"
    >
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full blur-3xl"
        style={{ background: isDeficit ? "hsl(140 90% 55% / 0.18)" : "hsl(0 80% 60% / 0.15)" }}
      />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
          <Flame className="h-3.5 w-3.5" /> Balance Energético
        </div>

        <div className="flex flex-col items-center">
          <AnimatedNumber
            value={balance}
            className="font-mono text-7xl font-bold tabular-nums md:text-8xl"
            prefix={balance > 0 ? "+" : ""}
            suffix=" kcal"
          />
          <div
            className="mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-widest"
            style={{
              color: isDeficit ? "hsl(140 90% 55%)" : "hsl(0 80% 65%)",
              borderColor: isDeficit ? "hsl(140 90% 55% / 0.4)" : "hsl(0 80% 65% / 0.4)",
              background: isDeficit ? "hsl(140 90% 55% / 0.08)" : "hsl(0 80% 65% / 0.08)",
              textShadow: isDeficit ? "0 0 24px hsl(140 90% 55% / 0.6)" : "none",
            }}
          >
            {isDeficit ? "Déficit · Modo Templo" : "Superávit"}
          </div>
        </div>

        <div className="grid w-full grid-cols-3 gap-3 pt-4">
          <Stat label="Consumidas" value={consumed} suffix=" kcal" tone="cyan" />
          <Stat label="Metabolismo Basal" value={bmr} suffix=" kcal" tone="muted" action={<BmrSettingsDialog />} />
          <Stat label="Quemadas" value={burned} suffix=" kcal" tone="green" />
        </div>

        <div className="grid w-full grid-cols-3 gap-3 pt-2">
          <Macro label="Proteínas" value={macros.protein} color="hsl(195 100% 60%)" />
          <Macro label="Carbohidratos" value={macros.carbs} color="hsl(45 100% 60%)" />
          <Macro label="Grasas" value={macros.fat} color="hsl(330 80% 65%)" />
        </div>

        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
          {consumed} − ({bmr} + {burned}) = {balance >= 0 ? "+" : ""}{balance} kcal · gasto total {totalOut}
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, suffix, tone, action }: { label: string; value: number; suffix: string; tone: "cyan" | "green" | "muted"; action?: React.ReactNode }) {
  const color =
    tone === "green" ? "hsl(140 90% 55%)" :
    tone === "cyan" ? "hsl(195 100% 60%)" :
    "hsl(var(--muted-foreground))";
  return (
    <div className="rounded-2xl border border-border/50 bg-background/30 p-4 text-center backdrop-blur">
      <div className="flex items-center justify-center gap-1.5 text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
        {label} {action}
      </div>
      <div className="mt-1 font-mono text-xl font-semibold tabular-nums" style={{ color }}>
        <AnimatedNumber value={value} suffix={suffix} />
      </div>
    </div>
  );
}

function Macro({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/30 p-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <span className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums">
        <AnimatedNumber value={value} decimals={1} suffix=" g" />
      </div>
    </div>
  );
}
