import { useMemo, useRef, useState } from "react";
import {
  DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Folder, FolderPlus, FileText, Search, ChevronRight,
  Mic, Upload, Loader2, CheckCircle2, AlertCircle, Trash2, Pencil, Home, Plus, Link2,
  Tag, Image as ImageIcon, FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCerebro } from "../CerebroContext";
import { Section, Empty } from "../TaskComponents";
import { ApunteAudio, ApunteDoc, ApunteFolder, PROJECTS_ROOT_FOLDER_ID } from "../types";
import { NoteEditorDialog } from "../ApunteNoteDialog";

/** Un punto de destino (carpeta o breadcrumb) para arrastrar carpetas/notas encima. */
function DropTarget({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn(className, isOver && "ring-2 ring-primary/60 bg-primary/10")}>
      {children}
    </div>
  );
}

/** Tarjeta de carpeta: arrastrable (salvo la de un proyecto) y receptora de lo que se suelte encima. */
function FolderTile({ folder, count, onOpen }: { folder: ApunteFolder; count: number; onOpen: () => void }) {
  const draggable = !folder.projectId && folder.id !== PROJECTS_ROOT_FOLDER_ID;
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: `folder:${folder.id}`, disabled: !draggable });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `folder:${folder.id}` });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <button
      ref={(node) => { setDragRef(node); setDropRef(node); }}
      style={style}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      onClick={onOpen}
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2 text-sm shadow-sm transition hover:border-primary/40",
        isDragging && "z-50 opacity-60",
        isOver && "border-primary/70 bg-primary/10 ring-2 ring-primary/40",
      )}
    >
      {folder.projectId ? <FolderKanban className="h-4 w-4 text-primary" /> : <Folder className="h-4 w-4 text-primary" />}
      {folder.name}
      <span className="text-[10px] text-muted-foreground">{count}</span>
    </button>
  );
}

/** Tarjeta de nota: arrastrable (no recibe nada encima). Si tiene foto, se ve ya aquí fuera, sin entrar. */
function DocTile({ doc, linkedCount, onOpen }: { doc: ApunteDoc; linkedCount: number; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `doc:${doc.id}` });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const cover = doc.photos[0];
  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={cn(
        "overflow-hidden rounded-xl border bg-card/60 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md",
        isDragging && "z-50 opacity-60",
      )}
    >
      {cover && (
        <img src={cover} alt="" className="h-32 w-full object-cover" />
      )}
      <div className="p-3">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          {doc.title}
        </p>
        {doc.content && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{doc.content}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {doc.tags.slice(0, 3).map(t => (
            <Badge key={t} variant="outline" className="h-4.5 gap-0.5 text-[10px]"><Tag className="h-2.5 w-2.5" />{t}</Badge>
          ))}
          {doc.links.length > 0 && <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Link2 className="h-3 w-3" />{doc.links.length}</span>}
          {doc.photos.length > 0 && <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><ImageIcon className="h-3 w-3" />{doc.photos.length}</span>}
          {linkedCount > 0 && <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Mic className="h-3 w-3" />{linkedCount}</span>}
        </div>
      </div>
    </button>
  );
}

/* ============================================================
   Archivo: árbol de carpetas 100% local (sin Drive). Hay una
   carpeta fija "Proyectos" con una subcarpeta automática por
   cada proyecto. Dentro de cualquier carpeta solo hay "notas":
   texto + enlaces + fotos + etiquetas. La transcripción de audio
   a texto es una herramienta aparte: una cola de audios hasta que
   se vinculan a una nota (existente o nueva).
============================================================ */

const NODE_ROOT = null;

function statusMeta(status: string) {
  switch (status) {
    case "uploading": return { label: "Subiendo…", icon: <Loader2 className="h-3 w-3 animate-spin" />, cls: "text-muted-foreground" };
    case "queued": return { label: "En cola…", icon: <Loader2 className="h-3 w-3 animate-spin" />, cls: "text-muted-foreground" };
    case "processing": return { label: "Transcribiendo…", icon: <Loader2 className="h-3 w-3 animate-spin" />, cls: "text-amber-500" };
    case "completed": return { label: "Listo", icon: <CheckCircle2 className="h-3 w-3" />, cls: "text-emerald-500" };
    case "error": return { label: "Error", icon: <AlertCircle className="h-3 w-3" />, cls: "text-rose-500" };
    default: return { label: status, icon: null, cls: "" };
  }
}

