import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSupabaseSync } from "@/hooks/useSupabaseSync";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CategoryType = "expense" | "income" | "savings" | "available";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;        // raw hsl values, e.g. "210 90% 60%"
  icon: string;         // lucide-react icon name
  tags: string[];       // keywords for auto-classification
  allocation: number;   // % of income routed to this box (0-100)
  budget: number;       // monthly budget reference
  image?: string;       // base64 image data or URL
  route?: string;       // optional deep link
  locked?: boolean;     // protected (e.g. travel sync)
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  categoryId: string | "all";
  note?: string;
  date: string; // ISO
  split?: Record<string, number>;
  hash?: string;
  imported?: boolean;
}

export interface ImportItem {
  date: string;
  concept: string;
  amount: number; // signed
  categoryId: string;
  hash: string;
}

interface FinanceState {
  categories: Category[];
  balances: Record<string, number>;
  transactions: Transaction[];
}

/* ------------------------------------------------------------------ */
/* Defaults & migration                                                */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "finance.state.v2";

const DEFAULT_CATEGORIES: Category[] = [
  { id: "fixed",    name: "Gastos Fijos", type: "expense", color: "210 90% 60%",
    icon: "Home", tags: ["alquiler","hipoteca","endesa","iberdrola","naturgy","movistar","vodafone","orange","seguro","mapfre","comunidad","ibi","agua","luz","gas","internet","spotify","netflix","hbo","disney","prime","icloud","gym","gimnasio"],
    allocation: 0, budget: 1000 },
  { id: "available_cash", name: "Dinero Disponible", type: "available", color: "152 75% 48%",
    icon: "Wallet", tags: [], allocation: 40, budget: 0 },
  { id: "savings",  name: "Ahorro", type: "savings", color: "45 95% 58%",
    icon: "PiggyBank", tags: ["traspaso ahorro","indexa","myinvestor","fondo","deposito"],
    allocation: 30, budget: 400 },
  { id: "travel",   name: "Viajes", type: "savings", color: "190 95% 55%",
    icon: "Plane", tags: ["ryanair","vueling","iberia","easyjet","booking","airbnb","renfe","ave","blablacar","uber","cabify","hotel","hostal","expedia","skyscanner"],
    allocation: 30, budget: 300, route: "/viajes", locked: true },
  { id: "variable", name: "Variables", type: "expense", color: "280 75% 65%",
    icon: "Sparkles", tags: ["mercadona","lidl","carrefour","alcampo","dia","sushi","burger","mcdonald","starbucks","amazon","aliexpress","zara","decathlon","ikea","restaurante","cafe","farmacia","fnac"],
    allocation: 0, budget: 0 },
];

