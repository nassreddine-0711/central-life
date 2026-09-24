import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Pencil, Check, X, Eraser, Palette, CalendarDays, Copy, Settings2, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/* ---------- Types ---------- */
interface RoutineCategory {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface RoutineVersion {
  id: string;
  name: string;
  /** Map "day-slot" → categoryId  (day: 0=Lun..6=Dom, slot: 0..47, cada slot = 30 min; slot 0 = 00:00–00:30) */
  blocks: Record<string, string>;
}

/** Horas (0-23) en las que empieza cada franja del día. "Mañana" siempre empieza a las 00:00. */
interface PeriodBoundaries {
  middayStart: number;
  afternoonStart: number;
  nightStart: number;
}

interface RoutinesState {
  versions: RoutineVersion[];
  categories: RoutineCategory[];
  currentId: string;
  periodBoundaries?: PeriodBoundaries;
  showLabelsAlways?: boolean;
  schemaVersion?: number;
}

/* ---------- Constants ---------- */
const STORAGE_KEY = "cerebro.routines.v1";
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;
const DAYS_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
/** 48 slots de media hora: slot 0 = 00:00, slot 1 = 00:30 … slot 47 = 23:30 */
const SLOTS = Array.from({ length: 48 }, (_, i) => i);
const DEFAULT_PERIODS: PeriodBoundaries = { middayStart: 12, afternoonStart: 14, nightStart: 21 };
const PERIOD_LABELS: { key: keyof PeriodBoundaries; label: string }[] = [
  { key: "middayStart", label: "Mediodía desde" },
  { key: "afternoonStart", label: "Tarde desde" },
  { key: "nightStart", label: "Noche desde" },
];
const slotLabel = (slot: number) => {
  const hour = Math.floor(slot / 2);
  const minute = slot % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
};
/** Si este slot es el inicio de una franja del día, devuelve su nombre para la línea divisoria. */
function periodNameForBoundary(slot: number, b: PeriodBoundaries): string | undefined {
  if (slot === b.middayStart * 2) return "Mediodía";
  if (slot === b.afternoonStart * 2) return "Tarde";
  if (slot === b.nightStart * 2) return "Noche";
  return undefined;
}
const PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#64748b",
];

const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- Default Seed ---------- */
function defaultState(): RoutinesState {
  const versionId = uid();
  return {
    versions: [{ id: versionId, name: "Rutina por defecto", blocks: {} }],
    categories: [
      { id: uid(), name: "Universidad", color: "#3b82f6", description: "Clases, estudio y trabajos académicos." },
      { id: uid(), name: "Entrenamiento", color: "#22c55e", description: "Gimnasio, cardio o deporte." },
      { id: uid(), name: "Descanso", color: "#a855f7", description: "Sueño, siestas o relax profundo." },
    ],
    currentId: versionId,
    periodBoundaries: { ...DEFAULT_PERIODS },
    showLabelsAlways: false,
    schemaVersion: 2,
  };
}

/** Migra bloques del formato antiguo "day-hour" (0-23, una celda por hora) al nuevo
 *  "day-slot" (0-47, media hora), duplicando cada hora pintada en sus dos mitades. */
function migrateHourlyBlocks(blocks: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(blocks).forEach(([key, catId]) => {
    const [dayStr, hourStr] = key.split("-");
    const hour = Number(hourStr);
    const day = Number(dayStr);
    if (Number.isNaN(hour) || Number.isNaN(day)) return;
    const base = hour * 2;
    out[`${day}-${base}`] = catId;
    out[`${day}-${base + 1}`] = catId;
  });
  return out;
}

