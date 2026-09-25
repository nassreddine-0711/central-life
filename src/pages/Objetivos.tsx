import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useSupabaseSync } from "@/hooks/useSupabaseSync";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Plus, Calendar, Sparkles, Trash2, Check, X,
  Mountain, Flag, ListChecks, ImageIcon, PartyPopper, ChevronRight, ChevronDown, Info, History, Pencil, Settings2, Route, MoreVertical
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VersionsModule } from "@/features/versions/VersionsModule";
import { useCerebro } from "@/features/cerebro/CerebroContext";
import { cn } from "@/lib/utils";

/* ============================================================
   Types & storage
============================================================ */
type GoalLevel = "dream" | "objective" | "milestone";
interface Goal {
  id: string;
  level: GoalLevel;
  parentId?: string | null;
  title: string;
  why: string;
  deadline: string;
  image?: string;
  done?: boolean;
  progress?: number;
  color?: string;
  createdAt: string;
  /** Si está marcado, aparece también como Proyecto (Kanban) en Second Brain. */
  isProject?: boolean;
}

interface RoadmapConfig {
  birthDate: string;
  targetType: "age" | "years";
  targetValue: number;
  baseDate: string; 
}

const LS_GOALS = "legado.goals.v2";
const LS_CONFIG = "legado.config.v2";

const PRESET_COLORS = ["#3b82f6", "#eab308", "#22c55e", "#ef4444", "#a855f7", "#ec4899", "#f97316", "#14b8a6"];

const DEFAULT_CONFIG: RoadmapConfig = { birthDate: "", targetType: "age", targetValue: 25, baseDate: new Date().toISOString() };

function loadGoals(): Goal[] {
  try { return JSON.parse(localStorage.getItem(LS_GOALS) || "[]"); } catch { return []; }
}

function loadConfig(): RoadmapConfig {
  try { return JSON.parse(localStorage.getItem(LS_CONFIG) || JSON.stringify(DEFAULT_CONFIG)); } catch { return DEFAULT_CONFIG; }
}

/* ============================================================
   Countdown helpers
============================================================ */
function getDelta(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { d, h, m, s, ms };
}

type Urgency = "calm" | "focus" | "urgent" | "done";
function urgencyOf(ms: number): Urgency {
  if (ms <= 0) return "done";
  const days = ms / 86400000;
  if (days < 30) return "urgent";
  if (days < 90) return "focus";
  return "calm";
}
const urgencyClass: Record<Urgency, string> = {
  calm: "text-foreground/80",
  focus: "text-amber-600 dark:text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.55)]",
  urgent: "text-amber-500 dark:text-amber-200 drop-shadow-[0_0_18px_rgba(251,191,36,0.85)] animate-pulse",
  done: "text-emerald-600 dark:text-emerald-300",
};