/** Editor de nota: crea o edita una ApunteDoc (texto + enlaces + fotos + etiquetas). */
export function ArchivoPanel() {
  const {
    apunteFolders: apunteFoldersRaw, apunteDocs, apunteAudios, projects,
    addApunteFolder, renameApunteFolder, delApunteFolder, folderPath,
    moveApunteFolder, moveApunteDoc, delApunteDoc, updateApunteDoc,
    updateApunteAudio, delApunteAudio, linkApunteAudio, uploadApunteAudio, addApunteDoc,
  } = useCerebro();

  // Una carpeta marcada como "de proyecto" cuyo proyecto ya no existe (huérfana) se trata como
  // una carpeta normal: así se puede ver como tal, renombrar o borrar desde "Gestionar carpetas".
  const apunteFolders = useMemo(() => {
    const ids = new Set(projects.map(p => p.id));
    return apunteFoldersRaw.map(f => (f.projectId && !ids.has(f.projectId) ? { ...f, projectId: undefined } : f));
  }, [apunteFoldersRaw, projects]);

  const [node, setNode] = useState<string | null>(NODE_ROOT);
  const [search, setSearch] = useState("");

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [manageFoldersOpen, setManageFoldersOpen] = useState(false);
  const [manageDocsOpen, setManageDocsOpen] = useState(false);

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [audioDocFor, setAudioDocFor] = useState<string | null>(null);
  const [audioDocTitle, setAudioDocTitle] = useState("");
  const [audioDocFolder, setAudioDocFolder] = useState<string>("__root");

  const [audioLinkFor, setAudioLinkFor] = useState<string | null>(null);
  const [audioLinkDoc, setAudioLinkDoc] = useState<string>("");

  /* ---------- breadcrumb ---------- */
  const breadcrumb = useMemo(() => {
    const chain: { id: string | null; label: string }[] = [{ id: NODE_ROOT, label: "Archivo" }];
    folderPath(node).forEach(f => chain.push({ id: f.id, label: f.name }));
    return chain;
  }, [node, folderPath]);

  /* ---------- listados del nodo actual ---------- */
  const subfolders = useMemo(() => {
    if (node === NODE_ROOT) return apunteFolders.filter(f => !f.parentId);
    return apunteFolders.filter(f => f.parentId === node);
  }, [node, apunteFolders]);

  const q = search.toLowerCase().trim();
  const matchesQuery = (title: string, content?: string) =>
    !q || title.toLowerCase().includes(q) || (content ?? "").toLowerCase().includes(q);

  // Una nota cuya carpeta ya no existe nunca se pierde: se muestra en la raíz del Archivo.
  const folderIds = useMemo(() => new Set(apunteFolders.map(f => f.id)), [apunteFolders]);
  const docNode = (d: ApunteDoc) => (d.folderId && folderIds.has(d.folderId) ? d.folderId : null);

  const folderDocs = useMemo(() =>
    apunteDocs.filter(d => docNode(d) === node).filter(d => matchesQuery(d.title, d.content)),
    [node, apunteDocs, folderIds, q]);

  const docCount = (folderId: string | null) =>
    apunteDocs.filter(d => docNode(d) === folderId).length;

  const currentFolder = node ? apunteFolders.find(f => f.id === node) : undefined;
  const isFixedFolder = node === PROJECTS_ROOT_FOLDER_ID || !!currentFolder?.projectId;

  /* ---------- listas planas (para los selectores) ---------- */
  const flatFolderOptions = useMemo(
    () => apunteFolders.map(f => ({ id: f.id, label: folderPath(f.id).map(x => x.name).join(" / ") })),
    [apunteFolders, folderPath]
  );

  const flatDocOptions = useMemo(() => {
    const rootLabel = "Archivo (raíz)";
    return apunteDocs.map(d => {
      const path = d.folderId ? flatFolderOptions.find(fo => fo.id === d.folderId)?.label : rootLabel;
      return { id: d.id, label: path ? `${path} / ${d.title}` : d.title };
    });
  }, [apunteDocs, flatFolderOptions]);

  /* ---------- solo audios sin asignar (la "cola") ---------- */
  const queuedAudios = useMemo(() => apunteAudios.filter(a => !a.documentId), [apunteAudios]);

  /* ---------- acciones ---------- */
  const openFolder = (id: string | null) => { setNode(id); setSearch(""); };

  /* ---------- arrastrar y soltar (mover carpetas/notas) ---------- */
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const [activeType, ...activeRest] = activeId.split(":");
    const activeRealId = activeRest.join(":");
    const [overType, ...overRest] = overId.split(":");
    const overRealId = overRest.join(":");

    let targetFolderId: string | null | undefined;
    if (overType === "folder") targetFolderId = overRealId;
    else if (overType === "crumb") targetFolderId = overRealId === "root" ? null : overRealId;
    else return;

    if (activeType === "folder") moveApunteFolder(activeRealId, targetFolderId);
    else if (activeType === "doc") moveApunteDoc(activeRealId, targetFolderId);
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    addApunteFolder(newFolderName.trim(), node);
    setNewFolderName("");
    setNewFolderOpen(false);
  };

  const deleteCurrentFolder = () => {
    if (!currentFolder) return;
    if (!confirm(`¿Eliminar la carpeta "${currentFolder.name}"? Se borrará también su contenido (subcarpetas y notas).`)) return;
    const parentId = currentFolder.parentId ?? null;
    delApunteFolder(currentFolder.id);
    setNode(parentId);
    setSearch("");
  };

  const openNewNote = () => {
    setEditingNoteId(null);
    setNoteDialogOpen(true);
  };

  const openEditNote = (d: ApunteDoc) => {
    setEditingNoteId(d.id);
    setNoteDialogOpen(true);
  };

  const onPickFile = (e: any) => {
    const f: File | undefined = e.target.files?.[0];
    if (!f) return;
    setPendingFile(f);
    setUploadTitle(f.name.replace(/\.[^.]+$/, ""));
    setUploadOpen(true);
    e.target.value = "";
  };

  const confirmUpload = () => {
    if (!pendingFile) return;
    uploadApunteAudio(pendingFile, { title: uploadTitle });
    setUploadOpen(false);
    setPendingFile(null);
  };

  const openAudioNewDoc = (audioId: string, defaultTitle: string) => {
    setAudioDocFor(audioId);
    setAudioDocTitle(defaultTitle);
    setAudioDocFolder("__root");
  };

  const confirmAudioNewDoc = () => {
    if (!audioDocFor || !audioDocTitle.trim()) return;
    const audio = apunteAudios.find(a => a.id === audioDocFor);
    const initialContent = audio?.status === "completed"
      ? [audio.summary, audio.transcript].filter(Boolean).join("\n\n")
      : undefined;
    const d = addApunteDoc({
      title: audioDocTitle.trim(),
      content: initialContent,
      folderId: audioDocFolder === "__root" ? null : audioDocFolder,
    });
    linkApunteAudio(audioDocFor, d.id);
    setAudioDocFor(null);
  };

  const openAudioLink = (audioId: string) => {
    setAudioLinkFor(audioId);
    setAudioLinkDoc("");
  };

  const confirmAudioLink = () => {
    if (!audioLinkFor || !audioLinkDoc) return;
    linkApunteAudio(audioLinkFor, audioLinkDoc);
    setAudioLinkFor(null);
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-10">
      {/* Caja grande: Archivo (carpetas + notas) */}
      <DndContext sensors={dndSensors} onDragEnd={onDragEnd}>
        <div className="space-y-4 rounded-2xl border-2 border-border bg-card/40 p-4 shadow-sm sm:p-6">
          {/* Breadcrumb (también sirve para soltar carpetas/notas y moverlas a un nivel superior) */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {breadcrumb.map((b, i) => (
              <DropTarget key={b.id ?? "root"} id={`crumb:${b.id ?? "root"}`} className="flex items-center gap-1.5 rounded-full">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                <button
                  onClick={() => setNode(b.id)}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1",
                    i === breadcrumb.length - 1 ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {i === 0 && <Home className="h-3 w-3" />}
                  {b.label}
                </button>
              </DropTarget>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en esta carpeta…" className="pl-8" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isFixedFolder && (
                <Button size="sm" variant="ghost" onClick={() => setNewFolderOpen(true)}>
                  <FolderPlus className="h-4 w-4" /> Carpeta
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={openNewNote}>
                <Plus className="h-4 w-4" /> Nota
              </Button>
              {subfolders.some(f => !f.projectId) && (
                <Button size="sm" variant="ghost" onClick={() => setManageFoldersOpen(true)}>
                  <Pencil className="h-4 w-4" /> Gestionar carpetas
                </Button>
              )}
              {folderDocs.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setManageDocsOpen(true)}>
                  <Pencil className="h-4 w-4" /> Gestionar notas
                </Button>
              )}
              {currentFolder && !isFixedFolder && (
                <Button size="sm" variant="ghost" className="text-rose-500 hover:text-rose-500" onClick={deleteCurrentFolder}>
                  <Trash2 className="h-4 w-4" /> Eliminar esta carpeta
                </Button>
              )}
            </div>
          </div>

          {/* Subcarpetas (arrastrables y soltables) */}
          {subfolders.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {subfolders.map(f => (
                <FolderTile key={f.id} folder={f} count={docCount(f.id)} onOpen={() => openFolder(f.id)} />
              ))}
            </div>
          )}

          {/* Notas de la carpeta actual (arrastrables) */}
          {folderDocs.length === 0 && subfolders.length === 0 ? (
            <Empty msg="Esta carpeta está vacía." />
          ) : folderDocs.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {folderDocs.map(d => (
                <DocTile
                  key={d.id}
                  doc={d}
                  linkedCount={apunteAudios.filter(a => a.documentId === d.id).length}
                  onOpen={() => openEditNote(d)}
                />
              ))}
            </div>
          ) : null}

          <p className="text-[11px] text-muted-foreground">
            Consejo: arrastra una carpeta o una nota sobre otra carpeta para moverla dentro, o sobre el nombre de un nivel superior en la ruta de arriba para sacarla. La carpeta "Proyectos" y las carpetas de cada proyecto se gestionan solas.
          </p>
        </div>
      </DndContext>

      {/* Herramienta aparte: Audio a texto (cola de audios sin asignar) */}
      <Section
        title="Audio a texto"
        icon={<Mic className="h-4 w-4 text-primary" />}
        className="border-2"
        action={
          <>
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={onPickFile} />
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Subir audio
            </Button>
          </>
        }
      >
        <p className="mb-3 text-xs text-muted-foreground">
          Los audios se quedan aquí hasta que los vincules a una nota. En cuanto los asignas, desaparecen de esta lista.
        </p>
        {queuedAudios.length === 0 ? <Empty msg="No hay audios pendientes de asignar." /> : (
          <div className="space-y-2">
            {queuedAudios.map(a => {
              const meta = statusMeta(a.status);
              return (
                <div key={a.id} className="rounded-xl border bg-card/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Input
                        defaultValue={a.title}
                        onBlur={(e) => e.target.value.trim() && e.target.value !== a.title && updateApunteAudio(a.id, { title: e.target.value.trim() })}
                        className="h-7 max-w-xs border-none bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
                      />
                      <p className={`flex items-center gap-1 text-[11px] ${meta.cls}`}>
                        {meta.icon} {meta.label}{a.errorMessage ? ` · ${a.errorMessage}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => openAudioLink(a.id)} disabled={apunteDocs.length === 0}>
                        <Link2 className="h-3.5 w-3.5" /> Vincular existente
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openAudioNewDoc(a.id, a.title)}>
                        <Plus className="h-3.5 w-3.5" /> Nota nueva
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => delApunteAudio(a.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  {a.status === "completed" && (a.summary || a.transcript) && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-primary">Ver resumen y transcripción</summary>
                      <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                        {a.summary && <div className="whitespace-pre-wrap rounded-lg bg-background/60 p-2"><span className="font-semibold text-foreground">Resumen:</span>{"\n"}{a.summary}</div>}
                        {a.transcript && <div className="whitespace-pre-wrap rounded-lg bg-background/40 p-2"><span className="font-semibold text-foreground">Transcripción:</span>{"\n"}{a.transcript}</div>}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Dialog: nueva carpeta */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva carpeta</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            Se creará dentro de: <span className="font-medium text-foreground">{breadcrumb.map(b => b.label).join(" / ")}</span>
          </p>
          <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Nombre de la carpeta" onKeyDown={e => e.key === "Enter" && createFolder()} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewFolderOpen(false)}>Cancelar</Button>
            <Button onClick={createFolder} disabled={!newFolderName.trim()}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: gestionar carpetas (nivel actual) */}
      <Dialog open={manageFoldersOpen} onOpenChange={setManageFoldersOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gestionar carpetas</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {subfolders.filter(f => !f.projectId).map(f => (
              <div key={f.id} className="flex items-center gap-2">
                <Input
                  defaultValue={f.name}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== f.name && renameApunteFolder(f.id, e.target.value)}
                  className="h-8"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`¿Eliminar la carpeta "${f.name}"? Se borrará también su contenido (subcarpetas y notas).`)) {
                      delApunteFolder(f.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {subfolders.filter(f => !f.projectId).length === 0 && <p className="text-xs text-muted-foreground">No hay carpetas en este nivel.</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManageFoldersOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: gestionar notas (nivel actual) */}
      <Dialog open={manageDocsOpen} onOpenChange={setManageDocsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gestionar notas</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {folderDocs.map(d => (
              <div key={d.id} className="flex items-center gap-2">
                <Input
                  defaultValue={d.title}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== d.title && updateApunteDoc(d.id, { title: e.target.value.trim() })}
                  className="h-8"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`¿Eliminar la nota "${d.title}"?`)) {
                      delApunteDoc(d.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {folderDocs.length === 0 && <p className="text-xs text-muted-foreground">No hay notas en esta carpeta.</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManageDocsOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: nueva nota / editar nota */}
      <NoteEditorDialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen} folderId={node} editingId={editingNoteId} />

      {/* Dialog: confirmar subida de audio */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Subir audio</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="truncate text-xs text-muted-foreground">{pendingFile?.name}</p>
            <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Título del audio" />
            <p className="text-[11px] text-muted-foreground">
              Se transcribirá y resumirá automáticamente. Quedará en "Audio a texto" hasta que lo vincules a una nota.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setUploadOpen(false); setPendingFile(null); }}>Cancelar</Button>
            <Button onClick={confirmUpload}>Subir y transcribir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: crear nota nueva desde un audio */}
      <Dialog open={!!audioDocFor} onOpenChange={(o) => !o && setAudioDocFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva nota para este audio</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={audioDocTitle} onChange={(e) => setAudioDocTitle(e.target.value)} placeholder="Título de la nota" />
            <Select value={audioDocFolder} onValueChange={setAudioDocFolder}>
              <SelectTrigger><SelectValue placeholder="Carpeta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__root">Archivo (raíz)</SelectItem>
                {flatFolderOptions.map(fo => <SelectItem key={fo.id} value={fo.id}>{fo.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Si el audio ya tiene transcripción, se pegará el resumen y la transcripción dentro.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAudioDocFor(null)}>Cancelar</Button>
            <Button onClick={confirmAudioNewDoc} disabled={!audioDocTitle.trim()}>Crear y vincular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: vincular audio a una nota existente */}
      <Dialog open={!!audioLinkFor} onOpenChange={(o) => !o && setAudioLinkFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vincular a una nota existente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={audioLinkDoc} onValueChange={setAudioLinkDoc}>
              <SelectTrigger><SelectValue placeholder="Elige una nota" /></SelectTrigger>
              <SelectContent>
                {flatDocOptions.map(fo => <SelectItem key={fo.id} value={fo.id}>{fo.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Cuando la transcripción esté lista, el resumen se añadirá al final de esta nota.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAudioLinkFor(null)}>Cancelar</Button>
            <Button onClick={confirmAudioLink} disabled={!audioLinkDoc}>Vincular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
