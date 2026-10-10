import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mountain, Plus, Pencil, Trash2, Settings2, ImageIcon, Sparkles, PartyPopper, FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCerebro } from "../CerebroContext";
import { Empty } from "../TaskComponents";
import { Dream, DreamsConfig, Project, PROJECT_STATUS_LABEL } from "../types";

/* ============================================================
   Sueños: aquí el hilo conductor es un viaje. El contador de
   arriba es un panel de embarque (como los de un aeropuerto, de
   noche, con la silueta de una cordillera en el borde) y cada
   sueño es un billete de embarque hacia su destino: un talón
   principal con el título y la descripción, una perforación, y
   un resguardo con la foto en forma de medallón y la cuenta
   atrás ("ETA"). Los proyectos asignados a ese sueño van debajo,
   como escalas del mismo viaje.
============================================================ */

const PRESET_COLORS = ["#3b82f6", "#eab308", "#22c55e", "#ef4444", "#a855f7", "#ec4899", "#f97316", "#14b8a6"];

/* ---------- Countdown helpers ---------- */
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
/** Vocabulario de panel de salidas: cada sueño "vuela" hacia su fecha. */
const STATUS_WORD: Record<Urgency, string> = {
  calm: "EN RUTA",
  focus: "EMBARQUE PRONTO",
  urgent: "ÚLTIMA LLAMADA",
  done: "LLEGADA",
};
/** Color del estado sobre fondo oscuro (panel de embarque). */
const STATUS_COLOR_DARK: Record<Urgency, string> = {
  calm: "text-[#F6E7C9]/60",
  focus: "text-amber-300",
  urgent: "text-amber-300",
  done: "text-emerald-300",
};
/** Color del estado sobre fondo claro (resguardo del billete). */
const STATUS_COLOR_LIGHT: Record<Urgency, string> = {
  calm: "text-muted-foreground",
  focus: "text-amber-600",
  urgent: "text-amber-600",
  done: "text-emerald-600",
};
function pad(n: number, len = 2) { return String(n).padStart(len, "0"); }

function useCountdown(deadline: string) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const delta = getDelta(new Date(deadline));
  return { ...delta, urg: urgencyOf(delta.ms) };
}

/** Resguardo del billete: ETA + estado, en el talón del sueño (fondo claro). */
function EtaStub({ deadline }: { deadline: string }) {
  const { d, urg } = useCountdown(deadline);
  if (urg === "done") {
    return <span className={cn("font-mono text-[11px] font-bold uppercase tracking-wider", STATUS_COLOR_LIGHT[urg])}>{STATUS_WORD[urg]}</span>;
  }
  return (
    <div className="text-center">
      <p className="font-mono text-lg font-bold tabular-nums leading-none text-foreground">{d}<span className="text-xs font-normal text-muted-foreground"> días</span></p>
      <p className={cn("mt-0.5 flex items-center justify-center gap-1 font-mono text-[9px] font-semibold uppercase tracking-wider", STATUS_COLOR_LIGHT[urg])}>
        {urg === "urgent" && <span className="h-1 w-1 animate-pulse rounded-full bg-current" />}
        {STATUS_WORD[urg]}
      </p>
    </div>
  );
}

/* ---------- Panel de embarque (mega contador) ---------- */
const STARS = [
  { top: "12%", left: "8%", size: 3, opacity: 0.9 }, { top: "22%", left: "22%", size: 2, opacity: 0.6 },
  { top: "10%", left: "38%", size: 2, opacity: 0.7 }, { top: "30%", left: "52%", size: 3, opacity: 0.5 },
  { top: "15%", left: "68%", size: 2, opacity: 0.8 }, { top: "8%", left: "82%", size: 3, opacity: 0.6 },
  { top: "26%", left: "92%", size: 2, opacity: 0.7 }, { top: "38%", left: "12%", size: 2, opacity: 0.5 },
  { top: "42%", left: "78%", size: 2, opacity: 0.6 }, { top: "6%", left: "55%", size: 2, opacity: 0.9 },
];

function Digit({ value }: { value: string }) {
  return (
    <span className="relative inline-block overflow-hidden rounded-[4px] bg-black/20 px-0.5 font-mono text-3xl sm:text-5xl md:text-6xl font-bold tabular-nums leading-none text-[#F2A65A]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "-60%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "60%", opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="inline-block drop-shadow-[0_0_6px_rgba(242,166,90,0.5)]"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
function ClockUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex gap-[2px]">{value.split("").map((ch, i) => <Digit key={i + "_" + ch} value={ch} />)}</div>
      <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#F6E7C9]/50">{label}</span>
    </div>
  );
}

