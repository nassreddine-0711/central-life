import { Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe2, BookOpen } from "lucide-react";
import { Globe3D } from "@/features/travel/Globe3D";
import { CountryModal } from "@/features/travel/CountryModal";
import { ExplorerRangeHUD, FinanceNexusHUD } from "@/features/travel/TravelHUD";
import { Bitacora } from "@/features/travel/Bitacora";
import { getCountryNameES } from "@/features/travel/countryNamesES";
import { cn } from "@/lib/utils";

type View = "globe" | "bitacora";

function ViajesInner() {
  const [view, setView] = useState<View>("globe");
  const [selected, setSelected] = useState<{ id: string; name?: string } | null>(null);
  const [flashID, setFlashID] = useState<string | null>(null);
  const [hover, setHover] = useState<{ id: string; name?: string } | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  return (
    <div
      className="relative h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.10)_0%,_hsl(var(--background))_70%)]"
      onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="pointer-events-none absolute left-3 sm:left-5 top-3 sm:top-5 z-20 text-left"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Globe2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="text-left">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight md:text-3xl">
              <span className="text-gradient">Trips</span>
            </h1>
          </div>
        </div>
      </motion.div>

      {/* Tabs selector */}
      <div className="pointer-events-none absolute left-3 sm:left-5 top-16 sm:top-[6.5rem] z-20">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1 shadow-sm">
          {([
            { key: "globe", label: "Visualizador 3D", icon: Globe2 },
            { key: "bitacora", label: "Mi Bitácora", icon: BookOpen },
          ] as const).map((t) => {
            const Icon = t.icon;
            const active = view === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider sm:tracking-widest transition",
                  active ? "text-primary-foreground" : "text-neutral-600 hover:text-neutral-900",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="viajes-tab-pill"
                    className="absolute inset-0 rounded-full bg-gradient-primary shadow-glow"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 h-3.5 w-3.5" />
                <span className="relative z-10">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "globe" ? (
          <motion.div
            key="globe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            {/* Globe — full on mobile, 70% on desktop */}
            <div className="absolute inset-0 mx-auto h-full w-full md:w-[70%]">
              <Suspense fallback={null}>
                <Globe3D
                  onSelectCountry={(id, name) => setSelected({ id, name })}
                  onHoverCountry={(id, name) => setHover(id ? { id, name } : null)}
                  flashCountryID={flashID}
                  onFlashConsumed={() => setFlashID(null)}
                />
              </Suspense>
            </div>

            {/* Floating hover label */}
            <AnimatePresence>
              {hover && (
                <motion.div
                  key={hover.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    left: Math.min(mouse.x + 16, window.innerWidth - 200),
                    top: Math.min(mouse.y + 16, window.innerHeight - 80),
                  }}
                  className="pointer-events-none fixed z-50"
                >
                  <div className="glass relative rounded-md border border-cyan-500/30 px-3 py-2 shadow-[0_0_24px_rgba(34,211,238,0.15)]">
                    <span className="pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t border-cyan-400/70" />
                    <span className="pointer-events-none absolute -right-px -bottom-px h-2 w-2 border-r border-b border-cyan-400/70" />
                    <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-cyan-300/70">
                      ISO · {hover.id}
                    </p>
                    <p className="font-mono text-sm font-semibold uppercase tracking-wider text-foreground">
                      {getCountryNameES(hover.id, hover.name)}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* HUD overlays */}
            <div className="pointer-events-none absolute right-3 sm:right-6 top-28 sm:top-32 z-10 hidden sm:block">
              <ExplorerRangeHUD />
            </div>
            <div className="pointer-events-none absolute bottom-4 sm:bottom-6 right-3 sm:right-6 z-10 hidden sm:block">
              <FinanceNexusHUD />
            </div>

            {/* Hint */}
            <div className="pointer-events-none absolute bottom-3 sm:bottom-6 left-3 sm:left-6 z-10 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-muted-foreground/70">
              ◌ haz clic sobre un país para registrar tu viaje
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="bitacora"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="absolute top-28 sm:top-36 bottom-0 left-0 right-0 overflow-y-auto"
          >
            <Bitacora />
          </motion.div>
        )}
      </AnimatePresence>

      <CountryModal
        countryID={selected?.id ?? null}
        countryName={selected?.name ?? null}
        onClose={() => setSelected(null)}
        onVisitedConfirmed={(id) => setFlashID(id)}
      />
    </div>
  );
}

export default function Viajes() {
  return <ViajesInner />;
}