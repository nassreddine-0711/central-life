import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, Trash2, Save, AlertTriangle, Tag, Pencil, Check,
} from "lucide-react";
import {
  useFinance, type Category, type CategoryType,
  CATEGORY_ICONS, CATEGORY_COLORS, getCategoryIcon,
} from "./FinanceContext";

const TYPE_LABELS: Record<CategoryType, string> = {
  expense: "Gasto",
  income:  "Ingreso",
  savings: "Ahorro",
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
  locked?: boolean;
}

const EMPTY: DraftCategory = {
  name: "", type: "expense", color: CATEGORY_COLORS[0],
  icon: "Sparkles", tags: [], allocation: 0, budget: 0,
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
      budget: c.budget, locked: c.locked,
    });
    setTagInput("");
  };

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) return;
    if (draft.id) {
      updateCategory(draft.id, {
        name: draft.name.trim(), type: draft.type, color: draft.color,
        icon: draft.icon, tags: draft.tags, allocation: draft.allocation, budget: draft.budget,
      });
    } else {
      addCategory({
        name: draft.name.trim(), type: draft.type, color: draft.color,
        icon: draft.icon, tags: draft.tags, allocation: draft.allocation, budget: draft.budget,
      });
    }
    setDraft(null);
  };

  const tryRemove = (c: Category) => {
    if (c.locked) return;
    const count = countTransactionsByCategory(c.id);
    if (count > 0) {
      const ok = confirm(`"${c.name}" tiene ${count} movimientos. ¿Eliminar de todos modos? (los movimientos se borrarán)`);
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
            <p className="fin-mono text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--fin-mute))]">
              Configurar · Categorías
            </p>
            <h2 className="fin-mono mt-1 text-xl uppercase tracking-[0.2em] text-[hsl(var(--fin-ink))]">
              Cajas Personalizadas
            </h2>
          </div>
          <button onClick={onClose} className="text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-ink))]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid flex-1 grid-cols-1 gap-5 overflow-hidden md:grid-cols-[1fr_1.2fr]">
          {/* List */}
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
                      active ? "border-[hsl(var(--fin-income)/0.6)] bg-[hsl(var(--fin-income)/0.06)]"
                             : "border-[hsl(var(--fin-line))] bg-[hsl(var(--fin-input-bg))]"
                    }`}
                  >
                    <span
                      className="grid h-9 w-9 place-items-center rounded-md"
                      style={{ background: `hsl(${c.color} / 0.15)`, color: `hsl(${c.color})` }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[hsl(var(--fin-ink))]">{c.name}</p>
                      <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
                        {TYPE_LABELS[c.type]} · {c.allocation}% · {count} mov · {c.tags.length} tags
                        {c.locked && " · sync"}
                      </p>
                    </div>
                    <button onClick={() => startEdit(c)} className="text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-ink))]" title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => tryRemove(c)}
                      disabled={c.locked}
                      className="text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-expense))] disabled:opacity-30 disabled:hover:text-[hsl(var(--fin-mute))]"
                      title={c.locked ? "Categoría protegida" : "Eliminar"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Editor */}
          <div className="overflow-y-auto rounded-xl border border-[hsl(var(--fin-line))] bg-[hsl(var(--fin-input-bg))] p-5">
            {!draft ? (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
                    Selecciona una categoría o crea una nueva
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Nombre</label>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Ej. Suscripciones, Mascotas, Inversión"
                    className="fin-input mt-1"
                  />
                </div>

                <div>
                  <label className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Tipo</label>
                  <div className="mt-1 flex gap-2">
                    {(Object.keys(TYPE_LABELS) as CategoryType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setDraft({ ...draft, type: t })}
                        className={`fin-mono flex-1 rounded-md border px-3 py-2 text-[10px] uppercase tracking-widest transition ${
                          draft.type === t
                            ? "border-[hsl(var(--fin-income)/0.6)] bg-[hsl(var(--fin-income)/0.12)] text-[hsl(var(--fin-income))]"
                            : "border-[hsl(var(--fin-line))] text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-ink))]"
                        }`}
                      >
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Reparto %</label>
                    <input
                      type="number" min={0} max={100}
                      value={draft.allocation}
                      onChange={(e) => setDraft({ ...draft, allocation: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                      className="fin-input fin-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Presupuesto €</label>
                    <input
                      type="number" min={0}
                      value={draft.budget}
                      onChange={(e) => setDraft({ ...draft, budget: Number(e.target.value) || 0 })}
                      className="fin-input fin-mono mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Color</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CATEGORY_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setDraft({ ...draft, color: c })}
                        className={`h-7 w-7 rounded-full border-2 transition ${draft.color === c ? "scale-110" : "border-transparent"}`}
                        style={{
                          background: `hsl(${c})`,
                          borderColor: draft.color === c ? `hsl(${c})` : "transparent",
                          boxShadow: draft.color === c ? `0 0 0 2px hsl(var(--fin-bg)), 0 0 0 4px hsl(${c})` : undefined,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Icono</label>
                  <div className="mt-2 grid max-h-40 grid-cols-8 gap-1.5 overflow-y-auto rounded-md border border-[hsl(var(--fin-line))] bg-[hsl(var(--fin-bg)/0.4)] p-2">
                    {Object.entries(CATEGORY_ICONS).map(([name, Icon]) => (
                      <button
                        key={name}
                        onClick={() => setDraft({ ...draft, icon: name })}
                        title={name}
                        className={`grid h-8 w-8 place-items-center rounded-md transition ${
                          draft.icon === name
                            ? "bg-[hsl(var(--fin-income)/0.18)] text-[hsl(var(--fin-income))]"
                            : "text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-ink))]"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
                    Tags (autoclasificación del importador)
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                      placeholder="Ej. mercadona, sushi, netflix..."
                      className="fin-input flex-1"
                    />
                    <button
                      onClick={addTag}
                      className="fin-mono rounded-md border border-[hsl(var(--fin-income)/0.5)] bg-[hsl(var(--fin-income)/0.12)] px-3 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-income))]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {draft.tags.length === 0 && (
                      <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
                        Sin tags · escribe palabras clave
                      </p>
                    )}
                    {draft.tags.map((t) => (
                      <span
                        key={t}
                        className="fin-mono inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                        style={{
                          borderColor: `hsl(${draft.color} / 0.5)`,
                          background:  `hsl(${draft.color} / 0.1)`,
                          color: `hsl(${draft.color})`,
                        }}
                      >
                        <Tag className="h-2.5 w-2.5" /> {t}
                        <button
                          onClick={() => setDraft({ ...draft, tags: draft.tags.filter((x) => x !== t) })}
                          className="ml-1 opacity-60 hover:opacity-100"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setDraft(null)}
                    className="fin-mono rounded-md border border-[hsl(var(--fin-line))] px-3 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-ink))]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={save}
                    disabled={!draft.name.trim()}
                    className="fin-mono inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--fin-income)/0.5)] bg-[hsl(var(--fin-income)/0.15)] px-4 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-income))] disabled:opacity-40"
                  >
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