function loadState(): FinanceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FinanceState;
      if (parsed.categories?.length) return parsed;
    }
  } catch { /* ignore */ }
  const balances: Record<string, number> = {};
  DEFAULT_CATEGORIES.forEach((c) => (balances[c.id] = 0));
  return { categories: DEFAULT_CATEGORIES, balances, transactions: [] };
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface FinanceContextValue extends FinanceState {
  addIncome: (amount: number, note?: string, specificCategoryId?: string) => void;
  addExpense: (categoryId: string, amount: number, note?: string) => void;
  importTransactions: (items: ImportItem[]) => { imported: number; skipped: number };
  removeTransaction: (id: string) => void;
  removeMonth: (year: number, month: number) => number;

  addCategory: (c: Omit<Category, "id">) => string;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  removeCategory: (id: string, fallbackId?: string) => void;
  setAllocations: (alloc: Record<string, number>) => void;
  countTransactionsByCategory: (id: string) => number;

  reset: () => void;

  travelSavings: number;
  setTravelSavings: (n: number) => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(() => loadState());

  useSupabaseSync("finance", state, setState);

  /* ---- transactions ---- */
  const addIncome = useCallback((amount: number, note?: string, specificCategoryId?: string) => {
    if (!amount || amount <= 0) return;
    setState((prev) => {
      const split: Record<string, number> = {};
      const balances = { ...prev.balances };

      if (specificCategoryId) {
        split[specificCategoryId] = amount;
        balances[specificCategoryId] = +((balances[specificCategoryId] || 0) + amount).toFixed(2);
      } else {
        const distributableCategories = prev.categories.filter((c) => c.type === "savings" || c.type === "available");
        distributableCategories.forEach((c) => {
          if (!c.allocation) return;
          const part = +(amount * c.allocation / 100).toFixed(2);
          split[c.id] = part;
          balances[c.id] = +((balances[c.id] || 0) + part).toFixed(2);
        });
      }

      const tx: Transaction = {
        id: crypto.randomUUID(), type: "income", amount,
        categoryId: specificCategoryId || "all", note, date: new Date().toISOString(), split,
      };
      return { ...prev, balances, transactions: [tx, ...prev.transactions] };
    });
  }, []);

  const addExpense = useCallback((categoryId: string, amount: number, note?: string) => {
    if (!amount || amount <= 0) return;
    setState((prev) => {
      const balances = { ...prev.balances };
      balances[categoryId] = +((balances[categoryId] || 0) - amount).toFixed(2);
      
      const cat = prev.categories.find((c) => c.id === categoryId);
      if (cat && cat.type === "expense") {
        const availableBox = prev.categories.find((c) => c.type === "available");
        if (availableBox) {
          balances[availableBox.id] = +((balances[availableBox.id] || 0) - amount).toFixed(2);
        }
      }

      const tx: Transaction = {
        id: crypto.randomUUID(), type: "expense", amount,
        categoryId, note, date: new Date().toISOString(),
      };
      return { ...prev, balances, transactions: [tx, ...prev.transactions] };
    });
  }, []);

  const importTransactions = useCallback((items: ImportItem[]) => {
    let imported = 0, skipped = 0;
    setState((prev) => {
      const existing = new Set(prev.transactions.map((t) => t.hash).filter(Boolean) as string[]);
      const balances = { ...prev.balances };
      const newTx: Transaction[] = [];
      
      for (const it of items) {
        if (existing.has(it.hash)) { skipped++; continue; }
        existing.add(it.hash);
        const isIncome = it.amount >= 0;
        const abs = Math.abs(+it.amount.toFixed(2));
        
        if (isIncome) {
          const split: Record<string, number> = {};
          const distributableCategories = prev.categories.filter((c) => c.type === "savings" || c.type === "available");
          distributableCategories.forEach((c) => {
            if (!c.allocation) return;
            const part = +(abs * c.allocation / 100).toFixed(2);
            split[c.id] = part;
            balances[c.id] = +((balances[c.id] || 0) + part).toFixed(2);
          });
          newTx.push({
            id: crypto.randomUUID(), type: "income", amount: abs, categoryId: "all",
            note: it.concept, date: it.date, hash: it.hash, imported: true, split,
          });
        } else {
          balances[it.categoryId] = +((balances[it.categoryId] || 0) - abs).toFixed(2);
          
          const cat = prev.categories.find((c) => c.id === it.categoryId);
          if (cat && cat.type === "expense") {
            const availableBox = prev.categories.find((c) => c.type === "available");
            if (availableBox) {
              balances[availableBox.id] = +((balances[availableBox.id] || 0) - abs).toFixed(2);
            }
          }

          newTx.push({
            id: crypto.randomUUID(), type: "expense", amount: abs, categoryId: it.categoryId,
            note: it.concept, date: it.date, hash: it.hash, imported: true,
          });
        }
        imported++;
      }
      return { ...prev, balances, transactions: [...newTx, ...prev.transactions] };
    });
    return { imported, skipped };
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setState((prev) => {
      const tx = prev.transactions.find((t) => t.id === id);
      if (!tx) return prev;
      const balances = { ...prev.balances };
      
      if (tx.type === "income" && tx.split) {
        for (const [catId, part] of Object.entries(tx.split)) {
          balances[catId] = +((balances[catId] || 0) - part).toFixed(2);
        }
      } else if (tx.type === "expense") {
        balances[tx.categoryId] = +((balances[tx.categoryId] || 0) + tx.amount).toFixed(2);
        
        const cat = prev.categories.find((c) => c.id === tx.categoryId);
        if (cat && cat.type === "expense") {
          const availableBox = prev.categories.find((c) => c.type === "available");
          if (availableBox) {
            balances[availableBox.id] = +((balances[availableBox.id] || 0) + tx.amount).toFixed(2);
          }
        }
      }
      return {
        ...prev,
        balances,
        transactions: prev.transactions.filter((t) => t.id !== id),
      };
    });
  }, []);

  const removeMonth = useCallback((year: number, month: number) => {
    let removed = 0;
    setState((prev) => {
      const balances = { ...prev.balances };
      const keep: Transaction[] = [];
      for (const t of prev.transactions) {
        const d = new Date(t.date);
        if (d.getFullYear() === year && d.getMonth() === month) {
          if (t.type === "income" && t.split) {
            for (const [catId, part] of Object.entries(t.split)) {
              balances[catId] = +((balances[catId] || 0) - part).toFixed(2);
            }
          } else if (t.type === "expense") {
            balances[t.categoryId] = +((balances[t.categoryId] || 0) + t.amount).toFixed(2);
            const cat = prev.categories.find((c) => c.id === t.categoryId);
            if (cat && cat.type === "expense") {
              const availableBox = prev.categories.find((c) => c.type === "available");
              if (availableBox) {
                balances[availableBox.id] = +((balances[availableBox.id] || 0) + t.amount).toFixed(2);
              }
            }
          }
          removed++;
        } else {
          keep.push(t);
        }
      }
      return { ...prev, balances, transactions: keep };
    });
    return removed;
  }, []);

  /* ---- category CRUD ---- */
  const addCategory = useCallback((c: Omit<Category, "id">) => {
    const id = crypto.randomUUID();
    setState((prev) => ({
      ...prev,
      categories: [...prev.categories, { ...c, id }],
      balances: { ...prev.balances, [id]: 0 },
    }));
    return id;
  }, []);

  const updateCategory = useCallback((id: string, patch: Partial<Category>) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => c.id === id ? { ...c, ...patch } : c),
    }));
  }, []);

  const removeCategory = useCallback((id: string, fallbackId?: string) => {
    setState((prev) => {
      const cat = prev.categories.find((c) => c.id === id);
      if (!cat || cat.locked) return prev;
      const balances = { ...prev.balances };
      const removedBal = balances[id] || 0;
      delete balances[id];
      let transactions = prev.transactions;
      if (fallbackId && prev.categories.some((c) => c.id === fallbackId)) {
        balances[fallbackId] = +((balances[fallbackId] || 0) + removedBal).toFixed(2);
        transactions = transactions.map((t) => t.categoryId === id ? { ...t, categoryId: fallbackId } : t);
      } else {
        transactions = transactions.filter((t) => t.categoryId !== id);
      }
      return {
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
        balances,
        transactions,
      };
    });
  }, []);

  const setAllocations = useCallback((alloc: Record<string, number>) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => ({ ...c, allocation: alloc[c.id] ?? c.allocation })),
    }));
  }, []);

  const countTransactionsByCategory = useCallback((id: string) => {
    return state.transactions.filter((t) => t.categoryId === id).length;
  }, [state.transactions]);

  const reset = useCallback(() => {
    const balances: Record<string, number> = {};
    DEFAULT_CATEGORIES.forEach((c) => (balances[c.id] = 0));
    setState({ categories: DEFAULT_CATEGORIES, balances, transactions: [] });
  }, []);

  const setTravelSavings = useCallback((n: number) => {
    setState((p) => ({ ...p, balances: { ...p.balances, travel: n } }));
  }, []);

  const value = useMemo<FinanceContextValue>(() => ({
    ...state,
    addIncome, addExpense, importTransactions, removeTransaction, removeMonth,
    addCategory, updateCategory, removeCategory, setAllocations,
    countTransactionsByCategory, reset,
    travelSavings: state.balances.travel ?? 0, setTravelSavings,
  }), [state, addIncome, addExpense, importTransactions, removeTransaction, removeMonth, addCategory, updateCategory, removeCategory, setAllocations, countTransactionsByCategory, reset, setTravelSavings]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}

