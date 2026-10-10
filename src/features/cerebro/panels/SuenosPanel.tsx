import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Mountain, Plus, Pencil, Trash2, Settings2, ImageIcon, Sparkles, PartyPopper, FolderKanban, Hourglass,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCerebro } from "../CerebroContext";
import { Empty } from "../TaskComponents";
import { Dream, DreamsConfig, Project, PROJECT_STATUS_LABEL } from "../types";

/* ============================================================
   Sueños: un contador técnico arriba (cuenta atrás + progreso hacia
   la meta, con los colores del resto de la web) y debajo una tarjeta
   por sueño: foto grande, título y descripción, y separado por un
   "cajón" más oscuro, los proyectos que forman parte de ese sueño.
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
function pad(n: number, len = 2) { return String(n).padStart(len, "0"); }

function useTick(everyMs = 1000) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(n => n + 1), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
}

/** Etiqueta con los días que faltan para un sueño (sobre la foto). */
function EtaChip({ deadline }: { deadline: string }) {
  useTick(60000);
  const target = new Date(deadline);
  const { d, ms } = getDelta(target);
  const dateLabel = format(target, "d MMM yyyy", { locale: es });
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur">
      {ms === 0 ? (
        <><PartyPopper className="h-3.5 w-3.5 text-emerald-500" /> Cumplido · {dateLabel}</>
      ) : (
        <>
          <Hourglass className={cn("h-3.5 w-3.5", d < 30 ? "text-amber-500" : "text-primary")} />
          <span className="tabular-nums">{d.toLocaleString("es-ES")}</span> días · {dateLabel}
        </>
      )}
    </span>
  );
}

/* ---------- Contador principal ---------- */
function CounterCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-4 sm:py-6">
      <span className="text-3xl font-semibold tabular-nums tracking-tight sm:text-5xl">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function MegaContador({ config, onConfigure }: { config: DreamsConfig; onConfigure: () => void }) {
  useTick(1000);

  const { start, target } = useMemo(() => {
    if (!config.birthDate) return { start: null as Date | null, target: null as Date | null };
    const birth = new Date(config.birthDate);
    if (config.targetType === "age") {
      const t = new Date(birth);
      t.setFullYear(t.getFullYear() + config.targetValue);
      return { start: birth, target: t };
    }
    const base = new Date(config.baseDate || new Date().toISOString());
    const t = new Date(base);
    t.setFullYear(t.getFullYear() + config.targetValue);
    return { start: base, target: t };
  }, [config]);

  const delta = target ? getDelta(target) : null;
  const progress = start && target
    ? Math.max(0, Math.min(1, (Date.now() - start.getTime()) / (target.getTime() - start.getTime())))
    : 0;

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Hourglass className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">
              {config.targetType === "age" ? `Meta: llegar a los ${config.targetValue} años` : `Meta: dentro de ${config.targetValue} años`}
            </h2>
            {target && (
              <p className="text-xs text-muted-foreground">{format(target, "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
            )}
          </div>
        </div>
        <button
          onClick={onConfigure}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title="Configurar meta"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </header>

      {!target || !delta ? (
        <div className="flex flex-col items-start gap-3 p-5">
          <p className="text-sm text-muted-foreground">Indica tu fecha de nacimiento para activar la cuenta atrás.</p>
          <button
            onClick={onConfigure}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Settings2 className="h-4 w-4" /> Configurar
          </button>
        </div>
      ) : delta.ms === 0 ? (
        <div className="flex items-center justify-center gap-3 p-8 text-emerald-600 dark:text-emerald-400">
          <PartyPopper className="h-6 w-6" />
          <p className="text-lg font-semibold">Meta alcanzada</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 divide-x">
            <CounterCell value={delta.d.toLocaleString("es-ES")} label="días" />
            <CounterCell value={pad(delta.h)} label="horas" />
            <CounterCell value={pad(delta.m)} label="min" />
            <CounterCell value={pad(delta.s)} label="seg" />
          </div>
          <div className="space-y-1.5 border-t px-5 py-3.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{(progress * 100).toFixed(1)}% del camino recorrido</span>
              <span>{config.targetType === "age" ? "Nacimiento" : "Inicio"} → meta</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/* ---------- Modal de configuración del contador ---------- */
function ConfigModal({ initial, onClose, onSave }: { initial: DreamsConfig; onClose: () => void; onSave: (c: DreamsConfig) => void }) {
  const [draft, setDraft] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold">Meta de vida</h3>
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
              {draft.targetType === "age" ? "Edad de la meta (ej: 25)" : "Años a partir de hoy (ej: 4)"}
            </label>
            <input type="number" value={draft.targetValue} onChange={(e) => setDraft({ ...draft, targetValue: Number(e.target.value) })}
              className="w-full rounded-xl border bg-muted px-4 py-3 text-xl font-bold outline-none focus:border-primary/60" />
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
        <h3 className="text-2xl font-bold">{isEdit ? "Editar sueño" : "Nuevo sueño"}</h3>

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

/* ---------- Tarjeta de un sueño: foto grande + descripción, y cajón de proyectos ---------- */
function DreamBox({
  dream, linkedProjects, onEdit, onDelete, onOpenProject, highlighted,
}: {
  dream: Dream; linkedProjects: Project[]; onEdit: () => void; onDelete: () => void; onOpenProject: (id: string) => void; highlighted?: boolean;
}) {
  const color = dream.color ?? "#6366f1";
  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        highlighted && "ring-2 ring-primary shadow-lg",
      )}
    >
      {/* Parte del sueño: foto grande + título + descripción */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        {dream.image ? (
          <img src={dream.image} alt={dream.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: `${color}22` }}>
            <Mountain className="h-14 w-14" style={{ color }} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/50 to-transparent p-3 pt-10">
          <EtaChip deadline={dream.deadline} />
        </div>
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button onClick={onEdit} title="Editar" className="rounded-full bg-background/90 p-1.5 text-foreground shadow-sm backdrop-blur hover:bg-background"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} title="Eliminar" className="rounded-full bg-background/90 p-1.5 text-foreground shadow-sm backdrop-blur hover:bg-background"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="flex-1 space-y-2 p-5">
        <h3 className="flex items-center gap-2 text-xl font-semibold leading-tight">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          {dream.title}
        </h3>
        {dream.why ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{dream.why}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground/60">Sin descripción todavía.</p>
        )}
      </div>

      {/* Cajón de proyectos: bloque separado y más oscuro */}
      <div className="border-t-2 bg-muted/70 p-4">
        <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
          <FolderKanban className="h-3.5 w-3.5" />
          Proyectos de este sueño
          <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{linkedProjects.length}</span>
        </div>
        {linkedProjects.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aún no hay proyectos. Asigna este sueño desde el resumen de un proyecto.</p>
        ) : (
          <div className="grid gap-1.5">
            {linkedProjects.map(p => (
              <button
                key={p.id}
                onClick={() => onOpenProject(p.id)}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-left text-sm shadow-sm transition hover:border-primary/50"
              >
                <span className="min-w-0 truncate font-medium">{p.title}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{PROJECT_STATUS_LABEL[p.status]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
