import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Lock, ChevronLeft, ChevronRight, Images, GitCompare } from "lucide-react";
import { useHealth, WeightEntry } from "./HealthContext";
import { formatISODate } from "./dateUtils";

const GREEN = "hsl(140 90% 55%)";
const CYAN = "hsl(190 95% 55%)";
const VIOLET = "hsl(265 90% 70%)";
const AMBER = "hsl(35 95% 60%)";
const CORAL = "hsl(10 90% 62%)";

type Mode = "single" | "compare";

export function TimeLapseGallery() {
  const { weights } = useHealth();
  const [reveal, setReveal] = useState(false);
  const [mode, setMode] = useState<Mode>("single");
  const [idx, setIdx] = useState(0);
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(0);

  const sorted = useMemo(
    () => [...weights].sort((a, b) => a.date.localeCompare(b.date)),
    [weights]
  );

  // initialize compare indices to first/last when entering compare mode
  const enterCompare = () => {
    if (sorted.length > 0) {
      setLeftIdx(0);
      setRightIdx(sorted.length - 1);
    }
    setMode("compare");
  };

  const safeIdx = Math.min(idx, Math.max(0, sorted.length - 1));
  const current = sorted[safeIdx];

  const go = (delta: number) => {
    if (sorted.length === 0) return;
    setIdx((i) => (i + delta + sorted.length) % sorted.length);
  };
  const goSide = (side: "left" | "right", delta: number) => {
    if (sorted.length === 0) return;
    if (side === "left")
      setLeftIdx((i) => (i + delta + sorted.length) % sorted.length);
    else setRightIdx((i) => (i + delta + sorted.length) % sorted.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass rounded-3xl p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-widest">Time-Lapse Mensual</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/40 p-0.5">
            <ModeBtn active={mode === "single"} onClick={() => setMode("single")} icon={<Images className="h-3 w-3" />}>
              Única
            </ModeBtn>
            <ModeBtn active={mode === "compare"} onClick={enterCompare} icon={<GitCompare className="h-3 w-3" />}>
              Comparar
            </ModeBtn>
          </div>
          <button
            onClick={() => setReveal((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {reveal ? "Ocultar" : "Revelar"}
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
          Aún no hay registros. Añade tus primeras medidas arriba.
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {mode === "single" ? (
            <motion.div
              key="single"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="mx-auto max-w-md"
            >
              <DataRow entry={current} />
              <PhotoFrame
                entry={current}
                reveal={reveal}
                onPrev={() => go(-1)}
                onNext={() => go(1)}
              />
              <Dots count={sorted.length} active={safeIdx} onPick={setIdx} />
            </motion.div>
          ) : (
            <motion.div
              key="compare"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <CompareSide
                label="Antes"
                entry={sorted[leftIdx]}
                reveal={reveal}
                onPrev={() => goSide("left", -1)}
                onNext={() => goSide("left", 1)}
              />
              <CompareSide
                label="Después"
                entry={sorted[rightIdx]}
                reveal={reveal}
                onPrev={() => goSide("right", -1)}
                onNext={() => goSide("right", 1)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}

function ModeBtn({
  active, onClick, icon, children,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest transition ${
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function DataRow({ entry }: { entry: WeightEntry }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={entry.date + "-row"}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.25 }}
        className="mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl border border-border/40 bg-background/30 px-3 py-2 text-xs"
      >
        <span className="font-mono text-muted-foreground">
          {formatISODate(entry.date, "dd LLL yy")}
        </span>
        <Sep />
        <Inline color={GREEN} value={`${entry.weight} kg`} label="peso" />
        <Sep />
        <Inline color={CYAN} value={`${entry.waist} cm`} label="cintura" />
        {entry.legs != null && (<><Sep /><Inline color={VIOLET} value={`${entry.legs} cm`} label="piernas" /></>)}
        {entry.armLeft != null && (<><Sep /><Inline color={AMBER} value={`${entry.armLeft} cm`} label="brazo izq." /></>)}
        {entry.armRight != null && (<><Sep /><Inline color={CORAL} value={`${entry.armRight} cm`} label="brazo der." /></>)}
        {entry.armLeft == null && entry.armRight == null && entry.arms != null && (
          <><Sep /><Inline color={AMBER} value={`${entry.arms} cm`} label="brazos" /></>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function Inline({ color, value, label }: { color: string; value: string; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="h-1.5 w-1.5 translate-y-[-1px] rounded-full" style={{ background: color }} />
      <span className="font-mono font-bold tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </span>
  );
}

function Sep() {
  return <span className="text-muted-foreground/40">|</span>;
}

function PhotoFrame({
  entry, reveal, onPrev, onNext, compact = false,
}: { entry: WeightEntry; reveal: boolean; onPrev: () => void; onNext: () => void; compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border/40 bg-background/30 ${compact ? "aspect-[3/4]" : "aspect-[4/5]"}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={entry.date}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          {entry.photo ? (
            <img
              src={entry.photo}
              alt={`Foto ${entry.date}`}
              className="h-full w-full object-cover transition-all duration-500"
              style={{
                filter: reveal ? "none" : "blur(28px) brightness(0.6)",
                transform: reveal ? "scale(1)" : "scale(1.1)",
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              Sin foto
            </div>
          )}
          {!reveal && entry.photo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="h-5 w-5 text-foreground/60" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <button
        onClick={onPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/60 p-1.5 text-foreground backdrop-blur transition hover:bg-background/90"
        aria-label="Anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={onNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/60 p-1.5 text-foreground backdrop-blur transition hover:bg-background/90"
        aria-label="Siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function CompareSide({
  label, entry, reveal, onPrev, onNext,
}: { label: string; entry: WeightEntry; reveal: boolean; onPrev: () => void; onNext: () => void }) {
  return (
    <div>
      <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </div>
      <DataRow entry={entry} />
      <PhotoFrame entry={entry} reveal={reveal} onPrev={onPrev} onNext={onNext} compact />
    </div>
  );
}

function Dots({ count, active, onPick }: { count: number; active: number; onPick: (i: number) => void }) {
  return (
    <div className="mt-3 flex items-center justify-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onPick(i)}
          className={`h-1.5 rounded-full transition-all ${
            i === active ? "w-6 bg-foreground" : "w-1.5 bg-muted-foreground/40"
          }`}
          aria-label={`Ir a ${i + 1}`}
        />
      ))}
    </div>
  );
}
