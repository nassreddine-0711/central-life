export type Priority = "low" | "med" | "high";
export type Category = "Trabajo" | "Universidad" | "Personal" | "Otros";

// NEW: Task complexity — quick/simple vs long/complex
export type Complexity = "quick" | "deep";
export const COMPLEXITY_LABEL: Record<Complexity, string> = {
  quick: "Rápida",
  deep: "Profunda",
};
export const COMPLEXITY_DESC: Record<Complexity, string> = {
  quick: "Menos de 30 min · simple",
  deep: "Más de 30 min · requiere concentración",
};

export interface LinkedRef {
  kind: "book" | "media" | "course" | "milestone";
  id: string;
  title: string;
}

export type RecurrenceFreq = "daily" | "weekly" | "monthly" | "yearly";

export interface Recurrence {
  freq: RecurrenceFreq;
  /** Para freq === "weekly": 0=Lun … 6=Dom. Vacío = mismo día de la semana. */
  weekdays?: number[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  photo?: string;
  category: Category;
  priority: Priority;
  complexity?: Complexity;   // NEW
  date?: string;
  done: boolean;
  completedAt?: string;
  inbox?: boolean;
  createdAt: string;
  linkedNoteId?: string;
  linkedMilestoneId?: string;
  recurrence?: Recurrence;
  /** Si pertenece a un Proyecto (Kanban), id del proyecto y columna actual. */
  projectId?: string;
  stage?: ProjectStage;
}

/* ---------- Proyectos (Kanban) ---------- */
export type ProjectStage = "backlog" | "doing" | "blocked" | "done";

export const PROJECT_STAGES: { key: ProjectStage; label: string }[] = [
  { key: "backlog", label: "Por hacer" },
  { key: "doing", label: "En curso" },
  { key: "blocked", label: "Bloqueado" },
  { key: "done", label: "Hecho" },
];

export interface Project {
  id: string;
  title: string;
  description?: string;
  color?: string;
  /** Id de un Goal (RoadMap) marcado como proyecto, si viene de ahí. */
  linkedGoalId?: string;
  archived?: boolean;
  createdAt: string;
}

export const PROJECTS_KEY = "cerebro.projects.v1";

export const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"] as const;
export const WEEKDAY_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

/** Próxima fecha tras `from` siguiendo la recurrencia. Devuelve ISO string. */
export function nextRecurrence(rec: Recurrence, from: Date): Date {
  const d = new Date(from);
  if (rec.freq === "daily") { d.setDate(d.getDate() + 1); return d; }
  if (rec.freq === "monthly") { d.setMonth(d.getMonth() + 1); return d; }
  if (rec.freq === "yearly") { d.setFullYear(d.getFullYear() + 1); return d; }
  // weekly
  if (rec.weekdays && rec.weekdays.length > 0) {
    const toIdx = (js: number) => (js + 6) % 7;
    for (let i = 1; i <= 7; i++) {
      const cand = new Date(d);
      cand.setDate(cand.getDate() + i);
      if (rec.weekdays.includes(toIdx(cand.getDay()))) return cand;
    }
  }
  d.setDate(d.getDate() + 7);
  return d;
}

export function describeRecurrence(rec: Recurrence): string {
  if (rec.freq === "daily") return "Cada día";
  if (rec.freq === "monthly") return "Cada mes";
  if (rec.freq === "yearly") return "Cada año";
  if (rec.weekdays && rec.weekdays.length > 0) {
    return "Sem · " + rec.weekdays.slice().sort((a, b) => a - b).map(i => WEEKDAY_LABELS[i]).join(" ");
  }
  return "Cada semana";
}

export interface Note {
  id: string;
  kind: "note" | "ref";
  title: string;
  content: string;
  url?: string;
  photo?: string;
  tags: string[];
  category: string;
  createdAt: string;
  linkedTo?: LinkedRef;
}

export const TASKS_KEY = "cerebro.tasks.v1";
export const NOTES_KEY = "cerebro.notes.v1";
export const NOTE_CATS_KEY = "cerebro.noteCategories.v1";
export const DEFAULT_NOTE_CAT = "General";

export const CATEGORIES: Category[] = ["Trabajo", "Universidad", "Personal", "Otros"];

export const CAT_COLORS: Record<Category, string> = {
  Trabajo: "bg-primary/15 text-primary border-primary/30",
  Universidad: "bg-accent/15 text-accent-foreground border-accent/30",
  Personal: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Otros: "bg-muted text-muted-foreground border-border",
};

export const PRIO_COLORS: Record<Priority, string> = {
  low: "text-muted-foreground",
  med: "text-amber-500",
  high: "text-rose-500",
};

export const PRIO_LABEL: Record<Priority, string> = {
  high: "Alta",
  med: "Media",
  low: "Baja",
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function load<T>(k: string, fallback: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}