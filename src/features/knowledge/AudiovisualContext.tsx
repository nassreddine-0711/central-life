import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type MediaType = "movie" | "series" | "documentary" | "video";
export type MediaStatus = "watchlist" | "watching" | "watched";

export interface MediaItem {
  id: string;
  title: string;
  creator?: string;          // director / canal / autor
  type: MediaType;
  status: MediaStatus;
  cover?: string;            // url o data:image base64
  notes?: string;
  notesUpdatedAt?: number;

  // Series
  currentSeason?: number;
  currentEpisode?: number;
  totalSeasons?: number;
  totalEpisodes?: number;

  // Vídeos / cursos
  url?: string;

  // Películas / docus largos
  durationMin?: number;
  watchedMin?: number;
}

interface Ctx {
  items: MediaItem[];
  addItem: (m: Omit<MediaItem, "id">) => MediaItem;
  updateItem: (id: string, patch: Partial<MediaItem>) => void;
  removeItem: (id: string) => void;
}

const AVContext = createContext<Ctx | null>(null);
const KEY = "audiovisual_collection";

const defaults: MediaItem[] = [
  { id: "av1", title: "Dune: Parte Dos", creator: "Denis Villeneuve", type: "movie", status: "watchlist" },
  { id: "av2", title: "Severance", creator: "Apple TV+", type: "series", status: "watching", currentSeason: 2, currentEpisode: 4, totalSeasons: 2, totalEpisodes: 20 },
  { id: "av3", title: "Cosmos: A Spacetime Odyssey", creator: "Neil deGrasse Tyson", type: "documentary", status: "watched" },
  { id: "av4", title: "MIT 6.006 Algorithms", creator: "MIT OpenCourseWare", type: "video", status: "watching", url: "https://www.youtube.com/playlist?list=PLUl4u3cNGP63EdVPNLG3ToM6LaEUuStEY" },
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

export function AudiovisualProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MediaItem[]>(() => load(KEY, defaults));

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* quota */ }
  }, [items]);

  const addItem: Ctx["addItem"] = useCallback((m) => {
    const created: MediaItem = { ...m, id: crypto.randomUUID() };
    setItems((p) => [...p, created]);
    return created;
  }, []);
  const updateItem: Ctx["updateItem"] = useCallback((id, patch) =>
    setItems((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x))), []);
  const removeItem: Ctx["removeItem"] = useCallback((id) =>
    setItems((p) => p.filter((x) => x.id !== id)), []);

  return (
    <AVContext.Provider value={{ items, addItem, updateItem, removeItem }}>
      {children}
    </AVContext.Provider>
  );
}

export function useAudiovisual() {
  const ctx = useContext(AVContext);
  if (!ctx) throw new Error("useAudiovisual must be used inside AudiovisualProvider");
  return ctx;
}

export const MEDIA_LABELS: Record<MediaType, string> = {
  movie: "Película",
  series: "Serie",
  documentary: "Documental",
  video: "Vídeo / Curso",
};
