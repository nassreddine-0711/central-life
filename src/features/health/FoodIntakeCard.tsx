import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Minus, Utensils, Sparkles, Trash2, List, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useHealth } from "./HealthContext";
import { NewFoodDialog } from "./CreateDialogs";
import type { Food } from "./foodDatabase";

type FoodLike = Food;

export function FoodIntakeCard() {
  const [q, setQ] = useState("");
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseQ, setBrowseQ] = useState("");
  const { addFood, foods, allFoods, customFoods, removeCustomFood, records } = useHealth();

  const customIds = useMemo(() => new Set(customFoods.map((c) => c.name)), [customFoods]);

  // Compute usage counts across all daily records
  const usageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(records).forEach((rec) => {
      rec.foods.forEach((f) => {
        counts[f.name] = (counts[f.name] ?? 0) + 1;
      });
    });
    return counts;
  }, [records]);

  // Top 7 most used (fallback to customs + first DB entries if not enough usage data)
  const topFoods = useMemo<FoodLike[]>(() => {
    const byName = new Map<string, FoodLike>();
    allFoods.forEach((f) => byName.set(f.name, f));
    const sortedNames = Object.entries(usageCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .filter((n) => byName.has(n));

    const picked: FoodLike[] = [];
    const seen = new Set<string>();
    for (const n of sortedNames) {
      if (picked.length >= 7) break;
      const f = byName.get(n);
      if (f && !seen.has(n)) {
        picked.push(f);
        seen.add(n);
      }
    }
    // Fill remaining slots with customs first, then DB defaults
    if (picked.length < 7) {
      for (const c of customFoods) {
        if (picked.length >= 7) break;
        if (!seen.has(c.name)) { picked.push(c); seen.add(c.name); }
      }
    }
    if (picked.length < 7) {
      for (const f of allFoods) {
        if (picked.length >= 7) break;
        if (!seen.has(f.name)) { picked.push(f); seen.add(f.name); }
      }
    }
    return picked;
  }, [usageCounts, allFoods, customFoods]);

  const results = useMemo<FoodLike[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return topFoods;
    return allFoods.filter((f) => f.name.toLowerCase().includes(term)).slice(0, 10);
  }, [q, allFoods, topFoods]);

  // All foods alphabetically for the browse popup
  const alphabetical = useMemo<FoodLike[]>(() => {
    const map = new Map<string, FoodLike>();
    allFoods.forEach((f) => map.set(f.name, f));
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" })
    );
  }, [allFoods]);

  const browseFiltered = useMemo<FoodLike[]>(() => {
    const term = browseQ.trim().toLowerCase();
    if (!term) return alphabetical;
    return alphabetical.filter((f) => f.name.toLowerCase().includes(term));
  }, [alphabetical, browseQ]);

  const getQty = (name: string) => qtyMap[name] ?? 1;
  const setQty = (name: string, n: number) =>
    setQtyMap((m) => ({ ...m, [name]: Math.max(1, Math.min(50, n)) }));

  const handleAdd = (f: FoodLike) => {
    const n = getQty(f.name);
    addFood(f, n);
    setQtyMap((m) => ({ ...m, [f.name]: 1 }));
    setQ("");
  };

  const renderRow = (f: FoodLike) => {
    const isCustom = customIds.has(f.name);
    const customRef = customFoods.find((c) => c.name === f.name);
    const qty = getQty(f.name);
    return (
      <div
        key={f.name}
        className="group flex w-full items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/30 p-3 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="truncate">{f.name}</span>
            {isCustom && (
              <Sparkles className="h-3 w-3 shrink-0 text-primary" aria-label="Personalizado" />
            )}
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">
            P {f.protein}g · C {f.carbs}g · G {f.fat}g · {f.kcal} kcal
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border/40 bg-background/40 px-1 py-0.5">
          <button
            type="button"
            onClick={() => setQty(f.name, qty - 1)}
            className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground"
            aria-label="Restar"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-5 text-center font-mono text-xs tabular-nums">{qty}</span>
          <button
            type="button"
            onClick={() => setQty(f.name, qty + 1)}
            className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground"
            aria-label="Sumar"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <button
          onClick={() => handleAdd(f)}
          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 font-mono text-xs text-primary transition hover:bg-primary/20"
          aria-label="Añadir"
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir
        </button>

        {isCustom && customRef && (
          <button
            onClick={() => removeCustomFood(customRef.id)}
            className="ml-1 rounded p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
            aria-label="Eliminar alimento personalizado"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-widest">Ingesta</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{foods.length} items</span>
          <button
            onClick={() => setBrowseOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition hover:border-primary/40 hover:text-primary"
            aria-label="Ver todos los alimentos"
          >
            <List className="h-3 w-3" />
            Ver todos
          </button>
          <NewFoodDialog />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar alimento..."
          className="pl-9"
        />
      </div>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-1 overflow-hidden"
          >
            {!q.trim() && (
              <div className="px-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                Más añadidos
              </div>
            )}
            {results.map(renderRow)}
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={browseOpen} onOpenChange={setBrowseOpen}>
        <DialogContent className="max-w-2xl border border-neutral-200 bg-white p-0 shadow-2xl">
          <DialogHeader className="border-b border-neutral-200 px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest">
              <Utensils className="h-4 w-4 text-primary" />
              Todos los alimentos
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={browseQ}
                onChange={(e) => setBrowseQ(e.target.value)}
                placeholder="Filtrar alimentos..."
                className="pl-9"
              />
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {browseFiltered.length} resultados · orden alfabético
            </div>
          </div>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto px-6 pb-6 pt-3">
            {browseFiltered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/40 px-3 py-6 text-center text-xs text-muted-foreground">
                Sin resultados
              </div>
            ) : (
              browseFiltered.map(renderRow)
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
