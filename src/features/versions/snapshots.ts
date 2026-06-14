/**
 * Versiones de Mí Mismo — snapshot capture & comparison helpers.
 *
 * Reads directly from localStorage (the same keys used by the other
 * feature contexts) to build a self-contained snapshot of the user's
 * state across health, travel, knowledge, finance and legacy.
 */

const SNAPSHOT_KEY = "versions.snapshots.v1";

export interface HealthSnap {
  trainedDays: number;
  restDays: number;
  trainedPct: number;
  avgKcal: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgWater: number; // glasses/day
  avgWaterMl: number;
  lastWeight?: number;
  lastWaist?: number;
  lastLegs?: number;
  lastArmLeft?: number;
  lastArmRight?: number;
  lastPhoto?: string;
  weightStart?: number;
}

export interface TravelSnap {
  visitedCount: number;
  wishlistCount: number;
  countries: string[]; // names
  totalSpend: number;
}

export interface KnowledgeSnap {
  booksRead: number;
  readTitles: { title: string; author: string }[];
  languages: { name: string; level: string }[];
  milestones: { title: string; year: string; status: string }[];
}

export interface FinanceSnap {
  totalSaved: number;       // sum of savings categories balances (snapshot moment)
  income6m: number;
  expenses6m: number;
  saved6m: number;
  savingsRate: number;      // % saved / income in window
}

export interface LegacySnap {
  completed: { id: string; title: string; level: string }[];
}

export interface Snapshot {
  id: string;
  label: string;
  createdAt: string;     // ISO
  periodStart: string;   // ISO (createdAt - 6 months)
  periodEnd: string;     // ISO
  health: HealthSnap;
  travel: TravelSnap;
  knowledge: KnowledgeSnap;
  finance: FinanceSnap;
  legacy: LegacySnap;
}

/* ---------------- storage ---------------- */

export function loadSnapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Snapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSnapshots(list: Snapshot[]) {
  try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(list)); } catch { /* */ }
}

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

/* ---------------- capture ---------------- */

function monthsAgo(d: Date, n: number) {
  const c = new Date(d);
  c.setMonth(c.getMonth() - n);
  return c;
}

function captureHealth(periodStart: Date, periodEnd: Date): HealthSnap {
  type Rec = { foods: { kcal: number; protein: number; carbs: number; fat: number }[]; activities: { kcal: number }[]; glasses: number };
  const records = readLS<Record<string, Rec>>("health.records", {});
  const glassMl = readLS<number>("health.glassMl", 250);
  const weights = readLS<{ date: string; weight: number; waist: number; legs?: number; arms?: number; armLeft?: number; armRight?: number; photo?: string }[]>("health.weights", []);

  const dates = Object.keys(records).filter((d) => {
    const dt = new Date(d);
    return dt >= periodStart && dt <= periodEnd;
  });

  let trained = 0, rest = 0;
  let kcal = 0, p = 0, c = 0, f = 0, glasses = 0;
  for (const d of dates) {
    const r = records[d];
    const dayK = r.foods.reduce((s, x) => s + (x.kcal || 0), 0);
    const dayP = r.foods.reduce((s, x) => s + (x.protein || 0), 0);
    const dayC = r.foods.reduce((s, x) => s + (x.carbs || 0), 0);
    const dayF = r.foods.reduce((s, x) => s + (x.fat || 0), 0);
    kcal += dayK; p += dayP; c += dayC; f += dayF;
    glasses += r.glasses || 0;
    if ((r.activities?.length || 0) > 0) trained++; else rest++;
  }
  const n = Math.max(1, dates.length);
  const totalDays = trained + rest;
  const trainedPct = totalDays ? Math.round((trained / totalDays) * 100) : 0;

  const inWindow = weights.filter((w) => {
    const dt = new Date(w.date);
    return dt >= periodStart && dt <= periodEnd;
  }).sort((a, b) => a.date.localeCompare(b.date));
  const first = inWindow[0];
  const last = inWindow[inWindow.length - 1] ?? weights[weights.length - 1];

  return {
    trainedDays: trained,
    restDays: rest,
    trainedPct,
    avgKcal: Math.round(kcal / n),
    avgProtein: Math.round(p / n),
    avgCarbs: Math.round(c / n),
    avgFat: Math.round(f / n),
    avgWater: +(glasses / n).toFixed(1),
    avgWaterMl: Math.round((glasses / n) * glassMl),
    lastWeight: last?.weight,
    lastWaist: last?.waist,
    lastLegs: last?.legs,
    lastArmLeft: last?.armLeft ?? last?.arms,
    lastArmRight: last?.armRight ?? last?.arms,
    lastPhoto: last?.photo,
    weightStart: first?.weight,
  };
}

