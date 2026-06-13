import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Save, ImageOff, Clapperboard, MonitorPlay, Film, PlayCircle, ExternalLink } from "lucide-react";
import { MediaItem, MediaType, MediaStatus, useAudiovisual, MEDIA_LABELS } from "./AudiovisualContext";
import { fileToCompressedDataURL } from "./imageUtils";

interface Props {
  open: boolean;
  item: MediaItem | null;
  onClose: () => void;
}

const TYPE_ICON: Record<MediaType, typeof Clapperboard> = {
  movie: Clapperboard,
  series: MonitorPlay,
  documentary: Film,
  video: PlayCircle,
};

function MediaCoverPlaceholder({ title, type }: { title: string; type: MediaType }) {
  const Icon = TYPE_ICON[type];
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[hsl(var(--atelier-cream))] to-[hsl(var(--atelier-cream))] p-3 text-center">
      <Icon className="mb-2 h-8 w-8 text-[hsl(var(--atelier-accent)/0.65)]" strokeWidth={1.2} />
      <span className="atelier-serif line-clamp-3 text-xs leading-tight text-[hsl(var(--atelier-ink))]">{title}</span>
    </div>
  );
}

export { MediaCoverPlaceholder };

export function MediaEditor({ open, item, onClose }: Props) {
  const { updateItem } = useAudiovisual();
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [type, setType] = useState<MediaType>("movie");
  const [status, setStatus] = useState<MediaStatus>("watchlist");
  const [cover, setCover] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [season, setSeason] = useState<number | "">("");
  const [episode, setEpisode] = useState<number | "">("");
  const [totalSeasons, setTotalSeasons] = useState<number | "">("");
  const [totalEpisodes, setTotalEpisodes] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setCreator(item.creator ?? "");
    setType(item.type);
    setStatus(item.status);
    setCover(item.cover);
    setNotes(item.notes ?? "");
    setUrl(item.url ?? "");
    setSeason(item.currentSeason ?? "");
    setEpisode(item.currentEpisode ?? "");
    setTotalSeasons(item.totalSeasons ?? "");
    setTotalEpisodes(item.totalEpisodes ?? "");
    setErr(null);
  }, [item]);

  if (!item) return null;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const dataURL = await fileToCompressedDataURL(file, { maxSize: 600, quality: 0.78 });
      setCover(dataURL);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al procesar la imagen");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    updateItem(item.id, {
      title: title.trim() || item.title,
      creator: creator.trim() || undefined,
      type,
      status,
      cover,
      notes: notes.trim() || undefined,
      notesUpdatedAt: notes.trim() ? Date.now() : item.notesUpdatedAt,
      url: type === "video" ? (url.trim() || undefined) : undefined,
      currentSeason: type === "series" && season !== "" ? Number(season) : undefined,
      currentEpisode: type === "series" && episode !== "" ? Number(episode) : undefined,
      totalSeasons: type === "series" && totalSeasons !== "" ? Number(totalSeasons) : undefined,
      totalEpisodes: type === "series" && totalEpisodes !== "" ? Number(totalEpisodes) : undefined,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="atelier fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--atelier-overlay))] p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="atelier-glass atelier-brackets relative w-full max-w-3xl overflow-hidden rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-[hsl(var(--atelier-line))] px-6 py-4">
              <div>
                <p className="atelier-mono text-[10px] uppercase tracking-[0.35em] text-[hsl(var(--atelier-accent))] atelier-text-glow-cyan">
                  ▶ Edición · Audiovisual
                </p>
                <h3 className="atelier-serif mt-0.5 text-xl text-[hsl(var(--atelier-ink))]">{item.title}</h3>
              </div>
              <button onClick={onClose} className="rounded-full border border-[hsl(var(--atelier-line))] p-1.5 text-[hsl(var(--atelier-mute))] hover:text-[hsl(var(--atelier-ink))]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[180px_1fr]">
              {/* Cover */}
              <div className="flex flex-col gap-3">
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md ring-1 ring-[hsl(var(--atelier-accent)/0.3)] shadow-[0_0_20px_hsl(var(--atelier-accent)/0.15)]">
                  {cover ? (
                    <img src={cover} alt={title} className="h-full w-full object-cover" />
                  ) : (
                    <MediaCoverPlaceholder title={title || "Sin título"} type={type} />
                  )}
                  {busy && (
                    <div className="absolute inset-0 grid place-items-center bg-[hsl(var(--atelier-overlay-soft))] backdrop-blur-sm">
                      <span className="atelier-mono text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--atelier-accent))] atelier-text-glow-cyan">
                        ▣ Comprimiendo…
                      </span>
                    </div>
                  )}
                </div>

                <label className="atelier-mono group flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[hsl(var(--atelier-accent)/0.5)] bg-[hsl(var(--atelier-accent)/0.08)] px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-accent))] transition hover:bg-[hsl(var(--atelier-accent)/0.18)] hover:atelier-glow-cyan">
                  <Upload className="h-3.5 w-3.5" />
                  Subir póster
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} />
                </label>

                {cover && (
                  <button
                    onClick={() => setCover(undefined)}
                    className="atelier-mono inline-flex items-center justify-center gap-1 rounded-full border border-[hsl(var(--atelier-line))] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-mute))] hover:text-[hsl(var(--atelier-ink))]"
                  >
                    <ImageOff className="h-3 w-3" /> Quitar
                  </button>
                )}

                {err && (
                  <p className="atelier-mono text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--destructive))]">{err}</p>
                )}
              </div>

              {/* Form */}
              <div className="flex flex-col gap-3">
                <div>
                  <label className="atelier-mono mb-1 block text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--atelier-mute))]">Título</label>
                  <input className="atelier-input" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="atelier-mono mb-1 block text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--atelier-mute))]">Director / Canal</label>
                    <input className="atelier-input" value={creator} onChange={(e) => setCreator(e.target.value)} />
                  </div>
                  <div>
                    <label className="atelier-mono mb-1 block text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--atelier-mute))]">Tipo</label>
                    <select className="atelier-input" value={type} onChange={(e) => setType(e.target.value as MediaType)}>
                      {(Object.keys(MEDIA_LABELS) as MediaType[]).map((k) => (
                        <option key={k} value={k}>{MEDIA_LABELS[k]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="atelier-mono mb-1 block text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--atelier-mute))]">Estado</label>
                  <select className="atelier-input" value={status} onChange={(e) => setStatus(e.target.value as MediaStatus)}>
                    <option value="watchlist">Pendiente</option>
                    <option value="watching">Viendo</option>
                    <option value="watched">Visto</option>
                  </select>
                </div>

                {type === "series" && (
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="atelier-mono mb-1 block text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-mute))]">T actual</label>
                      <input type="number" min={0} className="atelier-input atelier-mono" value={season} onChange={(e) => setSeason(e.target.value === "" ? "" : Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="atelier-mono mb-1 block text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-mute))]">Cap actual</label>
                      <input type="number" min={0} className="atelier-input atelier-mono" value={episode} onChange={(e) => setEpisode(e.target.value === "" ? "" : Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="atelier-mono mb-1 block text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-mute))]">T total</label>
                      <input type="number" min={0} className="atelier-input atelier-mono" value={totalSeasons} onChange={(e) => setTotalSeasons(e.target.value === "" ? "" : Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="atelier-mono mb-1 block text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-mute))]">Cap total</label>
                      <input type="number" min={0} className="atelier-input atelier-mono" value={totalEpisodes} onChange={(e) => setTotalEpisodes(e.target.value === "" ? "" : Number(e.target.value))} />
                    </div>
                  </div>
                )}

                {type === "video" && (
                  <div>
                    <label className="atelier-mono mb-1 block text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--atelier-mute))]">URL (YouTube / curso)</label>
                    <input className="atelier-input atelier-mono" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
                  </div>
                )}

                <div>
                  <label className="atelier-mono mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--atelier-mute))]">
                    <span>✎ Diario / Aprendizajes</span>
                    <span className="text-[hsl(var(--atelier-accent))]">{notes.length} car.</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Resumen, citas, ideas clave…"
                    rows={6}
                    className="atelier-input atelier-serif resize-none leading-relaxed"
                    style={{
                      background: "hsl(var(--atelier-notes-bg))",
                      color: "hsl(var(--atelier-notes-ink))",
                      fontSize: "0.875rem",
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[hsl(var(--atelier-line))] bg-[hsl(var(--atelier-form-bg))] px-6 py-4">
              {url && type === "video" ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="atelier-mono inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--atelier-accent)/0.4)] bg-[hsl(var(--atelier-accent)/0.08)] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-accent))] hover:atelier-glow-cyan"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir enlace
                </a>
              ) : <span />}
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="atelier-mono rounded-full px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-mute))] hover:text-[hsl(var(--atelier-ink))]">Cancelar</button>
                <button onClick={save} className="atelier-mono inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--atelier-accent))] px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] font-medium text-[hsl(var(--atelier-on-accent))] hover:atelier-glow-cyan">
                  <Save className="h-3 w-3" /> Guardar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
