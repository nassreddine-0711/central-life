import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Plus, Calendar, Sparkles, Trash2, Check, X,
  Mountain, Flag, ListChecks, ImageIcon, PartyPopper, ChevronRight, ChevronDown, Info, History, Pencil,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VersionsModule } from "@/features/versions/VersionsModule";

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
  deadline: string; // ISO
  image?: string;
  done?: boolean;
  progress?: number; // 0-100 (objectives)
  createdAt: string;
}

const LS_GOALS = "legado.goals.v1";
const LS_BIRTH = "legado.birthDate.v1";

function loadGoals(): Goal[] {
  try { return JSON.parse(localStorage.getItem(LS_GOALS) || "[]"); }
  catch { return []; }
}
function saveGoals(g: Goal[]) {
  localStorage.setItem(LS_GOALS, JSON.stringify(g));
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
function MasterClock({ target, onConfigure }: { target: Date | null; onConfigure: () => void }) {
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
      <h2 className="mt-2 text-2xl md:text-4xl font-bold text-gradient">Destino · 25 años</h2>

      {!target ? (
        <div className="mt-8">
          <p className="text-muted-foreground">Configura tu fecha de nacimiento para encender el reloj.</p>
          <button
            onClick={onConfigure}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow"
          >
            <Calendar className="h-4 w-4" /> Configurar fecha de nacimiento
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
      className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-xl"
    >
      <div className="text-center">
        <PartyPopper className="mx-auto h-12 w-12 text-amber-300 animate-bounce" />
        <p className="mt-4 text-3xl font-bold text-gradient">¡Fase 1 completada!</p>
        <p className="mt-2 text-muted-foreground">Has llegado a tus 25. El cimiento está construido.</p>
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

function unsplashFor(title: string) {
  const q = encodeURIComponent(title.split(/\s+/).slice(0, 3).join(" ") || "horizon");
  return `https://source.unsplash.com/1600x900/?${q},cinematic`;
}

/* ============================================================
   Why overlay (hover)
============================================================ */
function WhyOverlay({ why }: { why: string }) {
  if (!why) return null;
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 translate-y-2 rounded-xl bg-background/95 p-3 text-xs text-foreground/90 opacity-0 shadow-elegant backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Por qué</p>
      <p className="mt-1 leading-relaxed">{why}</p>
    </div>
  );
}

/* ============================================================
   Dependency line connector
============================================================ */
function Connector({ label }: { label?: string }) {
  return (
    <div className="relative flex items-center justify-center py-2">
      <div className="h-6 w-px bg-gradient-to-b from-primary/60 to-transparent" />
      {label && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}

/* ============================================================
   Cards
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
    >
      {goal.image ? (
        <div className="relative w-full bg-white">
          <img
            src={goal.image}
            alt={goal.title}
            className="block w-full max-h-[75vh] object-contain"
          />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground backdrop-blur">
            <Mountain className="h-3 w-3" /> Sueño
          </span>
          <div className="absolute right-3 top-3 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={onEdit}
              className="rounded-full bg-background/80 p-2 text-foreground/80 backdrop-blur transition hover:text-foreground"
              aria-label="Editar"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="rounded-full bg-background/80 p-2 text-foreground/80 backdrop-blur transition hover:text-foreground"
              aria-label="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative p-5 sm:p-7">
        {!goal.image && (
          <div className="mb-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground">
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
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground hover:bg-background transition"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Ver Objetivos ({childCount})
          </button>
          <button
            onClick={onAddChild}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:bg-primary transition"
          >
            <Plus className="h-3 w-3" /> Objetivo
          </button>
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground hover:bg-background transition"
          >
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
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)] hover:shadow-[0_20px_44px_-10px_rgba(0,0,0,0.45)] transition-shadow"
    >
      {goal.image && (
        <div className="relative w-full bg-black/30">
          <img
            src={goal.image}
            alt={goal.title}
            className="block w-full max-h-[60vh] object-contain"
          />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-primary backdrop-blur">
            <Flag className="h-3 w-3" /> Objetivo
          </span>
          <div className="absolute right-3 top-3 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
            {onEdit && (
              <button onClick={onEdit} className="rounded-full bg-background/80 p-1.5 text-muted-foreground backdrop-blur hover:text-foreground">
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => onDelete(goal.id)} className="rounded-full bg-background/80 p-1.5 text-muted-foreground backdrop-blur hover:text-foreground">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="p-5">
        {!goal.image && (
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-primary">
              <Flag className="h-3 w-3" /> Objetivo
            </span>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
              {onEdit && (
                <button onClick={onEdit} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
              )}
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
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full bg-gradient-primary"
          />
        </div>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{pct}%</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Hitos ({childCount})
          </button>
          <button
            onClick={onAddChild}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-primary hover:bg-primary/25 transition"
          >
            <Plus className="h-3 w-3" /> Hito
          </button>
          {onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
            >
              <Pencil className="h-3 w-3" /> Editar
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MilestoneItem({
  goal, parent, onDelete, onToggle, onEdit,
}: { goal: Goal; parent?: Goal; onDelete: (id: string) => void; onToggle: (id: string) => void; onEdit?: () => void }) {
  return (
    <motion.div
      whileHover={{ x: 2 }}
      className="group relative flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-[0_8px_22px_-6px_rgba(0,0,0,0.3)] hover:shadow-[0_14px_30px_-8px_rgba(0,0,0,0.4)] transition-shadow"
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
        level,
        title,
        why,
        deadline,
        image,
        progress: level === "objective" ? Math.max(0, Math.min(100, progress)) : editing.progress,
      });
    } else {
      onCreate({
        id: crypto.randomUUID(),
        level, title, why, deadline, image,
        parentId: ctx.parentId ?? null,
        progress: 0, done: false,
        createdAt: new Date().toISOString(),
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
            {(["dream","objective","milestone"] as GoalLevel[]).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
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
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-base outline-none focus:border-primary/60"
          />
          <textarea
            placeholder="¿Por qué? — tu motivación original"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary/60"
          />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary/60"
          />
          {(level === "dream" || level === "objective") && (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
              <ImageIcon className="h-4 w-4" />
              {image ? "Imagen lista (clic para cambiar)" : `Subir imagen ${level === "dream" ? "del sueño" : "del objetivo"} (opcional)`}
              <input
                type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          )}
          {isEdit && image && (
            <button
              onClick={() => setImage(undefined)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Quitar imagen
            </button>
          )}
          {isEdit && level === "objective" && (
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Progreso: {progress}%</label>
              <input
                type="range" min={0} max={100} value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full mt-1"
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!title || !deadline}
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
   Birth date modal
============================================================ */
function BirthModal({ initial, onClose, onSave }: { initial: string | null; onClose: () => void; onSave: (s: string) => void }) {
  const [v, setV] = useState(initial || "");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Configuración</p>
        <h3 className="mt-1 text-xl font-bold">Fecha de nacimiento</h3>
        <p className="mt-1 text-sm text-muted-foreground">Calcularemos el reloj hasta tu 25º cumpleaños.</p>
        <input
          type="date"
          value={v}
          onChange={(e) => setV(e.target.value)}
          className="mt-4 w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:border-primary/60"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
          <button
            onClick={() => v && (onSave(v), onClose())}
            disabled={!v}
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
  const [birth, setBirth] = useState<string | null>(() => localStorage.getItem(LS_BIRTH));
  const [createCtx, setCreateCtx] = useState<CreateContext | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showBirth, setShowBirth] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const openEdit = (g: Goal) => {
    const parent = g.parentId ? goals.find((x) => x.id === g.parentId) : null;
    setEditingGoal(g);
    setCreateCtx({ level: g.level, parentId: g.parentId ?? null, parentTitle: parent?.title, lockLevel: true });
  };
  const updateGoal = (updated: Goal) => {
    setGoals((prev) => prev.map((g) => g.id === updated.id ? updated : g));
  };

  useEffect(() => { saveGoals(goals); }, [goals]);

  // Enfocar un sueño si llegamos con #dream-<id>
  const location = useLocation();
  useEffect(() => {
    const m = location.hash.match(/^#dream-(.+)$/);
    if (!m) return;
    const id = m[1];
    setExpanded((e) => ({ ...e, [id]: true }));
    // pequeño delay para esperar al render expandido
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


  const target25 = useMemo(() => {
    if (!birth) return null;
    const b = new Date(birth);
    if (isNaN(b.getTime())) return null;
    const t = new Date(b);
    t.setFullYear(b.getFullYear() + 25);
    return t;
  }, [birth]);

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

  const addGoal = (g: Goal) => {
    setGoals((prev) => [g, ...prev]);
    if (g.parentId) setExpanded((e) => ({ ...e, [g.parentId!]: true }));
  };
  const delGoal = (id: string) => {
    // also delete descendants
    setGoals((prev) => {
      const toDelete = new Set<string>([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const g of prev) {
          if (g.parentId && toDelete.has(g.parentId) && !toDelete.has(g.id)) {
            toDelete.add(g.id); grew = true;
          }
        }
      }
      return prev.filter((g) => !toDelete.has(g.id));
    });
  };
  const toggleGoal = (id: string) =>
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, done: !g.done } : g));
  const toggleExpand = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] w-full">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-radial opacity-60" />

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:px-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
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

        <Tabs defaultValue="vision" className="mt-2">
          <TabsList className="mb-6 inline-flex h-auto items-center gap-1 rounded-full border border-neutral-200 bg-white p-1 shadow-sm">
            <TabsTrigger
              value="vision"
              className="relative rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-600 transition data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow"
            >
              <Target className="mr-2 inline h-3.5 w-3.5" /> Visión Actual
            </TabsTrigger>
            <TabsTrigger
              value="evolution"
              className="relative rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-600 transition data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow"
            >
              <History className="mr-2 inline h-3.5 w-3.5" /> Evolución Temporal
            </TabsTrigger>
          </TabsList>


          <TabsContent value="vision" className="mt-6 focus-visible:ring-0">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <MasterClock target={target25} onConfigure={() => setShowBirth(true)} />

              {/* Hierarchical tree */}
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
                          key={dream.id}
                          id={`dream-${dream.id}`}
                          className="relative scroll-mt-24 rounded-3xl border border-border/70 bg-card/40 p-5 shadow-md backdrop-blur-sm sm:p-8 md:p-10"
                        >
                          {/* Etiqueta lateral del Sueño */}
                          <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-background px-3 py-1 font-mono text-[9px] uppercase tracking-[0.3em] text-primary shadow-sm">
                            <Mountain className="h-3 w-3" /> Sueño
                          </span>

                          <DreamCard
                            goal={dream}
                            childCount={objs.length}
                            expanded={dreamOpen}
                            onToggle={() => toggleExpand(dream.id)}
                            onDelete={delGoal}
                            onAddChild={() => setCreateCtx({ level: "objective", parentId: dream.id, parentTitle: dream.title, lockLevel: true })}
                            onEdit={() => openEdit(dream)}
                          />

                          <AnimatePresence initial={false}>
                            {dreamOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                {/* Conector principal: tronco grueso desde el Sueño */}
                                <div className="relative flex flex-col items-center pt-8">
                                  <div className="h-10 w-1.5 rounded-full bg-gradient-to-b from-primary to-primary/60 shadow-[0_0_18px_hsl(var(--primary)/0.55)]" />
                                  <div className="-mt-1 h-3.5 w-3.5 rounded-full bg-primary shadow-[0_0_14px_hsl(var(--primary)/0.8)]" />
                                </div>

                                {objs.length === 0 ? (
                                  <div className="mx-auto mt-6 max-w-md rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                                    Aún sin objetivos tácticos.
                                    <button
                                      onClick={() => setCreateCtx({ level: "objective", parentId: dream.id, parentTitle: dream.title, lockLevel: true })}
                                      className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                                    >
                                      <Plus className="h-3 w-3" /> Crear objetivo
                                    </button>
                                  </div>
                                ) : (
                                  <div className="relative mt-4">
                                    {/* Bus horizontal principal (md+) que conecta todos los objetivos */}
                                    {objs.length > 1 && (
                                      <div className="pointer-events-none absolute left-[8%] right-[8%] top-0 hidden h-1.5 rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/40 shadow-[0_0_12px_hsl(var(--primary)/0.5)] md:block" />
                                    )}

                                    <div className="grid grid-cols-1 gap-x-6 gap-y-10 pt-10 md:grid-cols-2 lg:grid-cols-3">
                                      {objs.map((obj) => {
                                        const milestones = (byParent[obj.id] || []).filter((g) => g.level === "milestone");
                                        const objOpen = expanded[obj.id] ?? true;
                                        return (
                                          <div key={obj.id} className="relative flex flex-col">
                                            {/* Bajada vertical gruesa hacia cada objetivo (md+) */}
                                            <div className="pointer-events-none absolute left-1/2 -top-10 hidden h-10 w-1.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/70 to-primary md:block" />
                                            {/* En móvil: barra lateral conectora */}
                                            <div className="pointer-events-none absolute -left-3 top-0 h-full w-1 rounded-full bg-primary/40 md:hidden" />

                                            <ObjectiveCard
                                              goal={obj}
                                              parent={dream}
                                              childCount={milestones.length}
                                              expanded={objOpen}
                                              onToggle={() => toggleExpand(obj.id)}
                                              onDelete={delGoal}
                                              onAddChild={() => setCreateCtx({ level: "milestone", parentId: obj.id, parentTitle: obj.title, lockLevel: true })}
                                              onEdit={() => openEdit(obj)}
                                            />

                                            <AnimatePresence initial={false}>
                                              {objOpen && (
                                                <motion.div
                                                  initial={{ opacity: 0, height: 0 }}
                                                  animate={{ opacity: 1, height: "auto" }}
                                                  exit={{ opacity: 0, height: 0 }}
                                                  className="overflow-hidden"
                                                >
                                                  {/* Conector secundario: línea discontinua atenuada del Objetivo a sus Hitos */}
                                                  <div className="relative ml-5 mt-4 space-y-2 border-l-2 border-dashed border-muted-foreground/40 pl-5">
                                                    <p className="-ml-5 mb-2 inline-block rounded-full border border-border bg-background/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                                                      Hitos
                                                    </p>
                                                    {milestones.length === 0 ? (
                                                      <div className="relative">
                                                        <span className="pointer-events-none absolute -left-5 top-1/2 h-px w-5 border-t border-dashed border-muted-foreground/40" />
                                                        <button
                                                          onClick={() => setCreateCtx({ level: "milestone", parentId: obj.id, parentTitle: obj.title, lockLevel: true })}
                                                          className="w-full rounded-xl border border-dashed border-border bg-card/50 p-3 text-xs text-muted-foreground hover:text-foreground transition"
                                                        >
                                                          <Plus className="mr-1 inline h-3 w-3" /> Añadir hito
                                                        </button>
                                                      </div>
                                                    ) : (
                                                      <>
                                                        {milestones.map((m) => (
                                                          <div key={m.id} className="relative">
                                                            <span className="pointer-events-none absolute -left-5 top-1/2 h-px w-5 border-t border-dashed border-muted-foreground/40" />
                                                            <MilestoneItem goal={m} parent={obj} onDelete={delGoal} onToggle={toggleGoal} onEdit={() => openEdit(m)} />
                                                          </div>
                                                        ))}
                                                        <div className="relative">
                                                          <span className="pointer-events-none absolute -left-5 top-1/2 h-px w-5 border-t border-dashed border-muted-foreground/40" />
                                                          <button
                                                            onClick={() => setCreateCtx({ level: "milestone", parentId: obj.id, parentTitle: obj.title, lockLevel: true })}
                                                            className="w-full rounded-xl border border-dashed border-border bg-card/30 p-2 text-[11px] text-muted-foreground hover:text-foreground transition"
                                                          >
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
                        <ObjectiveCard
                          key={g.id} goal={g} childCount={0} expanded={false}
                          onToggle={() => {}}
                          onDelete={delGoal}
                          onAddChild={() => setCreateCtx({ level: "milestone", parentId: g.id, parentTitle: g.title, lockLevel: true })}
                          onEdit={() => openEdit(g)}
                        />
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

          <TabsContent value="evolution" className="mt-6 focus-visible:ring-0">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <VersionsModule />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      <AnimatePresence>
        {createCtx && <CreateGoalModal ctx={createCtx} editing={editingGoal} onClose={() => { setCreateCtx(null); setEditingGoal(null); }} onCreate={addGoal} onUpdate={updateGoal} />}
        {showBirth && (
          <BirthModal
            initial={birth}
            onClose={() => setShowBirth(false)}
            onSave={(s) => { setBirth(s); localStorage.setItem(LS_BIRTH, s); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({
  title, subtitle, icon: Icon, delay = 0, children,
}: { title: string; subtitle: string; icon: any; delay?: number; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="mt-10"
    >
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
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-glow"
        >
          <Plus className="h-3 w-3" /> {actionLabel}
        </button>
      )}
    </div>
  );
}
