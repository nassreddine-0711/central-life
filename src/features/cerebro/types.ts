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
  dueDate?: string;
  /** Id de un Goal (RoadMap) marcado como proyecto, si viene de ahí. */
  linkedGoalId?: string;
  archived?: boolean;
  createdAt: string;
}

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

/* ---------- Archivo (árbol de carpetas único: notas, referencias, apuntes) ----------
   Este mismo árbol de carpetas es compartido por Notas/Referencias y por los
   Apuntes de la uni. Cada carpeta puede tener un espejo real en Google Drive
   (driveFolderId); crear una carpeta aquí crea la carpeta en Drive, y las
   carpetas nuevas creadas directamente en Drive se reflejan aquí al refrescar. */
export interface ApunteFolder {
  id: string;
  name: string;
  color?: string;
  /** Carpeta padre en el árbol local (null/undefined = raíz). */
  parentId?: string | null;
  /** Id de la carpeta espejo en Google Drive, si esta carpeta está sincronizada. */
  driveFolderId?: string | null;
  createdAt: string;
}

export interface ApunteDoc {
  id: string;
  folderId?: string | null;
  title: string;
  content: string;
  /** Si el apunte vive como Google Doc real (en vez de local). */
  googleDocId?: string;
  googleDocUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type ApunteAudioStatus = "uploading" | "queued" | "processing" | "completed" | "error";

export interface ApunteAudio {
  id: string;
  title: string;
  storagePath: string;
  documentId?: string | null;
  /** Carpeta del árbol de Archivo en la que está clasificado este audio (null/undefined = sin clasificar todavía, vive en "Audio a texto"). */
  folderId?: string | null;
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