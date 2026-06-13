import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Radar,
  Folder,
  ExternalLink,
  Pencil,
  Trash2,
  ChevronDown,
  Save,
  X,
  ArrowRightLeft,
  Calendar,
  User,
  MapPin,
  Search,
  Coins,
} from "lucide-react";
import { useTravel, type CountryEntry } from "./TravelContext";
import { getCountryNameES } from "./countryNamesES";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Mode = "visited" | "wishlist";

function CountryItem({ entry, mode }: { entry: CountryEntry; mode: Mode }) {
  const { upsert, remove } = useTravel();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [mediaLink, setMediaLink] = useState(entry.mediaLink ?? "");
  const [spend, setSpend] = useState(entry.spend?.toString() ?? "0");

  const name = getCountryNameES(entry.countryID, entry.countryName);
  const accent =
    mode === "visited"
      ? "border-travel-visited/40 hover:border-travel-visited/60"
      : "border-travel-wishlist/40 hover:border-travel-wishlist/60";
  const accentText = mode === "visited" ? "text-travel-visited" : "text-travel-wishlist";

  const saveEdits = () => {
    upsert(entry.countryID, { notes, mediaLink, spend: Number(spend) || 0 });
    setEditing(false);
  };

  const cancelEdits = () => {
    setNotes(entry.notes ?? "");
    setMediaLink(entry.mediaLink ?? "");
    setSpend(entry.spend?.toString() ?? "0");
    setEditing(false);
  };

  const toggleStatus = () => {
    upsert(entry.countryID, {
      status: mode === "visited" ? "wishlist" : "visited",
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative rounded-xl border bg-card shadow-sm transition-all w-full overflow-hidden",
        accent,
      )}
    >
      {/* Header / row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-3 py-3 text-left focus:outline-none"
      >
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background/40", mode === "visited" ? "border-travel-visited/50" : "border-travel-wishlist/50")}>
          {mode === "visited" ? (
            <Check className={cn("h-4 w-4", accentText)} />
          ) : (
            <Radar className={cn("h-4 w-4", accentText)} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground leading-none mb-1">
            ISO · {entry.countryID}
          </p>
          <p className="truncate font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
            {name}
          </p>
        </div>
        
        {/* Metadatos en Escritorio */}
        <div className="hidden items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground md:flex">
          {entry.date && (
            <span className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-md">
              <Calendar className="h-3 w-3 text-primary" />
              {entry.date}
            </span>
          )}
          {entry.age && (
            <span className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-md">
              <User className="h-3 w-3 text-accent" />
              {entry.age}a
            </span>
          )}
          <span className="flex items-center gap-1.5 bg-muted/60 px-2 py-1 rounded-md font-bold text-foreground">
            <Coins className="h-3 w-3 text-amber-500" />
            {Number(entry.spend || 0).toLocaleString("es-ES")} €
          </span>
        </div>
        
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/30 bg-muted/10"
          >
            <div className="space-y-4 px-4 py-4">
              {/* Metadata compact (Solo Visible en Móviles/Tablets) */}
              <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground md:hidden">
                {entry.date && <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded"><Calendar className="h-3 w-3" />{entry.date}</span>}
                {entry.age && <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded"><User className="h-3 w-3" />{entry.age}a</span>}
                <span className="flex items-center gap-1 bg-amber-500/10 text-foreground font-bold px-2 py-0.5 rounded border border-amber-500/20">
                  <Coins className="h-3 w-3 text-amber-500" />{Number(entry.spend || 0).toLocaleString("es-ES")} €
                </span>
              </div>

              {/* Gasto Formulario (Si se está editando) */}
              {editing && (
                <div className="space-y-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-1">
                    <Coins className="h-3 w-3 text-amber-500" /> Presupuesto / Dinero Gastado (€)
                  </p>
                  <Input
                    type="number"
                    value={spend}
                    onChange={(e) => setSpend(e.target.value)}
                    placeholder="Cantidad gastada en el viaje"
                    className="border-border/40 bg-background/40 font-mono text-xs max-w-xs"
                  />
                </div>
              )}

              {/* Notes / Diary */}
              <div className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  ◌ Diario / Notas
                </p>
                {editing ? (
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={mode === "visited" ? "Recuerdos del viaje..." : "Planes, ideas, motivos..."}
                    className="min-h-[88px] resize-none border-border/40 bg-background/40 font-mono text-xs w-full"
                  />
                ) : (
                  <p className="whitespace-pre-wrap rounded-xl border border-border/30 bg-background/30 p-3 font-mono text-xs text-foreground/80 min-h-[2.5rem]">
                    {entry.notes?.trim() || <span className="italic text-muted-foreground/60">Sin notas registradas.</span>}
                  </p>
                )}
              </div>

              {/* Media link */}
              <div className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  ◌ Enlace a Recuerdos
                </p>
                {editing ? (
                  <Input
                    type="url"
                    value={mediaLink}
                    onChange={(e) => setMediaLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="border-border/40 bg-background/40 font-mono text-xs w-full"
                  />
                ) : entry.mediaLink ? (
                  <a
                    href={entry.mediaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-travel-wishlist/40 bg-travel-wishlist/10 px-3 py-2 font-mono text-xs uppercase tracking-wider text-travel-wishlist transition-colors hover:bg-travel-wishlist/20 w-full sm:w-auto justify-center"
                  >
                    <Folder className="h-3.5 w-3.5" />
                    Abrir carpeta
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                ) : (
                  <p className="font-mono text-xs italic text-muted-foreground/60">Sin enlace asociado.</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-border/10">
                {editing ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={cancelEdits} className="font-mono text-xs uppercase tracking-wider h-9 px-3 rounded-xl">
                      <X className="mr-1 h-3.5 w-3.5" /> Cancelar
                    </Button>
                    <Button size="sm" onClick={saveEdits} className="font-mono text-xs uppercase tracking-wider h-9 px-4 rounded-xl">
                      <Save className="mr-1 h-3.5 w-3.5" /> Guardar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(entry.countryID)}
                      className="font-mono text-xs uppercase tracking-wider text-destructive hover:bg-destructive/10 hover:text-destructive h-9 px-3 rounded-xl"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleStatus}
                      className={cn(
                        "font-mono text-xs uppercase tracking-wider h-9 px-3 rounded-xl",
                        mode === "wishlist"
                          ? "text-travel-visited hover:bg-travel-visited/10"
                          : "text-travel-wishlist hover:bg-travel-wishlist/10",
                      )}
                    >
                      <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
                      {mode === "wishlist" ? "Marcar visitado" : "Mover a deseados"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="font-mono text-xs uppercase tracking-wider h-9 px-3 rounded-xl">
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ListColumn({
  title,
  subtitle,
  icon,
  accent,
  items,
  mode,
  emptyHint,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: "emerald" | "cyan";
  items: CountryEntry[];
  mode: Mode;
  emptyHint: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((e) =>
      getCountryNameES(e.countryID, e.countryName).toLowerCase().includes(q) ||
      e.countryID.toLowerCase().includes(q),
    );
  }, [items, query]);

  const accentBorder = accent === "emerald" ? "border-travel-visited/40" : "border-travel-wishlist/40";
  const accentText = accent === "emerald" ? "text-travel-visited" : "text-travel-wishlist";

  return (
    <div className={cn("relative flex h-[500px] md:h-[650px] flex-col rounded-2xl border bg-card p-4 shadow-lg w-full overflow-hidden", accentBorder)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className={cn("flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em]", accentText)}>
            {icon}
            {subtitle}
          </p>
          <h2 className="font-mono text-base sm:text-lg uppercase tracking-[0.2em] text-foreground truncate">{title}</h2>
        </div>
        <div className={cn("rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-widest h-fit shrink-0", accentBorder, accentText)}>
          {items.length.toString().padStart(2, "0")}
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar país..."
          className="h-9 border-border/40 bg-background/40 pl-8 font-mono text-xs rounded-xl"
        />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/30 px-4 text-center"
            >
              <MapPin className="h-5 w-5 text-muted-foreground/50" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                {items.length === 0 ? emptyHint : "Sin resultados"}
              </p>
            </motion.div>
          ) : (
            filtered.map((e) => <CountryItem key={e.countryID} entry={e} mode={mode} />)
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function Bitacora() {
  const { entries } = useTravel();

  const { visited, wishlist } = useMemo(() => {
    const v: CountryEntry[] = [];
    const w: CountryEntry[] = [];
    Object.values(entries).forEach((e) => {
      if (e.status === "visited") v.push(e);
      else if (e.status === "wishlist") w.push(e);
    });
    const sortByName = (a: CountryEntry, b: CountryEntry) =>
      getCountryNameES(a.countryID, a.countryName).localeCompare(
        getCountryNameES(b.countryID, b.countryName),
      );
    return { visited: v.sort(sortByName), wishlist: w.sort(sortByName) };
  }, [entries]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-2 sm:p-4 md:p-6 max-w-full overflow-hidden">
      <ListColumn
        title="Misiones Completadas"
        subtitle="Países Visitados"
        icon={<Check className="h-3 w-3" />}
        accent="emerald"
        items={visited}
        mode="visited"
        emptyHint="Aún no has registrado viajes."
      />
      <ListColumn
        title="Próximos Objetivos"
        subtitle="Lista de Deseados"
        icon={<Radar className="h-3 w-3" />}
        accent="cyan"
        items={wishlist}
        mode="wishlist"
        emptyHint="Marca destinos en el globo."
      />
    </div>
  );
}