function captureTravel(): TravelSnap {
  const entries = readLS<Record<string, { status: string; countryName?: string; countryID: string; spend?: number }>>("travel.entries.v1", {});
  let v = 0, w = 0, spend = 0;
  const countries: string[] = [];
  Object.values(entries).forEach((e) => {
    if (e.status === "visited") {
      v++;
      countries.push(e.countryName || e.countryID);
    }
    if (e.status === "wishlist") w++;
    spend += Number(e.spend || 0);
  });
  return { visitedCount: v, wishlistCount: w, countries: countries.sort(), totalSpend: Math.round(spend) };
}

function captureKnowledge(): KnowledgeSnap {
  const books = readLS<{ title: string; author: string; status: string }[]>("knowledge.books.v1", []);
  const languages = readLS<{ name: string; current: string }[]>("knowledge.languages.v1", []);
  const milestones = readLS<{ title: string; year: string; status: string }[]>("knowledge.milestones.v1", []);
  const read = books.filter((b) => b.status === "read");
  return {
    booksRead: read.length,
    readTitles: read.map((b) => ({ title: b.title, author: b.author })),
    languages: languages.map((l) => ({ name: l.name, level: l.current })),
    milestones: milestones.map((m) => ({ title: m.title, year: m.year, status: m.status })),
  };
}

function captureFinance(periodStart: Date, periodEnd: Date): FinanceSnap {
  const state = readLS<{
    categories: { id: string; type: string }[];
    balances: Record<string, number>;
    transactions: { type: "income" | "expense"; amount: number; date: string; categoryId: string; split?: Record<string, number> }[];
  }>("finance.state.v2", { categories: [], balances: {}, transactions: [] });

  const savingsCats = new Set(state.categories.filter((c) => c.type === "savings").map((c) => c.id));
  const totalSaved = Object.entries(state.balances)
    .filter(([id]) => savingsCats.has(id))
    .reduce((s, [, v]) => s + (v || 0), 0);

  let income = 0, expenses = 0, saved6m = 0;
  for (const t of state.transactions) {
    const dt = new Date(t.date);
    if (dt < periodStart || dt > periodEnd) continue;
    if (t.type === "income") {
      income += t.amount;
      if (t.split) {
        for (const [cid, part] of Object.entries(t.split)) {
          if (savingsCats.has(cid)) saved6m += part;
        }
      }
    } else {
      expenses += t.amount;
    }
  }
  const rate = income > 0 ? Math.round((saved6m / income) * 100) : 0;
  return {
    totalSaved: Math.round(totalSaved),
    income6m: Math.round(income),
    expenses6m: Math.round(expenses),
    saved6m: Math.round(saved6m),
    savingsRate: rate,
  };
}

function captureLegacy(): LegacySnap {
  // Corrección: Usar la clave v2 que es donde realmente guardan los Objetivos.
  const goals = readLS<{ id: string; title: string; level: string; done?: boolean; progress?: number }[]>("legado.goals.v2", []);
  const completed = goals
    .filter((g) => g.done || (g.level === "objective" && (g.progress ?? 0) >= 100))
    .map((g) => ({ id: g.id, title: g.title, level: g.level }));
  return { completed };
}

export function createSnapshot(label: string): Snapshot {
  const now = new Date();
  const start = monthsAgo(now, 6);
  return {
    id: crypto.randomUUID(),
    label,
    createdAt: now.toISOString(),
    periodStart: start.toISOString(),
    periodEnd: now.toISOString(),
    health: captureHealth(start, now),
    travel: captureTravel(),
    knowledge: captureKnowledge(),
    finance: captureFinance(start, now),
    legacy: captureLegacy(),
  };
}

/** Suggest next semantic version label based on existing snapshots. */
export function suggestNextLabel(list: Snapshot[]): string {
  if (list.length === 0) return "Versión 1.0";
  const nums = list
    .map((s) => /Versi[oó]n\s+(\d+(?:\.\d+)?)/i.exec(s.label)?.[1])
    .filter(Boolean)
    .map(Number);
  const max = nums.length ? Math.max(...nums) : 1.0;
  return `Versión ${(max + 0.5).toFixed(1)}`;
}

/* ---------------- diff helpers ---------------- */

export function diffPct(a: number, b: number): number | null {
  if (!a) return b ? null : 0;
  return Math.round(((b - a) / Math.abs(a)) * 100);
}

export function listDiff<T extends string>(a: T[], b: T[]): { added: T[]; removed: T[] } {
  const sa = new Set(a), sb = new Set(b);
  return {
    added: b.filter((x) => !sa.has(x)),
    removed: a.filter((x) => !sb.has(x)),
  };
}