/* ============================================================
   Animated digit (master clock)
============================================================ */
function Digit({ value, size = "text-4xl sm:text-6xl md:text-8xl" }: { value: string; size?: string }) {
  return (
    <span className={`relative inline-block overflow-hidden font-mono ${size} font-bold tabular-nums leading-none`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "-60%", opacity: 0, filter: "blur(6px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "60%", opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
function pad(n: number, len = 2) { return String(n).padStart(len, "0"); }

/* ============================================================
   Master clock
============================================================ */
function MasterClock({ target, config, onConfigure }: { target: Date | null; config: RoadmapConfig; onConfigure: () => void }) {
  const [, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const delta = target ? getDelta(target) : { d: 0, h: 0, m: 0, s: 0, ms: 0 };
  const urg = target ? urgencyOf(delta.ms) : "calm";
  const cls = urgencyClass[urg];

  return (
    <motion.div
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-8 md:p-12 text-center relative overflow-hidden shadow-sm"
    >
      <h2 className="mt-2 text-2xl md:text-4xl font-bold text-gradient flex items-center justify-center gap-3">
        {config.targetType === "age" ? `Destino · ${config.targetValue} años` : `Destino · En ${config.targetValue} años`}
        <button onClick={onConfigure} className="text-muted-foreground hover:text-foreground transition rounded-full hover:bg-muted p-2" title="Configurar Destino">
          <Settings2 className="h-5 w-5" />
        </button>
      </h2>

      {!target ? (
        <div className="mt-8">
          <p className="text-muted-foreground">Configura tu fecha de nacimiento y destino para encender el reloj.</p>
          <button
            onClick={onConfigure}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow"
          >
            <Settings2 className="h-4 w-4" /> Configurar Destino
          </button>
        </div>
      ) : (
        <>
          <div className={`mt-8 flex items-end justify-center gap-1.5 sm:gap-3 md:gap-6 ${cls}`}>
            <ClockUnit value={pad(delta.d, 4)} label="Días" />
            <Sep />
            <ClockUnit value={pad(delta.h)} label="Horas" />
            <Sep />
            <ClockUnit value={pad(delta.m)} label="Min" />
            <Sep />
            <ClockUnit value={pad(delta.s)} label="Seg" />
          </div>
          {delta.ms === 0 && <CelebrationOverlay />}
        </>
      )}
    </motion.div>
  );
}

function ClockUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex">
        {value.split("").map((ch, i) => (
          <Digit key={i + "_" + ch} value={ch} />
        ))}
      </div>
      <span className="font-mono text-[10px] md:text-xs uppercase tracking-[0.35em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
function Sep() {
  return <span className="font-mono text-3xl sm:text-5xl md:text-7xl font-bold leading-none text-muted-foreground/60 mb-4 sm:mb-7">:</span>;
}

function CelebrationOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-xl z-50"
    >
      <div className="text-center">
        <PartyPopper className="mx-auto h-12 w-12 text-amber-300 animate-bounce" />
        <p className="mt-4 text-3xl font-bold text-gradient">¡Fase completada!</p>
        <p className="mt-2 text-muted-foreground">Has llegado a tu destino. El cimiento está construido.</p>
      </div>
    </motion.div>
  );
}

/* ============================================================
   Goal countdown
============================================================ */
function GoalCountdown({ deadline, compact = false }: { deadline: string; compact?: boolean }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(deadline);
  const d = getDelta(target);
  const urg = urgencyOf(d.ms);
  const cls = urgencyClass[urg];
  if (urg === "done") return <span className={`font-mono text-sm font-semibold ${cls}`}>completado</span>;
  if (compact) {
    return (
      <span className={`font-mono text-sm tabular-nums font-semibold ${cls}`}>
        {d.d}d {pad(d.h)}h {pad(d.m)}m
      </span>
    );
  }
  return (
    <span className={`font-mono text-base tabular-nums font-semibold ${cls}`}>
      {d.d}d {pad(d.h)}:{pad(d.m)}:{pad(d.s)}
    </span>
  );
}

/* ============================================================
   Cards for "Visión Actual"
============================================================ */
function DreamCard({
  goal, childCount, expanded, onToggle, onDelete, onAddChild, onEdit,
}: {
  goal: Goal; childCount: number; expanded: boolean;
  onToggle: () => void; onDelete: (id: string) => void; onAddChild: () => void; onEdit: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm"
      style={{ borderLeftColor: goal.color, borderLeftWidth: "4px" }}
    >
      {goal.image ? (
        <div className="relative w-full bg-white">
          <img src={goal.image} alt={goal.title} className="block w-full max-h-[75vh] object-contain" />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground backdrop-blur" style={{ color: goal.color || "hsl(var(--primary))" }}>
            <Mountain className="h-3 w-3" /> Sueño
          </span>
          <div className="absolute right-3 top-3 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
            <button onClick={onEdit} className="rounded-full bg-background/80 p-2 text-foreground/80 backdrop-blur transition hover:text-foreground"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => onDelete(goal.id)} className="rounded-full bg-background/80 p-2 text-foreground/80 backdrop-blur transition hover:text-foreground"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      ) : null}

      <div className="relative p-5 sm:p-7">
        {!goal.image && (
          <div className="mb-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground" style={{ color: goal.color || "hsl(var(--primary))" }}>
              <Mountain className="h-3 w-3" /> Sueño
            </span>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
              <button onClick={onEdit} className="text-foreground/70 hover:text-foreground"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => onDelete(goal.id)} className="text-foreground/70 hover:text-foreground"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{goal.title}</h3>
          <GoalCountdown deadline={goal.deadline} />
        </div>

        {goal.why && (
          <div className="mt-3 rounded-xl border border-border/60 bg-muted/40 p-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Por qué</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">{goal.why}</p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button onClick={onToggle} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground hover:bg-background transition">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />} Ver Objetivos ({childCount})
          </button>
          <button onClick={onAddChild} className="inline-flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:bg-primary transition">
            <Plus className="h-3 w-3" /> Objetivo
          </button>
          <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground hover:bg-background transition">
            <Pencil className="h-3 w-3" /> Editar
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ObjectiveCard({
  goal, parent, childCount, expanded, onToggle, onDelete, onAddChild, onEdit,
}: {
  goal: Goal; parent?: Goal; childCount: number; expanded: boolean;
  onToggle: () => void; onDelete: (id: string) => void; onAddChild: () => void; onEdit?: () => void;
}) {
  const pct = Math.max(0, Math.min(100, goal.progress ?? 0));
  const cardColor = parent?.color || "hsl(var(--primary))";

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)] hover:shadow-[0_20px_44px_-10px_rgba(0,0,0,0.45)] transition-shadow"
      style={{ borderTopColor: cardColor, borderTopWidth: "4px" }}
    >
      {goal.image && (
        <div className="relative w-full bg-black/30">
          <img src={goal.image} alt={goal.title} className="block w-full max-h-[60vh] object-contain" />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.25em] backdrop-blur" style={{ color: cardColor }}>
            <Flag className="h-3 w-3" /> Objetivo
          </span>
          <div className="absolute right-3 top-3 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
            {onEdit && <button onClick={onEdit} className="rounded-full bg-background/80 p-1.5 text-muted-foreground backdrop-blur hover:text-foreground"><Pencil className="h-4 w-4" /></button>}
            <button onClick={() => onDelete(goal.id)} className="rounded-full bg-background/80 p-1.5 text-muted-foreground backdrop-blur hover:text-foreground"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      <div className="p-5">
        {!goal.image && (
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.25em]" style={{ backgroundColor: `${cardColor}25`, color: cardColor }}>
              <Flag className="h-3 w-3" /> Objetivo
            </span>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
              {onEdit && <button onClick={onEdit} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>}
              <button onClick={() => onDelete(goal.id)} className="text-muted-foreground hover:text-foreground"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        <div className={`${goal.image ? "" : "mt-3"} flex flex-wrap items-center gap-2`}>
          <h4 className="text-lg font-semibold break-words">{goal.title}</h4>
          <GoalCountdown deadline={goal.deadline} compact />
        </div>
        {parent && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Sub-objetivo de: <span className="text-foreground/80">{parent.title}</span> (Sueño)
          </p>
        )}

        {goal.why && (
          <div className="mt-3 rounded-lg border border-border/60 bg-muted/40 p-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Por qué</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">{goal.why}</p>
          </div>
        )}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: "easeOut" }} className="h-full" style={{ backgroundColor: cardColor }} />
        </div>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{pct}%</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={onToggle} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />} Hitos ({childCount})
          </button>
          <button onClick={onAddChild} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest transition" style={{ backgroundColor: `${cardColor}25`, color: cardColor }}>
            <Plus className="h-3 w-3" /> Hito
          </button>
          {onEdit && (
            <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition">
              <Pencil className="h-3 w-3" /> Editar
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MilestoneItem({
  goal, parent, onDelete, onToggle, onEdit, parentColor
}: { goal: Goal; parent?: Goal; onDelete: (id: string) => void; onToggle: (id: string) => void; onEdit?: () => void; parentColor?: string }) {
  const color = parentColor || "hsl(var(--primary))";
  return (
    <motion.div
      whileHover={{ x: 2 }}
      className="group relative flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-[0_8px_22px_-6px_rgba(0,0,0,0.3)] hover:shadow-[0_14px_30px_-8px_rgba(0,0,0,0.4)] transition-shadow"
      style={{ borderLeftColor: color, borderLeftWidth: "3px" }}
    >
      <button
        onClick={() => onToggle(goal.id)}
        className={`grid h-5 w-5 place-items-center rounded-md border transition ${
          goal.done ? "border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300" : "border-foreground/20 hover:border-foreground/40"
        }`}
      >
        {goal.done && <Check className="h-3 w-3" />}
      </button>
      <div className="flex-1 min-w-0">
        {goal.why ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <p className={`text-sm break-words cursor-help ${goal.done ? "line-through text-muted-foreground" : ""}`}>{goal.title}</p>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Por qué</p>
              <p className="mt-1 text-xs leading-relaxed">{goal.why}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <p className={`text-sm break-words ${goal.done ? "line-through text-muted-foreground" : ""}`}>{goal.title}</p>
        )}
        {parent && (
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground break-words">
            Hito de: <span className="text-foreground/70">{parent.title}</span> (Objetivo)
          </p>
        )}
      </div>
      <GoalCountdown deadline={goal.deadline} compact />
      {onEdit && (
        <button onClick={onEdit} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground" aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </button>
      )}
      <button onClick={() => onDelete(goal.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

/* ============================================================
   Modal — create / edit goal
============================================================ */
interface CreateContext {
  level: GoalLevel;
  parentId?: string | null;
  parentTitle?: string;
  lockLevel?: boolean;
}

function CreateGoalModal({
  ctx, editing, onClose, onCreate, onUpdate,
}: {
  ctx: CreateContext;
  editing?: Goal | null;
  onClose: () => void;
  onCreate: (g: Goal) => void;
  onUpdate?: (g: Goal) => void;
}) {
  const isEdit = !!editing;
  const [level, setLevel] = useState<GoalLevel>(editing?.level ?? ctx.level);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [why, setWhy] = useState(editing?.why ?? "");
  const [deadline, setDeadline] = useState(editing?.deadline ? editing.deadline.slice(0, 10) : "");
  const [image, setImage] = useState<string | undefined>(editing?.image);
  const [progress, setProgress] = useState<number>(editing?.progress ?? 0);
  const [color, setColor] = useState<string>(editing?.color ?? PRESET_COLORS[0]);
  const [isProject, setIsProject] = useState<boolean>(editing?.isProject ?? false);

  const handleFile = (f: File) => {
    const r = new FileReader();
    r.onload = () => setImage(String(r.result));
    r.readAsDataURL(f);
  };

  const submit = () => {
    if (!title || !deadline) return;
    if (isEdit && editing && onUpdate) {
      onUpdate({
        ...editing,
        level, title, why, deadline, image, color: level === "dream" ? color : editing.color,
        progress: level === "objective" ? Math.max(0, Math.min(100, progress)) : editing.progress,
        isProject: level === "dream" ? undefined : isProject,
      });
    } else {
      onCreate({
        id: crypto.randomUUID(),
        level, title, why, deadline, image, color: level === "dream" ? color : undefined,
        parentId: ctx.parentId ?? null,
        progress: 0, done: false,
        createdAt: new Date().toISOString(),
        isProject: level === "dream" ? undefined : isProject,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">{isEdit ? "Editar" : "Nuevo"} · El Legado</p>
        <h3 className="mt-1 text-2xl font-bold text-gradient">{isEdit ? "Refinar ambición" : "Forjar ambición"}</h3>
        {ctx.parentTitle && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Vinculado a: <span className="text-foreground/80">{ctx.parentTitle}</span>
          </p>
        )}

        {!ctx.lockLevel && !isEdit && (
          <div className="mt-5 grid grid-cols-3 gap-2">
            {(["dream", "objective", "milestone"] as GoalLevel[]).map((l) => (
              <button
                key={l} onClick={() => setLevel(l)}
                className={`rounded-xl border px-3 py-2 text-xs font-mono uppercase tracking-widest transition ${
                  level === l ? "border-primary/60 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {l === "dream" ? "Sueño" : l === "objective" ? "Objetivo" : "Meta"}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <input
            placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-base outline-none focus:border-primary/60"
          />
          <textarea
            placeholder="¿Por qué? — tu motivación original" value={why} onChange={(e) => setWhy(e.target.value)} rows={3}
            className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary/60"
          />
          <input
            type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary/60"
          />
          
          {level === "dream" && (
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Color del Sueño</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c} onClick={() => setColor(c)}
                    className={cn("h-7 w-7 rounded-full border-2 transition-all", color === c ? "scale-110" : "border-transparent opacity-80 hover:opacity-100")}
                    style={{ backgroundColor: c, borderColor: color === c ? c : "transparent" }}
                  />
                ))}
              </div>
            </div>
          )}

          {(level === "dream" || level === "objective") && (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
              <ImageIcon className="h-4 w-4" />
              {image ? "Imagen lista (clic para cambiar)" : `Subir imagen ${level === "dream" ? "del sueño" : "del objetivo"} (opcional)`}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
          )}
          {isEdit && image && (
            <button onClick={() => setImage(undefined)} className="text-xs text-muted-foreground hover:text-foreground underline">Quitar imagen</button>
          )}
          {isEdit && level === "objective" && (
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Progreso: {progress}%</label>
              <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full mt-1" />
            </div>
          )}

          {(level === "objective" || level === "milestone") && (
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm text-foreground">
              <span className="flex items-center gap-2 text-muted-foreground">
                <ListChecks className="h-4 w-4" />
                Marcar como proyecto <span className="text-[10px] normal-case text-muted-foreground/70">(aparece en Proyectos con su Kanban)</span>
              </span>
              <input
                type="checkbox"
                checked={isProject}
                onChange={(e) => setIsProject(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
            </label>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
          <button
            onClick={submit} disabled={!title || !deadline}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" /> {isEdit ? "Guardar" : "Crear"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ============================================================
   Config Modal
============================================================ */
function ConfigModal({ initial, onClose, onSave }: { initial: RoadmapConfig; onClose: () => void; onSave: (c: RoadmapConfig) => void }) {
  const [draft, setDraft] = useState(initial);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Configuración</p>
        <h3 className="mt-1 text-xl font-bold">Destino de Vida</h3>
        
        <div className="mt-4 space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">Tu fecha de nacimiento</label>
            <input
              type="date" value={draft.birthDate} onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })}
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary/60"
            />
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">¿Cómo calculamos la meta?</label>
            <div className="flex gap-2">
              <button
                onClick={() => setDraft({ ...draft, targetType: "age" })}
                className={cn("flex-1 rounded-xl border py-2 text-xs font-mono uppercase tracking-widest transition", draft.targetType === "age" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
              >Por Edad</button>
              <button
                onClick={() => setDraft({ ...draft, targetType: "years" })}
                className={cn("flex-1 rounded-xl border py-2 text-xs font-mono uppercase tracking-widest transition", draft.targetType === "years" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
              >Por Años</button>
            </div>
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">
              {draft.targetType === "age" ? "Edad de destino (ej: 25)" : "Años a partir de hoy (ej: 4)"}
            </label>
            <input
              type="number" value={draft.targetValue} onChange={(e) => setDraft({ ...draft, targetValue: Number(e.target.value) })}
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-xl font-bold font-mono outline-none focus:border-primary/60"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
          <button
            onClick={() => { onSave({ ...draft, baseDate: draft.baseDate || new Date().toISOString() }); onClose(); }}
            disabled={!draft.birthDate || !draft.targetValue}
            className="rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Page
============================================================ */
export default function Objetivos() {
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals());
  const [config, setConfig] = useState<RoadmapConfig>(() => loadConfig());

  const setGoalsCb = useCallback((v: Goal[]) => setGoals(v), []);
  const setConfigCb = useCallback((v: RoadmapConfig) => setConfig(v), []);
  useSupabaseSync("objetivos_goals", goals, setGoalsCb);
  useSupabaseSync("objetivos_config", config, setConfigCb);
  const [createCtx, setCreateCtx] = useState<CreateContext | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [arrows, setArrows] = useState<{ id: string, path: string, color: string, level: number }[]>([]);

  const { addProject, updateProject, projectByGoalId } = useCerebro();

  const syncProjectForGoal = (g: Goal) => {
    const existing = projectByGoalId(g.id);
    if (g.isProject) {
      if (existing) {
        if (existing.archived || existing.title !== g.title) {
          updateProject(existing.id, { archived: false, title: g.title });
        }
      } else {
        addProject({ title: g.title, linkedGoalId: g.id });
      }
    } else if (existing && !existing.archived) {
      updateProject(existing.id, { archived: true });
    }
  };

  const openEdit = (g: Goal) => {
    const parent = g.parentId ? goals.find((x) => x.id === g.parentId) : null;
    setEditingGoal(g);
    setCreateCtx({ level: g.level, parentId: g.parentId ?? null, parentTitle: parent?.title, lockLevel: true });
  };
  const updateGoal = (updated: Goal) => {
    setGoals((prev) => prev.map((g) => g.id === updated.id ? updated : g));
    syncProjectForGoal(updated);
  };

  useEffect(() => { localStorage.setItem(LS_GOALS, JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem(LS_CONFIG, JSON.stringify(config)); }, [config]);

  const location = useLocation();
  useEffect(() => {
    const m = location.hash.match(/^#dream-(.+)$/);
    if (!m) return;
    const id = m[1];
    setExpanded((e) => ({ ...e, [id]: true }));
    const t = setTimeout(() => {
      const el = document.getElementById(`dream-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("ring-2", "ring-primary/60");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary/60"), 2200);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [location.hash]);

  const targetDate = useMemo(() => {
    if (!config.birthDate) return null;
    if (config.targetType === "age") {
      const d = new Date(config.birthDate);
      d.setFullYear(d.getFullYear() + config.targetValue);
      return d;
    } else {
      const d = new Date(config.baseDate);
      d.setFullYear(d.getFullYear() + config.targetValue);
      return d;
    }
  }, [config]);

  const byParent = useMemo(() => {
    const map: Record<string, Goal[]> = {};
    for (const g of goals) {
      const k = g.parentId || "_root";
      (map[k] ||= []).push(g);
    }
    return map;
  }, [goals]);

  const dreams = goals.filter((g) => g.level === "dream");
  const orphanObjectives = goals.filter((g) => g.level === "objective" && !g.parentId);
  const orphanMilestones = goals.filter((g) => g.level === "milestone" && !g.parentId);

  // Lógica inteligente para heredar el LADO de la línea temporal
  const timelineSides = useMemo(() => {
    const sides: Record<string, "left" | "right"> = {};
    const sortedDreams = goals.filter(g => g.level === "dream").sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    
    sortedDreams.forEach((d, i) => { sides[d.id] = i % 2 === 0 ? "left" : "right"; });
    goals.forEach(g => { if (g.level === "objective" && g.parentId) sides[g.id] = sides[g.parentId] || "right"; });
    goals.forEach(g => {
      if (g.level === "milestone" && g.parentId) {
        const obj = goals.find(x => x.id === g.parentId);
        if (obj && obj.parentId) sides[g.id] = sides[obj.parentId] || "right";
      }
    });
    return sides;
  }, [goals]);

  // Generador de la Línea Temporal (Solo Sueños y Objetivos)
  const timelineItems = useMemo(() => {
    if (!config.birthDate) return [];
    const birth = new Date(config.birthDate);
    const items: any[] = [];
    
    // Filtrar objetivos para dejar solo sueños y objetivos tácticos (excluyendo hitos)
    const filteredGoals = goals.filter(g => g.level === "dream" || g.level === "objective");

    filteredGoals.forEach(g => {
      const d = new Date(g.deadline);
      let age = d.getFullYear() - birth.getFullYear();
      if (d.getMonth() < birth.getMonth() || (d.getMonth() === birth.getMonth() && d.getDate() < birth.getDate())) age--;

      let color = g.color;
      let pTitle = null;
      if (g.parentId) {
        const p = goals.find(x => x.id === g.parentId);
        if (p) {
          pTitle = p.title;
          color = color || p.color;
          if (p.parentId) {
            const gp = goals.find(x => x.id === p.parentId);
            if (gp) { color = color || gp.color; pTitle = p.title; } 
          }
        }
      }
      color = color || "hsl(var(--primary))";
      items.push({ 
        ...g, 
        type: g.level, // Mapeado del tipo explícito para activar correctamente las clases de tamaño CSS
        dateObj: d, 
        age, 
        year: d.getFullYear(), 
        color, 
        parentTitle: pTitle, 
        icon: g.level === "dream" ? Mountain : Flag,
        side: timelineSides[g.id] || "right"
      });
    });

    return items.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [goals, config.birthDate, timelineSides]);

  // Gestor inteligente de líneas SVG (Circuito Externo y a 90 grados)
  useEffect(() => {
    const updateArrows = () => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 768;
      const centerLineX = rect.left + (isMobile ? 24 : rect.width / 2);
      
      // Encontrar los bordes extremos donde dibujar los carriles
      let maxR = centerLineX;
      let minL = centerLineX;

      timelineRef.current.querySelectorAll('.timeline-card').forEach(el => {
         const r = el.getBoundingClientRect();
         const isCardRight = isMobile ? true : r.left > centerLineX - 50;
         if (isCardRight) {
             if (r.right > maxR) maxR = r.right;
         } else {
             if (r.left < minL) minL = r.left;
         }
      });

      const extremeRight = maxR - rect.left;
      const extremeLeft = minL - rect.left;

      const newArrows: any[] = [];
      
      timelineItems.forEach((item) => {
        if (item.parentId && item.type !== "birth") {
          const pCard = document.getElementById(`tcard-${item.parentId}`);
          const cCard = document.getElementById(`tcard-${item.id}`);
          
          if (pCard && cCard) {
            const pR = pCard.getBoundingClientRect();
            const cR = cCard.getBoundingClientRect();
            
            const isRight = isMobile ? true : cR.left > centerLineX - 50; 
            
            // Jerarquía de las líneas
            const level = item.type === "objective" ? 1 : 2;
            const offsetDist = level === 1 ? 50 : 25; // Los sueños viajan más lejos que los hitos
            
            const startX = isRight ? pR.right - rect.left : pR.left - rect.left;
            const startY = pR.top - rect.top + pR.height / 2;
            const endX = isRight ? cR.right - rect.left : cR.left - rect.left;
            const endY = cR.top - rect.top + cR.height / 2;
            
            const midX = isRight ? extremeRight + offsetDist : extremeLeft - offsetDist;
            
            // Path SVG recto y con ángulos de 90°
            const path = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
            
            newArrows.push({ id: `${item.parentId}-${item.id}`, color: item.color, path, level });
          }
        }
      });
      setArrows(newArrows);
    };

    updateArrows();
    const observer = new ResizeObserver(updateArrows);
    if (timelineRef.current) observer.observe(timelineRef.current);
    window.addEventListener('resize', updateArrows);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateArrows);
    };
  }, [timelineItems, expandedTimelineId]);

  const addGoal = (g: Goal) => {
    setGoals((prev) => [g, ...prev]);
    if (g.parentId) setExpanded((e) => ({ ...e, [g.parentId!]: true }));
    syncProjectForGoal(g);
  };
  const delGoal = (id: string) => {
    const toDelete = new Set<string>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const g of goals) {
        if (g.parentId && toDelete.has(g.parentId) && !toDelete.has(g.id)) {
          toDelete.add(g.id); grew = true;
        }
      }
    }
    toDelete.forEach((gid) => {
      const p = projectByGoalId(gid);
      if (p && !p.archived) updateProject(p.id, { archived: true });
    });
    setGoals((prev) => prev.filter((g) => !toDelete.has(g.id)));
  };
  const toggleGoal = (id: string) => setGoals((prev) => prev.map((g) => g.id === id ? { ...g, done: !g.done } : g));
  const toggleExpand = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] w-full">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-radial opacity-60" />

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:px-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mb-8 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                <span className="text-gradient">RoadMap</span>
              </h1>
            </div>
          </div>
          <button
            onClick={() => setCreateCtx({ level: "dream", lockLevel: true })}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Forjar Sueño
          </button>
        </motion.div>

        <Tabs defaultValue="timeline" className="mt-2">
          <div className="flex justify-center w-full mb-6 overflow-x-auto pb-2">
            <TabsList className="inline-flex h-auto items-center gap-1 rounded-full border border-neutral-200 bg-white p-1 shadow-sm">
              <TabsTrigger value="timeline" className="relative rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-600 transition data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow">
                <Route className="mr-2 inline h-3.5 w-3.5" /> Línea Temporal
              </TabsTrigger>
              <TabsTrigger value="vision" className="relative rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-600 transition data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow">
                <Target className="mr-2 inline h-3.5 w-3.5" /> Visión Actual
              </TabsTrigger>
              <TabsTrigger value="evolution" className="relative rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-600 transition data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow">
                <History className="mr-2 inline h-3.5 w-3.5" /> Evolución Temporal
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ==========================================
              NUEVA PESTAÑA: LÍNEA TEMPORAL
          ========================================== */}
          <TabsContent value="timeline" className="mt-6 focus-visible:ring-0">
            {!config.birthDate ? (
              <Empty label="Configura tu destino y fecha de nacimiento para generar la Línea Temporal." actionLabel="Configurar" onAction={() => setShowConfig(true)} />
            ) : (
              <div className="relative mx-auto w-full max-w-[1200px] px-2 sm:px-10 md:px-24 py-10" ref={timelineRef}>
                
                {/* SVG Overlay para dibujar las flechas a 90 grados por fuera */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                  {arrows.map(a => (
                    <path 
                      key={a.id} d={a.path} fill="none" stroke={a.color} 
                      strokeWidth={a.level === 1 ? "4" : "2"} 
                      opacity={a.level === 1 ? "0.9" : "0.5"} 
                    />
                  ))}
                </svg>

                {/* Eje central vertical, grueso y visible */}
                <div className="absolute bottom-0 left-6 top-0 w-[6px] bg-border md:left-1/2 md:-translate-x-1/2 rounded-full" />

                {timelineItems.map((item) => {
                  const isLeft = item.side === "left";
                  const typeLabel = item.type === "dream" ? "SUEÑO" : "OBJETIVO";

                  // Lógica de TAMAÑOS jerárquica clara para Sueño vs Objetivo
                  let maxWidthClass = "max-w-md w-full";
                  let paddingClass = "p-4 sm:p-5";
                  let titleSize = "text-sm sm:text-base";

                  if (item.type === "dream") {
                    maxWidthClass = "max-w-2xl w-full"; 
                    paddingClass = "p-6 sm:p-8 bg-gradient-to-br from-card via-card to-background/30";
                    titleSize = "text-xl sm:text-2xl font-extrabold tracking-tight text-foreground";
                  } else if (item.type === "objective") {
                    maxWidthClass = "max-w-sm w-full"; // Tarjeta de objetivos sustancialmente menos ancha
                    paddingClass = "p-4 sm:p-5";
                    titleSize = "text-base sm:text-lg font-bold text-foreground/90";
                  }

                  const isExpanded = expandedTimelineId === item.id;

                  return (
                    <div key={item.id} className={cn("relative mb-14 flex w-full items-center z-10", isLeft ? "md:flex-row-reverse" : "flex-row")}>
                      
                      {/* Nodo central (Punto de la línea) */}
                      <div className="absolute left-6 md:left-1/2 flex -translate-x-1/2 flex-col items-center justify-center bg-background py-3 transition-transform hover:scale-110 z-20">
                        <span className="font-mono text-xs font-bold text-foreground leading-none">{item.age}a</span>
                        <div className="my-2 h-5 w-5 md:h-6 md:w-6 rounded-full border-[6px] bg-background shadow-md" style={{ borderColor: item.color }} />
                        <span className="font-mono text-[10px] text-muted-foreground leading-none">{item.year}</span>
                      </div>

                      {/* Tarjeta Wrapper */}
                      <div className={cn("w-full pl-20 md:w-1/2 flex", isLeft ? "md:pl-0 md:pr-14 md:justify-end text-left md:text-right" : "md:pl-14 justify-start text-left")}>
                        <motion.div 
                          id={`tcard-${item.id}`}
                          className={cn(
                            "timeline-card inline-block rounded-2xl bg-card/90 backdrop-blur-md cursor-pointer w-full transition-colors", 
                            maxWidthClass, 
                            paddingClass
                          )}
                          style={{ 
                            // Ambos tipos de tarjetas usan ahora el color seleccionado perimetralmente
                            borderWidth: item.type === "dream" ? "4px" : "1px",
                            borderColor: item.color,
                            borderStyle: "solid",
                            boxShadow: item.type === "dream"
                              ? `0 12px 35px -10px ${item.color}40, 0 0 15px -4px ${item.color}25`
                              : "0 4px 15px -3px rgba(0, 0, 0, 0.05)"
                          }}
                          whileHover={item.type === "dream" ? {
                            y: -6,
                            boxShadow: `0 25px 50px -12px ${item.color}70, 0 0 30px 2px ${item.color}40`,
                            borderColor: item.color
                          } : {
                            y: -4,
                            boxShadow: "0 12px 24px -6px rgba(0, 0, 0, 0.12)",
                            borderColor: item.color // Conserva su propio color delimitado al hacer hover
                          }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          onClick={() => setExpandedTimelineId(isExpanded ? null : item.id)}
                        >
                          <div className={cn("flex flex-wrap items-center gap-2 mb-4", isLeft ? "md:justify-end" : "justify-start")}>
                            <span 
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest shadow-sm",
                                item.type === "dream" ? "animate-pulse" : ""
                              )} 
                              style={{ backgroundColor: `${item.color}15`, borderColor: `${item.color}50`, color: item.color }}
                            >
                              <item.icon className="h-3.5 w-3.5" /> {typeLabel}
                            </span>
                            {item.parentTitle && item.type !== 'birth' && (
                              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                 DE: <span className="text-foreground/80 truncate max-w-[150px]">{item.parentTitle}</span>
                              </span>
                            )}
                          </div>
                          
                          <h4 className={cn("font-bold text-foreground leading-tight", titleSize)}>{item.title}</h4>
                          {item.type !== "birth" && <p className="font-mono text-[10px] text-muted-foreground mt-2">{item.dateObj.toLocaleDateString("es-ES")}</p>}
                          
                          <AnimatePresence>
                            {isExpanded && item.type !== "birth" && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={cn("overflow-hidden", isLeft ? "md:text-right" : "text-left")}>
                                <div className="mt-4 border-t border-border/50 pt-4">
                                  {item.why && <p className="text-sm text-foreground/80 mb-4 whitespace-pre-wrap">{item.why}</p>}
                                  <GoalCountdown deadline={item.deadline} />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </div>
                    </div>
                  );
                })}

                <div className="relative mt-12 flex w-full justify-start md:justify-center z-10">
                  <div className="absolute left-6 flex -translate-x-1/2 flex-col items-center bg-background md:left-1/2">
                    <div className="h-16 w-2 border-l-[6px] border-dashed border-muted-foreground/30" />
                    <MoreVertical className="mt-3 h-8 w-8 text-muted-foreground/30" />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ==========================================
              PESTAÑA: VISIÓN ACTUAL
          ========================================== */}
          <TabsContent value="vision" className="mt-6 focus-visible:ring-0">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              
              {/* Reloj Maestro Integrado */}
              <MasterClock target={targetDate} config={config} onConfigure={() => setShowConfig(true)} />

              <Section title="Sueños" subtitle="Árbol jerárquico · Sueño → Objetivo → Hito" icon={Mountain} delay={0.1}>
                {dreams.length === 0 ? (
                  <Empty
                    label="Aún no has dibujado un horizonte. Forja tu primer sueño."
                    actionLabel="Crear Sueño"
                    onAction={() => setCreateCtx({ level: "dream", lockLevel: true })}
                  />
                ) : (
                  <div className="space-y-16 sm:space-y-20">
                    {dreams.map((dream) => {
                      const objs = (byParent[dream.id] || []).filter((g) => g.level === "objective");
                      const dreamOpen = expanded[dream.id] ?? true;
                      return (
                        <article
                          key={dream.id} id={`dream-${dream.id}`}
                          className="relative scroll-mt-24 rounded-3xl border border-border/70 bg-card/40 p-5 shadow-md backdrop-blur-sm sm:p-8 md:p-10"
                        >
                          <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 font-mono text-[9px] uppercase tracking-[0.3em] shadow-sm" style={{ borderColor: `${dream.color}60`, color: dream.color || "hsl(var(--primary))" }}>
                            <Mountain className="h-3 w-3" /> Sueño
                          </span>

                          <DreamCard
                            goal={dream} childCount={objs.length} expanded={dreamOpen}
                            onToggle={() => toggleExpand(dream.id)} onDelete={delGoal}
                            onAddChild={() => setCreateCtx({ level: "objective", parentId: dream.id, parentTitle: dream.title, lockLevel: true })}
                            onEdit={() => openEdit(dream)}
                          />

                          <AnimatePresence initial={false}>
                            {dreamOpen && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                <div className="relative flex flex-col items-center pt-8">
                                  <div className="h-10 w-1.5 rounded-full bg-gradient-to-b to-transparent" style={{ backgroundImage: `linear-gradient(to bottom, ${dream.color || "hsl(var(--primary))"}, transparent)` }} />
                                  <div className="-mt-1 h-3.5 w-3.5 rounded-full shadow-lg" style={{ backgroundColor: dream.color || "hsl(var(--primary))" }} />
                                </div>

                                {objs.length === 0 ? (
                                  <div className="mx-auto mt-6 max-w-md rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                                    Aún sin objetivos tácticos.
                                    <button onClick={() => setCreateCtx({ level: "objective", parentId: dream.id, parentTitle: dream.title, lockLevel: true })} className="ml-2 inline-flex items-center gap-1 text-primary hover:underline">
                                      <Plus className="h-3 w-3" /> Crear objetivo
                                    </button>
                                  </div>
                                ) : (
                                  <div className="relative mt-4">
                                    {objs.length > 1 && (
                                      <div className="pointer-events-none absolute left-[8%] right-[8%] top-0 hidden h-1.5 rounded-full md:block" style={{ backgroundImage: `linear-gradient(to right, transparent, ${dream.color || "hsl(var(--primary))"}, transparent)` }} />
                                    )}

                                    <div className="grid grid-cols-1 gap-x-6 gap-y-10 pt-10 md:grid-cols-2 lg:grid-cols-3">
                                      {objs.map((obj) => {
                                        const milestones = (byParent[obj.id] || []).filter((g) => g.level === "milestone");
                                        const objOpen = expanded[obj.id] ?? true;
                                        return (
                                          <div key={obj.id} className="relative flex flex-col">
                                            <div className="pointer-events-none absolute left-1/2 -top-10 hidden h-10 w-1.5 -translate-x-1/2 rounded-full md:block" style={{ backgroundImage: `linear-gradient(to bottom, ${dream.color}80, ${dream.color})` }} />
                                            <div className="pointer-events-none absolute -left-3 top-0 h-full w-1 rounded-full md:hidden" style={{ backgroundColor: `${dream.color}60` }} />

                                            <ObjectiveCard
                                              goal={obj} parent={dream} childCount={milestones.length} expanded={objOpen}
                                              onToggle={() => toggleExpand(obj.id)} onDelete={delGoal}
                                              onAddChild={() => setCreateCtx({ level: "milestone", parentId: obj.id, parentTitle: obj.title, lockLevel: true })}
                                              onEdit={() => openEdit(obj)}
                                            />

                                            <AnimatePresence initial={false}>
                                              {objOpen && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                  <div className="relative ml-5 mt-4 space-y-2 border-l-2 border-dashed border-muted-foreground/40 pl-5">
                                                    <p className="-ml-5 mb-2 inline-block rounded-full border border-border bg-background/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">Hitos</p>
                                                    {milestones.length === 0 ? (
                                                      <div className="relative">
                                                        <span className="pointer-events-none absolute -left-5 top-1/2 h-px w-5 border-t border-dashed border-muted-foreground/40" />
                                                        <button onClick={() => setCreateCtx({ level: "milestone", parentId: obj.id, parentTitle: obj.title, lockLevel: true })} className="w-full rounded-xl border border-dashed border-border bg-card/50 p-3 text-xs text-muted-foreground hover:text-foreground transition">
                                                          <Plus className="mr-1 inline h-3 w-3" /> Añadir hito
                                                        </button>
                                                      </div>
                                                    ) : (
                                                      <>
                                                        {milestones.map((m) => (
                                                          <div key={m.id} className="relative">
                                                            <span className="pointer-events-none absolute -left-5 top-1/2 h-px w-5 border-t border-dashed border-muted-foreground/40" />
                                                            <MilestoneItem goal={m} parent={obj} onDelete={delGoal} onToggle={toggleGoal} onEdit={() => openEdit(m)} parentColor={dream.color} />
                                                          </div>
                                                        ))}
                                                        <div className="relative">
                                                          <span className="pointer-events-none absolute -left-5 top-1/2 h-px w-5 border-t border-dashed border-muted-foreground/40" />
                                                          <button onClick={() => setCreateCtx({ level: "milestone", parentId: obj.id, parentTitle: obj.title, lockLevel: true })} className="w-full rounded-xl border border-dashed border-border bg-card/30 p-2 text-[11px] text-muted-foreground hover:text-foreground transition">
                                                            <Plus className="mr-1 inline h-3 w-3" /> Añadir hito
                                                          </button>
                                                        </div>
                                                      </>
                                                    )}
                                                  </div>
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </article>
                      );
                    })}
                  </div>
                )}
              </Section>

              {(orphanObjectives.length > 0 || orphanMilestones.length > 0) && (
                <Section title="Sin vincular" subtitle="Objetivos y hitos sin sueño asignado" icon={Flag} delay={0.2}>
                  {orphanObjectives.length > 0 && (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                      {orphanObjectives.map((g) => (
                        <ObjectiveCard key={g.id} goal={g} childCount={0} expanded={false} onToggle={() => {}} onDelete={delGoal} onAddChild={() => setCreateCtx({ level: "milestone", parentId: g.id, parentTitle: g.title, lockLevel: true })} onEdit={() => openEdit(g)} />
                      ))}
                    </div>
                  )}
                  {orphanMilestones.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 gap-2">
                      {orphanMilestones.map((m) => (
                        <MilestoneItem key={m.id} goal={m} onDelete={delGoal} onToggle={toggleGoal} onEdit={() => openEdit(m)} />
                      ))}
                    </div>
                  )}
                </Section>
              )}
            </motion.div>
          </TabsContent>

          {/* ==========================================
              PESTAÑA: EVOLUCIÓN TEMPORAL
          ========================================== */}
          <TabsContent value="evolution" className="mt-6 focus-visible:ring-0">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <VersionsModule />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      <AnimatePresence>
        {createCtx && <CreateGoalModal ctx={createCtx} editing={editingGoal} onClose={() => { setCreateCtx(null); setEditingGoal(null); }} onCreate={addGoal} onUpdate={updateGoal} />}
        {showConfig && <ConfigModal initial={config} onClose={() => setShowConfig(false)} onSave={(c) => setConfig(c)} />}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   Helper Components
============================================================ */
function Section({
  title, subtitle, icon: Icon, delay = 0, children,
}: { title: string; subtitle: string; icon: any; delay?: number; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay }} className="mt-10">
      <div className="mb-4 flex items-center gap-3">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="font-mono text-xs uppercase tracking-[0.35em] text-foreground/80">{title}</h2>
        <span className="text-xs text-muted-foreground">· {subtitle}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </motion.section>
  );
}

function Empty({ label, actionLabel, onAction }: { label: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
      <Target className="mx-auto h-6 w-6 opacity-60" />
      <p className="mt-2">{label}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-glow">
          <Plus className="h-3 w-3" /> {actionLabel}
        </button>
      )}
    </div>
  );
}