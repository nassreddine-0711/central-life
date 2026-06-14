import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { useSupabaseSync } from "@/hooks/useSupabaseSync";

export type MediaType = "movie" | "series" | "documentary" | "video";
export type MediaStatus = "watchlist" | "watching" | "watched";

export interface MediaItem {
  id: string;
  title: string;
  creator?: string;
  type: MediaType;
  status: MediaStatus;
  cover?: string;
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

const defaults: MediaItem[] = [
  { id: "av1", title: "Dune: Parte Dos", creator: "Denis Villeneuve", type: "movie", status: "watchlist" },
  { id: "av2", title: "Severance", creator: "Apple TV+", type: "series", status: "watching", currentSeason: 2, currentEpisode: 4, totalSeasons: 2, totalEpisodes: 20 },
  { id: "av3", title: "Cosmos: A Spacetime Odyssey", creator: "Neil deGrasse Tyson", type: "documentary", status: "watched" },
  { id: "av4", title: "MIT 6.006 Algorithms", creator: "MIT OpenCourseWare", type: "video", status: "watching", url: "https://www.youtube.com/playlist?list=PLUl4u3cNGP63EdVPNLG3ToM6LaEUuStEY" },
];

export function AudiovisualProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MediaItem[]>(defaults);

  // ── Sync con Supabase ───────────────────────────────────────────────────
  useSupabaseSync("audiovisual", items, setItems);

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