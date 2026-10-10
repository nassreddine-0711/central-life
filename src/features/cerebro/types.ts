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

// NEW: franja horaria del día en la que se agenda la tarea (vista mensual)
export type DayPart = "morning" | "midday" | "afternoon" | "evening";
export const DAY_PART_LABEL: Record<DayPart, string> = {
  morning: "Mañana",
  midday: "Mediodía",
  afternoon: "Tarde",
  evening: "Noche",
};
export const DAY_PART_ORDER: DayPart[] = ["morning", "midday", "afternoon", "evening"];

export interface Task {
  id: string;
  title: string;
  description?: string;
  photo?: string;
  category: Category;
  priority: Priority;
  complexity?: Complexity;   // NEW
  dayPart?: DayPart;         // NEW: mañana/mediodía/tarde/noche (por defecto "morning")
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

/* ---------- Proyectos (Kanban interno de tareas por proyecto) ---------- */
export type ProjectStage = "todo" | "doing" | "blocked" | "done";

export const PROJECT_STAGES: { key: ProjectStage; label: string }[] = [
  { key: "todo", label: "Sin empezar" },
  { key: "doing", label: "En curso" },
  { key: "blocked", label: "Bloqueado" },
  { key: "done", label: "Terminadas" },
];

/* ---------- Proyectos (Kanban superior: siguiente / en curso / finalizado + inbox) ---------- */
export type ProjectStatus = "inbox" | "next" | "doing" | "done";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  inbox: "Inbox",
  next: "Siguiente proyecto",
  doing: "Proyecto en curso",
  done: "Proyecto finalizado",
};

/** Columnas del kanban superior, en orden (el Inbox se pinta aparte, debajo). */
export const PROJECT_KANBAN_STATUSES: ProjectStatus[] = ["next", "doing", "done"];

export interface Project {
  id: string;
  title: string;
  description?: string;
  color?: string;
  status: ProjectStatus;
  categoryId?: string;
  /** Fecha de inicio del proyecto. */
  startDate?: string;
  /** Fecha final del proyecto (fecha límite / cuenta atrás). */
  dueDate?: string;
  /** Id de un Goal (RoadMap) marcado como proyecto, si viene de ahí. */
  linkedGoalId?: string;
  archived?: boolean;
  createdAt: string;
  /** Presupuesto total asignado al proyecto (los gastos viven en ProjectExpense). */
  budgetTotal?: number;
  /** Horario semanal del acumulador de tiempo dedicado: qué días y cuántos minutos. */
  timeSchedule?: ProjectTimeSlot[];
  /** Fechas (yyyy-MM-dd) de sesiones programadas que el usuario dijo que NO hizo,
   *  para no volver a preguntar por ellas. */
  timeDeclinedDates?: string[];
}

/** Una franja del horario semanal del acumulador de tiempo: 0=Lunes ... 6=Domingo. */
export interface ProjectTimeSlot {
  weekday: number;
  minutes: number;
}

/** Una sesion de tiempo dedicado ya confirmada por el usuario (se acumula). */
export interface ProjectTimeEntry {
  id: string;
  projectId: string;
  /** Fecha (yyyy-MM-dd) del dia programado al que corresponde. */
  date: string;
  minutes: number;
  createdAt: string;
}

export const PROJECT_TIME_ENTRIES_KEY = "cerebro.projectTimeEntries.v1";

/** Un gasto dentro del presupuesto de un proyecto. */
export interface ProjectExpense {
  id: string;
  projectId: string;
  title: string;
  amount: number;
  date: string;
  createdAt: string;
}

export const PROJECT_EXPENSES_KEY = "cerebro.projectExpenses.v1";

/** Un "objetivo" del proyecto: el kanban interno (antes era de tareas) ahora vive aqui. */
export interface Objetivo {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  stage: ProjectStage;
  createdAt: string;
}

export const OBJETIVOS_KEY = "cerebro.objetivos.v1";

export type RetroResult = "achieved" | "pending";
export const RETRO_RESULT_LABEL: Record<RetroResult, string> = {
  achieved: "Logrado",
  pending: "Pendiente de ajustar",
};

/** Una entrada del diario de retrospectiva de un proyecto. */
export interface RetroEntry {
  id: string;
  projectId: string;
  wentWell: string;
  toImprove: string;
  result: RetroResult;
  createdAt: string;
}

export const RETRO_ENTRIES_KEY = "cerebro.retroEntries.v1";

export const PROJECTS_KEY = "cerebro.projects.v1";

/** Categorías de proyecto, creables/editables por el usuario. */
export interface ProjectCategory {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

export const PROJECT_CATS_KEY = "cerebro.projectCategories.v1";

export const PROJECT_CAT_PALETTE = [
  "#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#a855f7", "#ef4444", "#84cc16",
];

/** Entrada de "actualización" (estilo commit) del historial de un proyecto. */
export interface ProjectUpdate {
  id: string;
  projectId: string;
  text: string;
  createdAt: string;
}

export const PROJECT_UPDATES_KEY = "cerebro.projectUpdates.v1";

/* ---------- Archivo (árbol de carpetas 100% local) ----------
   Árbol de carpetas propio de la app, sin ninguna relación con Google Drive.
   Hay una carpeta fija "Proyectos" (PROJECTS_ROOT_FOLDER_ID) que siempre existe;
   al crear un proyecto se le crea automáticamente una subcarpeta ahí dentro
   (vinculada por projectId), que se renombra/borra junto con el proyecto. */
export const PROJECTS_ROOT_FOLDER_ID = "proyectos-root";

export interface ApunteFolder {
  id: string;
  name: string;
  color?: string;
  /** Carpeta padre en el árbol local (null/undefined = raíz). */
  parentId?: string | null;
  /** Si esta es la carpeta fija de un proyecto (se gestiona junto con él). */
  projectId?: string;
  createdAt: string;
}

/** Un enlace guardado dentro de una nota. */
export interface ApunteLink {
  id: string;
  url: string;
  label?: string;
}

/** Una nota dentro del Archivo: texto + enlaces + fotos + etiquetas, todo local. */
export interface ApunteDoc {
  id: string;
  folderId?: string | null;
  title: string;
  content: string;
  links: ApunteLink[];
  photos: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type ApunteAudioStatus = "uploading" | "queued" | "processing" | "completed" | "error";

export interface ApunteAudio {
  id: string;
  title: string;
  storagePath: string;
  documentId?: string | null;
  status: ApunteAudioStatus;
  transcriptionId?: string;
  transcript?: string;
  summary?: string;
  errorMessage?: string;
  createdAt: string;
}

export const APUNTE_FOLDERS_KEY = "cerebro.apunteFolders.v1";
export const APUNTE_DOCS_KEY = "cerebro.apunteDocs.v1";
export const APUNTE_AUDIOS_KEY = "cerebro.apunteAudios.v1";
export const APUNTES_AUDIO_BUCKET = "apuntes-audio";

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
  /** Si está vinculada a un Proyecto. */
  projectId?: string;
  /** Carpeta del árbol de Archivo a la que pertenece (null/undefined = raíz). */
  folderId?: string | null;
  /** Si se ha convertido explícitamente en un Google Doc real. */
  googleDocId?: string;
  googleDocUrl?: string;
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