/* --- Allocation editor: expenses use fixed budgets, savings split remainder --- */
export function AllocationEditor({ onClose }: { onClose: () => void }) {
  const { categories, setAllocations, updateCategory, transactions } = useFinance();

  const expenseCats = useMemo(() => categories.filter((c) => c.type === "expense"), [categories]);
  const savingsCats = useMemo(() => categories.filter((c) => c.type === "savings"), [categories]);

  const [alloc, setAlloc] = useState<Record<string, number>>(() =>
    Object.fromEntries(categories.map((c) => [c.id, c.allocation]))
  );
  const [budgets, setBudgets] = useState<Record<string, number>>(() =>
    Object.fromEntries(categories.map((c) => [c.id, c.budget]))
  );

  // Current month income (for "remanente real" preview)
  const monthIncome = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    return transactions.reduce((s, t) => {
      if (t.type !== "income") return s;
      const d = new Date(t.date);
      if (d.getFullYear() !== y || d.getMonth() !== m) return s;
      return s + t.amount;
    }, 0);
  }, [transactions]);

  const expenseBudgetTotal = useMemo(
    () => expenseCats.reduce((s, c) => s + (budgets[c.id] || 0), 0),
    [expenseCats, budgets]
  );
  const remanente = Math.max(0, monthIncome - expenseBudgetTotal);

  const savingsTotal = useMemo(
    () => savingsCats.reduce((s, c) => s + (alloc[c.id] || 0), 0),
    [savingsCats, alloc]
  );
  const ok = savingsCats.length === 0 || savingsTotal === 100;

  const normalize = () => {
    if (savingsTotal <= 0 || savingsCats.length === 0) return;
    const factor = 100 / savingsTotal;
    const next = { ...alloc };
    savingsCats.forEach((c, i) => {
      next[c.id] = i === savingsCats.length - 1
        ? 100 - savingsCats.slice(0, -1).reduce((s, x) => s + Math.round((alloc[x.id] || 0) * factor), 0)
        : Math.round((alloc[c.id] || 0) * factor);
    });
    setAlloc(next);
  };

  const save = () => {
    // Expense categories: allocation forced to 0 (no income split)
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
            <p className="fin-mono text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--fin-mute))]">
              Repartidor · Ingresos
            </p>
            <h2 className="fin-mono mt-1 text-lg uppercase tracking-[0.2em] text-[hsl(var(--fin-ink))]">
              Ajustes de Reparto
            </h2>
          </div>
          <button onClick={onClose} className="text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-ink))]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="fin-mono mt-4 grid grid-cols-2 gap-2 rounded-md border border-[hsl(var(--fin-line))] bg-[hsl(var(--fin-bg)/0.4)] px-3 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
          <div>Ingresos mes: <span className="text-[hsl(var(--fin-ink))]">{monthIncome.toFixed(2)} €</span></div>
          <div className="text-right">
            Remanente: <span className="text-[hsl(var(--fin-income))]">{remanente.toFixed(2)} €</span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {categories.map((c) => {
            const Icon = getCategoryIcon(c.icon);
            const isSavings = c.type === "savings";
            const monthlyContribution = isSavings
              ? +(remanente * ((alloc[c.id] || 0) / 100)).toFixed(2)
              : 0;
            return (
              <div key={c.id} className="rounded-lg border border-[hsl(var(--fin-line))] bg-[hsl(var(--fin-input-bg))] p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md"
                    style={{ background: `hsl(${c.color} / 0.15)`, color: `hsl(${c.color})` }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[hsl(var(--fin-ink))]">{c.name}</span>
                  {isSavings && (
                    <div className="flex shrink-0 items-center gap-1">
                      <input
                        type="number" min={0} max={100}
                        value={alloc[c.id] ?? 0}
                        onChange={(e) => setAlloc({ ...alloc, [c.id]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                        className="fin-input fin-mono w-16 sm:w-20 text-right"
                      />
                      <span className="fin-mono text-xs text-[hsl(var(--fin-mute))]">%</span>
                    </div>
                  )}
                </div>
                {isSavings && (
                  <input
                    type="range" min={0} max={100} step={1}
                    value={alloc[c.id] ?? 0}
                    onChange={(e) => setAlloc({ ...alloc, [c.id]: Number(e.target.value) })}
                    className="mt-3 w-full accent-[hsl(var(--fin-income))]"
                    style={{ accentColor: `hsl(${c.color})` }}
                  />
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="fin-mono text-[9px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
                    {isSavings ? "Objetivo a cumplir" : "Presupuesto"}
                  </span>
                  <input
                    type="number" min={0}
                    value={budgets[c.id] ?? 0}
                    onChange={(e) => setBudgets({ ...budgets, [c.id]: Number(e.target.value) || 0 })}
                    className="fin-input fin-mono ml-auto w-24 sm:w-28 text-right"
                  />
                  <span className="fin-mono text-[10px] text-[hsl(var(--fin-mute))]">{isSavings ? "€" : "€/mes"}</span>
                </div>
                {isSavings && (
                  <p className="fin-mono mt-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
                    Aporte estimado este mes:{" "}
                    <span className="text-[hsl(var(--fin-income))]">{monthlyContribution.toFixed(2)} €</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {savingsCats.length > 0 && (
          <div className={`fin-mono mt-4 flex items-center justify-between rounded-md border px-3 py-2 text-[10px] uppercase tracking-widest ${
            ok ? "border-[hsl(var(--fin-income)/0.5)] bg-[hsl(var(--fin-income)/0.1)] text-[hsl(var(--fin-income))]"
               : "border-[hsl(var(--fin-warn)/0.5)] bg-[hsl(var(--fin-warn)/0.1)] text-[hsl(var(--fin-warn))]"
          }`}>
            <span className="inline-flex items-center gap-2">
              {ok ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              Ahorro total: {savingsTotal}% {ok ? "" : "(debe sumar 100%)"}
            </span>
            {!ok && (
              <button onClick={normalize} className="fin-mono underline">Normalizar</button>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="fin-mono rounded-md border border-[hsl(var(--fin-line))] px-3 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={!ok}
            className="fin-mono rounded-md border border-[hsl(var(--fin-income)/0.5)] bg-[hsl(var(--fin-income)/0.15)] px-4 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-income))] disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
