import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSupabaseSync } from "@/hooks/useSupabaseSync";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { subMonths, parseISO, startOfDay, subDays, format } from "date-fns";
import {
  Task, Note, LinkedRef, Category, Priority, DayPart, Recurrence, Project, ProjectStage, ProjectStatus,
  ProjectCategory, ProjectUpdate,
  ApunteFolder, ApunteDoc, ApunteAudio, ApunteLink,
  Objetivo, RetroEntry, RetroResult, ProjectExpense, ProjectTimeSlot, ProjectTimeEntry,
  Dream, DreamsConfig,
  TASKS_KEY, NOTES_KEY, NOTE_CATS_KEY, PROJECTS_KEY, PROJECT_CATS_KEY, PROJECT_UPDATES_KEY,
  DEFAULT_NOTE_CAT, uid, load,
  nextRecurrence,
  APUNTE_FOLDERS_KEY, APUNTE_DOCS_KEY, APUNTE_AUDIOS_KEY, APUNTES_AUDIO_BUCKET,
  PROJECTS_ROOT_FOLDER_ID, OBJETIVOS_KEY, RETRO_ENTRIES_KEY, PROJECT_EXPENSES_KEY, PROJECT_TIME_ENTRIES_KEY,
  DREAMS_KEY, DREAMS_CONFIG_KEY, DEFAULT_DREAMS_CONFIG,
} from "./types";
import { startTranscription, pollTranscription } from "./apuntes/apuntesApi";

interface CerebroCtx {
  tasks: Task[];
  notes: Note[];
  noteCats: string[];
  projects: Project[];
  projectCategories: ProjectCategory[];
  projectUpdates: ProjectUpdate[];
  fadingIds: Set<string>;

  addTask: (partial: Partial<Task> & { title: string }) => Task;
  toggleTask: (id: string) => void;
  delTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  /** Pasa una captura rápida del Inbox a una nota del Archivo (en la carpeta elegida,
   *  null = raíz) y borra la tarea. */
  convertTaskToNote: (id: string, folderId: string | null) => void;

  addNote: (n: Note) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  delNote: (id: string) => void;

  addNoteCategory: (name: string) => void;
  deleteNoteCategory: (name: string) => void;

  // Proyectos (Kanban)
  addProject: (partial: Partial<Project> & { title: string }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  delProject: (id: string) => void;
  moveProjectStatus: (projectId: string, status: ProjectStatus) => void;
  projectTasks: (projectId: string) => Task[];
  projectProgress: (projectId: string) => { done: number; total: number; pct: number };
  moveTaskStage: (taskId: string, stage: ProjectStage) => void;
  projectsByDreamId: (dreamId: string) => Project[];
  addProjectCategory: (name: string, color?: string) => ProjectCategory;
  updateProjectCategory: (id: string, patch: Partial<ProjectCategory>) => void;
  delProjectCategory: (id: string) => void;
  addProjectUpdate: (projectId: string, text: string) => ProjectUpdate;
  delProjectUpdate: (id: string) => void;
  projectUpdatesFor: (projectId: string) => ProjectUpdate[];
  projectNotes: (projectId: string) => Note[];

  // Objetivos del proyecto (kanban interno)
  objetivos: Objetivo[];
  objetivosFor: (projectId: string) => Objetivo[];
  addObjetivo: (projectId: string, title: string, stage?: ProjectStage) => Objetivo;
  updateObjetivo: (id: string, patch: Partial<Objetivo>) => void;
  delObjetivo: (id: string) => void;
  moveObjetivoStage: (id: string, stage: ProjectStage) => void;

  // Diario de retrospectiva
  retroEntries: RetroEntry[];
  retroEntriesFor: (projectId: string) => RetroEntry[];
  addRetroEntry: (projectId: string, entry: { wentWell: string; toImprove: string; result: RetroResult }) => RetroEntry;
  delRetroEntry: (id: string) => void;

  // Presupuesto del proyecto
  projectExpenses: ProjectExpense[];
  expensesFor: (projectId: string) => ProjectExpense[];
  addExpense: (projectId: string, expense: { title: string; amount: number; date?: string }) => ProjectExpense;
  delExpense: (id: string) => void;
  projectBudgetRemaining: (projectId: string) => number;

  // Acumulador de tiempo dedicado
  projectTimeEntries: ProjectTimeEntry[];
  updateProjectTimeSchedule: (projectId: string, schedule: ProjectTimeSlot[]) => void;
  pendingTimeConfirmations: (projectId: string) => { date: string; minutes: number }[];
  confirmTimeSession: (projectId: string, date: string, minutes: number) => void;
  declineTimeSession: (projectId: string, date: string) => void;
  projectAccumulatedMinutes: (projectId: string) => number;

  // Suenos (antes "Vision actual" del Roadmap)
  dreams: Dream[];
  addDream: (partial: Partial<Dream> & { title: string }) => Dream;
  updateDream: (id: string, patch: Partial<Dream>) => void;
  delDream: (id: string) => void;
  dreamsConfig: DreamsConfig;
  updateDreamsConfig: (patch: Partial<DreamsConfig>) => void;

  // Archivo (carpetas + notas locales + audios transcritos)
  apunteFolders: ApunteFolder[];
  apunteDocs: ApunteDoc[];
  apunteAudios: ApunteAudio[];
  addApunteFolder: (name: string, parentId?: string | null, color?: string) => ApunteFolder;
  renameApunteFolder: (id: string, name: string) => void;
  delApunteFolder: (id: string) => void;
  folderPath: (folderId?: string | null) => ApunteFolder[];
  moveApunteFolder: (id: string, newParentId: string | null) => void;
  moveApunteDoc: (id: string, newFolderId: string | null) => void;
  convertNoteToDoc: (noteId: string) => Promise<void>;
  addApunteDoc: (partial: { title: string; content?: string; folderId?: string | null; links?: ApunteLink[]; tags?: string[]; photos?: string[] }) => ApunteDoc;
  updateApunteDoc: (id: string, patch: Partial<ApunteDoc>) => void;
  delApunteDoc: (id: string) => void;
  updateApunteAudio: (id: string, patch: Partial<ApunteAudio>) => void;
  delApunteAudio: (id: string) => void;
  linkApunteAudio: (audioId: string, documentId: string | null) => void;
  uploadApunteAudio: (file: File, opts?: { title?: string; documentId?: string | null }) => Promise<ApunteAudio>;
  projectFolder: (projectId: string) => ApunteFolder | undefined;
  googleConnected: boolean;
  connectGoogleDrive: () => void;

  // Cross-section UI hooks
  openNoteSheet: (opts?: { linkedTo?: LinkedRef; defaultCategory?: string; defaultKind?: "note" | "ref"; defaultFolderId?: string | null; defaultProjectId?: string }) => void;
  openTaskDialog: (opts?: { linkedNoteId?: string; linkedMilestoneId?: string; defaultTitle?: string; defaultDate?: string; defaultDayPart?: DayPart; defaultProjectId?: string; editId?: string }) => void;
  openQuickCapture: () => void;
  createTaskFromNote: (note: Note) => void;

  // Selectors
  tasksByMilestone: (milestoneId: string) => Task[];
  notesByMilestone: (milestoneId: string) => Note[];
  milestoneProgress: (milestoneId: string) => { done: number; total: number; pct: number };

  // internal modal state (consumed by mounted dialogs)
  _noteSheetState: { open: boolean; linkedTo?: LinkedRef; defaultCategory?: string; defaultKind?: "note" | "ref"; defaultFolderId?: string | null; defaultProjectId?: string };
  _setNoteSheetOpen: (open: boolean) => void;
  _taskDialogState: { open: boolean; linkedNoteId?: string; linkedMilestoneId?: string; defaultTitle?: string; defaultDate?: string; defaultDayPart?: DayPart; defaultProjectId?: string; editId?: string };
  _setTaskDialogOpen: (open: boolean) => void;
  _quickOpen: boolean;
  _setQuickOpen: (open: boolean) => void;
}

const Ctx = createContext<CerebroCtx | null>(null);

export function useCerebro() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCerebro must be used within CerebroProvider");
  return c;
}

