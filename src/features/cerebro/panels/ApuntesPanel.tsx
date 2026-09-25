import { useMemo, useRef, useState } from "react";
import { FolderPlus, FileText, Upload, Mic, Loader2, CheckCircle2, AlertCircle, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCerebro } from "../CerebroContext";
import { Section, Empty } from "../TaskComponents";
import { CategoryChip } from "../NoteComponents";
import { ApunteDoc } from "../types";

const NO_FOLDER = "__none";
const ALL_FOLDER = "__all";

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

export function ApuntesPanel() {
  const {
    apunteFolders, apunteDocs, apunteAudios,
    addApunteFolder, renameApunteFolder, delApunteFolder,
    addApunteDoc, updateApunteDoc, delApunteDoc,
    delApunteAudio, linkApunteAudio, uploadApunteAudio,
  } = useCerebro();

  const [activeFolder, setActiveFolder] = useState<string>(ALL_FOLDER);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [manageFoldersOpen, setManageFoldersOpen] = useState(false);

  const [editingDoc, setEditingDoc] = useState<ApunteDoc | null>(null);
  const [docEditorOpen, setDocEditorOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docFolder, setDocFolder] = useState<string>(NO_FOLDER);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDoc, setUploadDoc] = useState<string>(NO_FOLDER);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docs = useMemo(() => {
    if (activeFolder === ALL_FOLDER) return apunteDocs;
    if (activeFolder === NO_FOLDER) return apunteDocs.filter((d) => !d.folderId);
    return apunteDocs.filter((d) => d.folderId === activeFolder);
  }, [apunteDocs, activeFolder]);

  const docCount = (folderId: string | null) => apunteDocs.filter((d) => (d.folderId ?? null) === folderId).length;

  const openNewDoc = () => {
    setEditingDoc(null);
    setDocTitle("");
    setDocContent("");
    setDocFolder(activeFolder !== ALL_FOLDER && activeFolder !== NO_FOLDER ? activeFolder : NO_FOLDER);
    setDocEditorOpen(true);
  };

  const openEditDoc = (d: ApunteDoc) => {
    setEditingDoc(d);
    setDocTitle(d.title);
    setDocContent(d.content);
    setDocFolder(d.folderId || NO_FOLDER);
    setDocEditorOpen(true);
  };

  const saveDoc = () => {
    if (!docTitle.trim()) return;
    const folderId = docFolder === NO_FOLDER ? null : docFolder;
    if (editingDoc) {
      updateApunteDoc(editingDoc.id, { title: docTitle.trim(), content: docContent, folderId });
    } else {
      addApunteDoc({ title: docTitle.trim(), content: docContent, folderId });
    }
    setDocEditorOpen(false);
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    addApunteFolder(newFolderName.trim());
    setNewFolderName("");
    setNewFolderOpen(false);
  };

  const onPickFile = (e: any) => {
    const f: File | undefined = e.target.files?.[0];
    if (!f) return;
    setPendingFile(f);
    setUploadTitle(f.name.replace(/\.[^.]+$/, ""));
    setUploadDoc(NO_FOLDER);
    setUploadOpen(true);
    e.target.value = "";
  };

  const confirmUpload = () => {
    if (!pendingFile) return;
    uploadApunteAudio(pendingFile, {
      title: uploadTitle,
      documentId: uploadDoc === NO_FOLDER ? null : uploadDoc,
    });
    setUploadOpen(false);
    setPendingFile(null);
  };

  return (
    <div className="space-y-5">
      {/* Carpetas */}
      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip label={`Todo (${apunteDocs.length})`} active={activeFolder === ALL_FOLDER} onClick={() => setActiveFolder(ALL_FOLDER)} />
        <CategoryChip label={`Sin carpeta (${docCount(null)})`} active={activeFolder === NO_FOLDER} onClick={() => setActiveFolder(NO_FOLDER)} />
        {apunteFolders.map((f) => (
          <CategoryChip key={f.id} label={`${f.name} (${docCount(f.id)})`} active={activeFolder === f.id} onClick={() => setActiveFolder(f.id)} />
        ))}
        <Button size="sm" variant="ghost" onClick={() => setNewFolderOpen(true)}>
          <FolderPlus className="h-4 w-4" /> Carpeta
        </Button>
        {apunteFolders.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setManageFoldersOpen(true)}>
            <Pencil className="h-4 w-4" /> Gestionar
          </Button>
        )}
      </div>

      {/* Documentos */}
      <Section
        title="Apuntes"
        icon={<FileText className="h-4 w-4 text-primary" />}
        action={
          <Button size="sm" variant="outline" onClick={openNewDoc}>
            <FileText className="h-4 w-4" /> Nuevo documento
          </Button>
        }
      >
        {docs.length === 0 ? (
          <Empty msg="Sin documentos en esta carpeta." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((d) => {
              const linked = apunteAudios.filter((a) => a.documentId === d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => openEditDoc(d)}
                  className="rounded-xl border bg-card/60 p-3 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <p className="truncate text-sm font-semibold text-foreground">{d.title}</p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{d.content || "Sin contenido todavía."}</p>
                  {linked.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Mic className="h-3 w-3" /> {linked.length} audio{linked.length > 1 ? "s" : ""}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* Audios */}
      <Section
        title="Audios subidos"
        icon={<Mic className="h-4 w-4 text-primary" />}
        action={
          <>
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={onPickFile} />
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Subir audio
            </Button>
          </>
        }
      >
        {apunteAudios.length === 0 ? (
          <Empty msg="Todavía no has subido ningún audio." />
        ) : (
          <div className="space-y-2">
            {apunteAudios.map((a) => {
              const meta = statusMeta(a.status);
              const linkedDoc = apunteDocs.find((d) => d.id === a.documentId);
              return (
                <div key={a.id} className="rounded-xl border bg-card/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                      <p className={`flex items-center gap-1 text-[11px] ${meta.cls}`}>
                        {meta.icon} {meta.label}
                        {a.errorMessage ? ` · ${a.errorMessage}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={a.documentId || NO_FOLDER} onValueChange={(v) => linkApunteAudio(a.id, v === NO_FOLDER ? null : v)}>
                        <SelectTrigger className="h-8 w-[180px] text-xs">
                          <SelectValue placeholder="Vincular a…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_FOLDER}>Sin vincular</SelectItem>
                          {apunteDocs.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" onClick={() => delApunteAudio(a.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  {a.status === "completed" && (a.summary || a.transcript) && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-primary">Ver resumen y transcripción</summary>
                      <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                        {a.summary && (
                          <div className="whitespace-pre-wrap rounded-lg bg-background/60 p-2">
                            <span className="font-semibold text-foreground">Resumen:</span>{"\n"}{a.summary}
                          </div>
                        )}
                        {a.transcript && (
                          <div className="whitespace-pre-wrap rounded-lg bg-background/40 p-2">
                            <span className="font-semibold text-foreground">Transcripción:</span>{"\n"}{a.transcript}
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                  {linkedDoc && <p className="mt-1 text-[11px] text-muted-foreground">Vinculado a: {linkedDoc.title}</p>}
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
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nombre de la carpeta"
            onKeyDown={(e) => e.key === "Enter" && createFolder()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewFolderOpen(false)}>Cancelar</Button>
            <Button onClick={createFolder} disabled={!newFolderName.trim()}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: gestionar carpetas */}
      <Dialog open={manageFoldersOpen} onOpenChange={setManageFoldersOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gestionar carpetas</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {apunteFolders.map((f) => (
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
                    if (confirm(`¿Eliminar la carpeta "${f.name}"? Los documentos pasarán a "Sin carpeta".`)) {
                      delApunteFolder(f.id);
                      if (activeFolder === f.id) setActiveFolder(ALL_FOLDER);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {apunteFolders.length === 0 && <p className="text-xs text-muted-foreground">No tienes carpetas todavía.</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManageFoldersOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: editor de documento */}
      <Dialog open={docEditorOpen} onOpenChange={setDocEditorOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editingDoc ? "Editar apunte" : "Nuevo apunte"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Título" />
            <Select value={docFolder} onValueChange={setDocFolder}>
              <SelectTrigger><SelectValue placeholder="Carpeta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FOLDER}>Sin carpeta</SelectItem>
                {apunteFolders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              placeholder="Escribe tus apuntes aquí… (los resúmenes de audio vinculado se añaden automáticamente al final)"
              className="min-h-[320px] font-mono text-sm"
            />
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            {editingDoc && (
              <Button
                variant="ghost"
                className="text-rose-500 hover:text-rose-500"
                onClick={() => {
                  if (confirm("¿Eliminar este apunte?")) {
                    delApunteDoc(editingDoc.id);
                    setDocEditorOpen(false);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" /> Eliminar
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDocEditorOpen(false)}>Cancelar</Button>
              <Button onClick={saveDoc} disabled={!docTitle.trim()}>Guardar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: confirmar subida de audio */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Subir audio</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="truncate text-xs text-muted-foreground">{pendingFile?.name}</p>
            <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Título del audio" />
            <Select value={uploadDoc} onValueChange={setUploadDoc}>
              <SelectTrigger><SelectValue placeholder="Vincular a un documento (opcional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FOLDER}>Sin vincular</SelectItem>
                {apunteDocs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Se transcribirá y resumirá automáticamente. Si lo vinculas a un documento, el resumen se añadirá al final de ese apunte cuando esté listo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setUploadOpen(false); setPendingFile(null); }}>Cancelar</Button>
            <Button onClick={confirmUpload}>Subir y transcribir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
