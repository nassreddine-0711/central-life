import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from "react";
import { FOOD_DB, ACTIVITY_PRESETS, Food } from "./foodDatabase";
import { todayISO as todayISOHelper } from "./dateUtils";

export interface FoodEntry {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ActivityEntry {
  id: string;
  type: string;
  kcal: number;
}

export interface CustomFood extends Food {
  id: string;
}

export interface CustomActivity {
  id: string;
  type: string;
  kcal: number;
}

export interface WeightEntry {
  date: string;
  weight: number;
  waist: number;
  legs?: number;
  /** @deprecated Use armLeft / armRight. Kept for backward compatibility with old saved data. */
  arms?: number;
  armLeft?: number;
  armRight?: number;
  photo?: string;
}

interface DailyRecord {
  foods: FoodEntry[];
  activities: ActivityEntry[];
  glasses: number;
}

interface HealthState {
  // settings
  bmr: number;
  setBmr: (n: number) => void;
  hydrationGoal: number;
  setHydrationGoal: (n: number) => void;
  glassMl: number;
  setGlassMl: (n: number) => void;

  // selected day (for editing)
  today: string;          // real "today"
  selectedDate: string;   // currently viewed date (YYYY-MM-DD)
  setSelectedDate: (d: string) => void;
  goToToday: () => void;
  isToday: boolean;

  // current selected day data
  glasses: number;
  setGlasses: (n: number) => void;
  foods: FoodEntry[];
  activities: ActivityEntry[];
  addFood: (f: Omit<FoodEntry, "id">, count?: number) => void;
  removeFood: (id: string) => void;
  addActivity: (a: Omit<ActivityEntry, "id">) => void;
  removeActivity: (id: string) => void;

  // dictionaries
  customFoods: CustomFood[];
  addCustomFood: (f: Food) => void;
  removeCustomFood: (id: string) => void;
  allFoods: Food[];

  customActivities: CustomActivity[];
  addCustomActivity: (a: Omit<CustomActivity, "id">) => void;
  removeCustomActivity: (id: string) => void;

  hiddenPresets: string[];
  hidePreset: (key: string) => void;
  restorePresets: () => void;

  // computed for selected day
  consumed: number;
  burned: number;
  balance: number;
  macros: { protein: number; carbs: number; fat: number };
  weights: WeightEntry[];
  addWeight: (w: WeightEntry) => void;
  removeWeight: (date: string) => void;