function MegaContador({ config, onConfigure }: { config: DreamsConfig; onConfigure: () => void }) {
  const [, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = useMemo(() => {
    if (!config.birthDate) return null;
    if (config.targetType === "age") {
      const d = new Date(config.birthDate);
      d.setFullYear(d.getFullYear() + config.targetValue);
      return d;
    }
    const d = new Date(config.baseDate || new Date().toISOString());
    d.setFullYear(d.getFullYear() + config.targetValue);
    return d;
  }, [config]);

  const delta = target ? getDelta(target) : { d: 0, h: 0, m: 0, s: 0, ms: 0 };
  const urg = target ? urgencyOf(delta.ms) : "calm";

  return (
    <div
      className="relative overflow-hidden rounded-[28px] p-6 pb-14 text-center shadow-lg sm:p-8 sm:pb-16 md:p-10 md:pb-20"
      style={{ background: "linear-gradient(160deg, #11131F 0%, #262A47 55%, #3D3463 100%)" }}
    >
      {/* cielo nocturno */}
      <div className="pointer-events-none absolute inset-0">
        {STARS.map((s, i) => (
          <span key={i} className="absolute rounded-full bg-white" style={{ top: s.top, left: s.left, width: s.size, height: s.size, opacity: s.opacity }} />
        ))}
        <div
          className="absolute -right-6 top-4 h-28 w-28 rounded-full motion-safe:animate-pulse"
          style={{ background: "radial-gradient(circle, rgba(242,166,90,0.55) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 text-left">
        <div>
          <p className="font-serif text-xs italic text-[#F6E7C9]/60">Panel de embarque</p>
          <h2 className="font-serif text-xl text-[#F6E7C9] sm:text-2xl md:text-3xl">
            {config.targetType === "age" ? `Destino: ${config.targetValue} años` : `Destino: en ${config.targetValue} años`}
          </h2>
        </div>
        <button onClick={onConfigure} className="rounded-full p-2 text-[#F6E7C9]/50 transition hover:bg-white/10 hover:text-[#F6E7C9]" title="Configurar destino">
          <Settings2 className="h-5 w-5" />
        </button>
      </div>

      {!target ? (
        <div className="relative z-10 mt-6 text-left">
          <p className="text-sm text-[#F6E7C9]/70">Indica tu fecha de nacimiento para encender el panel.</p>
          <button onClick={onConfigure} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F2A65A] px-5 py-2.5 text-sm font-medium text-[#1B1D2E] shadow hover:bg-[#f7b273]">
            <Settings2 className="h-4 w-4" /> Configurar destino
          </button>
        </div>
      ) : (
        <>
          <div className="relative z-10 mt-5 flex items-center justify-center gap-1.5 text-[11px]">
            {urg === "urgent" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />}
            <span className={cn("font-mono font-semibold uppercase tracking-[0.25em]", STATUS_COLOR_DARK[urg])}>{STATUS_WORD[urg]}</span>
          </div>
          <div className="relative z-10 mt-4 flex items-end justify-center gap-1.5 sm:gap-3 md:gap-5">
            <ClockUnit value={pad(delta.d, 4)} label="días" />
            <span className="mb-4 font-mono text-2xl font-bold text-[#F6E7C9]/30 sm:text-4xl md:mb-6">:</span>
            <ClockUnit value={pad(delta.h)} label="horas" />
            <span className="mb-4 font-mono text-2xl font-bold text-[#F6E7C9]/30 sm:text-4xl md:mb-6">:</span>
            <ClockUnit value={pad(delta.m)} label="min" />
            <span className="mb-4 font-mono text-2xl font-bold text-[#F6E7C9]/30 sm:text-4xl md:mb-6">:</span>
            <ClockUnit value={pad(delta.s)} label="seg" />
          </div>
          {delta.ms === 0 && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-[#11131F]/90 backdrop-blur-xl">
              <div className="text-center">
                <PartyPopper className="mx-auto h-10 w-10 animate-bounce text-amber-300" />
                <p className="mt-3 font-serif text-xl text-[#F6E7C9]">Has llegado a tu destino</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* cordillera en el horizonte */}
      <svg viewBox="0 0 400 48" preserveAspectRatio="none" className="pointer-events-none absolute bottom-0 left-0 h-12 w-full sm:h-14">
        <path
          d="M0,48 L0,30 L28,14 L52,26 L82,6 L108,22 L140,10 L168,28 L196,16 L224,30 L252,12 L284,24 L312,8 L344,26 L372,14 L400,24 L400,48 Z"
          fill="#0D0E18"
        />
      </svg>
    </div>
  );
}

/* ---------- Modal de configuración del mega contador ---------- */
function ConfigModal({ initial, onClose, onSave }: { initial: DreamsConfig; onClose: () => void; onSave: (c: DreamsConfig) => void }) {
  const [draft, setDraft] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="font-serif text-xs italic text-muted-foreground">Configuración</p>
        <h3 className="mt-1 text-xl font-bold">Destino de vida</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tu fecha de nacimiento</label>
            <input type="date" value={draft.birthDate} onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })}
              className="w-full rounded-xl border bg-muted px-4 py-3 text-sm outline-none focus:border-primary/60" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">¿Cómo calculamos la meta?</label>
            <div className="flex gap-2">
              <button onClick={() => setDraft({ ...draft, targetType: "age" })} className={cn("flex-1 rounded-xl border py-2 text-xs font-medium transition", draft.targetType === "age" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>Por edad</button>
              <button onClick={() => setDraft({ ...draft, targetType: "years" })} className={cn("flex-1 rounded-xl border py-2 text-xs font-medium transition", draft.targetType === "years" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>Por años</button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {draft.targetType === "age" ? "Edad de destino (ej: 25)" : "Años a partir de hoy (ej: 4)"}
            </label>
            <input type="number" value={draft.targetValue} onChange={(e) => setDraft({ ...draft, targetValue: Number(e.target.value) })}
              className="w-full rounded-xl border bg-muted px-4 py-3 text-xl font-bold font-mono outline-none focus:border-primary/60" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
          <button
            onClick={() => { onSave({ ...draft, baseDate: draft.baseDate || new Date().toISOString() }); onClose(); }}
            disabled={!draft.birthDate || !draft.targetValue}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Modal de alta/edición de un sueño ---------- */
function DreamModal({ editing, onClose, onCreate, onUpdate }: {
  editing?: Dream | null; onClose: () => void; onCreate: (d: Partial<Dream> & { title: string }) => void; onUpdate: (id: string, patch: Partial<Dream>) => void;
}) {
  const isEdit = !!editing;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [why, setWhy] = useState(editing?.why ?? "");
  const [deadline, setDeadline] = useState(editing?.deadline ? editing.deadline.slice(0, 10) : "");
  const [image, setImage] = useState<string | undefined>(editing?.image);
  const [color, setColor] = useState<string>(editing?.color ?? PRESET_COLORS[0]);

  const handleFile = (f: File) => {
    const r = new FileReader();
    r.onload = () => setImage(String(r.result));
    r.readAsDataURL(f);
  };

  const submit = () => {
    if (!title || !deadline) return;
    if (isEdit && editing) {
      onUpdate(editing.id, { title, why, deadline: new Date(deadline).toISOString(), image, color });
    } else {
      onCreate({ title, why, deadline: new Date(deadline).toISOString(), image, color });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-serif text-xs italic text-muted-foreground">{isEdit ? "Editar" : "Nuevo"} sueño</p>
        <h3 className="mt-1 text-2xl font-bold">{isEdit ? "Refinar sueño" : "Un nuevo sueño"}</h3>

        <div className="mt-4 space-y-3">
          <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border bg-muted px-4 py-3 text-base outline-none focus:border-primary/60" />
          <textarea placeholder="Descripción / por qué de este sueño" value={why} onChange={(e) => setWhy(e.target.value)} rows={3}
            className="w-full rounded-xl border bg-muted px-4 py-3 text-sm outline-none focus:border-primary/60" />
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-xl border bg-muted px-4 py-3 text-sm outline-none focus:border-primary/60" />

          <div>
            <label className="text-xs font-medium text-muted-foreground">Color</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={cn("h-7 w-7 rounded-full border-2 transition-all", color === c ? "scale-110" : "border-transparent opacity-80 hover:opacity-100")}
                  style={{ backgroundColor: c, borderColor: color === c ? c : "transparent" }} />
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
            <ImageIcon className="h-4 w-4" />
            {image ? "Imagen lista (clic para cambiar)" : "Subir foto del sueño (opcional)"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
          {image && (
            <button onClick={() => setImage(undefined)} className="text-xs text-muted-foreground underline hover:text-foreground">Quitar imagen</button>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
          <button onClick={submit} disabled={!title || !deadline}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> {isEdit ? "Guardar" : "Crear"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- Billete de embarque de un sueño ---------- */
function DreamBox({
  dream, linkedProjects, onEdit, onDelete, onOpenProject, highlighted,
}: {
  dream: Dream; linkedProjects: Project[]; onEdit: () => void; onDelete: () => void; onOpenProject: (id: string) => void; highlighted?: boolean;
}) {
  const color = dream.color ?? "#6366f1";
  return (
    <motion.article
      whileHover={{ y: -3 }}
      className={cn(
        "group relative flex overflow-hidden rounded-2xl bg-card shadow-sm transition-shadow",
        highlighted && "ring-2 ring-primary shadow-lg",
      )}
    >
      {/* Talón principal */}
      <div className="min-w-0 flex-1 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-serif text-xs italic text-muted-foreground">Destino</p>
            <h3 className="truncate font-serif text-xl text-foreground sm:text-2xl">{dream.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button onClick={onEdit} className="rounded-full p-1.5 text-foreground/60 hover:bg-muted hover:text-foreground"><Pencil className="h-4 w-4" /></button>
            <button onClick={onDelete} className="rounded-full p-1.5 text-foreground/60 hover:bg-muted hover:text-foreground"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
        {dream.why && (
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/80">{dream.why}</p>
        )}

        {linkedProjects.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
            <FolderKanban className="h-3 w-3 shrink-0 text-muted-foreground" />
            {linkedProjects.map(p => (
              <button
                key={p.id}
                onClick={() => onOpenProject(p.id)}
                className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium transition hover:border-primary/50 hover:text-primary"
              >
                {p.title}
                <span className="text-muted-foreground">· {PROJECT_STATUS_LABEL[p.status]}</span>
              </button>
            ))}
          </div>
        )}
        {linkedProjects.length === 0 && (
          <p className="mt-3 border-t pt-3 text-[11px] text-muted-foreground/70">Sin escalas todavía — asigna este sueño desde un proyecto.</p>
        )}
      </div>

      {/* Perforación del billete */}
      <div className="relative w-px shrink-0 self-stretch bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_5px,hsl(var(--border))_5px,hsl(var(--border))_10px)]">
        <span className="absolute -top-2.5 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-background" />
        <span className="absolute -bottom-2.5 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-background" />
      </div>

      {/* Resguardo: medallón + ETA */}
      <div
        className="flex w-32 shrink-0 flex-col items-center justify-center gap-2.5 p-4 text-center sm:w-36"
        style={{ background: `linear-gradient(165deg, ${color}26, ${color}08)` }}
      >
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 bg-muted shadow-sm sm:h-16 sm:w-16" style={{ borderColor: color }}>
          {dream.image ? (
            <img src={dream.image} alt={dream.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: `${color}1a` }}>
              <Mountain className="h-6 w-6" style={{ color }} />
            </div>
          )}
        </div>
        <EtaStub deadline={dream.deadline} />
      </div>
    </motion.article>
  );
}

/* ---------- Panel principal ---------- */
export function SuenosPanel({
  onOpenProject, focusDreamId, onFocusHandled,
}: { onOpenProject: (id: string) => void; focusDreamId?: string | null; onFocusHandled?: () => void }) {
  const { dreams, addDream, updateDream, delDream, dreamsConfig, updateDreamsConfig, projects, projectsByDreamId } = useCerebro();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Dream | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!focusDreamId) return;
    const el = refs.current[focusDreamId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(focusDreamId);
    const t = setTimeout(() => { setHighlightId(null); onFocusHandled?.(); }, 2200);
    return () => clearTimeout(t);
  }, [focusDreamId, onFocusHandled]);

  const linkedByDream = useMemo(() => {
    const m = new Map<string, Project[]>();
    dreams.forEach(d => m.set(d.id, projectsByDreamId(d.id)));
    return m;
  }, [dreams, projects, projectsByDreamId]);

  return (
    <div className="space-y-6">
      <MegaContador config={dreamsConfig} onConfigure={() => setConfigOpen(true)} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mountain className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Sueños</h2>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nuevo sueño
        </button>
      </div>

      {dreams.length === 0 ? (
        <Empty msg="Todavía no has creado ningún sueño." />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {dreams.map(d => (
            <div key={d.id} ref={(el) => { refs.current[d.id] = el; }}>
              <DreamBox
                dream={d}
                linkedProjects={linkedByDream.get(d.id) ?? []}
                onEdit={() => { setEditing(d); setModalOpen(true); }}
                onDelete={() => delDream(d.id)}
                onOpenProject={onOpenProject}
                highlighted={highlightId === d.id}
              />
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <DreamModal
          editing={editing}
          onClose={() => setModalOpen(false)}
          onCreate={(partial) => addDream(partial)}
          onUpdate={(id, patch) => updateDream(id, patch)}
        />
      )}
      {configOpen && (
        <ConfigModal initial={dreamsConfig} onClose={() => setConfigOpen(false)} onSave={updateDreamsConfig} />
      )}
    </div>
  );
}
