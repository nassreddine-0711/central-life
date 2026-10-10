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
   Sueños (antes "Visión Actual" del Roadmap): cajas grandes,
   sin jerarquía de objetivos/hitos. Cada caja muestra arriba el
   sueño (foto + título + descripción + contador) y abajo los
   proyectos que el usuario haya asignado a ese sueño desde el
   propio proyecto.
============================================================ */

const PRESET_COLORS = ["#3b82f6", "#eab308", "#22c55e", "#ef4444", "#a855f7", "#ec4899", "#f97316", "#14b8a6"];

/* ---------- Countdown helpers (mismo criterio que antes en Roadmap) ---------- */
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
  focus: "text-amber-600 dark:text-amber-300",
  urgent: "text-amber-500 dark:text-amber-200 animate-pulse",
  done: "text-emerald-600 dark:text-emerald-300",
};
function pad(n: number, len = 2) { return String(n).padStart(len, "0"); }

function GoalCountdown({ deadline }: { deadline: string }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const d = getDelta(new Date(deadline));
  const urg = urgencyOf(d.ms);
  if (urg === "done") return <span className={cn("font-mono text-sm font-semibold", urgencyClass[urg])}>completado</span>;
  return (
    <span className={cn("font-mono text-base tabular-nums font-semibold", urgencyClass[urg])}>
      {d.d}d {pad(d.h)}:{pad(d.m)}:{pad(d.s)}
    </span>
  );
}

