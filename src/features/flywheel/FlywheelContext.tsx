import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useHealth } from "@/features/health/HealthContext";
import { useFinance } from "@/features/finance/FinanceContext";
import { useTravel } from "@/features/travel/TravelContext";
import { useCerebro } from "@/features/cerebro/CerebroContext";
import { toISODate } from "@/features/health/dateUtils";

/* ============================================================
   Tipos
============================================================ */
export type SpokeType = "health" | "finance" | "secondBrain" | "projects" | "trips" | "manual";

export interface FlywheelSpoke {
  id: string;
  label: string;
  color: string;
  type: SpokeType;
  enabled: boolean;
  /** Solo para "trips": objetivo (ej. viajes por año). */
  target?: number;
  /** Solo para "manual": valor puesto a mano por el usuario, 0-100. */
  manualValue?: number;
}

export interface ComputedSpoke extends FlywheelSpoke {
  pct: number;
  prevPct: number;
  trend: "up" | "down" | "flat";
}

interface FlywheelCtx {
  spokes: FlywheelSpoke[];
  computed: ComputedSpoke[];
  overallPct: number;
  overallTrend: "up" | "down" | "flat";
  addManualSpoke: (label: string, color?: string) => void;
  updateSpoke: (id: string, patch: Partial<FlywheelSpoke>) => void;
  removeSpoke: (id: string) => void;
}

const Ctx = createContext<FlywheelCtx | null>(null);

export function useFlywheel() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFlywheel must be used within FlywheelProvider");
  return c;
}

/* ============================================================
   Storage
============================================================ */
const STORAGE_KEY = "flywheel.state.v1";
const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_SPOKES: FlywheelSpoke[] = [
  { id: "health", label: "Salud", color: "#22c55e", type: "health", enabled: true },
  { id: "finance", label: "Finanzas", color: "#eab308", type: "finance", enabled: true },
  { id: "secondBrain", label: "Second Brain", color: "#3b82f6", type: "secondBrain", enabled: true },
  { id: "projects", label: "Proyectos", color: "#a855f7", type: "projects", enabled: true },
  { id: "trips", label: "Viajes", color: "#06b6d4", type: "trips", enabled: true, target: 1 },
];

function loadSpokes(): FlywheelSpoke[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SPOKES.map((s) => ({ ...s }));
    const parsed = JSON.parse(raw) as FlywheelSpoke[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_SPOKES.map((s) => ({ ...s }));
    return parsed;
  } catch {
    return DEFAULT_SPOKES.map((s) => ({ ...s }));
  }
}

/* ============================================================
   Cálculo de momentum por tipo
   Cada uno devuelve el % actual y el % del periodo comparable anterior,
   para poder mostrar tendencia (el volante acelera, mantiene o frena).
============================================================ */
function clampPct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function useHealthMomentum(): { pct: number; prevPct: number } {
  const { getDayStats } = useHealth();
  return useMemo(() => {
    const windowPct = (offsetDays: number) => {
      let met = 0, total = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i - offsetDays);
        const stats = getDayStats(toISODate(d));
        if (stats.hasData) {
          total++;
          if (stats.caloriesGoalMet) met++;
        }
      }
      return total === 0 ? null : clampPct((met / total) * 100);
    };
    const pct = windowPct(0);
    const prevPct = windowPct(7);
    return { pct: pct ?? 60, prevPct: prevPct ?? pct ?? 60 };
  }, [getDayStats]);
}

function useFinanceMomentum(): { pct: number; prevPct: number } {
  const { categories, transactions } = useFinance();
  return useMemo(() => {
    const monthPct = (monthsAgo: number) => {
      const now = new Date();
      now.setMonth(now.getMonth() - monthsAgo);
      const y = now.getFullYear(), m = now.getMonth();
      const expenseCats = categories.filter((c) => c.type === "expense" && c.budget > 0);
      const totalBudget = expenseCats.reduce((s, c) => s + c.budget, 0);
      if (totalBudget <= 0) return null;
      const spent = transactions
        .filter((t) => t.type === "expense" && expenseCats.some((c) => c.id === t.categoryId))
        .filter((t) => { const d = new Date(t.date); return d.getFullYear() === y && d.getMonth() === m; })
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      const over = Math.max(0, spent - totalBudget);
      return clampPct((1 - over / totalBudget) * 100);
    };
    const pct = monthPct(0);
    const prevPct = monthPct(1);
    return { pct: pct ?? 60, prevPct: prevPct ?? pct ?? 60 };
  }, [categories, transactions]);
}

