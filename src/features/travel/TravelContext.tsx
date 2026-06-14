import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useFinance } from "@/features/finance/FinanceContext";
import { useSupabaseSync } from "@/hooks/useSupabaseSync";

const TOTAL_COUNTRIES = 195;

export type CountryStatus = "visited" | "wishlist" | "none";

export interface CountryEntry {
  countryID: string;
  countryName?: string;
  status: CountryStatus;
  spend: number;
  date: string;
  age: string;
  mediaLink: string;
  notes?: string;
}

interface TravelContextValue {
  entries: Record<string, CountryEntry>;
  upsert: (id: string, patch: Partial<CountryEntry>) => void;
  remove: (id: string) => void;
  visitedCount: number;
  wishlistCount: number;
  worldPercent: number;
  totalSpend: number;
  travelSavings: number;
  setTravelSavings: (n: number) => void;
}

const TravelContext = createContext<TravelContextValue | null>(null);

export function TravelProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, CountryEntry>>({});
  const finance = useFinance();
  const travelSavings = finance.travelSavings;
  const setTravelSavings = finance.setTravelSavings;

  // ── Sync con Supabase ───────────────────────────────────────────────────
  useSupabaseSync("travel", entries, setEntries);

  const upsert = useCallback((id: string, patch: Partial<CountryEntry>) => {
    setEntries((prev) => {
      const existing: CountryEntry = prev[id] ?? {
        countryID: id,
        status: "none",
        spend: 0,
        date: "",
        age: "",
        mediaLink: "",
      };

      if (patch.spend !== undefined && Number(patch.spend) > Number(existing.spend)) {
        const diff = Number(patch.spend) - Number(existing.spend);
        finance.addExpense("travel", diff, `Gasto registrado en: ${patch.countryName || existing.countryName || id}`);
      }

      return { ...prev, [id]: { ...existing, ...patch, countryID: id } };
    });
  }, [finance]);

  const remove = useCallback((id: string) => {
    setEntries((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const { visitedCount, wishlistCount, entriesSpend } = useMemo(() => {
    let v = 0, w = 0, s = 0;
    Object.values(entries).forEach((e) => {
      if (e.status === "visited") v += 1;
      if (e.status === "wishlist") w += 1;
      s += Number(e.spend) || 0;
    });
    return { visitedCount: v, wishlistCount: w, entriesSpend: s };
  }, [entries]);

  const totalSpend = useMemo(() => {
    const financeTravelExpenses = finance.transactions
      .filter((t) => t.type === "expense" && t.categoryId === "travel")
      .reduce((sum, t) => sum + t.amount, 0);
    return entriesSpend + financeTravelExpenses;
  }, [entriesSpend, finance.transactions]);

  const worldPercent = useMemo(
    () => Math.min(100, (visitedCount / TOTAL_COUNTRIES) * 100),
    [visitedCount],
  );

  const value: TravelContextValue = {
    entries,
    upsert,
    remove,
    visitedCount,
    wishlistCount,
    worldPercent,
    totalSpend,
    travelSavings,
    setTravelSavings,
  };

  return <TravelContext.Provider value={value}>{children}</TravelContext.Provider>;
}

export function useTravel() {
  const ctx = useContext(TravelContext);
  if (!ctx) throw new Error("useTravel must be used within TravelProvider");
  return ctx;
}