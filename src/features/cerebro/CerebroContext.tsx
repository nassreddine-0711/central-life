import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSupabaseSync } from "@/hooks/useSupabaseSync";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { subMonths, parseISO } from "date-fns";
import {
  Task, Note, LinkedRef, Category, Priority, Project, ProjectStage, ProjectStatus,
  ProjectCategory, ProjectUpdate,
  ApunteFolder, ApunteDoc, ApunteAudio,
  TASKS_KEY, NOTES_KEY, NOTE_CATS_KEY, PROJECTS_KEY, PROJECT_CATS_KEY, PROJECT_UPDATES_KEY,
  DEFAULT_NOTE_CAT, uid, load,
  nextRecurrence,
  APUNTE_FOLDERS_KEY, APUNTE_DOCS_KEY, APUNTE_AUDIOS_KEY, APUNTES_AUDIO_BUCKET,
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
  projectByGoalId: (goalId: string) => Project | undefined;
  addProjectCategory: (name: string, color?: string) => ProjectCategory;
  updateProjectCategory: (id: string, patch: Partial<ProjectCategory>) => void;
  delProjectCategory: (id: string) => void;
  addProjectUpdate: (projectId: string, text: string) => ProjectUpdate;
  delProjectUpdate: (id: string) => void;
  projectUpdatesFor: (projectId: string) => ProjectUpdate[];
  projectNotes: (projectId: string) => Note[];

  // Apuntes (carpetas + documentos + audios transcritos)
  apunteFolders: ApunteFolder[];
  apunteDocs: ApunteDoc[];
  apunteAudios: ApunteAudio[];
  addApunteFolder: (name: string, parentId?: string | null, color?: string) => ApunteFolder;
  renameApunteFolder: (id: string, name: string) => void;
  delApunteFolder: (id: string) => void;
  folderPath: (folderId?: string | null) => ApunteFolder[];
  convertNoteToDoc: (noteId: string) => Promise<void>;
  addApunteDoc: (partial: { title: string; content?: string; folderId?: string | null }) => Promise<ApunteDoc | null>;
  updateApunteDoc: (id: string, patch: Partial<ApunteDoc>) => void;
  delApunteDoc: (id: string) => void;
  updateApunteAudio: (id: string, patch: Partial<ApunteAudio>) => void;
  delApunteAudio: (id: string) => void;
  linkApunteAudio: (audioId: string, documentId: string | null) => void;
  uploadApunteAudio: (file: File, opts?: { title?: string; documentId?: string | null }) => Promise<ApunteAudio>;
  googleConnected: boolean;
  connectGoogleDrive: () => void;
  driveFolders: { id: string; name: string; parentId: string | null }[];
  driveRootId: string | null;
  refreshDriveFolders: () => void;
  createDriveFolder: (name: string, parentId: string) => Promise<{ id: string; name: string; parentId: string | null } | null>;

  // Cross-section UI hooks
  openNoteSheet: (opts?: { linkedTo?: LinkedRef; defaultCategory?: string; defaultKind?: "note" | "ref"; defaultFolderId?: string | null; defaultProjectId?: string }) => void;
  openTaskDialog: (opts?: { linkedNoteId?: string; linkedMilestoneId?: string; defaultTitle?: string; editId?: string }) => void;
  openQuickCapture: () => void;
  createTaskFromNote: (note: Note) => void;

  // Selectors
  tasksByMilestone: (milestoneId: string) => Task[];
  notesByMilestone: (milestoneId: string) => Note[];
  milestoneProgress: (milestoneId: string) => { done: number; total: number; pct: number };

  // internal modal state (consumed by mounted dialogs)
  _noteSheetState: { open: boolean; linkedTo?: LinkedRef; defaultCategory?: string; defaultKind?: "note" | "ref"; defaultFolderId?: string | null; defaultProjectId?: string };
  _setNoteSheetOpen: (open: boolean) => void;
  _taskDialogState: { open: boolean; linkedNoteId?: string; linkedMilestoneId?: string; defaultTitle?: string; editId?: string };
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
  const [tasks, setTasks] = useState<Task[]>(() => filterOldCompletedTasks(load(TASKS_KEY, [])));
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
  const createDriveFolderRef = useRef<((name: string, parentId: string) => Promise<{ id: string; name: string; parentId: string | null } | null>) | null>(null);
  const [driveFolders, setDriveFolders] = useState<{ id: string; name: string; parentId: string | null }[]>([]);
  const [driveRootId, setDriveRootId] = useState<string | null>(null);
  const backfillInFlight = useRef<Set<string>>(new Set());
  const [apunteDocs, setApunteDocs] = useState<ApunteDoc[]>(() => load(APUNTE_DOCS_KEY, []));
  const [apunteAudios, setApunteAudios] = useState<ApunteAudio[]>(() => load(APUNTE_AUDIOS_KEY, []));
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());

  const [noteSheetState, setNoteSheetState] = useState<{ open: boolean; linkedTo?: LinkedRef; defaultCategory?: string; defaultKind?: "note" | "ref"; defaultFolderId?: string | null; defaultProjectId?: string }>({ open: false });
  const [taskDialogState, setTaskDialogState] = useState<{ open: boolean; linkedNoteId?: string; linkedMilestoneId?: string; defaultTitle?: string; editId?: string }>({ open: false });
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

  const setTasksCb = useCallback((v: Task[]) => setTasks(filterOldCompletedTasks(v)), []);
  const setNotesCb = useCallback((v: Note[]) => setNotes(v.map(n => ({ ...n, category: n.category || DEFAULT_NOTE_CAT }))), []);
  const setNoteCatsCb = useCallback((v: string[]) => setNoteCats(v), []);
  const setProjectsCb = useCallback((v: Project[]) => setProjects(v), []);
  const setProjectCategoriesCb = useCallback((v: ProjectCategory[]) => setProjectCategories(v), []);
  const setProjectUpdatesCb = useCallback((v: ProjectUpdate[]) => setProjectUpdates(v), []);
  const setApunteFoldersCb = useCallback((v: ApunteFolder[]) => setApunteFolders(v), []);
  const setApunteDocsCb = useCallback((v: ApunteDoc[]) => setApunteDocs(v), []);
  const setApunteAudiosCb = useCallback((v: ApunteAudio[]) => setApunteAudios(v), []);
  useSupabaseSync("cerebro_tasks", tasks, setTasksCb);
  useSupabaseSync("cerebro_notes", notes, setNotesCb);
  useSupabaseSync("cerebro_notecats", noteCats, setNoteCatsCb);
  useSupabaseSync("cerebro_projects", projects, setProjectsCb);
  useSupabaseSync("cerebro_project_categories", projectCategories, setProjectCategoriesCb);
  useSupabaseSync("cerebro_project_updates", projectUpdates, setProjectUpdatesCb);
  useSupabaseSync("cerebro_apunte_folders", apunteFolders, setApunteFoldersCb);
  useSupabaseSync("cerebro_apunte_docs", apunteDocs, setApunteDocsCb);
  useSupabaseSync("cerebro_apunte_audios", apunteAudios, setApunteAudiosCb);

  const addTask: CerebroCtx["addTask"] = useCallback((partial) => {
    const t: Task = {
      id: uid(),
      title: partial.title,
      description: partial.description,
      photo: partial.photo,
      category: partial.category ?? "Otros",
      priority: partial.priority ?? "med",
      date: partial.date,
      done: false,
      inbox: partial.inbox ?? (partial.projectId ? false : true),
      createdAt: new Date().toISOString(),
      linkedNoteId: partial.linkedNoteId,
      linkedMilestoneId: partial.linkedMilestoneId,
      recurrence: partial.recurrence,
      projectId: partial.projectId,
      stage: partial.projectId ? (partial.stage ?? "todo") : undefined,
    };
    setTasks(prev => [t, ...prev]);
    return t;
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => {
      const t = prev.find(x => x.id === id);
      if (!t) return prev;
      if (!t.done) {
        setFadingIds(s => { const n = new Set(s); n.add(id); return n; });
        window.setTimeout(() => {
          setTasks(p => {
            const updated = p.map(x => x.id === id ? { ...x, done: true, completedAt: new Date().toISOString() } : x);
            // Spawn next occurrence if recurring
            if (t.recurrence) {
              const base = t.date ? new Date(t.date) : new Date();
              const next = nextRecurrence(t.recurrence, base);
              const cloned: Task = {
                ...t,
                id: uid(),
                done: false,
                completedAt: undefined,
                createdAt: new Date().toISOString(),
                date: next.toISOString(),
                inbox: false,
              };
              return [cloned, ...updated];
            }
            return updated;
          });
          setFadingIds(s => { const n = new Set(s); n.delete(id); return n; });
        }, 320);
        return prev;
      }
      return prev.map(x => x.id === id ? { ...x, done: false, completedAt: undefined } : x);
    });
  }, []);

  const delTask = useCallback((id: string) => setTasks(t => t.filter(x => x.id !== id)), []);
  const updateTask = useCallback((id: string, patch: Partial<Task>) => setTasks(t => t.map(x => x.id === id ? { ...x, ...patch } : x)), []);

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
    setTaskDialogState({ open: true, linkedNoteId: opts?.linkedNoteId, linkedMilestoneId: opts?.linkedMilestoneId, defaultTitle: opts?.defaultTitle, editId: opts?.editId });
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
      dueDate: partial.dueDate,
      linkedGoalId: partial.linkedGoalId,
      archived: false,
      createdAt: new Date().toISOString(),
    };
    setProjects(prev => [p, ...prev]);
    return p;
  }, []);

  const updateProject = useCallback((id: string, patch: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }, []);

  const delProject = useCallback((id: string) => {
    if (!confirm("¿Eliminar este proyecto? Las tareas y archivos vinculados se quedarán sin proyecto.")) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.map(t => t.projectId === id ? { ...t, projectId: undefined, stage: undefined } : t));
    setNotes(prev => prev.map(n => n.projectId === id ? { ...n, projectId: undefined } : n));
    setProjectUpdates(prev => prev.filter(u => u.projectId !== id));
  }, []);

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

  const moveTaskStage = useCallback((taskId: string, stage: ProjectStage) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, stage, done: stage === "done" ? true : t.done } : t));
  }, []);

  const projectByGoalId = useCallback((goalId: string) => projects.find(p => p.linkedGoalId === goalId), [projects]);

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

  /* ---------- Archivo (árbol único de carpetas: notas, referencias, apuntes) ---------- */
  const addApunteFolder: CerebroCtx["addApunteFolder"] = useCallback((name, parentId, color) => {
    const f: ApunteFolder = { id: uid(), name: name.trim(), color, parentId: parentId ?? null, createdAt: new Date().toISOString() };
    setApunteFolders(prev => [...prev, f]);
    // Espejo en Google Drive, si está conectado (en segundo plano; si falla, la carpeta se queda solo local).
    if (googleConnected && session?.access_token) {
      const parentDriveId = parentId
        ? apunteFolders.find(x => x.id === parentId)?.driveFolderId
        : driveRootId;
      if (parentDriveId) {
        createDriveFolderRef.current?.(f.name, parentDriveId).then(drive => {
          if (drive) setApunteFolders(prev => prev.map(x => x.id === f.id ? { ...x, driveFolderId: drive.id } : x));
        });
      }
    }
    return f;
  }, [googleConnected, session, apunteFolders, driveRootId]);

  const renameApunteFolder = useCallback((id: string, name: string) => {
    setApunteFolders(prev => prev.map(f => f.id === id ? { ...f, name: name.trim() || f.name } : f));
  }, []);

  const delApunteFolder = useCallback((id: string) => {
    setApunteFolders(prev => {
      const target = prev.find(f => f.id === id);
      const parentId = target?.parentId ?? null;
      return prev.filter(f => f.id !== id).map(f => f.parentId === id ? { ...f, parentId } : f);
    });
    setApunteDocs(prev => prev.map(d => d.folderId === id ? { ...d, folderId: null } : d));
    setNotes(prev => prev.map(n => n.folderId === id ? { ...n, folderId: null } : n));
  }, []);

  const folderPath = useCallback((folderId?: string | null) => {
    const chain: ApunteFolder[] = [];
    let cur = folderId ? apunteFolders.find(f => f.id === folderId) : undefined;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parentId ? apunteFolders.find(f => f.id === cur!.parentId) : undefined;
    }
    return chain;
  }, [apunteFolders]);

  /** Crea un Google Doc real (en la carpeta de Drive dada, si la hay) y le pega el contenido inicial. */
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
      toast.error("Conecta Google Drive primero", { description: "Ve a Archivo para conectarlo." });
      return;
    }
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const folderDriveId = note.folderId ? apunteFolders.find(f => f.id === note.folderId)?.driveFolderId : undefined;
    const created = await createGoogleDoc(note.title, folderDriveId, note.content);
    if (!created) return;
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, googleDocId: created.googleDocId, googleDocUrl: created.googleDocUrl } : n));
    toast.success("Convertido a Google Doc", { description: note.title });
  }, [session, notes, apunteFolders, createGoogleDoc]);

  const addApunteDoc: CerebroCtx["addApunteDoc"] = useCallback(async (partial) => {
    if (!googleConnected || !session?.access_token) {
      toast.error("Conecta Google Drive primero", { description: "Necesitas Drive conectado para crear documentos." });
      return null;
    }
    const folderDriveId = partial.folderId
      ? apunteFolders.find(f => f.id === partial.folderId)?.driveFolderId
      : driveRootId;
    const created = await createGoogleDoc(partial.title, folderDriveId, partial.content);
    if (!created) return null;

    const now = new Date().toISOString();
    const d: ApunteDoc = {
      id: uid(),
      folderId: partial.folderId ?? null,
      title: partial.title.trim() || "Sin título",
      content: "",
      googleDocId: created.googleDocId,
      googleDocUrl: created.googleDocUrl,
      createdAt: now,
      updatedAt: now,
    };
    setApunteDocs(prev => [d, ...prev]);
    return d;
  }, [googleConnected, session, apunteFolders, driveRootId, createGoogleDoc]);

  const updateApunteDoc = useCallback((id: string, patch: Partial<ApunteDoc>) => {
    setApunteDocs(prev => prev.map(d => d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d));
  }, []);

  const delApunteDoc = useCallback((id: string) => {
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

  const linkApunteAudio = useCallback((audioId: string, documentId: string | null) => {
    setApunteAudios(prev => prev.map(a => a.id === audioId ? { ...a, documentId } : a));
  }, []);

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
  const apunteDocsRef = useRef<ApunteDoc[]>(apunteDocs);
  useEffect(() => { apunteDocsRef.current = apunteDocs; }, [apunteDocs]);

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
                const doc = apunteDocsRef.current.find(d => d.id === a.documentId);
                if (doc?.googleDocId) {
                  if (session?.access_token) {
                    fetch("/api/google-docs-append", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                      body: JSON.stringify({ googleDocId: doc.googleDocId, text: addition }),
                    }).catch(() => {
                      toast.error("No se pudo añadir el resumen al Google Doc", { description: doc.title });
                    });
                  }
                } else {
                  setApunteDocs(prev => prev.map(d => d.id === a.documentId
                    ? { ...d, content: (d.content || "") + addition, updatedAt: new Date().toISOString() }
                    : d));
                }
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
  }, [apunteAudios, updateApunteAudio, session]);

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

  /* ---------- Árbol de carpetas de Google Drive (en vivo) ---------- */
  const refreshDriveFolders = useCallback(() => {
    if (!session?.access_token) return;
    fetch("/api/google-drive-tree", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.json())
      .then(j => {
        if (j.folders) {
          setDriveFolders(j.folders);
          setDriveRootId(j.rootId || null);
        }
      })
      .catch(() => { /* se reintentará en el próximo refresco */ });
  }, [session]);

  useEffect(() => {
    if (googleConnected) refreshDriveFolders();
  }, [googleConnected, refreshDriveFolders]);

  useEffect(() => {
    const onFocus = () => { if (googleConnected) refreshDriveFolders(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [googleConnected, refreshDriveFolders]);

  const createDriveFolder: CerebroCtx["createDriveFolder"] = useCallback(async (name, parentId) => {
    if (!session?.access_token) return null;
    try {
      const res = await fetch("/api/google-drive-create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name, parentId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo crear la carpeta en Drive", { description: json?.error });
        return null;
      }
      const folder = { id: json.id as string, name: json.name as string, parentId: json.parentId as string };
      setDriveFolders(prev => [...prev, folder]);
      return folder;
    } catch (e: any) {
      toast.error("No se pudo crear la carpeta en Drive", { description: e?.message });
      return null;
    }
  }, [session]);

  useEffect(() => { createDriveFolderRef.current = createDriveFolder; }, [createDriveFolder]);

  // Reconciliación: si aparecen carpetas nuevas en Drive (creadas fuera de la web),
  // se reflejan aquí como carpetas locales la próxima vez que se refresca el árbol.
  useEffect(() => {
    if (!googleConnected || driveFolders.length === 0) return;
    setApunteFolders(prev => {
      const byDriveId = new Map(prev.filter(f => f.driveFolderId).map(f => [f.driveFolderId as string, f]));
      const additions: ApunteFolder[] = [];
      const resolveLocalParent = (driveParentId: string | null): string | null | undefined => {
        if (driveParentId === driveRootId) return null;
        if (!driveParentId) return undefined;
        const match = byDriveId.get(driveParentId) ?? additions.find(f => f.driveFolderId === driveParentId);
        return match ? match.id : undefined;
      };
      // Varias pasadas para que las subcarpetas de carpetas recién creadas también entren.
      for (let pass = 0; pass < 4; pass++) {
        driveFolders.forEach(df => {
          if (byDriveId.has(df.id) || additions.some(a => a.driveFolderId === df.id)) return;
          const localParent = resolveLocalParent(df.parentId);
          if (localParent === undefined) return; // el padre aún no está mirado; se intentará en la siguiente pasada
          additions.push({ id: uid(), name: df.name, parentId: localParent, driveFolderId: df.id, createdAt: new Date().toISOString() });
        });
      }
      if (additions.length === 0) return prev;
      return [...prev, ...additions];
    });
  }, [driveFolders, driveRootId, googleConnected]);

  // Sincronización inicial (local → Drive): carpetas creadas antes de que la conexión
  // con Google Drive funcionara nunca llegaron a espejarse allí. En cuanto detectamos
  // conexión, creamos en Drive cualquier carpeta local que todavía no tenga pareja,
  // respetando la jerarquía (primero el padre, luego los hijos, en pasadas sucesivas
  // a medida que cada creación deja al siguiente nivel listo para continuar).
  useEffect(() => {
    if (!googleConnected || !driveRootId || !session?.access_token) return;
    const pending = apunteFolders.filter(f => !f.driveFolderId && !backfillInFlight.current.has(f.id));
    pending.forEach(f => {
      const parentDriveId = f.parentId
        ? apunteFolders.find(x => x.id === f.parentId)?.driveFolderId
        : driveRootId;
      if (!parentDriveId) return; // el padre todavía no tiene carpeta en Drive; se reintenta cuando la tenga
      backfillInFlight.current.add(f.id);
      createDriveFolder(f.name, parentDriveId).then(drive => {
        backfillInFlight.current.delete(f.id);
        if (drive) {
          setApunteFolders(prev => prev.map(x => x.id === f.id ? { ...x, driveFolderId: drive.id } : x));
        }
      });
    });
  }, [apunteFolders, googleConnected, driveRootId, session, createDriveFolder]);

  // Migración de documentos antiguos: ahora Archivo ya no distingue notas/referencias,
  // todo es "documento" y vive siempre como Google Doc. Las notas/referencias que ya
  // estaban archivadas en una carpeta se convierten en documentos reales (se crea su
  // Google Doc y se elimina la nota, que queda sustituida por el documento). Los
  // documentos que ya existían pero nunca llegaron a crearse en Drive (porque la
  // conexión no funcionaba) se crean ahora también.
  const legacyBackfillInFlight = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!googleConnected || !session?.access_token) return;

    const notesToMigrate = notes.filter(n => n.folderId && !legacyBackfillInFlight.current.has(`note:${n.id}`));
    notesToMigrate.forEach(n => {
      const folderDriveId = n.folderId ? apunteFolders.find(f => f.id === n.folderId)?.driveFolderId : driveRootId;
      if (!folderDriveId) return; // la carpeta todavía no tiene su Drive id; se reintenta cuando lo tenga
      legacyBackfillInFlight.current.add(`note:${n.id}`);
      createGoogleDoc(n.title, folderDriveId, n.content).then(created => {
        legacyBackfillInFlight.current.delete(`note:${n.id}`);
        if (!created) return;
        const now = new Date().toISOString();
        setApunteDocs(prev => [{
          id: uid(), folderId: n.folderId ?? null, title: n.title, content: "",
          googleDocId: created.googleDocId, googleDocUrl: created.googleDocUrl,
          createdAt: n.createdAt || now, updatedAt: now,
        }, ...prev]);
        setNotes(prev => prev.filter(x => x.id !== n.id));
      });
    });

    const docsToBackfill = apunteDocs.filter(d => !d.googleDocId && !legacyBackfillInFlight.current.has(`doc:${d.id}`));
    docsToBackfill.forEach(d => {
      const folderDriveId = d.folderId ? apunteFolders.find(f => f.id === d.folderId)?.driveFolderId : driveRootId;
      if (!folderDriveId) return;
      legacyBackfillInFlight.current.add(`doc:${d.id}`);
      createGoogleDoc(d.title, folderDriveId, d.content).then(created => {
        legacyBackfillInFlight.current.delete(`doc:${d.id}`);
        if (!created) return;
        setApunteDocs(prev => prev.map(x => x.id === d.id
          ? { ...x, googleDocId: created.googleDocId, googleDocUrl: created.googleDocUrl, content: "" }
          : x));
      });
    });
  }, [googleConnected, session, notes, apunteDocs, apunteFolders, driveRootId, createGoogleDoc]);

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
    addTask, toggleTask, delTask, updateTask,
    addNote, updateNote, delNote, addNoteCategory, deleteNoteCategory,
    addProject, updateProject, delProject, moveProjectStatus, projectTasks, projectProgress, moveTaskStage, projectByGoalId,
    addProjectCategory, updateProjectCategory, delProjectCategory,
    addProjectUpdate, delProjectUpdate, projectUpdatesFor, projectNotes,
    apunteFolders, apunteDocs, apunteAudios,
    addApunteFolder, renameApunteFolder, delApunteFolder, folderPath, convertNoteToDoc,
    addApunteDoc, updateApunteDoc, delApunteDoc,
    updateApunteAudio, delApunteAudio, linkApunteAudio, uploadApunteAudio,
    googleConnected, connectGoogleDrive,
    driveFolders, driveRootId, refreshDriveFolders, createDriveFolder,
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
    addTask, toggleTask, delTask, updateTask,
    addNote, updateNote, delNote, addNoteCategory, deleteNoteCategory,
    addProject, updateProject, delProject, moveProjectStatus, projectTasks, projectProgress, moveTaskStage, projectByGoalId,
    addProjectCategory, updateProjectCategory, delProjectCategory,
    addProjectUpdate, delProjectUpdate, projectUpdatesFor, projectNotes,
    apunteFolders, apunteDocs, apunteAudios,
    addApunteFolder, renameApunteFolder, delApunteFolder, folderPath, convertNoteToDoc,
    addApunteDoc, updateApunteDoc, delApunteDoc,
    updateApunteAudio, delApunteAudio, linkApunteAudio, uploadApunteAudio,
    googleConnected, connectGoogleDrive,
    driveFolders, driveRootId, refreshDriveFolders, createDriveFolder,
    openNoteSheet, openTaskDialog, openQuickCapture, createTaskFromNote,
    tasksByMilestone, notesByMilestone, milestoneProgress,
    noteSheetState, taskDialogState, quickOpen,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}