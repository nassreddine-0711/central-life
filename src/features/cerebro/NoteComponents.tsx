import { Link2, FileText, Trash2, Tag, ListPlus, Bookmark, Pencil, Image as ImageIcon, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Note } from "./types";
import { useCerebro } from "./CerebroContext";
import { useState } from "react";

export function NoteCard({ note }: { note: Note }) {
  const { delNote, createTaskFromNote, updateNote, noteCats } = useCerebro();
  const [editOpen, setEditOpen] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  // Edit state
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [url, setUrl] = useState(note.url ?? "");
  const [tags, setTags] = useState(note.tags.join(", "));
  const [category, setCategory] = useState(note.category);
  const [photo, setPhoto] = useState<string | undefined>(note.photo);

  const openEdit = () => {
    setTitle(note.title);
    setContent(note.content);
    setUrl(note.url ?? "");
    setTags(note.tags.join(", "));
    setCategory(note.category);
    setPhoto(note.photo);
    setEditOpen(true);
  };

  const onPhotoFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveEdit = () => {
    updateNote(note.id, {
      title: title.trim() || note.title,
      content: content.trim(),
      url: url.trim() || undefined,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      category,
      photo: photo || undefined,
    });
    setEditOpen(false);
  };

  return (
    <>
      <div className="group flex flex-col rounded-xl border bg-card/70 p-3 backdrop-blur-sm transition-colors hover:border-primary/40">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {note.kind === "ref" ? <Link2 className="h-3.5 w-3.5 shrink-0 text-primary" /> : <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            <p className="truncate text-sm font-medium">{note.title}</p>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={openEdit}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => createTaskFromNote(note)}>
                  <ListPlus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Crear tarea relacionada</TooltipContent>
            </Tooltip>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => delNote(note.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Photo thumbnail */}
        {note.photo && (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="mb-2 mt-1 block w-full overflow-hidden rounded-lg border"
            title="Ver foto"
          >
            <img src={note.photo} alt="" className="h-28 w-full object-cover transition hover:opacity-80" />
          </button>
        )}

        {note.url && <a href={note.url} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary hover:underline">{note.url}</a>}
        {note.content && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{note.content}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {note.category && (
            <Badge variant="outline" className="h-5 border-primary/30 bg-primary/10 text-[10px] text-primary">
              {note.category}
            </Badge>
          )}
          {note.linkedTo && (
            <Badge variant="outline" className="h-5 border-accent/40 bg-accent/10 text-[10px]">
              <Bookmark className="mr-1 h-2.5 w-2.5" />
              {note.linkedTo.title}
            </Badge>
          )}
          {note.tags.map(t => <Badge key={t} variant="secondary" className="h-5 text-[10px]"><Tag className="mr-1 h-2.5 w-2.5" />{t}</Badge>)}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar {note.kind === "ref" ? "referencia" : "nota"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
            {note.kind === "ref" && (
              <Input placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} />
            )}
            <Textarea
              placeholder={note.kind === "ref" ? "Por qué lo guardas…" : "Contenido / pensamiento…"}
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={5}
            />

            {/* Photo */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Foto (opcional)</label>
              {photo ? (
                <div className="relative inline-block">
                  <img src={photo} alt="adjunto" className="max-h-40 rounded-lg border object-cover" />
                  <Button
                    size="icon" variant="secondary"
                    className="absolute right-1 top-1 h-6 w-6"
                    onClick={() => setPhoto(undefined)}
                    title="Quitar foto"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Subir imagen
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onPhotoFile(e.target.files?.[0])}
                  />
                </label>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Categoría</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {noteCats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="Etiquetas (separadas por coma)"
              value={tags}
              onChange={e => setTags(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={saveEdit} disabled={!title.trim()}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightbox && note.photo && (
        <div
          onClick={() => setLightbox(false)}
          className="fixed inset-0 z-[100] grid cursor-zoom-out place-items-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Cerrar"
          >
            <XIcon className="h-5 w-5" />
          </button>
          <img
            src={note.photo}
            alt={note.title}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] cursor-default rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

export function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}