import {
  Home, PiggyBank, Plane, Sparkles, Wallet, Heart, ShoppingCart, Car,
  Utensils, Coffee, Gift, Music, Film, Book, GraduationCap, Briefcase,
  Dumbbell, Stethoscope, PawPrint, Baby, Tv, Smartphone, Globe, Zap,
  TrendingUp, CreditCard, Landmark, Building2, Bus, Train,
} from "lucide-react";

export const CATEGORY_ICONS = {
  Home, PiggyBank, Plane, Sparkles, Wallet, Heart, ShoppingCart, Car,
  Utensils, Coffee, Gift, Music, Film, Book, GraduationCap, Briefcase,
  Dumbbell, Stethoscope, PawPrint, Baby, Tv, Smartphone, Globe, Zap,
  TrendingUp, CreditCard, Landmark, Building2, Bus, Train,
} as const;

export type CategoryIconName = keyof typeof CATEGORY_ICONS;

export function getCategoryIcon(name: string) {
  return (CATEGORY_ICONS as Record<string, any>)[name] || Sparkles;
}

export const CATEGORY_COLORS = [
  "210 90% 60%", "190 95% 55%", "152 75% 48%", "45 95% 58%",
  "280 75% 65%", "330 80% 65%", "6 80% 68%", "260 70% 65%",
  "170 70% 50%", "30 90% 60%", "100 60% 55%", "220 70% 70%",
];