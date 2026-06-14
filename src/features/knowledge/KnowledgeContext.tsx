import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useSupabaseSync } from "@/hooks/useSupabaseSync";

export type MilestoneStatus = "completed" | "active" | "planned";
export interface Milestone {
  id: string;
  title: string;
  institution?: string;
  year: string;
  status: MilestoneStatus;
  progress?: number;
  detail?: string;
}

export type LangLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export const LEVEL_VALUE: Record<LangLevel, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
export interface Language {
  id: string;
  name: string;
  current: LangLevel;
  target?: LangLevel;
  mastered: boolean;
}

export type BookStatus = "wishlist" | "reading" | "read";
export interface Book {
  id: string;
  title: string;
  author: string;
  cover?: string;
  status: BookStatus;
  pagesRead?: number;
  pagesTotal?: number;
  featured?: boolean;
  notes?: string;
  notesUpdatedAt?: number;
}

interface Ctx {
  milestones: Milestone[];
  languages: Language[];
  books: Book[];
  addMilestone: (m: Omit<Milestone, "id">) => void;
  removeMilestone: (id: string) => void;
  upsertLanguage: (l: Omit<Language, "id"> & { id?: string }) => void;
  removeLanguage: (id: string) => void;
  addBook: (b: Omit<Book, "id">) => Book;
  updateBook: (id: string, patch: Partial<Book>) => void;
  removeBook: (id: string) => void;
  setFeatured: (id: string) => void;
}

const KnowledgeContext = createContext<Ctx | null>(null);

const defaultMilestones: Milestone[] = [
  { id: "m1", title: "Bachillerato Científico", institution: "IES", year: "2018", status: "completed" },
  { id: "m2", title: "Curso Full-Stack", institution: "Online", year: "2021", status: "completed" },
  { id: "m3", title: "Grado en Ingeniería", institution: "Universidad", year: "2023-2027", status: "active", progress: 50, detail: "2/4 años" },
];
const defaultLanguages: Language[] = [
  { id: "l1", name: "Español", current: "C2", mastered: true },
  { id: "l2", name: "Inglés", current: "C1", target: "C2", mastered: true },
  { id: "l3", name: "Francés", current: "B1", target: "B2", mastered: false },
  { id: "l4", name: "Alemán", current: "A2", target: "B1", mastered: false },
  { id: "l5", name: "Italiano", current: "A1", target: "A2", mastered: false },
];
const defaultBooks: Book[] = [
  { id: "b1", title: "Sapiens", author: "Yuval N. Harari", status: "reading", pagesRead: 180, pagesTotal: 496, featured: true },
  { id: "b2", title: "Atomic Habits", author: "James Clear", status: "read", pagesTotal: 320, pagesRead: 320 },
  { id: "b3", title: "Meditaciones", author: "Marco Aurelio", status: "wishlist" },
  { id: "b4", title: "Deep Work", author: "Cal Newport", status: "wishlist" },
];

interface KnowledgePersistedData {
  milestones: Milestone[];
  languages: Language[];
  books: Book[];
}

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [milestones, setMilestones] = useState<Milestone[]>(defaultMilestones);
  const [languages, setLanguages] = useState<Language[]>(defaultLanguages);
  const [books, setBooks] = useState<Book[]>(defaultBooks);

  // ── Sync con Supabase ───────────────────────────────────────────────────
  const knowledgeData: KnowledgePersistedData = { milestones, languages, books };

  useSupabaseSync<KnowledgePersistedData>("knowledge", knowledgeData, (loaded) => {
    if (loaded.milestones) setMilestones(loaded.milestones);
    if (loaded.languages)  setLanguages(loaded.languages);
    if (loaded.books)      setBooks(loaded.books);
  });

  const addMilestone: Ctx["addMilestone"] = (m) => setMilestones((p) => [...p, { ...m, id: crypto.randomUUID() }]);
  const removeMilestone: Ctx["removeMilestone"] = (id) => setMilestones((p) => p.filter((x) => x.id !== id));
  const upsertLanguage: Ctx["upsertLanguage"] = (l) => setLanguages((p) => {
    if (l.id && p.find((x) => x.id === l.id)) return p.map((x) => x.id === l.id ? { ...x, ...l } as Language : x);
    return [...p, { ...l, id: l.id ?? crypto.randomUUID() } as Language];
  });
  const removeLanguage: Ctx["removeLanguage"] = (id) => setLanguages((p) => p.filter((x) => x.id !== id));
  const addBook: Ctx["addBook"] = (b) => {
    const created: Book = { ...b, id: crypto.randomUUID() };
    setBooks((p) => [...p, created]);
    return created;
  };
  const updateBook: Ctx["updateBook"] = (id, patch) => setBooks((p) => p.map((x) => x.id === id ? { ...x, ...patch } : x));
  const removeBook: Ctx["removeBook"] = (id) => setBooks((p) => p.filter((x) => x.id !== id));
  const setFeatured: Ctx["setFeatured"] = useCallback((id) => {
    setBooks((p) => p.map((x) => ({ ...x, featured: x.id === id })));
  }, []);

  return (
    <KnowledgeContext.Provider value={{ milestones, languages, books, addMilestone, removeMilestone, upsertLanguage, removeLanguage, addBook, updateBook, removeBook, setFeatured }}>
      {children}
    </KnowledgeContext.Provider>
  );
}

export function useKnowledge() {
  const ctx = useContext(KnowledgeContext);
  if (!ctx) throw new Error("useKnowledge must be used inside KnowledgeProvider");
  return ctx;
}

export async function fetchCover(title: string, author: string): Promise<string | undefined> {
  try {
    const q = encodeURIComponent(`${title} ${author}`.trim());
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=1`);
    const data = await res.json();
    const doc = data?.docs?.[0];
    if (doc?.cover_i) return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
  } catch { /* noop */ }
  return undefined;
}