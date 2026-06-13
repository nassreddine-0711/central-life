import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, BookOpen, Save, Trash2, ImageOff } from "lucide-react";
import { Book, useKnowledge, fetchCover } from "./KnowledgeContext";
import { fileToCompressedDataURL } from "./imageUtils";

interface Props {
  open: boolean;
  book: Book | null;
  onClose: () => void;
}

function CoverPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[hsl(var(--atelier-cream))] to-[hsl(var(--atelier-cream))] p-3 text-center">
      <BookOpen className="mb-2 h-6 w-6 text-[hsl(var(--atelier-accent)/0.6)]" strokeWidth={1.2} />
      <span className="atelier-serif line-clamp-3 text-xs leading-tight text-[hsl(var(--atelier-ink))]">{title}</span>
    </div>
  );
}

export function BookEditor({ open, book, onClose }: Props) {
  const { updateBook } = useKnowledge();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pagesTotal, setPagesTotal] = useState<number | "">("");
  const [pagesRead, setPagesRead] = useState<number | "">("");
  const [cover, setCover] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<null | "upload" | "fetch">(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!book) return;
    setTitle(book.title);
    setAuthor(book.author);
    setPagesTotal(book.pagesTotal ?? "");
    setPagesRead(book.pagesRead ?? "");
    setCover(book.cover);
    setNotes(book.notes ?? "");
    setErr(null);
  }, [book]);

  if (!book) return null;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    setBusy("upload");
    try {
      const dataURL = await fileToCompressedDataURL(file, { maxSize: 600, quality: 0.78 });
      setCover(dataURL);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al procesar la imagen");
    } finally {
      setBusy(null);
    }
  };

  const refetch = async () => {
    setBusy("fetch");
    const c = await fetchCover(title, author);
    if (c) setCover(c);
    setBusy(null);
  };

  const save = () => {
    updateBook(book.id, {
      title: title.trim() || book.title,
      author: author.trim() || book.author,
      pagesTotal: pagesTotal === "" ? undefined : Number(pagesTotal),
      pagesRead: pagesRead === "" ? undefined : Number(pagesRead),
      cover,
      notes: notes.trim() || undefined,
      notesUpdatedAt: notes.trim() ? Date.now() : book.notesUpdatedAt,
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--atelier-overlay))] p-4 backdrop-blur-sm atelier"
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
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[hsl(var(--atelier-line))] px-6 py-4">
              <div>
                <p className="atelier-mono text-[10px] uppercase tracking-[0.35em] text-[hsl(var(--atelier-accent))] atelier-text-glow-cyan">
                  ✎ Edición de Misión
                </p>
                <h3 className="atelier-serif mt-0.5 text-xl text-[hsl(var(--atelier-ink))]">{book.title}</h3>
              </div>
              <button onClick={onClose} className="rounded-full border border-[hsl(var(--atelier-line))] p-1.5 text-[hsl(var(--atelier-mute))] hover:text-[hsl(var(--atelier-ink))]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[180px_1fr]">
              {/* Cover + uploader */}
              <div className="flex flex-col gap-3">
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md ring-1 ring-[hsl(var(--atelier-accent)/0.3)] shadow-[0_0_20px_hsl(var(--atelier-accent)/0.15)]">
                  {cover ? (
                    <img src={cover} alt={title} className="h-full w-full object-cover" />
                  ) : (
                    <CoverPlaceholder title={title || "Sin título"} />
                  )}
                  {busy === "upload" && (
                    <div className="absolute inset-0 grid place-items-center bg-[hsl(var(--atelier-overlay-soft))] backdrop-blur-sm">
                      <span className="atelier-mono text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--atelier-neon))] atelier-text-glow-neon">
                        ▣ Comprimiendo…
                      </span>
                    </div>
                  )}
                </div>

                <label className="atelier-mono group flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[hsl(var(--atelier-neon)/0.5)] bg-[hsl(var(--atelier-neon)/0.08)] px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-neon))] transition hover:bg-[hsl(var(--atelier-neon)/0.18)] hover:atelier-glow-neon">
                  <Upload className="h-3.5 w-3.5" />
                  Subir portada
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={refetch}
                    disabled={busy !== null || !title}
                    className="atelier-mono flex-1 rounded-full border border-[hsl(var(--atelier-accent)/0.4)] bg-[hsl(var(--atelier-accent)/0.08)] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-accent))] transition hover:bg-[hsl(var(--atelier-accent)/0.18)] disabled:opacity-50"
                  >
                    {busy === "fetch" ? "Buscando…" : "Auto-cover"}
                  </button>
                  {cover && (
                    <button
                      onClick={() => setCover(undefined)}
                      title="Quitar portada"
                      className="rounded-full border border-[hsl(var(--atelier-line))] p-1.5 text-[hsl(var(--atelier-mute))] hover:text-[hsl(var(--atelier-ink))]"
                    >
                      <ImageOff className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {err && (
                  <p className="atelier-mono text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--destructive))]">
                    {err}
                  </p>
                )}
              </div>

              {/* Form fields */}
              <div className="flex flex-col gap-3">
                <div>
                  <label className="atelier-mono mb-1 block text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--atelier-mute))]">Título</label>
                  <input className="atelier-input" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="atelier-mono mb-1 block text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--atelier-mute))]">Autor</label>
                  <input className="atelier-input" value={author} onChange={(e) => setAuthor(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="atelier-mono mb-1 block text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--atelier-mute))]">Páginas totales</label>
                    <input
                      type="number"
                      min={0}
                      className="atelier-input atelier-mono"
                      value={pagesTotal}
                      onChange={(e) => setPagesTotal(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="atelier-mono mb-1 block text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--atelier-mute))]">Leídas</label>
                    <input
                      type="number"
                      min={0}
                      className="atelier-input atelier-mono"
                      value={pagesRead}
                      onChange={(e) => setPagesRead(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <label className="atelier-mono mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--atelier-mute))]">
                    <span>✎ Diario de lectura</span>
                    <span className="text-[hsl(var(--atelier-accent))]">{notes.length} car.</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reflexiones, aprendizajes clave, citas memorables…"
                    rows={7}
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

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-[hsl(var(--atelier-line))] bg-[hsl(var(--atelier-form-bg))] px-6 py-4">
              <button
                onClick={onClose}
                className="atelier-mono rounded-full px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-mute))] hover:text-[hsl(var(--atelier-ink))]"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                className="atelier-mono inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--atelier-neon))] px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] font-medium text-[hsl(var(--atelier-on-accent))] hover:atelier-glow-neon"
              >
                <Save className="h-3 w-3" /> Guardar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
