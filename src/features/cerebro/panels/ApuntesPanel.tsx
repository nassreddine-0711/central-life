import { useMemo, useRef, useState } from "react";
import { FolderPlus, FileText, Upload, Mic, Loader2, CheckCircle2, AlertCircle, Trash2, Pencil, ExternalLink, RefreshCw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
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
    googleConnected, connectGoogleDrive,
    driveFolders, driveRootId, refreshDriveFolders, createDriveFolder,
  } = useCerebro();
  const [savingDoc, setSavingDoc] = useState(false);

  // Modo local (sin Drive): carpetas planas propias de la app
  const [activeFolder, setActiveFolder] = useState<string>(ALL_FOLDER);
  // Modo Drive: navegación por carpeta actual (null = raíz)
  const [driveCurrentId, setDriveCurrentId] = useState<string | null>(null);
  const [driveViewAll, setDriveViewAll] = useState(false);

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

  const driveFolderMap = useMemo(
    () => new Map(driveFolders.map((f) => [f.id, f])),
    [driveFolders]
  );

  const driveBreadcrumb = useMemo(() => {
    if (!driveCurrentId) return [] as { id: string; name: string }[];
    const chain: { id: string; name: string }[] = [];
    let cur = driveFolderMap.get(driveCurrentId);
    while (cur) {
      chain.unshift({ id: cur.id, name: cur.name });
      cur = cur.parentId ? driveFolderMap.get(cur.parentId) : undefined;
    }
    return chain;
  }, [driveCurrentId, driveFolderMap]);

  const driveChildFolders = useMemo(() => {
    const parent = driveCurrentId ?? driveRootId;
    return driveFolders.filter((f) => f.parentId === parent);
  }, [driveFolders, driveCurrentId, driveRootId]);

  /** Ruta "A / B / C" de un doc de Drive, para mostrarla en los selectores de vinculación de audio. */
  const drivePathLabel = (d: ApunteDoc) => {
    if (!d.googleDocId) return d.title;
    const parts: string[] = [];
    let cur = d.folderId ? driveFolderMap.get(d.folderId) : undefined;
    while (cur) { parts.unshift(cur.name); cur = cur.parentId ? driveFolderMap.get(cur.parentId) : undefined; }
    return (parts.length ? parts.join(" / ") + " / " : "") + d.title;
  };

  const docs = useMemo(() => {
    if (googleConnected) {
      if (driveViewAll) return apunteDocs.filter((d) => !!d.googleDocId);
      const folder = driveCurrentId ?? driveRootId;
      return apunteDocs.filter((d) => d.googleDocId && (d.folderId ?? null) === folder);
    }
    if (activeFolder === ALL_FOLDER) return apunteDocs.filter((d) => !d.googleDocId);
    if (activeFolder === NO_FOLDER) return apunteDocs.filter((d) => !d.googleDocId && !d.folderId);
    return apunteDocs.filter((d) => !d.googleDocId && d.folderId === activeFolder);
  }, [apunteDocs, activeFolder, googleConnected, driveViewAll, driveCurrentId, driveRootId]);

  const localOnlyDocs = useMemo(() => apunteDocs.filter((d) => !d.googleDocId), [apunteDocs]);

  const docCount = (folderId: string | null) => apunteDocs.filter((d) => !d.googleDocId && (d.folderId ?? null) === folderId).length;

  const openNewDoc = () => {
    setEditingDoc(null);
    setDocTitle("");
    setDocContent("");
    if (googleConnected) {
      setDocFolder((driveCurrentId ?? driveRootId) || NO_FOLDER);
    } else {
      setDocFolder(activeFolder !== ALL_FOLDER && activeFolder !== NO_FOLDER ? activeFolder : NO_FOLDER);
    }
    setDocEditorOpen(true);
  };

  const openEditDoc = (d: ApunteDoc) => {
    setEditingDoc(d);
    setDocTitle(d.title);
    setDocContent(d.content);
    setDocFolder(d.folderId || NO_FOLDER);
    setDocEditorOpen(true);
  };

  const saveDoc = async () => {
    if (!docTitle.trim()) return;
    const folderId = docFolder === NO_FOLDER ? null : docFolder;
    if (editingDoc) {
      updateApunteDoc(editingDoc.id, {
        title: docTitle.trim(),
        ...(editingDoc.googleDocId ? {} : { folderId, content: docContent }),
      });
      setDocEditorOpen(false);
    } else {
      setSavingDoc(true);
      await addApunteDoc({ title: docTitle.trim(), content: docContent, folderId });
      setSavingDoc(false);
      setDocEditorOpen(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    if (googleConnected) {
      const parent = driveCurrentId ?? driveRootId;
      if (!parent) return;
      await createDriveFolder(newFolderName.trim(), parent);
    } else {
      addApunteFolder(newFolderName.trim());
    }
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
      {/* Estado de Google Drive */}
      {googleConnected ? (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> Conectado a Google Drive — los apuntes nuevos se crean como Google Docs.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-sm">
          <span className="text-muted-foreground">Conecta Google Drive para que tus apuntes nuevos se guarden como Google Docs editables.</span>
          <Button size="sm" onClick={connectGoogleDrive}>Conectar Google Drive</Button>
        </div>
      )}

      {/* Navegador de carpetas — modo Google Drive */}
      {googleConnected && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => { setDriveViewAll(true); }}
              className={cn("rounded-full px-2.5 py-1", driveViewAll ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              Todo
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              onClick={() => { setDriveViewAll(false); setDriveCurrentId(null); }}
              className={cn("rounded-full px-2.5 py-1", !driveViewAll && !driveCurrentId ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              📁 Apuntes
            </button>
            {!driveViewAll && driveBreadcrumb.map((b, i) => (
              <span key={b.id} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <button
                  onClick={() => setDriveCurrentId(b.id)}
                  className={cn("rounded-full px-2.5 py-1", i === driveBreadcrumb.length - 1 ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:text-foreground")}
                >
                  {b.name}
                </button>
              </span>
            ))}
            <button onClick={refreshDriveFolders} className="ml-1 rounded p-1 text-muted-foreground hover:text-foreground" title="Actualizar desde Drive">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {!driveViewAll && (
            <div className="flex flex-wrap items-center gap-2">
              {driveChildFolders.map((f) => (
                <CategoryChip key={f.id} label={`📁 ${f.name}`} active={false} onClick={() => setDriveCurrentId(f.id)} />
              ))}
              <Button size="sm" variant="ghost" onClick={() => setNewFolderOpen(true)}>
                <FolderPlus className="h-4 w-4" /> Subcarpeta
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Carpetas — modo local (sin Drive) */}
      {!googleConnected && (
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
      )}

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
                  {d.googleDocId ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" /> Google Docs
                    </p>
                  ) : (
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{d.content || "Sin contenido todavía."}</p>
                  )}
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

      {/* Apuntes locales previos a conectar Drive (si los hay) */}
      {googleConnected && localOnlyDocs.length > 0 && (
        <details className="rounded-xl border p-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Apuntes locales de antes de conectar Drive ({localOnlyDocs.length})
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {localOnlyDocs.map((d) => (
              <button
                key={d.id}
                onClick={() => openEditDoc(d)}
                className="rounded-xl border bg-card/60 p-3 text-left shadow-sm transition hover:border-primary/40"
              >
                <p className="truncate text-sm font-semibold text-foreground">{d.title}</p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{d.content || "Sin contenido todavía."}</p>
              </button>
            ))}
          </div>
        </details>
      )}

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
                        <SelectTrigger className="h-8 w-[220px] text-xs">
                          <SelectValue placeholder="Vincular a…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_FOLDER}>Sin vincular</SelectItem>
                          {apunteDocs.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{drivePathLabel(d)}</SelectItem>
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
                  {linkedDoc && <p className="mt-1 text-[11px] text-muted-foreground">Vinculado a: {drivePathLabel(linkedDoc)}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Dialog: nueva carpeta / subcarpeta */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{googleConnected ? "Nueva subcarpeta en Drive" : "Nueva carpeta"}</DialogTitle>
          </DialogHeader>
          {googleConnected && (
            <p className="text-xs text-muted-foreground">
              Se creará dentro de: <span className="font-medium text-foreground">{driveBreadcrumb.map((b) => b.name).join(" / ") || "Apuntes (raíz)"}</span>
            </p>
          )}
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

      {/* Dialog: gestionar carpetas locales */}
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

            {editingDoc?.googleDocId ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Este apunte vive en Google Docs — edítalo allí, con todas sus herramientas. Para moverlo de carpeta, hazlo directamente en Drive.
                <div className="mt-3">
                  <a
                    href={editingDoc.googleDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                  >
                    Abrir en Google Docs <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ) : !editingDoc && googleConnected ? (
              <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                Se creará en Google Drive dentro de: <span className="font-medium text-foreground">{driveBreadcrumb.map((b) => b.name).join(" / ") || "Apuntes (raíz)"}</span>
                {" "}— navega a otra carpeta antes de crear si quieres guardarlo en otro sitio.
              </p>
            ) : (
              <>
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
              </>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            {editingDoc && (
              <Button
                variant="ghost"
                className="text-rose-500 hover:text-rose-500"
                onClick={() => {
                  if (confirm("¿Eliminar este apunte? (si es un Google Doc, el archivo en Drive no se borra)")) {
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
              <Button onClick={saveDoc} disabled={!docTitle.trim() || savingDoc}>
                {savingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Guardar
              </Button>
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
                  <SelectItem key={d.id} value={d.id}>{drivePathLabel(d)}</SelectItem>
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