function useSecondBrainMomentum(): { pct: number; prevPct: number } {
  const { tasks } = useCerebro();
  return useMemo(() => {
    const windowPct = (offsetDays: number) => {
      const end = new Date(); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() - offsetDays);
      const start = new Date(end); start.setDate(start.getDate() - 7);
      const windowTasks = tasks.filter((t) => {
        if (!t.date || t.projectId) return false;
        const d = new Date(t.date);
        return d >= start && d < end;
      });
      if (windowTasks.length === 0) return null;
      const done = windowTasks.filter((t) => t.done).length;
      return clampPct((done / windowTasks.length) * 100);
    };
    const pct = windowPct(0);
    const prevPct = windowPct(7);
    return { pct: pct ?? 70, prevPct: prevPct ?? pct ?? 70 };
  }, [tasks]);
}

function useProjectsMomentum(): { pct: number; prevPct: number } {
  const { projects, tasks } = useCerebro();
  return useMemo(() => {
    const active = projects.filter((p) => !p.archived);
    if (active.length === 0) return { pct: 50, prevPct: 50 };
    let done = 0, total = 0;
    active.forEach((p) => {
      const list = tasks.filter((t) => t.projectId === p.id);
      total += list.length;
      done += list.filter((t) => t.stage === "done").length;
    });
    const pct = total === 0 ? 50 : clampPct((done / total) * 100);
    return { pct, prevPct: pct };
  }, [projects, tasks]);
}

function useTripsMomentum(target: number): { pct: number; prevPct: number } {
  const { entries } = useTravel();
  return useMemo(() => {
    const countYear = (year: number) => Object.values(entries).filter(
      (e) => e.status === "visited" && e.date && new Date(e.date).getFullYear() === year
    ).length;
    const t = Math.max(1, target || 1);
    const thisYear = new Date().getFullYear();
    const pct = clampPct((countYear(thisYear) / t) * 100);
    const prevPct = clampPct((countYear(thisYear - 1) / t) * 100);
    return { pct, prevPct };
  }, [entries, target]);
}

function trendOf(pct: number, prevPct: number): "up" | "down" | "flat" {
  const diff = pct - prevPct;
  if (diff > 3) return "up";
  if (diff < -3) return "down";
  return "flat";
}

/* ============================================================
   Provider
============================================================ */
export function FlywheelProvider({ children }: { children: ReactNode }) {
  const [spokes, setSpokes] = useState<FlywheelSpoke[]>(() => loadSpokes());

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(spokes)); } catch { /* */ }
  }, [spokes]);

  const health = useHealthMomentum();
  const finance = useFinanceMomentum();
  const secondBrain = useSecondBrainMomentum();
  const projectsM = useProjectsMomentum();
  const tripsTarget = spokes.find((s) => s.type === "trips")?.target ?? 1;
  const trips = useTripsMomentum(tripsTarget);

  const momentumByType: Record<Exclude<SpokeType, "manual">, { pct: number; prevPct: number }> = {
    health, finance, secondBrain, projects: projectsM, trips,
  };

  const computed: ComputedSpoke[] = useMemo(() => {
    return spokes.map((s) => {
      if (s.type === "manual") {
        const pct = clampPct(s.manualValue ?? 50);
        return { ...s, pct, prevPct: pct, trend: "flat" as const };
      }
      const m = momentumByType[s.type];
      return { ...s, pct: m.pct, prevPct: m.prevPct, trend: trendOf(m.pct, m.prevPct) };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spokes, health.pct, health.prevPct, finance.pct, finance.prevPct, secondBrain.pct, secondBrain.prevPct, projectsM.pct, projectsM.prevPct, trips.pct, trips.prevPct]);

  const enabledComputed = computed.filter((s) => s.enabled);
  const overallPct = useMemo(() => {
    if (enabledComputed.length === 0) return 0;
    const pcts = enabledComputed.map((s) => s.pct);
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const min = Math.min(...pcts);
    // Un volante muy parado frena el conjunto más de lo proporcional.
    return clampPct(avg * 0.7 + min * 0.3);
  }, [enabledComputed]);
  const overallPrevPct = useMemo(() => {
    if (enabledComputed.length === 0) return 0;
    const pcts = enabledComputed.map((s) => s.prevPct);
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const min = Math.min(...pcts);
    return clampPct(avg * 0.7 + min * 0.3);
  }, [enabledComputed]);
  const overallTrend = trendOf(overallPct, overallPrevPct);

  const addManualSpoke = useCallback((label: string, color?: string) => {
    const l = label.trim();
    if (!l) return;
    setSpokes((prev) => [...prev, { id: uid(), label: l, color: color ?? "#64748b", type: "manual", enabled: true, manualValue: 50 }]);
  }, []);

  const updateSpoke = useCallback((id: string, patch: Partial<FlywheelSpoke>) => {
    setSpokes((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
  }, []);

  const removeSpoke = useCallback((id: string) => {
    setSpokes((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const value = useMemo<FlywheelCtx>(() => ({
    spokes, computed, overallPct, overallTrend, addManualSpoke, updateSpoke, removeSpoke,
  }), [spokes, computed, overallPct, overallTrend, addManualSpoke, updateSpoke, removeSpoke]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
