import { useMemo, useRef, useState } from "react";
import { Plus, Link2, Image as ImageIcon, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCerebro } from "./CerebroContext";
import { ApunteLink } from "./types";
import { fileToCompressedDataURL } from "@/features/knowledge/imageUtils";

const NODE_ROOT = null;

/** Editor de nota: crea o edita una ApunteDoc (texto + enlaces + fotos + etiquetas).
 *  Compartido entre el Archivo general y el espacio de Notas y referencias de cada
 *  proyecto, para que una nota se edite exactamente igual en los dos sitios. */
export function NoteEditorDialog({
  open, onOpenChange, folderId, editingId,
}: { open: boolean; onOpenChange: (v: boolean) => void; folderId: string | null; editingId: string | null }) {
  const { apunteDocs, addApunteDoc, updateApunteDoc, folderPath } = useCerebro();
  const editing = editingId ? apunteDocs.find(d => d.id === editingId) : undefined;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [links, setLinks] = useState<ApunteLink[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Rellena el formulario cada vez que se abre.
  useMemo(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setContent(editing.content);
      setTags(editing.tags);
      setLinks(editing.links);
      setPhotos(editing.photos);
    } else {
      setTitle("");
      setContent("");
      setTags([]);
      setLinks([]);
      setPhotos([]);
    }
    setTagInput("");
    setLinkUrl("");
    setLinkLabel("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId]);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) { setTagInput(""); return; }
    setTags(prev => [...prev, t]);
    setTagInput("");
  };

  const addLink = () => {
    if (!linkUrl.trim()) return;
    setLinks(prev => [...prev, { id: Math.random().toString(36).slice(2, 10), url: linkUrl.trim(), label: linkLabel.trim() || undefined }]);
    setLinkUrl("");
    setLinkLabel("");
  };

  const onPhotoFile = async (file?: File) => {
    if (!file) return;
    try {
      const compressed = await fileToCompressedDataURL(file);
      setPhotos(prev => [...prev, compressed]);
    } catch {
      // noop
    }
  };

  const save = () => {
    if (!title.trim()) return;
    if (editing) {
      updateApunteDoc(editing.id, { title: title.trim(), content, tags, links, photos });
    } else {
      addApunteDoc({ title: title.trim(), content, folderId, tags, links, photos });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Editar nota" : "Nueva nota"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" />
          {!editing && (
            <p className="text-[11px] text-muted-foreground">
              Se creará dentro de: <span className="font-medium text-foreground">{[{ id: NODE_ROOT, label: "Archivo" }, ...folderPath(folderId).map(f => ({ id: f.id, label: f.name }))].map(b => b.label).join(" / ")}</span>
            </p>
          )}
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Escribe aquí…" className="min-h-[160px]" />

          {/* Etiquetas */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Etiquetas</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map(t => (
                <Badge key={t} variant="outline" className="gap-1 text-xs">
                  {t}
                  <button onClick={() => setTags(prev => prev.filter(x => x !== t))}><XIcon className="h-3 w-3" /></button>
                </Badge>
              ))}
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                placeholder="Añadir etiqueta…"
                className="h-7 w-32 text-xs"
              />
            </div>
          </div>

          {/* Enlaces */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Enlaces</label>
            {links.length > 0 && (
              <div className="space-y-1">
                {links.map(l => (
                  <div key={l.id} className="flex items-center gap-2 rounded-lg border bg-background/60 p-1.5 text-xs">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-primary hover:underline">{l.label || l.url}</a>
                    <button onClick={() => setLinks(prev => prev.filter(x => x.id !== l.id))}><XIcon className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…" className="h-8 flex-1 text-xs" />
              <Input value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="Título (opcional)" className="h-8 w-36 text-xs" />
              <Button size="sm" variant="outline" onClick={addLink} disabled={!linkUrl.trim()}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </div>

          {/* Fotos */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Fotos</label>
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p} alt="" className="h-20 w-20 rounded-lg border object-cover" />
                  <button
                    onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background shadow"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
                <ImageIcon className="h-4 w-4" />
                <span className="text-[10px]">Añadir</span>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e => onPhotoFile(e.target.files?.[0])} />
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={!title.trim()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