  // history
  records: Record<string, DailyRecord>;
  getDayStats: (date: string) => {
    consumed: number;
    burned: number;
    balance: number;
    glasses: number;
    totalMl: number;
    macros: { protein: number; carbs: number; fat: number };
    foods: FoodEntry[];
    activities: ActivityEntry[];
    caloriesGoalMet: boolean;
    hydrationGoalMet: boolean;
    hasData: boolean;
  };
}

export type { DailyRecord };

const HealthContext = createContext<HealthState | null>(null);

const seedWeights: WeightEntry[] = [
  { date: "2025-11-01", weight: 82.4, waist: 88, legs: 58, armLeft: 33.8, armRight: 34.2, photo: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600" },
  { date: "2025-12-01", weight: 81.1, waist: 87, legs: 58.5, armLeft: 34.3, armRight: 34.7, photo: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600" },
  { date: "2026-01-01", weight: 80.0, waist: 86, legs: 59, armLeft: 34.8, armRight: 35.2, photo: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600" },
  { date: "2026-02-01", weight: 79.2, waist: 85, legs: 59.2, armLeft: 35.0, armRight: 35.4, photo: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600" },
  { date: "2026-03-01", weight: 78.4, waist: 84, legs: 59.5, armLeft: 35.3, armRight: 35.7, photo: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600" },
  { date: "2026-04-01", weight: 77.6, waist: 83, legs: 60, armLeft: 35.8, armRight: 36.2, photo: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=600" },
];

const todayISO = todayISOHelper;

function loadLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveLS<T>(key: string, v: T) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}

const K = {
  bmr: "health.bmr",
  hyd: "health.hydrationGoal",
  ml: "health.glassMl",
  customFoods: "health.customFoods",
  customActivities: "health.customActivities",
  records: "health.records", // { [date]: DailyRecord }
  hiddenPresets: "health.hiddenPresets",
  weights: "health.weights",
};

export function HealthProvider({ children }: { children: ReactNode }) {
  const [bmr, setBmrState] = useState<number>(() => loadLS(K.bmr, 1750));
  const [hydrationGoal, setHydrationGoalState] = useState<number>(() => loadLS(K.hyd, 8));
  const [glassMl, setGlassMlState] = useState<number>(() => loadLS(K.ml, 250));

  const [customFoods, setCustomFoods] = useState<CustomFood[]>(() => loadLS(K.customFoods, []));
  const [customActivities, setCustomActivities] = useState<CustomActivity[]>(() => loadLS(K.customActivities, []));
  const [hiddenPresets, setHiddenPresets] = useState<string[]>(() => loadLS(K.hiddenPresets, []));

  const [records, setRecords] = useState<Record<string, DailyRecord>>(() => loadLS(K.records, {}));
  const [weights, setWeights] = useState<WeightEntry[]>(() => loadLS(K.weights, seedWeights));

  const [today, setToday] = useState<string>(todayISO());
  const [selectedDate, setSelectedDateState] = useState<string>(todayISO());

  // Auto-detect day change (every 30s). When the system date crosses 00:00,
  // refresh `today`; if user was viewing the previous "today", advance them.
  useEffect(() => {
    const tick = () => {
      const now = todayISO();
      setToday((prev) => {
        if (prev !== now) {
          // If user was on the old "today", move them to the new one.
          setSelectedDateState((sel) => (sel === prev ? now : sel));
          return now;
        }
        return prev;
      });
    };
    const id = window.setInterval(tick, 30_000);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const current: DailyRecord = records[selectedDate] ?? { foods: [], activities: [], glasses: 0 };

  // persistence
  useEffect(() => saveLS(K.bmr, bmr), [bmr]);
  useEffect(() => saveLS(K.hyd, hydrationGoal), [hydrationGoal]);
  useEffect(() => saveLS(K.ml, glassMl), [glassMl]);
  useEffect(() => saveLS(K.customFoods, customFoods), [customFoods]);
  useEffect(() => saveLS(K.customActivities, customActivities), [customActivities]);
  useEffect(() => saveLS(K.records, records), [records]);
  useEffect(() => saveLS(K.hiddenPresets, hiddenPresets), [hiddenPresets]);
  useEffect(() => saveLS(K.weights, weights), [weights]);

  const setSelectedDate = useCallback((d: string) => setSelectedDateState(d), []);
  const goToToday = useCallback(() => setSelectedDateState(todayISO()), []);

  const addWeight = (w: WeightEntry) =>
    setWeights((arr) => {
      const filtered = arr.filter((x) => x.date !== w.date);
      return [...filtered, w].sort((a, b) => a.date.localeCompare(b.date));
    });
  const removeWeight = (date: string) =>
    setWeights((arr) => arr.filter((x) => x.date !== date));

  const hidePreset = (key: string) =>
    setHiddenPresets((s) => (s.includes(key) ? s : [...s, key]));
  const restorePresets = () => setHiddenPresets([]);

  const updateSelected = (patch: Partial<DailyRecord>) => {
    setRecords((r) => ({
      ...r,
      [selectedDate]: { ...(r[selectedDate] ?? { foods: [], activities: [], glasses: 0 }), ...patch },
    }));
  };

  const setBmr = (n: number) => setBmrState(Math.max(0, Math.round(n)));
  const setHydrationGoal = (n: number) => setHydrationGoalState(Math.max(1, Math.round(n)));
  const setGlassMl = (n: number) => setGlassMlState(Math.max(50, Math.round(n)));

  const setGlasses = (n: number) =>
    updateSelected({ glasses: Math.max(0, Math.min(hydrationGoal, n)) });

  const addFood = (f: Omit<FoodEntry, "id">, count: number = 1) => {
    const n = Math.max(1, Math.floor(count));
    const newItems: FoodEntry[] = Array.from({ length: n }, () => ({ ...f, id: crypto.randomUUID() }));
    setRecords((r) => {
      const prev = r[selectedDate] ?? { foods: [], activities: [], glasses: 0 };
      return { ...r, [selectedDate]: { ...prev, foods: [...prev.foods, ...newItems] } };
    });
  };
  const removeFood = (id: string) =>
    updateSelected({ foods: current.foods.filter((x) => x.id !== id) });

  const addActivity = (a: Omit<ActivityEntry, "id">) =>
    updateSelected({ activities: [...current.activities, { ...a, id: crypto.randomUUID() }] });
  const removeActivity = (id: string) =>
    updateSelected({ activities: current.activities.filter((x) => x.id !== id) });

  const addCustomFood = (f: Food) =>
    setCustomFoods((s) => [{ ...f, id: crypto.randomUUID() }, ...s]);
  const removeCustomFood = (id: string) =>
    setCustomFoods((s) => s.filter((x) => x.id !== id));

  const addCustomActivity = (a: Omit<CustomActivity, "id">) =>
    setCustomActivities((s) => [{ ...a, id: crypto.randomUUID() }, ...s]);
  const removeCustomActivity = (id: string) =>
    setCustomActivities((s) => s.filter((x) => x.id !== id));

  const value = useMemo<HealthState>(() => {
    const consumed = current.foods.reduce((s, f) => s + f.kcal, 0);
    const burned = current.activities.reduce((s, a) => s + a.kcal, 0);
    const balance = consumed - (bmr + burned);
    const macros = current.foods.reduce(
      (acc, f) => ({
        protein: acc.protein + f.protein,
        carbs: acc.carbs + f.carbs,
        fat: acc.fat + f.fat,
      }),
      { protein: 0, carbs: 0, fat: 0 }
    );

    const allFoods: Food[] = [
      ...customFoods.map(({ id, ...rest }) => rest),
      ...FOOD_DB,
    ];

    return {
      bmr, setBmr,
      hydrationGoal, setHydrationGoal,
      glassMl, setGlassMl,
      today,
      selectedDate, setSelectedDate, goToToday,
      isToday: selectedDate === today,
      glasses: current.glasses,
      setGlasses,
      foods: current.foods,
      activities: current.activities,
      addFood, removeFood, addActivity, removeActivity,
      customFoods, addCustomFood, removeCustomFood, allFoods,
      customActivities, addCustomActivity, removeCustomActivity,
      hiddenPresets, hidePreset, restorePresets,
      consumed, burned, balance, macros,
      weights,
      addWeight, removeWeight,
      records,
      getDayStats: (date: string) => {
        const r = records[date];
        const foods = r?.foods ?? [];
        const activities = r?.activities ?? [];
        const glassesD = r?.glasses ?? 0;
        const consumedD = foods.reduce((s, f) => s + f.kcal, 0);
        const burnedD = activities.reduce((s, a) => s + a.kcal, 0);
        const balanceD = consumedD - (bmr + burnedD);
        const macrosD = foods.reduce(
          (acc, f) => ({ protein: acc.protein + f.protein, carbs: acc.carbs + f.carbs, fat: acc.fat + f.fat }),
          { protein: 0, carbs: 0, fat: 0 }
        );
        const totalMl = glassesD * glassMl;
        const hasData = foods.length > 0 || activities.length > 0 || glassesD > 0;
        const caloriesGoalMet = hasData && consumedD > 0 && balanceD <= 0;
        const hydrationGoalMet = glassesD >= hydrationGoal;
        return {
          consumed: consumedD, burned: burnedD, balance: balanceD,
          glasses: glassesD, totalMl, macros: macrosD,
          foods, activities, caloriesGoalMet, hydrationGoalMet, hasData,
        };
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bmr, hydrationGoal, glassMl, customFoods, customActivities, hiddenPresets, records, weights, today, selectedDate]);

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>;
}

export function useHealth() {
  const ctx = useContext(HealthContext);
  if (!ctx) throw new Error("useHealth must be used within HealthProvider");
  return ctx;
}