/* ---------- Mega contador (encima de todos los sueños) ---------- */
function Digit({ value }: { value: string }) {
  return (
    <span className="relative inline-block overflow-hidden font-mono text-3xl sm:text-5xl md:text-7xl font-bold tabular-nums leading-none">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "-60%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "60%", opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="inline-block"
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
      <div className="flex">{value.split("").map((ch, i) => <Digit key={i + "_" + ch} value={ch} />)}</div>
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
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
    <div className="relative overflow-hidden rounded-3xl border bg-card p-5 sm:p-8 md:p-10 text-center shadow-sm">
      <h2 className="flex items-center justify-center gap-3 text-xl md:text-3xl font-bold text-foreground">
        {config.targetType === "age" ? `Destino · ${config.targetValue} años` : `Destino · En ${config.targetValue} años`}
        <button onClick={onConfigure} className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" title="Configurar destino">
          <Settings2 className="h-5 w-5" />
        </button>
      </h2>

      {!target ? (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">Configura tu fecha de nacimiento para encender el contador.</p>
          <button onClick={onConfigure} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
            <Settings2 className="h-4 w-4" /> Configurar destino
          </button>
        </div>
      ) : (
        <>
          <div className={cn("mt-6 flex items-end justify-center gap-1.5 sm:gap-3 md:gap-5", urgencyClass[urg])}>
            <ClockUnit value={pad(delta.d, 4)} label="Días" />
            <span className="mb-4 font-mono text-2xl sm:text-4xl font-bold text-muted-foreground/60 md:mb-6">:</span>
            <ClockUnit value={pad(delta.h)} label="Horas" />
            <span className="mb-4 font-mono text-2xl sm:text-4xl font-bold text-muted-foreground/60 md:mb-6">:</span>
            <ClockUnit value={pad(delta.m)} label="Min" />
            <span className="mb-4 font-mono text-2xl sm:text-4xl font-bold text-muted-foreground/60 md:mb-6">:</span>
            <ClockUnit value={pad(delta.s)} label="Seg" />
          </div>
          {delta.ms === 0 && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-background/85 backdrop-blur-xl">
              <div className="text-center">
                <PartyPopper className="mx-auto h-10 w-10 animate-bounce text-amber-400" />
                <p className="mt-3 text-xl font-bold">¡Destino alcanzado!</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Modal de configuración del mega contador ---------- */
function ConfigModal({ initial, onClose, onSave }: { initial: DreamsConfig; onClose: () => void; onSave: (c: DreamsConfig) => void }) {
  const [draft, setDraft] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Configuración</p>
        <h3 className="mt-1 text-xl font-bold">Destino de vida</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tu fecha de nacimiento</label>
            <input type="date" value={draft.birthDate} onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })}
              className="w-full rounded-xl border bg-muted px-4 py-3 text-sm outline-none focus:border-primary/60" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">¿Cómo calculamos la meta?</label>
            <div className="flex gap-2">
              <button onClick={() => setDraft({ ...draft, targetType: "age" })} className={cn("flex-1 rounded-xl border py-2 text-xs font-mono uppercase tracking-widest transition", draft.targetType === "age" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>Por edad</button>
              <button onClick={() => setDraft({ ...draft, targetType: "years" })} className={cn("flex-1 rounded-xl border py-2 text-xs font-mono uppercase tracking-widest transition", draft.targetType === "years" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>Por años</button>
            </div>
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
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
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{isEdit ? "Editar" : "Nuevo"} sueño</p>
        <h3 className="mt-1 text-2xl font-bold">{isEdit ? "Refinar sueño" : "Un nuevo sueño"}</h3>

        <div className="mt-4 space-y-3">
          <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border bg-muted px-4 py-3 text-base outline-none focus:border-primary/60" />
          <textarea placeholder="Descripción / por qué de este sueño" value={why} onChange={(e) => setWhy(e.target.value)} rows={3}
            className="w-full rounded-xl border bg-muted px-4 py-3 text-sm outline-none focus:border-primary/60" />
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-xl border bg-muted px-4 py-3 text-sm outline-none focus:border-primary/60" />

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Color</label>
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

/* ---------- Caja grande de un sueño, dividida en dos ---------- */
function DreamBox({
  dream, linkedProjects, onEdit, onDelete, onOpenProject, highlighted,
}: {
  dream: Dream; linkedProjects: Project[]; onEdit: () => void; onDelete: () => void; onOpenProject: (id: string) => void; highlighted?: boolean;
}) {
  return (
    <motion.article
      whileHover={{ y: -3 }}
      className={cn(
        "group relative flex min-h-[420px] flex-col overflow-hidden rounded-3xl border bg-card shadow-sm transition-shadow",
        highlighted && "ring-2 ring-primary shadow-lg",
      )}
      style={{ borderLeftColor: dream.color, borderLeftWidth: "5px" }}
    >
      {/* Mitad superior: el sueño */}
      <div className="relative flex-1">
        {dream.image ? (
          <div className="relative h-56 w-full overflow-hidden bg-muted sm:h-64">
            <img src={dream.image} alt={dream.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] backdrop-blur" style={{ color: dream.color }}>
              <Mountain className="h-3 w-3" /> Sueño
            </span>
            <div className="absolute right-4 top-4 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
              <button onClick={onEdit} className="rounded-full bg-background/80 p-2 text-foreground/80 backdrop-blur hover:text-foreground"><Pencil className="h-4 w-4" /></button>
              <button onClick={onDelete} className="rounded-full bg-background/80 p-2 text-foreground/80 backdrop-blur hover:text-foreground"><Trash2 className="h-4 w-4" /></button>
            </div>
            <h3 className="absolute bottom-3 left-4 right-4 text-2xl font-bold text-white drop-shadow sm:text-3xl">{dream.title}</h3>
          </div>
        ) : (
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: dream.color }}>
                <Mountain className="h-3 w-3" /> Sueño
              </span>
              <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                <button onClick={onEdit} className="text-foreground/70 hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                <button onClick={onDelete} className="text-foreground/70 hover:text-foreground"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <h3 className="mt-3 text-2xl font-bold sm:text-3xl">{dream.title}</h3>
          </div>
        )}

        <div className="p-6 pt-4">
          <GoalCountdown deadline={dream.deadline} />
          {dream.why && (
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">{dream.why}</p>
          )}
        </div>
      </div>

      {/* Mitad inferior: proyectos asignados a este sueño */}
      <div className="border-t bg-muted/30 p-5">
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <FolderKanban className="h-3.5 w-3.5" /> Proyectos de este sueño · {linkedProjects.length}
        </p>
        {linkedProjects.length === 0 ? (
          <p className="text-xs text-muted-foreground">Asigna este sueño desde cualquier proyecto para verlo aquí.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {linkedProjects.map(p => (
              <button
                key={p.id}
                onClick={() => onOpenProject(p.id)}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium transition hover:border-primary/50 hover:text-primary"
              >
                {p.title}
                <span className="text-[10px] text-muted-foreground">· {PROJECT_STATUS_LABEL[p.status]}</span>
              </button>
            ))}
          </div>
        )}
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
