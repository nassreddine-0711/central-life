import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSupabaseSync } from "@/hooks/useSupabaseSync";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { subMonths, parseISO } from "date-fns";
import {
  Task, Note, LinkedRef, Category, Priority, Project, ProjectStage,
  ApunteFolder, ApunteDoc, ApunteAudio,
  TASKS_KEY, NOTES_KEY, NOTE_CATS_KEY, PROJECTS_KEY, DEFAULT_NOTE_CAT, uid, load,
  nextRecurrence,
  APUNTE_FOLDERS_KEY, APUNTE_DOCS_KEY, APUNTE_AUDIOS_KEY, APUNTES_AUDIO_BUCKET,
} from "./types";
import { startTranscription, pollTranscription } from "./apuntes/apuntesApi";

interface CerebroCtx {
  tasks: Task[];
  notes: Note[];
  noteCats: string[];
  projects: Project[];
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
  projectTasks: (projectId: string) => Task[];
  projectProgress: (projectId: string) => { done: number; total: number; pct: number };
  moveTaskStage: (taskId: string, stage: ProjectStage) => void;
  projectByGoalId: (goalId: string) => Project | undefined;

  // Apuntes (carpetas + documentos + audios transcritos)
  apunteFolders: ApunteFolder[];
  apunteDocs: ApunteDoc[];
  apunteAudios: ApunteAudio[];
  addApunteFolder: (name: string, color?: string) => ApunteFolder;
  renameApunteFolder: (id: string, name: string) => void;
  delApunteFolder: (id: string) => void;
  addApunteDoc: (partial: { title: string; content?: string; folderId?: string | null }) => ApunteDoc;
  updateApunteDoc: (id: string, patch: Partial<ApunteDoc>) => void;
  delApunteDoc: (id: string) => void;
  updateApunteAudio: (id: string, patch: Partial<ApunteAudio>) => void;
  delApunteAudio: (id: string) => void;
  linkApunteAudio: (audioId: string, documentId: string | null) => void;
  uploadApunteAudio: (file: File, opts?: { title?: string; documentId?: string | null }) => Promise<ApunteAudio>;

  // Cross-section UI hooks
  openNoteSheet: (opts?: { linkedTo?: LinkedRef; defaultCategory?: string }) => void;
  openTaskDialog: (opts?: { linkedNoteId?: string; linkedMilestoneId?: string; defaultTitle?: string; editId?: string }) => void;
  openQuickCapture: () => void;
  createTaskFromNote: (note: Note) => void;

  // Selectors
  tasksByMilestone: (milestoneId: string) => Task[];
  notesByMilestone: (milestoneId: string) => Note[];
  milestoneProgress: (milestoneId: string) => { done: number; total: number; pct: number };

