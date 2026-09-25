import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clapperboard, MonitorPlay, Film, PlayCircle, Plus, Pencil, Trash2,
  Check, ExternalLink, NotebookPen, Eye, EyeOff,
} from "lucide-react";
import { useAudiovisual, MediaItem, MediaType, MediaStatus, MEDIA_LABELS } from "./AudiovisualContext";
import { MediaEditor, MediaCoverPlaceholder } from "./MediaEditor";
import { useCerebro } from "@/features/cerebro/CerebroContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_TABS: { key: MediaStatus; label: string }[] = [
  { key: "watchlist", label: "Pendiente" },
  { key: "watching", label: "Viendo" },
  { key: "watched", label: "Visto" },
];

const TYPE_ICON: Record<MediaType, typeof Clapperboard> = {
  movie: Clapperboard,
  series: MonitorPlay,
  documentary: Film,
  video: PlayCircle,
};

const TYPE_CHIPS: { key: MediaType; label: string; Icon: typeof Clapperboard }[] = [
  { key: "movie", label: "Pelis", Icon: Clapperboard },
  { key: "series", label: "Series", Icon: MonitorPlay },
  { key: "documentary", label: "Docus", Icon: Film },
  { key: "video", label: "Vídeos", Icon: PlayCircle },
];

function seriesProgress(m: MediaItem): number | null {
  if (m.type !== "series" || !m.totalEpisodes) return null;
  const ep = m.currentEpisode ?? 0;
  return Math.max(0, Math.min(100, (ep / m.totalEpisodes) * 100));
}

export function Audiovisual() {
  const { items, addItem, updateItem, removeItem } = useAudiovisual();
  const { openNoteSheet } = useCerebro();

  const [tab, setTab] = useState<MediaStatus>("watchlist");
  const [typeFilters, setTypeFilters] = useState<Set<MediaType>>(new Set());
  const [editing, setEditing] = useState<MediaItem | null>(null);

  const filtered = useMemo(() => {
    return items.filter((i) => i.status === tab && (typeFilters.size === 0 || typeFilters.has(i.type)));
  }, [items, tab, typeFilters]);

  const toggleType = (t: MediaType) =>
    setTypeFilters((p) => {
      const n = new Set(p);
      if (n.has(t)) n.delete(t); else n.add(t);
      return n;
    });

  const quickAdd = () => {
    const created = addItem({ title: "Nueva entrada", type: "movie", status: tab });
    setEditing(created);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Archivo Audiovisual</p>
          <h3 className="mt-0.5 text-xl font-semibold text-foreground">Cine, Series & Cursos</h3>
        </div>
        <Button size="sm" onClick={quickAdd} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Añadir
        </Button>
      </div>

      {/* Filters row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Status tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-1">
          {STATUS_TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-[10px] opacity-60">
                  {items.filter((i) => i.status === t.key).length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Type chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {TYPE_CHIPS.map(({ key, label, Icon }) => {
            const active = typeFilters.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleType(key)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" /> {label}
              </button>
            );
          })}
          {typeFilters.size > 0 && (
            <button
              onClick={() => setTypeFilters(new Set())}
              title="Limpiar filtros"
              className="rounded-full border border-border/60 p-1 text-muted-foreground hover:text-foreground"
            >
              <EyeOff className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <AnimatePresence mode="popLayout">
          {filtered.map((m) => {
            const Icon = TYPE_ICON[m.type];
            const progress = seriesProgress(m);
            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm transition-all hover:border-border hover:shadow-md"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted/30">
                  {m.cover ? (
                    <img src={m.cover} alt={m.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <MediaCoverPlaceholder title={m.title} type={m.type} />
                  )}

                  {/* Type badge */}
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-foreground backdrop-blur">
                    <Icon className="h-2.5 w-2.5" /> {MEDIA_LABELS[m.type]}
                  </span>

                  {/* Status badge */}
                  {m.status === "watched" && (
                    <Badge className="absolute right-1.5 top-1.5 text-[9px] bg-amber-400/20 text-amber-400 border-amber-400/40 hover:bg-amber-400/20">
                      <Check className="mr-0.5 h-2.5 w-2.5" /> OK
                    </Badge>
                  )}
                  {m.status === "watching" && (
                    <Badge className="absolute right-1.5 top-1.5 text-[9px] bg-primary/20 text-primary border-primary/40 hover:bg-primary/20">
                      LIVE
                    </Badge>
                  )}

                  {/* Big play button for videos */}
                  {m.type === "video" && m.url && (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100"
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/90 text-primary-foreground shadow-lg">
                        <PlayCircle className="h-7 w-7" />
                      </span>
                    </a>
                  )}

                  {/* Notes overlay */}
                  {m.notes && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 max-h-[55%] overflow-hidden bg-gradient-to-t from-black/90 to-transparent p-2.5 opacity-0 transition group-hover:opacity-100">
                      <p className="mb-1 flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-primary">
                        <NotebookPen className="h-2.5 w-2.5" /> Notas
                      </p>
                      <p className="line-clamp-4 text-[11px] italic leading-snug text-white/90">{m.notes}</p>
                    </div>
                  )}

                  {/* Action bar */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                    {m.status !== "watching" && (
                      <button
                        onClick={() => updateItem(m.id, { status: "watching" })}
                        title="Empezar a ver"
                        className="rounded-full bg-primary p-1.5 text-primary-foreground hover:opacity-90"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {m.status !== "watched" && (
                      <button
                        onClick={() => updateItem(m.id, { status: "watched" })}
                        title="Marcar visto"
                        className="rounded-full bg-amber-400 p-1.5 text-black hover:opacity-90"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setEditing(m)}
                      title="Editar"
                      className="rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur hover:opacity-90"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => openNoteSheet({ linkedTo: { kind: m.type === "documentary" || m.type === "video" ? "course" : "media", id: m.id, title: m.title } })}
                      title="Tomar nota"
                      className="rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur hover:opacity-90"
                    >
                      <NotebookPen className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeItem(m.id)}
                      title="Eliminar"
                      className="ml-auto rounded-full bg-destructive p-1.5 text-destructive-foreground hover:opacity-90"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card footer */}
                <div className="border-t border-border/50 p-2.5">
                  <div className="flex items-start justify-between gap-1.5">
                    <h5 className="line-clamp-2 text-sm font-medium leading-tight text-foreground">{m.title}</h5>
                    {m.notes && (
                      <span title="Tiene notas" className="mt-0.5 shrink-0 text-muted-foreground">
                        <NotebookPen className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  {m.creator && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{m.creator}</p>
                  )}

                  {/* Series progress */}
                  {m.type === "series" && m.status === "watching" && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>T{m.currentSeason ?? "?"} · E{m.currentEpisode ?? "?"}</span>
                        {progress !== null && <span className="font-medium text-foreground">{Math.round(progress)}%</span>}
                      </div>
                      {progress !== null && (
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Video link */}
                  {m.type === "video" && m.url && (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Abrir
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border/50 bg-muted/20 p-8 text-center">
            <Clapperboard className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" strokeWidth={1.2} />
            <p className="text-xs text-muted-foreground">Sin registros en esta lista</p>
          </div>
        )}
      </div>

      <MediaEditor open={!!editing} item={editing} onClose={() => setEditing(null)} />
    </div>
  );
}