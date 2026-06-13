import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { subMonths, parseISO } from "date-fns";
import {
  Task, Note, LinkedRef, Category, Priority,
  TASKS_KEY, NOTES_KEY, NOTE_CATS_KEY, DEFAULT_NOTE_CAT, uid, load,
  nextRecurrence,
} from "./types";

interface CerebroCtx {
  tasks: Task[];
  notes: Note[];
  noteCats: string[];
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
  const [tasks, setTasks] = useState<Task[]>(() => filterOldCompletedTasks(load(TASKS_KEY, [])));
  const [notes, setNotes] = useState<Note[]>(() =>
    load<Note[]>(NOTES_KEY, []).map(n => ({ ...n, category: n.category || DEFAULT_NOTE_CAT }))
  );
  const [noteCats, setNoteCats] = useState<string[]>(() => load(NOTE_CATS_KEY, [DEFAULT_NOTE_CAT]));
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());

  const [noteSheetState, setNoteSheetState] = useState<{ open: boolean; linkedTo?: LinkedRef; defaultCategory?: string }>({ open: false });
  const [taskDialogState, setTaskDialogState] = useState<{ open: boolean; linkedNoteId?: string; linkedMilestoneId?: string; defaultTitle?: string; editId?: string }>({ open: false });
  const [quickOpen, setQuickOpen] = useState(false);

  useEffect(() => { localStorage.setItem(TASKS_KEY, JSON.stringify(filterOldCompletedTasks(tasks))); }, [tasks]);
  useEffect(() => { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem(NOTE_CATS_KEY, JSON.stringify(noteCats)); }, [noteCats]);

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
      inbox: partial.inbox ?? true,
      createdAt: new Date().toISOString(),
      linkedNoteId: partial.linkedNoteId,
      linkedMilestoneId: partial.linkedMilestoneId,
      recurrence: partial.recurrence,
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

  const tasksByMilestone = useCallback((id: string) => tasks.filter(t => t.linkedMilestoneId === id), [tasks]);
  const notesByMilestone = useCallback((id: string) => notes.filter(n => n.linkedTo?.kind === "milestone" && n.linkedTo.id === id), [notes]);
  const milestoneProgress = useCallback((id: string) => {
    const list = tasks.filter(t => t.linkedMilestoneId === id);
    const total = list.length;
    const done = list.filter(t => t.done).length;
    return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  }, [tasks]);

  const value = useMemo<CerebroCtx>(() => ({
    tasks, notes, noteCats, fadingIds,
    addTask, toggleTask, delTask, updateTask,
    addNote, updateNote, delNote, addNoteCategory, deleteNoteCategory,
    openNoteSheet, openTaskDialog, openQuickCapture, createTaskFromNote,
    tasksByMilestone, notesByMilestone, milestoneProgress,
    _noteSheetState: noteSheetState,
    _setNoteSheetOpen: (open) => setNoteSheetState(s => ({ ...s, open })),
    _taskDialogState: taskDialogState,
    _setTaskDialogOpen: (open) => setTaskDialogState(s => ({ ...s, open })),
    _quickOpen: quickOpen,
    _setQuickOpen: setQuickOpen,
  }), [
    tasks, notes, noteCats, fadingIds,
    addTask, toggleTask, delTask, updateTask,
    addNote, updateNote, delNote, addNoteCategory, deleteNoteCategory,
    openNoteSheet, openTaskDialog, openQuickCapture, createTaskFromNote,
    tasksByMilestone, notesByMilestone, milestoneProgress,
    noteSheetState, taskDialogState, quickOpen,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}