  // internal modal state (consumed by mounted dialogs)
  _noteSheetState: { open: boolean; linkedTo?: LinkedRef; defaultCategory?: string };
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
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(() => filterOldCompletedTasks(load(TASKS_KEY, [])));
  const [notes, setNotes] = useState<Note[]>(() =>
    load<Note[]>(NOTES_KEY, []).map(n => ({ ...n, category: n.category || DEFAULT_NOTE_CAT }))
  );
  const [noteCats, setNoteCats] = useState<string[]>(() => load(NOTE_CATS_KEY, [DEFAULT_NOTE_CAT]));
  const [projects, setProjects] = useState<Project[]>(() => load(PROJECTS_KEY, []));
  const [apunteFolders, setApunteFolders] = useState<ApunteFolder[]>(() => load(APUNTE_FOLDERS_KEY, []));
  const [apunteDocs, setApunteDocs] = useState<ApunteDoc[]>(() => load(APUNTE_DOCS_KEY, []));
  const [apunteAudios, setApunteAudios] = useState<ApunteAudio[]>(() => load(APUNTE_AUDIOS_KEY, []));
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());

  const [noteSheetState, setNoteSheetState] = useState<{ open: boolean; linkedTo?: LinkedRef; defaultCategory?: string }>({ open: false });
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
  useEffect(() => { saveLocal(APUNTE_FOLDERS_KEY, apunteFolders, "las carpetas de apuntes"); }, [apunteFolders, saveLocal]);
  useEffect(() => { saveLocal(APUNTE_DOCS_KEY, apunteDocs, "los apuntes"); }, [apunteDocs, saveLocal]);
  useEffect(() => { saveLocal(APUNTE_AUDIOS_KEY, apunteAudios, "los audios de apuntes"); }, [apunteAudios, saveLocal]);

  const setTasksCb = useCallback((v: Task[]) => setTasks(filterOldCompletedTasks(v)), []);
  const setNotesCb = useCallback((v: Note[]) => setNotes(v.map(n => ({ ...n, category: n.category || DEFAULT_NOTE_CAT }))), []);
  const setNoteCatsCb = useCallback((v: string[]) => setNoteCats(v), []);
  const setProjectsCb = useCallback((v: Project[]) => setProjects(v), []);
  const setApunteFoldersCb = useCallback((v: ApunteFolder[]) => setApunteFolders(v), []);
  const setApunteDocsCb = useCallback((v: ApunteDoc[]) => setApunteDocs(v), []);
  const setApunteAudiosCb = useCallback((v: ApunteAudio[]) => setApunteAudios(v), []);
  useSupabaseSync("cerebro_tasks", tasks, setTasksCb);
  useSupabaseSync("cerebro_notes", notes, setNotesCb);
  useSupabaseSync("cerebro_notecats", noteCats, setNoteCatsCb);
  useSupabaseSync("cerebro_projects", projects, setProjectsCb);
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
      stage: partial.projectId ? (partial.stage ?? "backlog") : undefined,
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
    setNoteSheetState({ open: true, linkedTo: opts?.linkedTo, defaultCategory: opts?.defaultCategory });
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
    if (!confirm("¿Eliminar este proyecto? Las tareas que tenga se quedarán sin proyecto.")) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.map(t => t.projectId === id ? { ...t, projectId: undefined, stage: undefined } : t));
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

  /* ---------- Apuntes (carpetas + documentos + audios transcritos) ---------- */
  const addApunteFolder: CerebroCtx["addApunteFolder"] = useCallback((name, color) => {
    const f: ApunteFolder = { id: uid(), name: name.trim(), color, createdAt: new Date().toISOString() };
    setApunteFolders(prev => [...prev, f]);
    return f;
  }, []);

  const renameApunteFolder = useCallback((id: string, name: string) => {
    setApunteFolders(prev => prev.map(f => f.id === id ? { ...f, name: name.trim() || f.name } : f));
  }, []);

  const delApunteFolder = useCallback((id: string) => {
    setApunteFolders(prev => prev.filter(f => f.id !== id));
    setApunteDocs(prev => prev.map(d => d.folderId === id ? { ...d, folderId: null } : d));
  }, []);

  const addApunteDoc: CerebroCtx["addApunteDoc"] = useCallback((partial) => {
    const now = new Date().toISOString();
    const d: ApunteDoc = {
      id: uid(),
      folderId: partial.folderId ?? null,
      title: partial.title.trim() || "Sin título",
      content: partial.content ?? "",
      createdAt: now,
      updatedAt: now,
    };
    setApunteDocs(prev => [d, ...prev]);
    return d;
  }, []);

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
                setApunteDocs(prev => prev.map(d => {
                  if (d.id !== a.documentId) return d;
                  const addition = `\n\n---\n### 🎙️ ${a.title}\n${res.summary || res.transcript || ""}\n`;
                  return { ...d, content: (d.content || "") + addition, updatedAt: new Date().toISOString() };
                }));
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

  const tasksByMilestone = useCallback((id: string) => tasks.filter(t => t.linkedMilestoneId === id), [tasks]);
  const notesByMilestone = useCallback((id: string) => notes.filter(n => n.linkedTo?.kind === "milestone" && n.linkedTo.id === id), [notes]);
  const milestoneProgress = useCallback((id: string) => {
    const list = tasks.filter(t => t.linkedMilestoneId === id);
    const total = list.length;
    const done = list.filter(t => t.done).length;
    return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  }, [tasks]);

  const value = useMemo<CerebroCtx>(() => ({
    tasks, notes, noteCats, projects, fadingIds,
    addTask, toggleTask, delTask, updateTask,
    addNote, updateNote, delNote, addNoteCategory, deleteNoteCategory,
    addProject, updateProject, delProject, projectTasks, projectProgress, moveTaskStage, projectByGoalId,
    apunteFolders, apunteDocs, apunteAudios,
    addApunteFolder, renameApunteFolder, delApunteFolder,
    addApunteDoc, updateApunteDoc, delApunteDoc,
    updateApunteAudio, delApunteAudio, linkApunteAudio, uploadApunteAudio,
    openNoteSheet, openTaskDialog, openQuickCapture, createTaskFromNote,
    tasksByMilestone, notesByMilestone, milestoneProgress,
    _noteSheetState: noteSheetState,
    _setNoteSheetOpen: (open) => setNoteSheetState(s => ({ ...s, open })),
    _taskDialogState: taskDialogState,
    _setTaskDialogOpen: (open) => setTaskDialogState(s => ({ ...s, open })),
    _quickOpen: quickOpen,
    _setQuickOpen: setQuickOpen,
  }), [
    tasks, notes, noteCats, projects, fadingIds,
    addTask, toggleTask, delTask, updateTask,
    addNote, updateNote, delNote, addNoteCategory, deleteNoteCategory,
    addProject, updateProject, delProject, projectTasks, projectProgress, moveTaskStage, projectByGoalId,
    apunteFolders, apunteDocs, apunteAudios,
    addApunteFolder, renameApunteFolder, delApunteFolder,
    addApunteDoc, updateApunteDoc, delApunteDoc,
    updateApunteAudio, delApunteAudio, linkApunteAudio, uploadApunteAudio,
    openNoteSheet, openTaskDialog, openQuickCapture, createTaskFromNote,
    tasksByMilestone, notesByMilestone, milestoneProgress,
    noteSheetState, taskDialogState, quickOpen,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}