const SIX_MONTHS_AGO = subMonths(new Date(), 6);

function filterOldCompletedTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => {
    if (!t.done || !t.completedAt) return true;
    return parseISO(t.completedAt) >= SIX_MONTHS_AGO;
  });
}

export function CerebroProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(() => filterOldCompletedTasks(load<Task[]>(TASKS_KEY, [])).map(t => ({ ...t, dayPart: t.dayPart ?? "morning" })));
  const [notes, setNotes] = useState<Note[]>(() =>
    load<Note[]>(NOTES_KEY, []).map(n => ({ ...n, category: n.category || DEFAULT_NOTE_CAT }))
  );
  const [noteCats, setNoteCats] = useState<string[]>(() => load(NOTE_CATS_KEY, [DEFAULT_NOTE_CAT]));
  const [projects, setProjects] = useState<Project[]>(() =>
    load<Project[]>(PROJECTS_KEY, []).map(p => ({ ...p, status: p.status ?? (p.archived ? "done" : "next") }))
  );
  const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>(() => load(PROJECT_CATS_KEY, []));
  const [projectUpdates, setProjectUpdates] = useState<ProjectUpdate[]>(() => load(PROJECT_UPDATES_KEY, []));
  const [apunteFolders, setApunteFolders] = useState<ApunteFolder[]>(() => load(APUNTE_FOLDERS_KEY, []));
  const [apunteDocs, setApunteDocs] = useState<ApunteDoc[]>(() => load(APUNTE_DOCS_KEY, []));
  const [apunteAudios, setApunteAudios] = useState<ApunteAudio[]>(() => load(APUNTE_AUDIOS_KEY, []));
  const [objetivos, setObjetivos] = useState<Objetivo[]>(() => load(OBJETIVOS_KEY, []));
  const [retroEntries, setRetroEntries] = useState<RetroEntry[]>(() => load(RETRO_ENTRIES_KEY, []));
  const [projectExpenses, setProjectExpenses] = useState<ProjectExpense[]>(() => load(PROJECT_EXPENSES_KEY, []));
  const [projectTimeEntries, setProjectTimeEntries] = useState<ProjectTimeEntry[]>(() => load(PROJECT_TIME_ENTRIES_KEY, []));
  const [dreams, setDreams] = useState<Dream[]>(() => load(DREAMS_KEY, []));
  const [dreamsConfig, setDreamsConfig] = useState<DreamsConfig>(() => load(DREAMS_CONFIG_KEY, DEFAULT_DREAMS_CONFIG));
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());

  const [noteSheetState, setNoteSheetState] = useState<{ open: boolean; linkedTo?: LinkedRef; defaultCategory?: string; defaultKind?: "note" | "ref"; defaultFolderId?: string | null; defaultProjectId?: string }>({ open: false });
  const [taskDialogState, setTaskDialogState] = useState<{ open: boolean; linkedNoteId?: string; linkedMilestoneId?: string; defaultTitle?: string; defaultDate?: string; defaultDayPart?: DayPart; defaultProjectId?: string; editId?: string }>({ open: false });
  const [quickOpen, setQuickOpen] = useState(false);

  const saveLocal = useCallback((key: string, value: unknown, label: string) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error al guardar ${label} en localStorage`, e);
      toast.error("No se pudo guardar", {
        description: `${label} no cabe en el almacenamiento local (puede ser por una foto muy pesada). Prueba con una foto más pequeña.`,
      });
    }
  }, []);

  useEffect(() => { saveLocal(TASKS_KEY, filterOldCompletedTasks(tasks), "las tareas"); }, [tasks, saveLocal]);
  useEffect(() => { saveLocal(NOTES_KEY, notes, "las notas"); }, [notes, saveLocal]);
  useEffect(() => { saveLocal(NOTE_CATS_KEY, noteCats, "las categorías de notas"); }, [noteCats, saveLocal]);
  useEffect(() => { saveLocal(PROJECTS_KEY, projects, "los proyectos"); }, [projects, saveLocal]);
  useEffect(() => { saveLocal(PROJECT_CATS_KEY, projectCategories, "las categorías de proyecto"); }, [projectCategories, saveLocal]);
  useEffect(() => { saveLocal(PROJECT_UPDATES_KEY, projectUpdates, "las actualizaciones de proyecto"); }, [projectUpdates, saveLocal]);
  useEffect(() => { saveLocal(APUNTE_FOLDERS_KEY, apunteFolders, "las carpetas de apuntes"); }, [apunteFolders, saveLocal]);
  useEffect(() => { saveLocal(APUNTE_DOCS_KEY, apunteDocs, "los apuntes"); }, [apunteDocs, saveLocal]);
  useEffect(() => { saveLocal(APUNTE_AUDIOS_KEY, apunteAudios, "los audios de apuntes"); }, [apunteAudios, saveLocal]);
  useEffect(() => { saveLocal(OBJETIVOS_KEY, objetivos, "los objetivos"); }, [objetivos, saveLocal]);
  useEffect(() => { saveLocal(RETRO_ENTRIES_KEY, retroEntries, "las retrospectivas"); }, [retroEntries, saveLocal]);
  useEffect(() => { saveLocal(PROJECT_EXPENSES_KEY, projectExpenses, "los gastos de proyecto"); }, [projectExpenses, saveLocal]);
  useEffect(() => { saveLocal(PROJECT_TIME_ENTRIES_KEY, projectTimeEntries, "las sesiones de tiempo dedicado"); }, [projectTimeEntries, saveLocal]);
  useEffect(() => { saveLocal(DREAMS_KEY, dreams, "los sueños"); }, [dreams, saveLocal]);
  useEffect(() => { saveLocal(DREAMS_CONFIG_KEY, dreamsConfig, "la configuración de sueños"); }, [dreamsConfig, saveLocal]);

  const setTasksCb = useCallback((v: Task[]) => setTasks(filterOldCompletedTasks(v).map(t => ({ ...t, dayPart: t.dayPart ?? "morning" }))), []);
  const setNotesCb = useCallback((v: Note[]) => setNotes(v.map(n => ({ ...n, category: n.category || DEFAULT_NOTE_CAT }))), []);
  const setNoteCatsCb = useCallback((v: string[]) => setNoteCats(v), []);
  const setProjectsCb = useCallback((v: Project[]) => setProjects(v), []);
  const setProjectCategoriesCb = useCallback((v: ProjectCategory[]) => setProjectCategories(v), []);
  const setProjectUpdatesCb = useCallback((v: ProjectUpdate[]) => setProjectUpdates(v), []);
  const setApunteFoldersCb = useCallback((v: ApunteFolder[]) => setApunteFolders(v), []);
  const setApunteDocsCb = useCallback((v: ApunteDoc[]) => setApunteDocs(v), []);
  const setApunteAudiosCb = useCallback((v: ApunteAudio[]) => setApunteAudios(v), []);
  const setObjetivosCb = useCallback((v: Objetivo[]) => setObjetivos(v), []);
  const setRetroEntriesCb = useCallback((v: RetroEntry[]) => setRetroEntries(v), []);
  const setProjectExpensesCb = useCallback((v: ProjectExpense[]) => setProjectExpenses(v), []);
  const setProjectTimeEntriesCb = useCallback((v: ProjectTimeEntry[]) => setProjectTimeEntries(v), []);
  const setDreamsCb = useCallback((v: Dream[]) => setDreams(v), []);
  const setDreamsConfigCb = useCallback((v: DreamsConfig) => setDreamsConfig(v), []);
  useSupabaseSync("cerebro_tasks", tasks, setTasksCb);
  useSupabaseSync("cerebro_notes", notes, setNotesCb);
  useSupabaseSync("cerebro_notecats", noteCats, setNoteCatsCb);
  const projectsSync = useSupabaseSync("cerebro_projects", projects, setProjectsCb);
  useSupabaseSync("cerebro_project_categories", projectCategories, setProjectCategoriesCb);
  useSupabaseSync("cerebro_project_updates", projectUpdates, setProjectUpdatesCb);
  const foldersSync = useSupabaseSync("cerebro_apunte_folders", apunteFolders, setApunteFoldersCb);
  const docsSync = useSupabaseSync("cerebro_apunte_docs", apunteDocs, setApunteDocsCb);
  useSupabaseSync("cerebro_apunte_audios", apunteAudios, setApunteAudiosCb);
  useSupabaseSync("cerebro_objetivos", objetivos, setObjetivosCb);
  useSupabaseSync("cerebro_retro_entries", retroEntries, setRetroEntriesCb);
  useSupabaseSync("cerebro_project_expenses", projectExpenses, setProjectExpensesCb);
  useSupabaseSync("cerebro_project_time_entries", projectTimeEntries, setProjectTimeEntriesCb);
  useSupabaseSync("cerebro_dreams", dreams, setDreamsCb);
  useSupabaseSync("cerebro_dreams_config", dreamsConfig, setDreamsConfigCb);

  // Asegura que la carpeta fija "Proyectos" siempre existe y que cada proyecto
  // tiene su subcarpeta dentro de ella (por si algún proyecto antiguo no la tenía).
  // IMPORTANTE: solo se ejecuta cuando proyectos y carpetas ya se han cargado del
  // servidor; si no, creaba carpetas "nuevas" sobre un estado vacío y eso pisaba en
  // Supabase las carpetas reales (y las notas guardadas dentro se quedaban huérfanas).
  const foldersReady = foldersSync.ready && projectsSync.ready && docsSync.ready;
  useEffect(() => {
    if (!foldersReady) return;
    // Si por una unión de versiones quedó más de una carpeta para el mismo proyecto,
    // se deja una y todo lo que colgaba de las otras se reubica en ella (no se pierde nada).
    const keepByProject = new Map<string, string>();
    const remap = new Map<string, string>();
    apunteFolders.forEach(f => {
      if (!f.projectId) return;
      const keep = keepByProject.get(f.projectId);
      if (keep) remap.set(f.id, keep); else keepByProject.set(f.projectId, f.id);
    });
    if (remap.size > 0) {
      setApunteFolders(prev => prev
        .filter(f => !remap.has(f.id))
        .map(f => (f.parentId && remap.has(f.parentId) ? { ...f, parentId: remap.get(f.parentId)! } : f)));
      setApunteDocs(prev => prev.map(d => (d.folderId && remap.has(d.folderId) ? { ...d, folderId: remap.get(d.folderId)! } : d)));
    }
    setApunteFolders(prev => {
      let next = prev;
      if (!next.some(f => f.id === PROJECTS_ROOT_FOLDER_ID)) {
        next = [{ id: PROJECTS_ROOT_FOLDER_ID, name: "Proyectos", parentId: null, createdAt: new Date().toISOString() }, ...next];
      }
      const missing = projects.filter(p => !next.some(f => f.projectId === p.id));
      if (missing.length > 0) {
        next = [...next, ...missing.map(p => ({ id: uid(), name: p.title, parentId: PROJECTS_ROOT_FOLDER_ID, projectId: p.id, createdAt: p.createdAt }))];
      }
      return next === prev ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, foldersReady]);

  // Recurrencia tipo "evento de calendario": al poner una tarea/evento como recurrente se
  // generan de golpe sus próximas apariciones futuras (no hace falta completar la actual
  // para que aparezca la siguiente), y un efecto aparte las va reponiendo para que la serie
  // nunca se quede sin apariciones por delante.
  const SERIES_MAX_COUNT = 24;
  const SERIES_HORIZON_MONTHS = 18;
  const SERIES_TOPUP_MS = 60 * 24 * 60 * 60 * 1000; // 60 días

  const buildSeriesTasks = useCallback((anchor: Task, rec: Recurrence, seriesId: string): Task[] => {
    if (!anchor.date) return [];
    const limit = new Date(anchor.date);
    limit.setMonth(limit.getMonth() + SERIES_HORIZON_MONTHS);
    const out: Task[] = [];
    let cur = new Date(anchor.date);
    for (let i = 0; i < SERIES_MAX_COUNT; i++) {
      cur = nextRecurrence(rec, cur);
      if (cur > limit) break;
      out.push({
        ...anchor,
        id: uid(),
        date: cur.toISOString(),
        done: false,
        completedAt: undefined,
        createdAt: new Date().toISOString(),
        inbox: false,
        seriesId,
        recurrence: rec,
      });
    }
    return out;
  }, []);

  const addTask: CerebroCtx["addTask"] = useCallback((partial) => {
    const id = uid();
    const t: Task = {
      id,
      title: partial.title,
      kind: partial.kind,
      description: partial.description,
      photo: partial.photo,
      category: partial.category ?? "Otros",
      priority: partial.priority ?? "med",
      date: partial.date,
      dayPart: partial.dayPart ?? "morning",
      done: false,
      inbox: partial.inbox ?? (partial.projectId ? false : true),
      createdAt: new Date().toISOString(),
      linkedNoteId: partial.linkedNoteId,
      linkedMilestoneId: partial.linkedMilestoneId,
      recurrence: partial.recurrence,
      seriesId: partial.recurrence ? id : undefined,
      projectId: partial.projectId,
      // Kanban del proyecto: sin fecha se queda "sin empezar"; si ya trae una fecha
      // asignada (p. ej. creada desde el inbox) pasa directamente a "en curso".
      // Un stage explícito (p. ej. al añadir la tarjeta directamente en una columna
      // del kanban) siempre tiene prioridad.
      stage: partial.projectId ? (partial.stage ?? (partial.date ? "doing" : "todo")) : undefined,
    };
    setTasks(prev => {
      const extra = t.recurrence ? buildSeriesTasks(t, t.recurrence, id) : [];
      return [t, ...extra, ...prev];
    });
    return t;
  }, [buildSeriesTasks]);

  // Repone apariciones futuras de cada serie recurrente cuando quedan pocas por delante,
  // para que nunca se "acabe" aunque el usuario no vuelva a tocar la tarea/evento.
  useEffect(() => {
    const lastBySeries = new Map<string, Task>();
    for (const t of tasks) {
      if (!t.seriesId || !t.recurrence || !t.date) continue;
      const cur = lastBySeries.get(t.seriesId);
      if (!cur || new Date(t.date).getTime() > new Date(cur.date!).getTime()) lastBySeries.set(t.seriesId, t);
    }
    const now = Date.now();
    const additions: Task[] = [];
    for (const [seriesId, last] of lastBySeries) {
      if (!last.date || !last.recurrence) continue;
      if (new Date(last.date).getTime() - now < SERIES_TOPUP_MS) {
        additions.push(...buildSeriesTasks(last, last.recurrence, seriesId));
      }
    }
    if (additions.length > 0) setTasks(prev => [...additions, ...prev]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, buildSeriesTasks]);

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => {
      const t = prev.find(x => x.id === id);
      if (!t) return prev;
      if (!t.done) {
        setFadingIds(s => { const n = new Set(s); n.add(id); return n; });
        window.setTimeout(() => {
          setTasks(p => p.map(x => x.id === id
            ? { ...x, done: true, completedAt: new Date().toISOString(), stage: x.projectId ? "done" as const : x.stage }
            : x));
          setFadingIds(s => { const n = new Set(s); n.delete(id); return n; });
        }, 320);
        return prev;
      }
      // Al reabrir una tarea de proyecto que estaba "terminada", vuelve a "en curso"
      // si tiene fecha asignada, o a "sin empezar" si no.
      return prev.map(x => x.id === id
        ? { ...x, done: false, completedAt: undefined, stage: x.projectId ? (x.date ? "doing" as const : "todo" as const) : x.stage }
        : x);
    });
  }, []);

  const delTask = useCallback((id: string) => setTasks(t => t.filter(x => x.id !== id)), []);

  const updateTask: CerebroCtx["updateTask"] = useCallback((id, patch) => {
    setTasks(prev => {
      const x = prev.find(t => t.id === id);
      if (!x) return prev;
      const next: Task = { ...x, ...patch };
      // Si la tarea pertenece a un proyecto y este cambio toca la fecha, la fecha
      // manda sobre la columna del kanban — salvo que esté "bloqueada" o "terminada"
      // (esas dos son estados manuales/excepcionales que no debe pisar la fecha).
      if (next.projectId && "date" in patch && next.stage !== "blocked" && next.stage !== "done") {
        next.stage = next.date ? "doing" : "todo";
      }
      const recurrenceChanged = "recurrence" in patch
        && JSON.stringify(patch.recurrence ?? null) !== JSON.stringify(x.recurrence ?? null);
      if (!recurrenceChanged) {
        return prev.map(t => t.id === id ? next : t);
      }
      // La recurrencia se ha puesto, cambiado o quitado: se regeneran las próximas
      // apariciones futuras (no completadas) de la serie a partir de esta.
      const seriesId = x.seriesId ?? id;
      next.seriesId = patch.recurrence ? seriesId : x.seriesId;
      const anchorTime = next.date ? new Date(next.date).getTime() : Date.now();
      let list = prev
        .filter(t => !(t.id !== id && t.seriesId === seriesId && !t.done && t.date && new Date(t.date).getTime() > anchorTime))
        .map(t => t.id === id ? next : t);
      if (patch.recurrence && next.date) {
        list = [...buildSeriesTasks(next, patch.recurrence, seriesId), ...list];
      }
      return list;
    });
  }, [buildSeriesTasks]);

  const addNote = useCallback((n: Note) => setNotes(prev => [n, ...prev]), []);
  const updateNote = useCallback((id: string, patch: Partial<Note>) => setNotes(ns => ns.map(n => n.id === id ? { ...n, ...patch } : n)), []);
  const delNote = useCallback((id: string) => setNotes(prev => prev.filter(x => x.id !== id)), []);

  const addNoteCategory = useCallback((name: string) => {
    const n = name.trim();
    if (!n) return;
    setNoteCats(cs => cs.includes(n) ? cs : [...cs, n]);
  }, []);

  const deleteNoteCategory = useCallback((name: string) => {
    if (name === DEFAULT_NOTE_CAT) return;
    setNoteCats(cs => cs.filter(c => c !== name));
    setNotes(ns => ns.map(n => n.category === name ? { ...n, category: DEFAULT_NOTE_CAT } : n));
  }, []);

  const openNoteSheet: CerebroCtx["openNoteSheet"] = useCallback((opts) => {
    setNoteSheetState({
      open: true,
      linkedTo: opts?.linkedTo,
      defaultCategory: opts?.defaultCategory,
      defaultKind: opts?.defaultKind,
      defaultFolderId: opts?.defaultFolderId,
      defaultProjectId: opts?.defaultProjectId,
    });
  }, []);

  const openTaskDialog: CerebroCtx["openTaskDialog"] = useCallback((opts) => {
    setTaskDialogState({ open: true, linkedNoteId: opts?.linkedNoteId, linkedMilestoneId: opts?.linkedMilestoneId, defaultTitle: opts?.defaultTitle, defaultDate: opts?.defaultDate, defaultDayPart: opts?.defaultDayPart, defaultProjectId: opts?.defaultProjectId, editId: opts?.editId });
  }, []);

  const openQuickCapture = useCallback(() => setQuickOpen(true), []);

  const createTaskFromNote = useCallback((note: Note) => {
    addTask({ title: note.title, linkedNoteId: note.id, inbox: true, priority: "med", category: "Otros" });
    toast.success("Tarea creada en Inbox", { description: note.title });
  }, [addTask]);

  /* ---------- Proyectos (Kanban) ---------- */
  const addProject: CerebroCtx["addProject"] = useCallback((partial) => {
    const p: Project = {
      id: uid(),
      title: partial.title,
      description: partial.description,
      color: partial.color,
      status: partial.status ?? "inbox",
      categoryId: partial.categoryId,
      startDate: partial.startDate,
      dueDate: partial.dueDate,
      dreamId: partial.dreamId,
      archived: false,
      createdAt: new Date().toISOString(),
      budgetTotal: partial.budgetTotal,
      timeSchedule: partial.timeSchedule ?? [],
      timeDeclinedDates: [],
    };
    setProjects(prev => [p, ...prev]);
    // Carpeta fija del proyecto dentro de "Proyectos", en Archivo.
    setApunteFolders(prev => [...prev, {
      id: uid(), name: p.title, parentId: PROJECTS_ROOT_FOLDER_ID, projectId: p.id, createdAt: p.createdAt,
    }]);
    return p;
  }, []);

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
    if (patch.title) {
      setApunteFolders(prev => prev.map(f => f.projectId === id ? { ...f, name: patch.title! } : f));
    }
  }, []);

  const delProject = useCallback((id: string) => {
    if (!confirm("¿Eliminar este proyecto? Las tareas se quedarán sin proyecto; su carpeta de Archivo, objetivos, presupuesto y retrospectiva se borrarán.")) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.map(t => t.projectId === id ? { ...t, projectId: undefined, stage: undefined } : t));
    setNotes(prev => prev.map(n => n.projectId === id ? { ...n, projectId: undefined } : n));
    setProjectUpdates(prev => prev.filter(u => u.projectId !== id));
    setObjetivos(prev => prev.filter(o => o.projectId !== id));
    setRetroEntries(prev => prev.filter(r => r.projectId !== id));
    setProjectExpenses(prev => prev.filter(e => e.projectId !== id));
    setProjectTimeEntries(prev => prev.filter(t => t.projectId !== id));
    const folder = apunteFolders.find(f => f.projectId === id);
    if (folder) {
      const idsToRemove = new Set<string>([folder.id]);
      let grew = true;
      while (grew) {
        grew = false;
        apunteFolders.forEach(f => {
          if (f.parentId && idsToRemove.has(f.parentId) && !idsToRemove.has(f.id)) { idsToRemove.add(f.id); grew = true; }
        });
      }
      setApunteFolders(prev => prev.filter(f => !idsToRemove.has(f.id)));
      const removedDocIds = new Set(apunteDocs.filter(d => d.folderId && idsToRemove.has(d.folderId)).map(d => d.id));
      setApunteDocs(prev => prev.filter(d => !(d.folderId && idsToRemove.has(d.folderId))));
      if (removedDocIds.size > 0) {
        setApunteAudios(prev => prev.map(a => a.documentId && removedDocIds.has(a.documentId) ? { ...a, documentId: null } : a));
      }
    }
  }, [apunteFolders, apunteDocs]);

  const moveProjectStatus = useCallback((projectId: string, status: ProjectStatus) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status, archived: status === "done" } : p));
  }, []);

  const projectTasks = useCallback((projectId: string) => tasks.filter(t => t.projectId === projectId), [tasks]);

  const projectProgress = useCallback((projectId: string) => {
    const list = tasks.filter(t => t.projectId === projectId);
    const total = list.length;
    const done = list.filter(t => t.stage === "done").length;
    return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  }, [tasks]);

  /** Mueve una tarea a otra columna del kanban del proyecto (arrastrar y soltar).
   *  "Bloqueada" es manual y excepcional: le quita la fecha asignada (si tenía) para
   *  que la tarea aparezca en Atrasadas, dentro del foco de tareas. "Terminadas"
   *  marca la tarea como hecha; salir de "Terminadas" la reabre. */
  const moveTaskStage = useCallback((taskId: string, stage: ProjectStage) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const patch: Partial<Task> = { stage };
      if (stage === "blocked") {
        patch.date = undefined;
      }
      if (stage === "done") {
        patch.done = true;
        patch.completedAt = t.completedAt ?? new Date().toISOString();
      } else if (t.done) {
        patch.done = false;
        patch.completedAt = undefined;
      }
      return { ...t, ...patch };
    }));
  }, []);

  const projectsByDreamId = useCallback((dreamId: string) => projects.filter(p => p.dreamId === dreamId), [projects]);

  /* ---------- Suenos (antes "Vision actual" del Roadmap) ---------- */
  const addDream: CerebroCtx["addDream"] = useCallback((partial) => {
    const d: Dream = {
      id: uid(),
      title: partial.title,
      why: partial.why ?? "",
      deadline: partial.deadline ?? new Date().toISOString(),
      image: partial.image,
      color: partial.color,
      createdAt: new Date().toISOString(),
    };
    setDreams(prev => [d, ...prev]);
    return d;
  }, []);

  const updateDream = useCallback((id: string, patch: Partial<Dream>) => {
    setDreams(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  }, []);

  const delDream = useCallback((id: string) => {
    if (!confirm("¿Eliminar este sueño? Los proyectos asignados a él se quedarán sin sueño.")) return;
    setDreams(prev => prev.filter(d => d.id !== id));
    setProjects(prev => prev.map(p => p.dreamId === id ? { ...p, dreamId: undefined } : p));
  }, []);

  const updateDreamsConfig = useCallback((patch: Partial<DreamsConfig>) => {
    setDreamsConfig(prev => ({ ...prev, ...patch }));
  }, []);


  const addProjectCategory: CerebroCtx["addProjectCategory"] = useCallback((name, color) => {
    const c: ProjectCategory = { id: uid(), name: name.trim() || "Sin nombre", color, createdAt: new Date().toISOString() };
    setProjectCategories(prev => [...prev, c]);
    return c;
  }, []);

  const updateProjectCategory = useCallback((id: string, patch: Partial<ProjectCategory>) => {
    setProjectCategories(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const delProjectCategory = useCallback((id: string) => {
    setProjectCategories(prev => prev.filter(c => c.id !== id));
    setProjects(prev => prev.map(p => p.categoryId === id ? { ...p, categoryId: undefined } : p));
  }, []);

  const addProjectUpdate: CerebroCtx["addProjectUpdate"] = useCallback((projectId, text) => {
    const u: ProjectUpdate = { id: uid(), projectId, text: text.trim(), createdAt: new Date().toISOString() };
    setProjectUpdates(prev => [u, ...prev]);
    return u;
  }, []);

  const delProjectUpdate = useCallback((id: string) => {
    setProjectUpdates(prev => prev.filter(u => u.id !== id));
  }, []);

  const projectUpdatesFor = useCallback((projectId: string) =>
    projectUpdates.filter(u => u.projectId === projectId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [projectUpdates]);

  const projectNotes = useCallback((projectId: string) => notes.filter(n => n.projectId === projectId), [notes]);

  /* ---------- Objetivos del proyecto (kanban interno) ---------- */
  const objetivosFor = useCallback((projectId: string) => objetivos.filter(o => o.projectId === projectId), [objetivos]);

  const addObjetivo: CerebroCtx["addObjetivo"] = useCallback((projectId, title, stage) => {
    const o: Objetivo = { id: uid(), projectId, title: title.trim(), stage: stage ?? "todo", createdAt: new Date().toISOString() };
    setObjetivos(prev => [...prev, o]);
    return o;
  }, []);

  const updateObjetivo = useCallback((id: string, patch: Partial<Objetivo>) => {
    setObjetivos(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
  }, []);

  const delObjetivo = useCallback((id: string) => {
    setObjetivos(prev => prev.filter(o => o.id !== id));
  }, []);

  const moveObjetivoStage = useCallback((id: string, stage: ProjectStage) => {
    setObjetivos(prev => prev.map(o => o.id === id ? { ...o, stage } : o));
  }, []);

  /* ---------- Diario de retrospectiva ---------- */
  const retroEntriesFor = useCallback((projectId: string) =>
    retroEntries.filter(r => r.projectId === projectId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [retroEntries]);

  const addRetroEntry: CerebroCtx["addRetroEntry"] = useCallback((projectId, entry) => {
    const r: RetroEntry = {
      id: uid(), projectId, wentWell: entry.wentWell.trim(), toImprove: entry.toImprove.trim(),
      result: entry.result, createdAt: new Date().toISOString(),
    };
    setRetroEntries(prev => [r, ...prev]);
    return r;
  }, []);

  const delRetroEntry = useCallback((id: string) => {
    setRetroEntries(prev => prev.filter(r => r.id !== id));
  }, []);

  /* ---------- Presupuesto del proyecto ---------- */
  const expensesFor = useCallback((projectId: string) =>
    projectExpenses.filter(e => e.projectId === projectId).sort((a, b) => b.date.localeCompare(a.date)),
    [projectExpenses]);

  const addExpense: CerebroCtx["addExpense"] = useCallback((projectId, expense) => {
    const e: ProjectExpense = {
      id: uid(), projectId, title: expense.title.trim() || "Gasto", amount: expense.amount,
      date: expense.date ?? new Date().toISOString(), createdAt: new Date().toISOString(),
    };
    setProjectExpenses(prev => [e, ...prev]);
    return e;
  }, []);

  const delExpense = useCallback((id: string) => {
    setProjectExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  const projectBudgetRemaining = useCallback((projectId: string) => {
    const total = projects.find(p => p.id === projectId)?.budgetTotal ?? 0;
    const spent = projectExpenses.filter(e => e.projectId === projectId).reduce((s, e) => s + e.amount, 0);
    return total - spent;
  }, [projects, projectExpenses]);

  /* ---------- Acumulador de tiempo dedicado ---------- */
  const updateProjectTimeSchedule = useCallback((projectId: string, schedule: ProjectTimeSlot[]) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, timeSchedule: schedule } : p));
  }, []);

  /** Franjas programadas ya pasadas que todavía no tienen ni sesión confirmada ni
   *  "no la hice" — hay que preguntarle al usuario por ellas. Mira como mucho 120
   *  días hacia atrás (o desde que se creó/empezó el proyecto) para no iterar sin
   *  límite en proyectos muy antiguos. */
  const pendingTimeConfirmations: CerebroCtx["pendingTimeConfirmations"] = useCallback((projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.timeSchedule || project.timeSchedule.length === 0) return [];
    const byWeekday = new Map(project.timeSchedule.map(s => [s.weekday, s.minutes]));
    const confirmedDates = new Set(projectTimeEntries.filter(e => e.projectId === projectId).map(e => e.date));
    const declinedDates = new Set(project.timeDeclinedDates ?? []);
    const today = startOfDay(new Date());
    const earliest = startOfDay(parseISO(project.startDate || project.createdAt));
    const windowStart = subDays(today, 120);
    const from = earliest > windowStart ? earliest : windowStart;
    const toIdx = (js: number) => (js + 6) % 7;
    const out: { date: string; minutes: number }[] = [];
    for (let d = new Date(from); d < today; d.setDate(d.getDate() + 1)) {
      const minutes = byWeekday.get(toIdx(d.getDay()));
      if (minutes === undefined) continue;
      const key = format(d, "yyyy-MM-dd");
      if (confirmedDates.has(key) || declinedDates.has(key)) continue;
      out.push({ date: key, minutes });
    }
    return out;
  }, [projects, projectTimeEntries]);

  const confirmTimeSession: CerebroCtx["confirmTimeSession"] = useCallback((projectId, date, minutes) => {
    setProjectTimeEntries(prev => [...prev, { id: uid(), projectId, date, minutes, createdAt: new Date().toISOString() }]);
  }, []);

  const declineTimeSession: CerebroCtx["declineTimeSession"] = useCallback((projectId, date) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, timeDeclinedDates: [...(p.timeDeclinedDates ?? []), date] } : p));
  }, []);

  const projectAccumulatedMinutes = useCallback((projectId: string) =>
    projectTimeEntries.filter(e => e.projectId === projectId).reduce((s, e) => s + e.minutes, 0),
    [projectTimeEntries]);

  const projectFolder = useCallback((projectId: string) => apunteFolders.find(f => f.projectId === projectId), [apunteFolders]);

  /* ---------- Archivo (árbol de carpetas 100% local) ---------- */
  const addApunteFolder: CerebroCtx["addApunteFolder"] = useCallback((name, parentId, color) => {
    const f: ApunteFolder = { id: uid(), name: name.trim(), color, parentId: parentId ?? null, createdAt: new Date().toISOString() };
    setApunteFolders(prev => [...prev, f]);
    return f;
  }, []);

  const renameApunteFolder = useCallback((id: string, name: string) => {
    setApunteFolders(prev => prev.map(f => f.id === id ? { ...f, name: name.trim() || f.name } : f));
  }, []);

  /** Borra una carpeta Y todo lo que tenga dentro (subcarpetas y notas). */
  const delApunteFolder: CerebroCtx["delApunteFolder"] = useCallback((id) => {
    const target = apunteFolders.find(f => f.id === id);
    if (!target) return;

    const idsToRemove = new Set<string>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      apunteFolders.forEach(f => {
        if (f.parentId && idsToRemove.has(f.parentId) && !idsToRemove.has(f.id)) {
          idsToRemove.add(f.id);
          grew = true;
        }
      });
    }

    setApunteFolders(prev => prev.filter(f => !idsToRemove.has(f.id)));
    const removedDocIds = new Set(apunteDocs.filter(d => d.folderId && idsToRemove.has(d.folderId)).map(d => d.id));
    setApunteDocs(prev => prev.filter(d => !(d.folderId && idsToRemove.has(d.folderId))));
    if (removedDocIds.size > 0) {
      setApunteAudios(prev => prev.map(a => a.documentId && removedDocIds.has(a.documentId) ? { ...a, documentId: null } : a));
    }
  }, [apunteFolders, apunteDocs]);

  const folderPath = useCallback((folderId?: string | null) => {
    const chain: ApunteFolder[] = [];
    let cur = folderId ? apunteFolders.find(f => f.id === folderId) : undefined;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parentId ? apunteFolders.find(f => f.id === cur!.parentId) : undefined;
    }
    return chain;
  }, [apunteFolders]);

  const moveApunteFolder: CerebroCtx["moveApunteFolder"] = useCallback((id, newParentId) => {
    if (id === newParentId) return;
    // Evita mover una carpeta dentro de sí misma o de una de sus propias subcarpetas.
    const isDescendantOfMoved = (candidateId: string | null): boolean => {
      let cur = candidateId ? apunteFolders.find(f => f.id === candidateId) : undefined;
      while (cur) {
        if (cur.id === id) return true;
        cur = cur.parentId ? apunteFolders.find(f => f.id === cur!.parentId) : undefined;
      }
      return false;
    };
    if (newParentId && isDescendantOfMoved(newParentId)) {
      toast.error("No puedes mover una carpeta dentro de sí misma.");
      return;
    }
    const folder = apunteFolders.find(f => f.id === id);
    if (!folder || (folder.parentId ?? null) === (newParentId ?? null)) return;
    if (folder.projectId && projects.some(p => p.id === folder.projectId)) {
      toast.error("La carpeta de un proyecto no se puede mover.");
      return;
    }
    setApunteFolders(prev => prev.map(f => f.id === id ? { ...f, parentId: newParentId } : f));
  }, [apunteFolders, projects]);

  const moveApunteDoc: CerebroCtx["moveApunteDoc"] = useCallback((id, newFolderId) => {
    const doc = apunteDocs.find(d => d.id === id);
    if (!doc || (doc.folderId ?? null) === (newFolderId ?? null)) return;
    setApunteDocs(prev => prev.map(d => d.id === id ? { ...d, folderId: newFolderId, updatedAt: new Date().toISOString() } : d));
  }, [apunteDocs]);

  /** Crea un Google Doc real y le pega el contenido inicial. Solo lo usa ya
   *  "convertNoteToDoc", para las notas de Hitos/Roadmap — el Archivo ya no
   *  tiene ninguna relación con Drive. */
  const createGoogleDoc = useCallback(async (
    title: string,
    folderDriveId?: string | null,
    content?: string
  ): Promise<{ googleDocId: string; googleDocUrl: string } | null> => {
    if (!session?.access_token) return null;
    try {
      const res = await fetch("/api/google-docs-create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ title, folderId: folderDriveId || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.googleDocId) {
        toast.error("No se pudo crear el Google Doc", { description: json?.error });
        return null;
      }
      if (content?.trim()) {
        await fetch("/api/google-docs-append", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ googleDocId: json.googleDocId, text: content }),
        }).catch(() => {});
      }
      return { googleDocId: json.googleDocId, googleDocUrl: json.googleDocUrl };
    } catch (e: any) {
      toast.error("No se pudo crear el Google Doc", { description: e?.message });
      return null;
    }
  }, [session]);

  const convertNoteToDoc: CerebroCtx["convertNoteToDoc"] = useCallback(async (noteId) => {
    if (!session?.access_token) {
      toast.error("Conecta Google Drive primero");
      return;
    }
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const created = await createGoogleDoc(note.title, undefined, note.content);
    if (!created) return;
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, googleDocId: created.googleDocId, googleDocUrl: created.googleDocUrl } : n));
    toast.success("Convertido a Google Doc", { description: note.title });
  }, [session, notes, createGoogleDoc]);

  const addApunteDoc: CerebroCtx["addApunteDoc"] = useCallback((partial) => {
    const now = new Date().toISOString();
    const d: ApunteDoc = {
      id: uid(),
      folderId: partial.folderId ?? null,
      title: partial.title.trim() || "Sin título",
      content: partial.content ?? "",
      links: partial.links ?? [],
      photos: partial.photos ?? [],
      tags: partial.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    setApunteDocs(prev => [d, ...prev]);
    return d;
  }, []);

  const convertTaskToNote: CerebroCtx["convertTaskToNote"] = useCallback((id, folderId) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    addApunteDoc({ title: t.title, content: t.description ?? "", folderId, photos: t.photo ? [t.photo] : [] });
    delTask(id);
    toast.success("Pasada a nota", { description: t.title });
  }, [tasks, addApunteDoc, delTask]);

  const updateApunteDoc = useCallback((id: string, patch: Partial<ApunteDoc>) => {
    setApunteDocs(prev => prev.map(d => d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d));
  }, []);

  const delApunteDoc: CerebroCtx["delApunteDoc"] = useCallback((id) => {
    setApunteDocs(prev => prev.filter(d => d.id !== id));
    setApunteAudios(prev => prev.map(a => a.documentId === id ? { ...a, documentId: null } : a));
  }, []);

  const updateApunteAudio = useCallback((id: string, patch: Partial<ApunteAudio>) => {
    setApunteAudios(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  }, []);

  const delApunteAudio = useCallback((id: string) => {
    setApunteAudios(prev => {
      const a = prev.find(x => x.id === id);
      if (a?.storagePath) {
        supabase.storage.from(APUNTES_AUDIO_BUCKET).remove([a.storagePath]).catch(() => { /* noop */ });
      }
      return prev.filter(x => x.id !== id);
    });
  }, []);

  /** Vincula un audio a un documento. Si el audio ya tiene transcripción lista
   *  (p. ej. se vincula a un documento EXISTENTE después de completarse, en vez
   *  de crear uno nuevo en el momento), hay que pegarla ahora mismo: antes solo
   *  se pegaba en el instante en que la transcripción terminaba, así que vincular
   *  un audio ya completado a un documento existente no escribía nada en Drive. */
  const linkApunteAudio = useCallback((audioId: string, documentId: string | null) => {
    setApunteAudios(prev => prev.map(a => a.id === audioId ? { ...a, documentId } : a));

    const audio = apunteAudios.find(a => a.id === audioId);
    if (documentId && audio?.status === "completed" && (audio.summary || audio.transcript)) {
      const addition = `

---
### 🎙️ ${audio.title}
${audio.summary || audio.transcript || ""}
`;
      setApunteDocs(prev => prev.map(d => d.id === documentId
        ? { ...d, content: (d.content || "") + addition, updatedAt: new Date().toISOString() }
        : d));
    }
  }, [apunteAudios]);

  const uploadApunteAudio: CerebroCtx["uploadApunteAudio"] = useCallback(async (file, opts) => {
    if (!user) throw new Error("Debes iniciar sesión.");
    const id = uid();
    const now = new Date().toISOString();
    const audio: ApunteAudio = {
      id,
      title: (opts?.title || file.name.replace(/\.[^.]+$/, "")).trim() || file.name,
      storagePath: "",
      documentId: opts?.documentId ?? null,
      status: "uploading",
      createdAt: now,
    };
    setApunteAudios(prev => [audio, ...prev]);

    try {
      const safeName = file.name.replace(/[^\w.-]+/g, "_");
      const path = `${user.id}/${id}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from(APUNTES_AUDIO_BUCKET)
        .upload(path, file, { contentType: file.type || "audio/mpeg", upsert: false });
      if (upErr) throw upErr;

      updateApunteAudio(id, { storagePath: path, status: "queued" });

      const { data: signed, error: signErr } = await supabase.storage
        .from(APUNTES_AUDIO_BUCKET)
        .createSignedUrl(path, 60 * 60 * 6);
      if (signErr || !signed?.signedUrl) throw signErr || new Error("No se pudo generar la URL firmada del audio.");

      const { transcriptionId } = await startTranscription(signed.signedUrl, audio.title);
      updateApunteAudio(id, { transcriptionId, status: "processing" });
    } catch (e: any) {
      const msg = e?.message || "Error al subir o transcribir el audio.";
      updateApunteAudio(id, { status: "error", errorMessage: msg });
      toast.error("Error con el audio", { description: msg });
    }

    return audio;
  }, [user, updateApunteAudio]);

  // Sondeo periódico de transcripciones en curso
  const pollingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      apunteAudios.forEach(a => {
        if (a.status !== "processing" || !a.transcriptionId || pollingRef.current.has(a.id)) return;
        pollingRef.current.add(a.id);
        pollTranscription(a.transcriptionId)
          .then(res => {
            if (res.status === "completed") {
              updateApunteAudio(a.id, { status: "completed", transcript: res.transcript, summary: res.summary });
              if (a.documentId) {
                const addition = `\n\n---\n### 🎙️ ${a.title}\n${res.summary || res.transcript || ""}\n`;
                setApunteDocs(prev => prev.map(d => d.id === a.documentId
                  ? { ...d, content: (d.content || "") + addition, updatedAt: new Date().toISOString() }
                  : d));
              }
            } else if (res.status === "failed") {
              updateApunteAudio(a.id, { status: "error", errorMessage: res.error || "La transcripción falló." });
            }
          })
          .catch(() => { /* se reintenta en el siguiente ciclo */ })
          .finally(() => { pollingRef.current.delete(a.id); });
      });
    }, 7000);
    return () => clearInterval(interval);
  }, [apunteAudios, updateApunteAudio]);

  /* ---------- Conexión con Google Drive/Docs ---------- */
  useEffect(() => {
    if (!session?.access_token) return;
    fetch("/api/google-status", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.json())
      .then(j => setGoogleConnected(!!j.connected))
      .catch(() => {});
  }, [session?.access_token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const g = params.get("google");
    if (!g) return;
    if (g === "connected") {
      toast.success("Google Drive conectado");
      setGoogleConnected(true);
    } else if (g === "error") {
      const reason = params.get("reason");
      toast.error("No se pudo conectar Google Drive", {
        description: reason ? `Motivo: ${reason}` : "Vuelve a intentarlo desde Apuntes.",
      });
    }
    params.delete("google");
    const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
    window.history.replaceState({}, "", newUrl);
  }, []);

  const connectGoogleDrive = useCallback(() => {
    if (!user) return;
    window.location.href = `/api/google-auth-start?uid=${encodeURIComponent(user.id)}`;
  }, [user]);

  const tasksByMilestone = useCallback((id: string) => tasks.filter(t => t.linkedMilestoneId === id), [tasks]);
  const notesByMilestone = useCallback((id: string) => notes.filter(n => n.linkedTo?.kind === "milestone" && n.linkedTo.id === id), [notes]);
  const milestoneProgress = useCallback((id: string) => {
    const list = tasks.filter(t => t.linkedMilestoneId === id);
    const total = list.length;
    const done = list.filter(t => t.done).length;
    return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  }, [tasks]);

  const value = useMemo<CerebroCtx>(() => ({
    tasks, notes, noteCats, projects, projectCategories, projectUpdates, fadingIds,
    addTask, toggleTask, delTask, updateTask, convertTaskToNote,
    addNote, updateNote, delNote, addNoteCategory, deleteNoteCategory,
    addProject, updateProject, delProject, moveProjectStatus, projectTasks, projectProgress, moveTaskStage, projectsByDreamId,
    addProjectCategory, updateProjectCategory, delProjectCategory,
    addProjectUpdate, delProjectUpdate, projectUpdatesFor, projectNotes,
    apunteFolders, apunteDocs, apunteAudios,
    addApunteFolder, renameApunteFolder, delApunteFolder, folderPath, moveApunteFolder, moveApunteDoc, convertNoteToDoc,
    addApunteDoc, updateApunteDoc, delApunteDoc,
    updateApunteAudio, delApunteAudio, linkApunteAudio, uploadApunteAudio,
    googleConnected, connectGoogleDrive,
    objetivos, objetivosFor, addObjetivo, updateObjetivo, delObjetivo, moveObjetivoStage,
    retroEntries, retroEntriesFor, addRetroEntry, delRetroEntry,
    projectExpenses, expensesFor, addExpense, delExpense, projectBudgetRemaining,
    projectTimeEntries, updateProjectTimeSchedule, pendingTimeConfirmations, confirmTimeSession, declineTimeSession, projectAccumulatedMinutes,
    projectFolder,
    dreams, addDream, updateDream, delDream, dreamsConfig, updateDreamsConfig,
    openNoteSheet, openTaskDialog, openQuickCapture, createTaskFromNote,
    tasksByMilestone, notesByMilestone, milestoneProgress,
    _noteSheetState: noteSheetState,
    _setNoteSheetOpen: (open) => setNoteSheetState(s => ({ ...s, open })),
    _taskDialogState: taskDialogState,
    _setTaskDialogOpen: (open) => setTaskDialogState(s => ({ ...s, open })),
    _quickOpen: quickOpen,
    _setQuickOpen: setQuickOpen,
  }), [
    tasks, notes, noteCats, projects, projectCategories, projectUpdates, fadingIds,
    addTask, toggleTask, delTask, updateTask, convertTaskToNote,
    addNote, updateNote, delNote, addNoteCategory, deleteNoteCategory,
    addProject, updateProject, delProject, moveProjectStatus, projectTasks, projectProgress, moveTaskStage, projectsByDreamId,
    addProjectCategory, updateProjectCategory, delProjectCategory,
    addProjectUpdate, delProjectUpdate, projectUpdatesFor, projectNotes,
    apunteFolders, apunteDocs, apunteAudios,
    addApunteFolder, renameApunteFolder, delApunteFolder, folderPath, moveApunteFolder, moveApunteDoc, convertNoteToDoc,
    addApunteDoc, updateApunteDoc, delApunteDoc,
    updateApunteAudio, delApunteAudio, linkApunteAudio, uploadApunteAudio,
    googleConnected, connectGoogleDrive,
    objetivos, objetivosFor, addObjetivo, updateObjetivo, delObjetivo, moveObjetivoStage,
    retroEntries, retroEntriesFor, addRetroEntry, delRetroEntry,
    projectExpenses, expensesFor, addExpense, delExpense, projectBudgetRemaining,
    projectTimeEntries, updateProjectTimeSchedule, pendingTimeConfirmations, confirmTimeSession, declineTimeSession, projectAccumulatedMinutes,
    projectFolder,
    dreams, addDream, updateDream, delDream, dreamsConfig, updateDreamsConfig,
    openNoteSheet, openTaskDialog, openQuickCapture, createTaskFromNote,
    tasksByMilestone, notesByMilestone, milestoneProgress,
    noteSheetState, taskDialogState, quickOpen,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}