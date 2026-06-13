import { motion } from "framer-motion";
import { Compass, Wallet, Camera } from "lucide-react";
import { useTravel } from "./TravelContext";

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

function HudFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-xl border border-border bg-card p-4 shadow-lg ${className}`}>
      {children}
    </div>
  );
}


export function ExplorerRangeHUD() {
  const { worldPercent, visitedCount, wishlistCount } = useTravel();
  return (
    <motion.div {...fade} className="pointer-events-auto w-72">
      <HudFrame>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">
          <Compass className="h-3.5 w-3.5" />
          Rango de explorador
        </div>
        <div className="mt-3 font-mono text-3xl font-semibold text-foreground">
          {worldPercent.toFixed(2)}
          <span className="text-base text-muted-foreground">%</span>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Has descubierto el mundo
        </p>

        {/* Technical progress bar */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-sm bg-border/40">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${worldPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]"
          />
        </div>

        <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>VST · <span className="text-emerald-400">{visitedCount}</span></span>
          <span>WSH · <span className="text-cyan-300">{wishlistCount}</span></span>
          <span>TOT · 195</span>
        </div>
      </HudFrame>
    </motion.div>
  );
}

export function FinanceNexusHUD() {
  const { travelSavings, totalSpend } = useTravel();
  return (
    <motion.div {...fade} className="pointer-events-auto flex w-72 flex-col gap-3">
      <HudFrame>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">
          <Wallet className="h-3.5 w-3.5" />
          Bolsa de viaje
        </div>
        <div className="mt-2 font-mono text-2xl font-semibold text-emerald-400">
          {travelSavings.toLocaleString("es-ES")}
          <span className="ml-1 text-sm text-muted-foreground">€</span>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Saldo disponible · sync finanzas
        </p>
      </HudFrame>

      <HudFrame>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">
          <Camera className="h-3.5 w-3.5" />
          Inversión en memorias
        </div>
        <div className="mt-2 font-mono text-2xl font-semibold text-cyan-300">
          {totalSpend.toLocaleString("es-ES")}
          <span className="ml-1 text-sm text-muted-foreground">€</span>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Sumatorio histórico
        </p>
      </HudFrame>
    </motion.div>
  );
}
