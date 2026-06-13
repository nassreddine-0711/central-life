import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type MilestoneStatus = "completed" | "active" | "planned";
export interface Milestone {
  id: string;
  title: string;
  institution?: string;
  year: string;
  status: MilestoneStatus;
  progress?: number; // 0-100
  detail?: string; // ej: "2/4 años"
}

export type LangLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export const LEVEL_VALUE: Record<LangLevel, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
export interface Language {
  id: string;
  name: string;
  current: LangLevel;
  target?: LangLevel;
  mastered: boolean; // true => capa "dominados"
}

export type BookStatus = "wishlist" | "reading" | "read";
export interface Book {
  id: string;
  title: string;
  author: string;
  cover?: string;       // url o data:image base64 (comprimido)
  status: BookStatus;
  pagesRead?: number;
  pagesTotal?: number;
  featured?: boolean;
  notes?: string;       // diario de lectura
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

const KEY_M = "knowledge.milestones.v1";
const KEY_L = "knowledge.languages.v1";
const KEY_B = "knowledge.books.v1";

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

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [milestones, setMilestones] = useState<Milestone[]>(() => load(KEY_M, defaultMilestones));
  const [languages, setLanguages] = useState<Language[]>(() => load(KEY_L, defaultLanguages));
  const [books, setBooks] = useState<Book[]>(() => load(KEY_B, defaultBooks));

  useEffect(() => { localStorage.setItem(KEY_M, JSON.stringify(milestones)); }, [milestones]);
  useEffect(() => { localStorage.setItem(KEY_L, JSON.stringify(languages)); }, [languages]);
  useEffect(() => { localStorage.setItem(KEY_B, JSON.stringify(books)); }, [books]);

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

// Búsqueda de portadas usando Open Library
export async function fetchCover(title: string, author: string): Promise<string | undefined> {
  try {
    const q = encodeURIComponent(`${title} ${author}`.trim());
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=1`);
    const data = await res.json();
    const doc = data?.docs?.[0];
    if (doc?.cover_i) return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
  } catch {
    /* noop */
  }
  return undefined;
}