function loadState(): RoutinesState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as RoutinesState;
    if (!parsed.versions?.length) return defaultState();
    if (!parsed.versions.find((v) => v.id === parsed.currentId)) {
      parsed.currentId = parsed.versions[0].id;
    }
    if (!parsed.periodBoundaries) parsed.periodBoundaries = { ...DEFAULT_PERIODS };
    if (parsed.showLabelsAlways === undefined) parsed.showLabelsAlways = false;
    if ((parsed.schemaVersion ?? 1) < 2) {
      parsed.versions = parsed.versions.map((v) => ({ ...v, blocks: migrateHourlyBlocks(v.blocks) }));
      parsed.schemaVersion = 2;
    }
    return parsed;
  } catch {
    return defaultState();
  }
}

/* ============================================================
   Main panel
============================================================ */
export function RutinasPanel() {
  const [state, setState] = useState<RoutinesState>(() => loadState());
  const [paintCategoryId, setPaintCategoryId] = useState<string | null>(null);
  const [erasing, setErasing] = useState(false);
  const [isPainting, setIsPainting] = useState(false);

  // dialogs
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [editingCat, setEditingCat] = useState<RoutineCategory | null>(null);
  const [catDialogOpen, setCatDialogOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* */ }
  }, [state]);

  const currentVersion = useMemo(
    () => state.versions.find((v) => v.id === state.currentId) ?? state.versions[0],
    [state.versions, state.currentId],
  );

  const setVersion = (updater: (v: RoutineVersion) => RoutineVersion) => {
    setState((s) => ({
      ...s,
      versions: s.versions.map((v) => (v.id === s.currentId ? updater(v) : v)),
    }));
  };

  /* ---------- Version CRUD ---------- */
  const onCreateVersion = (duplicate = false) => {
    const name = versionName.trim();
    if (!name) return;
    const id = uid();
    const blocks = duplicate ? { ...currentVersion.blocks } : {};
    setState((s) => ({
      ...s,
      versions: [...s.versions, { id, name, blocks }],
      currentId: id,
    }));
    setVersionName("");
    setVersionDialogOpen(false);
  };

  const onDeleteVersion = () => {
    if (state.versions.length <= 1) return;
    if (!confirm(`¿Eliminar la rutina "${currentVersion.name}"?`)) return;
    setState((s) => {
      const remaining = s.versions.filter((v) => v.id !== s.currentId);
      return { ...s, versions: remaining, currentId: remaining[0].id };
    });
  };

  /* ---------- Category CRUD ---------- */
  const openNewCategory = () => {
    setEditingCat({ id: "", name: "", color: PALETTE[0], description: "" });
    setCatDialogOpen(true);
  };
  const openEditCategory = (c: RoutineCategory) => {
    setEditingCat({ ...c });
    setCatDialogOpen(true);
  };
  const saveCategory = () => {
    if (!editingCat || !editingCat.name.trim()) return;
    setState((s) => {
      if (editingCat.id) {
        return {
          ...s,
          categories: s.categories.map((c) => (c.id === editingCat.id ? { ...editingCat, name: editingCat.name.trim() } : c)),
        };
      }
      return {
        ...s,
        categories: [...s.categories, { ...editingCat, id: uid(), name: editingCat.name.trim() }],
      };
    });
    setCatDialogOpen(false);
    setEditingCat(null);
  };
  const deleteCategory = (id: string) => {
    if (!confirm("¿Eliminar esta categoría? Las celdas que la usen quedarán vacías.")) return;
    setState((s) => ({
      ...s,
      categories: s.categories.filter((c) => c.id !== id),
      versions: s.versions.map((v) => {
        const blocks: Record<string, string> = {};
        Object.entries(v.blocks).forEach(([k, cid]) => {
          if (cid !== id) blocks[k] = cid;
        });
        return { ...v, blocks };
      }),
    }));
    if (paintCategoryId === id) setPaintCategoryId(null);
  };

  /* ---------- Cell interaction ---------- */
  const applyCell = useCallback((day: number, slot: number) => {
    const key = `${day}-${slot}`;
    if (erasing) {
      setVersion((v) => {
        const { [key]: _, ...rest } = v.blocks;
        return { ...v, blocks: rest };
      });
      return;
    }
    if (!paintCategoryId) return;
    setVersion((v) => {
      // toggle off if same category
      if (v.blocks[key] === paintCategoryId) {
        const { [key]: _, ...rest } = v.blocks;
        return { ...v, blocks: rest };
      }
      return { ...v, blocks: { ...v.blocks, [key]: paintCategoryId } };
    });
  }, [paintCategoryId, erasing]); // setVersion is stable enough via setState

  const onCellMouseDown = (day: number, slot: number) => {
    setIsPainting(true);
    applyCell(day, slot);
  };
  const onCellMouseEnter = (day: number, slot: number) => {
    if (isPainting) applyCell(day, slot);
  };

  useEffect(() => {
    const stop = () => setIsPainting(false);
    window.addEventListener("mouseup", stop);
    window.addEventListener("mouseleave", stop);
    return () => {
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("mouseleave", stop);
    };
  }, []);

  const clearAll = () => {
    if (!confirm("¿Vaciar todas las celdas de esta rutina?")) return;
    setVersion((v) => ({ ...v, blocks: {} }));
  };

  const catById = (id: string) => state.categories.find((c) => c.id === id);
  const totalBlocks = Object.keys(currentVersion.blocks).length;

  /* ============================================================
     Render
  ============================================================ */
  return (
    <div className="space-y-5">
      {/* ---------- Top Bar ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <CalendarDays className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Gestor de Rutinas Semanales</h2>
            <p className="text-xs text-muted-foreground">
              Time-blocking con múltiples versiones · {totalBlocks} bloques asignados
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={state.currentId} onValueChange={(v) => setState((s) => ({ ...s, currentId: v }))}>
            <SelectTrigger className="h-9 min-w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {state.versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { setVersionName(""); setVersionDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Nueva versión
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={onDeleteVersion}
            disabled={state.versions.length <= 1}
            className="text-rose-500 hover:text-rose-500"
          >
            <Trash2 className="h-4 w-4" /> Borrar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* ---------- Grid ---------- */}
        <div className="rounded-2xl border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          {/* Toolbar inside grid */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {paintCategoryId ? (
                <>
                  <span
                    className="h-3 w-3 rounded-sm border border-border"
                    style={{ background: catById(paintCategoryId)?.color }}
                  />
                  <span>
                    Pintando con <span className="font-medium text-foreground">{catById(paintCategoryId)?.name}</span>
                  </span>
                </>
              ) : erasing ? (
                <span className="font-medium text-foreground">Modo borrador activo</span>
              ) : (
                <span>Selecciona una categoría de la leyenda para pintar</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm" variant={erasing ? "default" : "outline"}
                onClick={() => { setErasing((e) => !e); setPaintCategoryId(null); }}
                className="h-7"
              >
                <Eraser className="h-3.5 w-3.5" /> Borrador
              </Button>
              <Button size="sm" variant="ghost" onClick={clearAll} className="h-7 text-muted-foreground">
                <X className="h-3.5 w-3.5" /> Vaciar
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7">
                    <Settings2 className="h-3.5 w-3.5" /> Ajustes
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Mostrar nombre siempre</span>
                    </div>
                    <Switch
                      checked={!!state.showLabelsAlways}
                      onCheckedChange={(v) => setState((s) => ({ ...s, showLabelsAlways: v }))}
                    />
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Con esto activado, el nombre de la categoría se ve siempre en cada celda,
                    no solo al pasar el ratón.
                  </p>
                  <div className="border-t border-border/60 pt-3">
                    <p className="mb-2 text-xs font-medium text-foreground">Franjas del día</p>
                    <div className="space-y-2">
                      {PERIOD_LABELS.map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{label}</span>
                          <Select
                            value={String((state.periodBoundaries ?? DEFAULT_PERIODS)[key])}
                            onValueChange={(v) =>
                              setState((s) => ({
                                ...s,
                                periodBoundaries: { ...(s.periodBoundaries ?? DEFAULT_PERIODS), [key]: Number(v) },
                              }))
                            }
                          >
                            <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => i).map((hh) => (
                                <SelectItem key={hh} value={String(hh)}>{hh.toString().padStart(2, "0")}:00</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      La mañana siempre empieza a las 00:00. Estas líneas solo son una guía visual.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-auto">
            <div
              className="grid select-none"
              style={{
                gridTemplateColumns: "60px repeat(7, minmax(64px, 1fr))",
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* Header row */}
              <div className="sticky top-0 z-20 border-b border-r border-border/60 bg-card/95 px-2 py-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground backdrop-blur">
                Hora
              </div>
              {DAYS.map((d, i) => (
                <div
                  key={d}
                  className="sticky top-0 z-20 border-b border-border/60 bg-card/95 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-widest backdrop-blur"
                  title={DAYS_FULL[i]}
                >
                  {d}
                </div>
              ))}

              {/* Body */}
              {SLOTS.map((slot) => (
                <FragmentRow
                  key={slot}
                  slot={slot}
                  blocks={currentVersion.blocks}
                  catById={catById}
                  onMouseDown={onCellMouseDown}
                  onMouseEnter={onCellMouseEnter}
                  boundaryLabel={periodNameForBoundary(slot, state.periodBoundaries ?? DEFAULT_PERIODS)}
                  showLabelAlways={!!state.showLabelsAlways}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ---------- Legend ---------- */}
        <aside className="space-y-3 rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Categorías</h3>
            </div>
            <Button size="sm" variant="outline" className="h-7" onClick={openNewCategory}>
              <Plus className="h-3.5 w-3.5" /> Nueva
            </Button>
          </div>

          {state.categories.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              Aún no tienes categorías. Crea la primera para empezar a pintar tu semana.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {state.categories.map((c) => {
                const active = paintCategoryId === c.id;
                return (
                  <li key={c.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "group flex items-center gap-2 rounded-lg border p-2 transition-colors cursor-pointer",
                            active
                              ? "border-primary/60 bg-primary/10 ring-1 ring-primary/40"
                              : "border-border bg-background/40 hover:border-primary/40",
                          )}
                          onClick={() => { setPaintCategoryId((id) => (id === c.id ? null : c.id)); setErasing(false); }}
                        >
                          <span
                            className="h-5 w-5 shrink-0 rounded-md border border-border/60 shadow-inner"
                            style={{ background: c.color }}
                          />
                          <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                          {active && <Check className="h-3.5 w-3.5 text-primary" />}
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); openEditCategory(c); }}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); deleteCategory(c.id); }}
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TooltipTrigger>
                      {c.description && (
                        <TooltipContent side="left" className="max-w-[220px]">
                          <p className="text-xs">{c.description}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Tip:</span> haz clic en una
              categoría para activarla, luego pinta arrastrando sobre las celdas.
              Vuelve a hacer clic en una celda para vaciarla.
            </p>
          </div>
        </aside>
      </div>

      {/* ---------- New Version Dialog ---------- */}
      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva versión de rutina</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="Ej. Rutina de exámenes"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onCreateVersion(false)}
            />
            <p className="text-[11px] text-muted-foreground">
              Puedes empezar en blanco o duplicar la rutina actual como punto de partida.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setVersionDialogOpen(false)}>Cancelar</Button>
            <Button variant="outline" onClick={() => onCreateVersion(true)} disabled={!versionName.trim()}>
              <Copy className="h-4 w-4" /> Duplicar actual
            </Button>
            <Button onClick={() => onCreateVersion(false)} disabled={!versionName.trim()}>
              <Plus className="h-4 w-4" /> Crear vacía
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Category Dialog ---------- */}
      <Dialog open={catDialogOpen} onOpenChange={(o) => { setCatDialogOpen(o); if (!o) setEditingCat(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat?.id ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          {editingCat && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nombre</label>
                <Input
                  autoFocus
                  value={editingCat.name}
                  onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                  placeholder="Ej. Estudio profundo"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Color</label>
                <div className="flex flex-wrap items-center gap-2">
                  {PALETTE.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditingCat({ ...editingCat, color: p })}
                      className={cn(
                        "h-7 w-7 rounded-md border-2 transition",
                        editingCat.color.toLowerCase() === p.toLowerCase()
                          ? "border-foreground ring-2 ring-primary/40"
                          : "border-border hover:scale-110",
                      )}
                      style={{ background: p }}
                      aria-label={`Color ${p}`}
                    />
                  ))}
                  <label className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs">
                    <span className="text-muted-foreground">Custom</span>
                    <input
                      type="color"
                      value={editingCat.color}
                      onChange={(e) => setEditingCat({ ...editingCat, color: e.target.value })}
                      className="h-5 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Descripción (opcional)</label>
                <Textarea
                  rows={3}
                  value={editingCat.description ?? ""}
                  onChange={(e) => setEditingCat({ ...editingCat, description: e.target.value })}
                  placeholder="Qué tipo de actividad pertenece a esta categoría…"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCatDialogOpen(false); setEditingCat(null); }}>Cancelar</Button>
            <Button onClick={saveCategory} disabled={!editingCat?.name.trim()}>
              <Check className="h-4 w-4" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Single half-hour row (extracted to keep render light) ---------- */
function FragmentRow({
  slot, blocks, catById, onMouseDown, onMouseEnter, boundaryLabel, showLabelAlways,
}: {
  slot: number;
  blocks: Record<string, string>;
  catById: (id: string) => RoutineCategory | undefined;
  onMouseDown: (day: number, slot: number) => void;
  onMouseEnter: (day: number, slot: number) => void;
  boundaryLabel?: string;
  showLabelAlways: boolean;
}) {
  const label = slotLabel(slot);
  const isHourMark = slot % 2 === 0;

  return (
    <>
      {boundaryLabel && (
        <div className="col-span-8 flex items-center gap-2 border-t-2 border-dashed border-t-primary/30 bg-primary/[0.03] px-2 py-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-primary/70">{boundaryLabel}</span>
          <span className="h-px flex-1 bg-primary/15" />
        </div>
      )}
      <div
        className={cn(
          "sticky left-0 z-10 border-r border-border/40 bg-card/95 px-2 py-1 font-mono backdrop-blur",
          isHourMark ? "border-b border-b-border/50 text-[10px] text-muted-foreground" : "border-b border-b-border/20 text-[9px] text-muted-foreground/50",
        )}
      >
        {label}
      </div>
      {Array.from({ length: 7 }, (_, day) => {
        const key = `${day}-${slot}`;
        const catId = blocks[key];
        const cat = catId ? catById(catId) : undefined;
        return (
          <div
            key={day}
            onMouseDown={() => onMouseDown(day, slot)}
            onMouseEnter={() => onMouseEnter(day, slot)}
            className={cn(
              "group relative h-7 cursor-pointer border-r border-border/30 transition",
              isHourMark ? "border-b border-b-border/50" : "border-b border-b-border/20",
              !cat && "bg-[repeating-linear-gradient(45deg,transparent_0_4px,hsl(var(--border)/0.25)_4px_5px)] hover:bg-primary/5",
              cat && "hover:brightness-110",
            )}
            style={cat ? { background: cat.color } : undefined}
            title={cat ? `${DAYS_FULL[day]} · ${label} — ${cat.name}` : `${DAYS_FULL[day]} · ${label}`}
          >
            {cat && (
              <span
                className={cn(
                  "pointer-events-none absolute inset-0 items-center justify-center px-0.5 text-center text-[8px] font-semibold uppercase leading-tight tracking-widest text-white/90 mix-blend-overlay",
                  showLabelAlways ? "flex" : "hidden group-hover:flex",
                )}
              >
                {cat.name.slice(0, 10)}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
