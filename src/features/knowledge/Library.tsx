import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Sparkles, Trash2, Star, BookMarked, Check, Pencil, NotebookPen, Upload, ImageOff, Save, X } from "lucide-react";
import { useKnowledge, BookStatus, Book, fetchCover } from "./KnowledgeContext";
import { BookEditor } from "./BookEditor";
import { useCerebro } from "@/features/cerebro/CerebroContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fileToCompressedDataURL } from "./imageUtils";

const TABS: { key: BookStatus; label: string }[] = [
  { key: "wishlist", label: "Por leer" },
  { key: "reading", label: "Leyendo" },
  { key: "read", label: "Leídos" },
];

function CoverPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-muted/50 p-3 text-center">
      <BookOpen className="mb-2 h-6 w-6 text-muted-foreground/60" strokeWidth={1.2} />
      <span className="line-clamp-3 text-xs leading-tight text-muted-foreground">{title}</span>
    </div>
  );
}

export function Library() {
  const { books, addBook, updateBook, removeBook, setFeatured } = useKnowledge();
  const { openNoteSheet } = useCerebro();
  const [tab, setTab] = useState<BookStatus>("wishlist");
  const [showForm, setShowForm] = useState(false);
  const [searching, setSearching] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);

  // Full form with all fields from the start
  const [form, setForm] = useState({
    title: "",
    author: "",
    pagesTotal: "" as number | "",
    notes: "",
    coverFile: null as File | null,
    coverPreview: undefined as string | undefined,
  });

  const featured = useMemo(
    () => books.find((b) => b.featured && b.status === "reading") || books.find((b) => b.status === "reading"),
    [books]
  );
  const filtered = useMemo(() => books.filter((b) => b.status === tab), [books, tab]);

  const handleCoverFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const compressed = await fileToCompressedDataURL(file);
      setForm((f) => ({ ...f, coverPreview: compressed, coverFile: file }));
    } catch (err) {
      console.error("Error compressing cover", err);
    }
  };

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSearching(true);
    // Use uploaded cover if present, otherwise try auto-fetch
    let cover: string | undefined = form.coverPreview;
    if (!cover) cover = await fetchCover(form.title, form.author);
    setSearching(false);

    addBook({
      title: form.title.trim(),
      author: form.author.trim() || "Desconocido",
      cover,
      status: "wishlist",
      pagesTotal: form.pagesTotal === "" ? undefined : Number(form.pagesTotal),
      pagesRead: 0,
      notes: form.notes.trim() || undefined,
    });

    setForm({ title: "", author: "", pagesTotal: "", notes: "", coverFile: null, coverPreview: undefined });
    setShowForm(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Lecturas</p>
          <h3 className="mt-0.5 text-xl font-semibold text-foreground">Biblioteca</h3>
        </div>
      </div>

      {/* Featured reading */}
      {featured && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-primary/20 bg-card/80 backdrop-blur-sm shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row">
                {/* Cover */}
                <div className="relative mx-auto h-40 w-28 shrink-0 overflow-hidden rounded-lg border border-border/60 shadow-md sm:mx-0">
                  {featured.cover ? (
                    <img src={featured.cover} alt={featured.title} className="h-full w-full object-cover" />
                  ) : (
                    <CoverPlaceholder title={featured.title} />
                  )}
                </div>

                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-400 text-[10px]">
                      <Star className="mr-1 h-3 w-3" /> Leyendo ahora
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => setEditing(featured)}
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                  </div>

                  <h4 className="mt-2 text-xl font-semibold leading-tight text-foreground">{featured.title}</h4>
                  <p className="text-xs text-muted-foreground">{featured.author}</p>

                  {featured.notes && (
                    <div className="mt-3 rounded-md border border-border/50 bg-muted/30 p-3">
                      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        <NotebookPen className="h-3 w-3" /> Notas
                      </p>
                      <p className="line-clamp-3 text-sm italic leading-snug text-foreground/80">{featured.notes}</p>
                    </div>
                  )}

                  {featured.pagesTotal ? (
                    <div className="mt-auto pt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progreso</span>
                        <span className="font-medium text-foreground">{featured.pagesRead ?? 0} / {featured.pagesTotal} pp</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, ((featured.pagesRead ?? 0) / featured.pagesTotal) * 100)}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                        />
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={featured.pagesTotal}
                          value={featured.pagesRead ?? 0}
                          onChange={(e) => updateBook(featured.id, { pagesRead: Math.min(featured.pagesTotal!, Math.max(0, Number(e.target.value))) })}
                          className="h-8 w-24 rounded-md border border-border/60 bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <span className="text-xs text-muted-foreground">páginas leídas</span>
                        {featured.pagesRead === featured.pagesTotal && (
                          <Button
                            size="sm"
                            className="ml-auto h-7 gap-1 text-xs"
                            onClick={() => updateBook(featured.id, { status: "read", featured: false })}
                          >
                            <Check className="h-3 w-3" /> Marcar leído
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs + add button */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-[10px] opacity-60">{books.filter((b) => b.status === t.key).length}</span>
              </button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="gap-1.5 text-xs"
        >
          <Sparkles className="h-3.5 w-3.5" /> Nueva semilla
        </Button>
      </div>

      {/* Add form — full fields */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <Card className="border-border/60 bg-card/80">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Cover uploader */}
                  <div className="flex shrink-0 flex-col items-center gap-2">
                    <div className="relative h-32 w-22 overflow-hidden rounded-lg border border-border/60 bg-muted/30" style={{ width: "88px" }}>
                      {form.coverPreview ? (
                        <img src={form.coverPreview} alt="portada" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground/50">
                          <BookOpen className="h-5 w-5" strokeWidth={1.2} />
                        </div>
                      )}
                    </div>
                    <label className="flex cursor-pointer items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[10px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
                      <Upload className="h-3 w-3" /> Portada
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleCoverFile(e.target.files?.[0])} />
                    </label>
                    {form.coverPreview && (
                      <button
                        onClick={() => setForm((f) => ({ ...f, coverPreview: undefined, coverFile: null }))}
                        className="text-[10px] text-muted-foreground hover:text-destructive"
                      >
                        <ImageOff className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="flex flex-1 flex-col gap-3">
                    <input
                      className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Título del libro *"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                    <input
                      className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Autor"
                      value={form.author}
                      onChange={(e) => setForm({ ...form, author: e.target.value })}
                    />
                    <input
                      className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      type="number"
                      min={0}
                      placeholder="Número de páginas (opcional)"
                      value={form.pagesTotal}
                      onChange={(e) => setForm({ ...form, pagesTotal: e.target.value === "" ? "" : Number(e.target.value) })}
                    />
                    <textarea
                      className="min-h-[72px] resize-none rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Notas o descripción del libro (opcional)…"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button
                    size="sm"
                    onClick={handleAdd}
                    disabled={searching || !form.title.trim()}
                    className="gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {searching ? "Buscando portada…" : "Guardar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Book grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((b) => (
            <motion.div
              key={b.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm transition-all hover:border-border hover:shadow-md"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted/30">
                {b.cover ? (
                  <img src={b.cover} alt={b.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <CoverPlaceholder title={b.title} />
                )}

                {b.status === "read" && (
                  <Badge className="absolute right-1.5 top-1.5 text-[9px] bg-amber-400/20 text-amber-400 border-amber-400/40 hover:bg-amber-400/20">
                    <Check className="mr-0.5 h-2.5 w-2.5" /> OK
                  </Badge>
                )}
                {b.status === "reading" && (
                  <Badge className="absolute right-1.5 top-1.5 text-[9px] bg-primary/20 text-primary border-primary/40 hover:bg-primary/20">
                    LIVE
                  </Badge>
                )}

                {/* Action bar on hover */}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                  {b.status !== "reading" && (
                    <button
                      onClick={() => updateBook(b.id, { status: "reading" })}
                      title="Empezar a leer"
                      className="rounded-full bg-primary p-1.5 text-primary-foreground hover:opacity-90"
                    >
                      <BookMarked className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {b.status !== "read" && (
                    <button
                      onClick={() => updateBook(b.id, { status: "read", pagesRead: b.pagesTotal })}
                      title="Marcar leído"
                      className="rounded-full bg-amber-400 p-1.5 text-black hover:opacity-90"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {b.status === "reading" && !b.featured && (
                    <button
                      onClick={() => setFeatured(b.id)}
                      title="Destacar"
                      className="rounded-full bg-amber-400/80 p-1.5 text-black hover:opacity-90"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setEditing(b)}
                    title="Editar"
                    className="rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur hover:opacity-90"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => openNoteSheet({ linkedTo: { kind: "book", id: b.id, title: b.title } })}
                    title="Tomar nota"
                    className="rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur hover:opacity-90"
                  >
                    <NotebookPen className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => removeBook(b.id)}
                    title="Eliminar"
                    className="ml-auto rounded-full bg-destructive p-1.5 text-destructive-foreground hover:opacity-90"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="border-t border-border/50 p-2.5">
                <div className="flex items-start justify-between gap-1.5">
                  <h5 className="line-clamp-2 text-sm font-medium leading-tight text-foreground">{b.title}</h5>
                  {b.notes && (
                    <span title="Tiene notas" className="mt-0.5 shrink-0 text-muted-foreground">
                      <NotebookPen className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{b.author}</p>
                {b.status === "reading" && b.pagesTotal && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{b.pagesRead ?? 0}/{b.pagesTotal}</span>
                      <span className="font-medium text-foreground">{Math.round(((b.pagesRead ?? 0) / b.pagesTotal) * 100)}%</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, ((b.pagesRead ?? 0) / b.pagesTotal) * 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border/50 bg-muted/20 p-8 text-center">
            <BookOpen className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" strokeWidth={1.2} />
            <p className="text-xs text-muted-foreground">Estantería vacía</p>
          </div>
        )}
      </div>

      <BookEditor open={!!editing} book={editing} onClose={() => setEditing(null)} />
    </div>
  );
}