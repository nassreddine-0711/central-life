import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, Trash2, Save, Tag, Pencil, Check
} from "lucide-react";
import {
  useFinance, type Category, type CategoryType,
  CATEGORY_ICONS, CATEGORY_COLORS, getCategoryIcon,
} from "./FinanceContext";

const TYPE_LABELS: Record<CategoryType, string> = {
  expense: "Gasto",
  income:  "Ingreso",
  savings: "Ahorro",
  available: "Dinero Disponible",
};

interface DraftCategory {
  id?: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  tags: string[];
  allocation: number;
  budget: number;
  image?: string;
  locked?: boolean;
}

const EMPTY: DraftCategory = {
  name: "", type: "expense", color: CATEGORY_COLORS[0],
  icon: "Sparkles", tags: [], allocation: 0, budget: 0, image: "",
};

export function CategoryManager({ onClose }: { onClose: () => void }) {
  const { categories, addCategory, updateCategory, removeCategory, countTransactionsByCategory } = useFinance();
  const [draft, setDraft] = useState<DraftCategory | null>(null);
  const [tagInput, setTagInput] = useState("");

  const startCreate = () => { setDraft({ ...EMPTY }); setTagInput(""); };
  const startEdit = (c: Category) => {
    setDraft({
      id: c.id, name: c.name, type: c.type, color: c.color,
      icon: c.icon, tags: [...c.tags], allocation: c.allocation,
      budget: c.budget, image: c.image || "", locked: c.locked,
    });
    setTagInput("");
  };

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) return;
    if (draft.id) {
      updateCategory(draft.id, {
        name: draft.name.trim(), type: draft.type, color: draft.color,
        icon: draft.icon, tags: draft.tags, allocation: draft.allocation, budget: draft.budget, image: draft.image,
      });
    } else {
      addCategory({
        name: draft.name.trim(), type: draft.type, color: draft.color,
        icon: draft.icon, tags: draft.tags, allocation: draft.allocation, budget: draft.budget, image: draft.image,
      });
    }
    setDraft(null);
  };

  const tryRemove = (c: Category) => {
    if (c.locked) return;
    const count = countTransactionsByCategory(c.id);
    if (count > 0) {
      const ok = confirm(`"${c.name}" tiene ${count} movimientos. ¿Eliminar de todos modos?`);
      if (!ok) return;
    }
    removeCategory(c.id);
    if (draft?.id === c.id) setDraft(null);
  };

  const addTag = () => {
    const v = tagInput.trim().toLowerCase();
    if (!v || !draft) return;
    if (!draft.tags.includes(v)) setDraft({ ...draft, tags: [...draft.tags, v] });
    setTagInput("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fin fixed inset-0 z-50 grid place-items-center bg-[hsl(var(--fin-bg)/0.85)] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
        className="fin-glass fin-brackets relative w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="fin-mono text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--fin-mute))]">Configurar · Categorías</p>
            <h2 className="fin-mono mt-1 text-xl uppercase tracking-[0.2em] text-[hsl(var(--fin-ink))]">Cajas Personalizadas</h2>
          </div>
          <button onClick={onClose} className="text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-ink))]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid flex-1 grid-cols-1 gap-5 overflow-hidden md:grid-cols-[1fr_1.2fr]">
          <div className="overflow-y-auto pr-2">
            <button
              onClick={startCreate}
              className="fin-mono mb-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[hsl(var(--fin-income)/0.5)] bg-[hsl(var(--fin-income)/0.08)] px-3 py-3 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-income))] hover:bg-[hsl(var(--fin-income)/0.15)]"
            >
              <Plus className="h-3.5 w-3.5" /> Nueva Categoría
            </button>
            <div className="space-y-2">
              {categories.map((c) => {
                const Icon = getCategoryIcon(c.icon);
                const count = countTransactionsByCategory(c.id);
                const active = draft?.id === c.id;
                return (
                  <div
                    key={c.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                      active ? "border-[hsl(var(--fin-income)/0.6)] bg-[hsl(var(--fin-income)/0.06)]" : "border-[hsl(var(--fin-line))] bg-[hsl(var(--fin-input-bg))]"
                    }`}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-md" style={{ background: `hsl(${c.color} / 0.15)`, color: `hsl(${c.color})` }}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[hsl(var(--fin-ink))]">{c.name}</p>
                      <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
                        {TYPE_LABELS[c.type]} · {c.allocation}% · {count} mov
                      </p>
                    </div>
                    <button onClick={() => startEdit(c)} className="text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-ink))]">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => tryRemove(c)} disabled={c.locked} className="text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-expense))] disabled:opacity-35">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-y-auto rounded-xl border border-[hsl(var(--fin-line))] bg-[hsl(var(--fin-input-bg))] p-5">
            {!draft ? (
              <div className="grid h-full place-items-center text-center">
                <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Selecciona una categoría o crea una nueva</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Nombre</label>
                  <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ej. Coche, Viaje Japón, Emergencias" className="fin-input mt-1" />
                </div>

                <div>
                  <label className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Tipo</label>
                  <div className="mt-1 flex gap-2">
                    {(Object.keys(TYPE_LABELS) as CategoryType[]).map((t) => (
                      <button
                        key={t} onClick={() => setDraft({ ...draft, type: t })}
                        className={`fin-mono flex-1 rounded-md border px-3 py-2 text-[10px] uppercase tracking-widest transition ${
                          draft.type === t ? "border-[hsl(var(--fin-income)/0.6)] bg-[hsl(var(--fin-income)/0.12)] text-[hsl(var(--fin-income))]" : "border-[hsl(var(--fin-line))] text-[hsl(var(--fin-mute))]"
                        }`}
                      >
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>

                {(draft.type === "savings" || draft.type === "available") && (
                  <div>
                    <label className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Subir Foto del Objetivo (Desde ordenador)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setDraft({ ...draft, image: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="mt-1 block w-full text-xs text-neutral-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[hsl(var(--fin-income)/0.1)] file:text-[hsl(var(--fin-income))] hover:file:bg-[hsl(var(--fin-income)/0.2)]"
                    />
                    {draft.image && (
                      <div className="mt-2 relative inline-block">
                        <img src={draft.image} className="h-20 w-32 object-cover rounded border" alt="Preview" />
                        <button 
                          type="button" 
                          onClick={() => setDraft({ ...draft, image: "" })}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Reparto %</label>
                    <input type="number" min={0} max={100} value={draft.allocation} onChange={(e) => setDraft({ ...draft, allocation: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} className="fin-input fin-mono mt-1" disabled={draft.type === "expense"} />
                  </div>
                  <div>
                    <label className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Meta / Presupuesto €</label>
                    <input type="number" min={0} value={draft.budget} onChange={(e) => setDraft({ ...draft, budget: Number(e.target.value) || 0 })} className="fin-input fin-mono mt-1" />
                  </div>
                </div>

                <div>
                  <label className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Color</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CATEGORY_COLORS.map((c) => (
                      <button
                        key={c} onClick={() => setDraft({ ...draft, color: c })} className={`h-7 w-7 rounded-full border-2 transition ${draft.color === c ? "scale-110" : "border-transparent"}`}
                        style={{ background: `hsl(${c})`, borderColor: draft.color === c ? `hsl(${c})` : "transparent" }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Icono</label>
                  <div className="mt-2 grid max-h-32 grid-cols-8 gap-1.5 overflow-y-auto rounded-md border border-[hsl(var(--fin-line))] p-2">
                    {Object.entries(CATEGORY_ICONS).map(([name, Icon]) => (
                      <button
                        key={name} onClick={() => setDraft({ ...draft, icon: name })}
                        className={`grid h-8 w-8 place-items-center rounded-md ${draft.icon === name ? "bg-[hsl(var(--fin-income)/0.18)] text-[hsl(var(--fin-income))]" : "text-[hsl(var(--fin-mute))]"}`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button onClick={() => setDraft(null)} className="fin-mono rounded-md border border-[hsl(var(--fin-line))] px-3 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Cancelar</button>
                  <button onClick={save} disabled={!draft.name.trim()} className="fin-mono inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--fin-income)/0.5)] bg-[hsl(var(--fin-income)/0.15)] px-4 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-income))] disabled:opacity-40">
                    <Save className="h-3.5 w-3.5" /> {draft.id ? "Actualizar" : "Crear"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function AllocationEditor({ onClose }: { onClose: () => void }) {
  const { categories, setAllocations, updateCategory, transactions } = useFinance();
  const expenseCats = useMemo(() => categories.filter((c) => c.type === "expense"), [categories]);
  const savingsCats = useMemo(() => categories.filter((c) => c.type === "savings" || c.type === "available"), [categories]);

  const [alloc, setAlloc] = useState<Record<string, number>>(() => Object.fromEntries(categories.map((c) => [c.id, c.allocation])));
  const [budgets, setBudgets] = useState<Record<string, number>>(() => Object.fromEntries(categories.map((c) => [c.id, c.budget])));

  const savingsTotal = useMemo(() => savingsCats.reduce((s, c) => s + (alloc[c.id] || 0), 0), [savingsCats, alloc]);
  const ok = savingsCats.length === 0 || savingsTotal === 100;

  const save = () => {
    const finalAlloc: Record<string, number> = { ...alloc };
    expenseCats.forEach((c) => { finalAlloc[c.id] = 0; });
    setAllocations(finalAlloc);
    Object.entries(budgets).forEach(([id, b]) => updateCategory(id, { budget: b }));
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fin fixed inset-0 z-50 grid place-items-center bg-[hsl(var(--fin-bg)/0.85)] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
        className="fin-glass fin-brackets relative w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="fin-mono text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--fin-mute))]">Repartidor · Ingresos</p>
            <h2 className="fin-mono mt-1 text-lg uppercase tracking-[0.2em] text-[hsl(var(--fin-ink))]">Ajustes de Reparto</h2>
          </div>
          <button onClick={onClose} className="text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-ink))]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {categories.map((c) => {
            const Icon = getCategoryIcon(c.icon);
            const isSavings = c.type === "savings" || c.type === "available";
            return (
              <div key={c.id} className="rounded-lg border border-[hsl(var(--fin-line))] bg-[hsl(var(--fin-input-bg))] p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md" style={{ background: `hsl(${c.color} / 0.15)`, color: `hsl(${c.color})` }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[hsl(var(--fin-ink))]">{c.name}</span>
                  {isSavings && (
                    <div className="flex shrink-0 items-center gap-1">
                      <input
                        type="number" min={0} max={100} value={alloc[c.id] ?? 0}
                        onChange={(e) => setAlloc({ ...alloc, [c.id]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                        className="fin-input fin-mono w-16 sm:w-20 text-right"
                      />
                      <span className="fin-mono text-xs text-[hsl(var(--fin-mute))]">%</span>
                    </div>
                  )}
                </div>
                {isSavings && (
                  <input
                    type="range" min={0} max={100} step={1} value={alloc[c.id] ?? 0}
                    onChange={(e) => setAlloc({ ...alloc, [c.id]: Number(e.target.value) })}
                    className="mt-3 w-full" style={{ accentColor: `hsl(${c.color})` }}
                  />
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="fin-mono text-[9px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
                    {isSavings ? "Meta Financiera Total" : "Presupuesto Mensual Fijo"}
                  </span>
                  <input
                    type="number" min={0} value={budgets[c.id] ?? 0}
                    onChange={(e) => setBudgets({ ...budgets, [c.id]: Number(e.target.value) || 0 })}
                    className="fin-input fin-mono ml-auto w-24 sm:w-28 text-right"
                  />
                  <span className="fin-mono text-[10px] text-[hsl(var(--fin-mute))]">€</span>
                </div>
              </div>
            );
          })}
        </div>

        {savingsCats.length > 0 && (
          <div className={`fin-mono mt-4 flex items-center justify-between rounded-md border px-3 py-2 text-[10px] uppercase tracking-widest ${ok ? "text-[hsl(var(--fin-income))]" : "text-[hsl(var(--fin-warn))]"}`}>
            <span>Porcentaje total asignado (Ahorros + Disponible): {savingsTotal}% {ok ? "✓" : "(debe sumar 100%)"}</span>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="fin-mono rounded-md border border-[hsl(var(--fin-line))] px-3 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Cancelar</button>
          <button onClick={save} disabled={!ok} className="fin-mono rounded-md border border-[hsl(var(--fin-income)/0.5)] bg-[hsl(var(--fin-income)/0.15)] px-4 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-income))] disabled:opacity-40">Guardar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}