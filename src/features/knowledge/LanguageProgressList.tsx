import { motion } from "framer-motion";
import { useState } from "react";
import { Languages, Plus, Trash2, ArrowRight, Pencil, Check, X } from "lucide-react";
import { useKnowledge, LangLevel, LEVEL_VALUE } from "./KnowledgeContext";
import { cn } from "@/lib/utils";

const LEVELS: LangLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const FLAGS: Record<string, string> = {
  español: "🇪🇸", espanol: "🇪🇸", spanish: "🇪🇸",
  inglés: "🇬🇧", ingles: "🇬🇧", english: "🇬🇧",
  francés: "🇫🇷", frances: "🇫🇷", french: "🇫🇷",
  alemán: "🇩🇪", aleman: "🇩🇪", german: "🇩🇪",
  italiano: "🇮🇹", italian: "🇮🇹",
  portugués: "🇵🇹", portugues: "🇵🇹",
  japonés: "🇯🇵", japones: "🇯🇵",
  chino: "🇨🇳",
  ruso: "🇷🇺",
  árabe: "🇸🇦", arabe: "🇸🇦",
};

function flagFor(name: string) {
  return FLAGS[name.trim().toLowerCase()] ?? "🌐";
}

export function LanguageProgressList() {
  const { languages, upsertLanguage, removeLanguage } = useKnowledge();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; current: LangLevel; target: LangLevel; mastered: boolean }>({
    name: "", current: "A1", target: "B1", mastered: false,
  });

  // Edit state: which language is being edited inline
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; current: LangLevel; target: LangLevel; mastered: boolean }>({
    name: "", current: "A1", target: "B1", mastered: false,
  });

  const startEdit = (lang: typeof languages[0]) => {
    setEditId(lang.id);
    setEditForm({ name: lang.name, current: lang.current, target: lang.target ?? lang.current, mastered: lang.mastered ?? false });
  };

  const saveEdit = () => {
    if (!editId) return;
    upsertLanguage({ id: editId, name: editForm.name, current: editForm.current, target: editForm.target, mastered: editForm.mastered });
    setEditId(null);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Languages className="h-4 w-4 text-primary" />
          <span>Idiomas · MCER A1 → C2</span>
          <span className="ml-2 text-xs font-normal text-muted-foreground">{languages.length} lenguas</span>
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/20"
        >
          <Plus className="h-3.5 w-3.5" /> Idioma
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4 overflow-hidden rounded-xl border bg-background/60 p-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              className="col-span-2 h-9 rounded-md border bg-background px-3 text-sm outline-none focus:border-primary"
              placeholder="Idioma"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm outline-none focus:border-primary"
              value={form.current}
              onChange={e => setForm({ ...form, current: e.target.value as LangLevel })}
            >
              {LEVELS.map(l => <option key={l} value={l}>Actual: {l}</option>)}
            </select>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm outline-none focus:border-primary"
              value={form.target}
              onChange={e => setForm({ ...form, target: e.target.value as LangLevel })}
            >
              {LEVELS.map(l => <option key={l} value={l}>Objetivo: {l}</option>)}
            </select>
            <label className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={form.mastered}
                onChange={e => setForm({ ...form, mastered: e.target.checked })}
              />
              Marcar como dominado
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!form.name.trim()) return;
                upsertLanguage({ name: form.name, current: form.current, target: form.target, mastered: form.mastered });
                setForm({ name: "", current: "A1", target: "B1", mastered: false });
                setOpen(false);
              }}
              className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Guardar
            </button>
          </div>
        </motion.div>
      )}

      <ul className="space-y-3">
        {languages.map((lang, idx) => {
          const currentIdx = LEVEL_VALUE[lang.current]; // 1..6
          const targetIdx = lang.target ? LEVEL_VALUE[lang.target] : currentIdx;
          const isMastered = lang.mastered;
          const inProgress = !!lang.target && targetIdx > currentIdx;
          const isEditing = editId === lang.id;

          return (
            <li
              key={lang.id}
              className="group rounded-xl border bg-background/60 p-3 transition hover:border-primary/40"
            >
              {isEditing ? (
                /* ── Inline edit form ── */
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="col-span-2 h-9 rounded-md border bg-background px-3 text-sm outline-none focus:border-primary"
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Idioma"
                    />
                    <select
                      className="h-9 rounded-md border bg-background px-2 text-sm outline-none focus:border-primary"
                      value={editForm.current}
                      onChange={e => setEditForm({ ...editForm, current: e.target.value as LangLevel })}
                    >
                      {LEVELS.map(l => <option key={l} value={l}>Actual: {l}</option>)}
                    </select>
                    <select
                      className="h-9 rounded-md border bg-background px-2 text-sm outline-none focus:border-primary"
                      value={editForm.target}
                      onChange={e => setEditForm({ ...editForm, target: e.target.value as LangLevel })}
                    >
                      {LEVELS.map(l => <option key={l} value={l}>Objetivo: {l}</option>)}
                    </select>
                    <label className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={editForm.mastered}
                        onChange={e => setEditForm({ ...editForm, mastered: e.target.checked })}
                      />
                      Marcar como dominado
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditId(null)}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" /> Cancelar
                    </button>
                    <button
                      onClick={saveEdit}
                      className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Check className="h-3 w-3" /> Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg leading-none">{flagFor(lang.name)}</span>
                      <span className="truncate font-serif text-base font-medium">{lang.name}</span>
                      {isMastered && (
                        <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                          Dominado
                        </span>
                      )}
                      {inProgress && (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-500">
                          Aprendiendo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-mono text-muted-foreground">{lang.current}</span>
                      {lang.target && lang.target !== lang.current && (
                        <>
                          <ArrowRight className="h-3 w-3 text-primary" />
                          <span className="font-mono text-primary">{lang.target}</span>
                        </>
                      )}
                      <button
                        onClick={() => startEdit(lang)}
                        className="ml-1 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
                        aria-label="Editar idioma"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeLanguage(lang.id)}
                        className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
                        aria-label="Eliminar idioma"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Segmented bar */}
                  <div className="grid grid-cols-6 gap-1">
                    {LEVELS.map((lvl, i) => {
                      const pos = i + 1;
                      const reached = pos <= currentIdx;
                      const isCurrent = pos === currentIdx;
                      const isNextTarget = inProgress && pos === currentIdx + 1 && pos <= targetIdx;
                      const isPathToTarget = inProgress && pos > currentIdx && pos <= targetIdx;

                      return (
                        <div key={lvl} className="flex flex-col items-center gap-1">
                          <div
                            className={cn(
                              "relative h-2 w-full overflow-hidden rounded-full",
                              reached
                                ? isMastered
                                  ? "bg-primary"
                                  : "bg-emerald-500"
                                : "bg-muted",
                              isCurrent && "ring-2 ring-offset-1 ring-offset-background",
                              isCurrent && isMastered && "ring-primary/60",
                              isCurrent && !isMastered && "ring-emerald-500/60",
                            )}
                          >
                            {isNextTarget && (
                              <motion.div
                                initial={{ x: "-100%" }}
                                animate={{ x: "0%" }}
                                transition={{ duration: 1.4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: idx * 0.1 }}
                                className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-emerald-500/60 via-emerald-400/40 to-transparent"
                              />
                            )}
                            {isPathToTarget && !isNextTarget && (
                              <div className="absolute inset-0 bg-emerald-500/20" />
                            )}
                          </div>
                          <span
                            className={cn(
                              "font-mono text-[9px] uppercase tracking-wider",
                              reached ? "text-foreground" : "text-muted-foreground/60",
                              isCurrent && "font-bold",
                            )}
                          >
                            {lvl}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-3 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2 w-3 rounded-sm bg-primary" />
          <span className="font-medium uppercase tracking-wider">Dominados</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2 w-3 rounded-sm bg-emerald-500" />
          <span className="font-medium uppercase tracking-wider">Aprendiendo</span>
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground">
          <Languages className="h-3.5 w-3.5" /> {languages.length} lenguas
        </span>
      </div>
    </div>
  );
}