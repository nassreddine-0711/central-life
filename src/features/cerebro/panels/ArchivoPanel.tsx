import { useMemo, useRef, useState } from "react";
import {
  Folder, FolderPlus, FileText, Search, ChevronRight,
  Mic, Upload, Loader2, CheckCircle2, AlertCircle, Trash2, Pencil, ExternalLink, RefreshCw,
  Home, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCerebro } from "../CerebroContext";
import { Section, Empty } from "../TaskComponents";
import { ApunteDoc } from "../types";

/* ============================================================
   Archivo: un único árbol de carpetas (libre, tal como el usuario
   lo organice). Dentro de cada carpeta solo hay "documentos" (ya
   no se separan notas/referencias/apuntes: todo es lo mismo) y
   cada documento vive directamente como Google Doc — al abrirlo
   se redirige a Drive para editarlo allí.
   La transcripción de audio a texto es una herramienta aparte,
   siempre visible debajo del árbol, que permite vincular cada
   audio a un documento de alguna carpeta (existente o nuevo).
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

export function ArchivoPanel() {
  const {
    apunteFolders, apunteDocs, apunteAudios,
    addApunteFolder, renameApunteFolder, delApunteFolder, folderPath,
    addApunteDoc, updateApunteDoc, delApunteDoc,
    updateApunteAudio, delApunteAudio, linkApunteAudio, uploadApunteAudio,
    googleConnected, connectGoogleDrive, refreshDriveFolders,
  } = useCerebro();

  const [node, setNode] = useState<string | null>(NODE_ROOT);
  const [search, setSearch] = useState("");

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [manageFoldersOpen, setManageFoldersOpen] = useState(false);
  const [manageDocsOpen, setManageDocsOpen] = useState(false);

  const [newDocOpen, setNewDocOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [creatingDoc, setCreatingDoc] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDoc, setUploadDoc] = useState<string>("__none");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [audioDocFor, setAudioDocFor] = useState<string | null>(null);
  const [audioDocTitle, setAudioDocTitle] = useState("");
  const [audioDocFolder, setAudioDocFolder] = useState<string>("__root");
  const [creatingAudioDoc, setCreatingAudioDoc] = useState(false);

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

  const folderDocs = useMemo(() =>
    apunteDocs.filter(d => (d.folderId ?? null) === node).filter(d => matchesQuery(d.title, d.content)),
    [node, apunteDocs, q]);

  const docCount = (folderId: string | null) =>
    apunteDocs.filter(d => (d.folderId ?? null) === folderId).length;

  /* ---------- carpetas en una lista plana (para los selectores) ---------- */
  const flatFolderOptions = useMemo(
    () => apunteFolders.map(f => ({ id: f.id, label: folderPath(f.id).map(x => x.name).join(" / ") })),
    [apunteFolders, folderPath]
  );

  /* ---------- acciones ---------- */
  const openFolder = (id: string | null) => { setNode(id); setSearch(""); };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    addApunteFolder(newFolderName.trim(), node);
    setNewFolderName("");
    setNewFolderOpen(false);
  };

  const openNewDoc = () => {
    if (!googleConnected) {
      connectGoogleDrive();
      return;
    }
    setNewDocTitle("");
    setNewDocContent("");
    setNewDocOpen(true);
  };

  const confirmNewDoc = async () => {
    if (!newDocTitle.trim()) return;
    setCreatingDoc(true);
    const d = await addApunteDoc({ title: newDocTitle.trim(), content: newDocContent, folderId: node });
    setCreatingDoc(false);
    if (d?.googleDocUrl) {
      window.open(d.googleDocUrl, "_blank", "noreferrer");
      setNewDocOpen(false);
    }
  };

  const openDoc = (d: ApunteDoc) => {
    if (d.googleDocUrl) {
      window.open(d.googleDocUrl, "_blank", "noreferrer");
    }
  };

  const onPickFile = (e: any) => {
    const f: File | undefined = e.target.files?.[0];
    if (!f) return;
    setPendingFile(f);
    setUploadTitle(f.name.replace(/\.[^.]+$/, ""));
    setUploadDoc("__none");
    setUploadOpen(true);
    e.target.value = "";
  };

  const confirmUpload = () => {
    if (!pendingFile) return;
    uploadApunteAudio(pendingFile, { title: uploadTitle, documentId: uploadDoc === "__none" ? null : uploadDoc });
    setUploadOpen(false);
    setPendingFile(null);
  };

  const openAudioNewDoc = (audioId: string, defaultTitle: string) => {
    if (!googleConnected) {
      connectGoogleDrive();
      return;
    }
    setAudioDocFor(audioId);
    setAudioDocTitle(defaultTitle);
    setAudioDocFolder("__root");
    setCreatingAudioDoc(false);
  };

  const confirmAudioNewDoc = async () => {
    if (!audioDocFor || !audioDocTitle.trim()) return;
    const audio = apunteAudios.find(a => a.id === audioDocFor);
    const initialContent = audio?.status === "completed"
      ? [audio.summary, audio.transcript].filter(Boolean).join("\n\n")
      : undefined;
    setCreatingAudioDoc(true);
    const d = await addApunteDoc({
      title: audioDocTitle.trim(),
      content: initialContent,
      folderId: audioDocFolder === "__root" ? null : audioDocFolder,
    });
    setCreatingAudioDoc(false);
    if (d) {
      linkApunteAudio(audioDocFor, d.id);
      setAudioDocFor(null);
    }
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-5">
      {/* Estado de Google Drive */}
      {!googleConnected && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-sm">
          <span className="text-muted-foreground">Conecta Google Drive para crear y abrir tus documentos directamente en Google Docs.</span>
          <Button size="sm" onClick={connectGoogleDrive}>Conectar Google Drive</Button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {breadcrumb.map((b, i) => (
          <span key={b.id ?? "root"} className="flex items-center gap-1.5">
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
          </span>
        ))}
        {googleConnected && (
          <button onClick={refreshDriveFolders} className="ml-1 rounded p-1 text-muted-foreground hover:text-foreground" title="Actualizar desde Drive">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en esta carpeta…" className="pl-8" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus className="h-4 w-4" /> Carpeta
          </Button>
          <Button size="sm" variant="outline" onClick={openNewDoc}>
            <Plus className="h-4 w-4" /> Documento
          </Button>
          {subfolders.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setManageFoldersOpen(true)}>
              <Pencil className="h-4 w-4" /> Gestionar carpetas
            </Button>
          )}
          {folderDocs.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setManageDocsOpen(true)}>
              <Pencil className="h-4 w-4" /> Gestionar documentos
            </Button>
          )}
        </div>
      </div>

      {/* Subcarpetas */}
      {subfolders.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {subfolders.map(f => (
            <button
              key={f.id}
              onClick={() => openFolder(f.id)}
              className="flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2 text-sm shadow-sm transition hover:border-primary/40"
            >
              <Folder className="h-4 w-4 text-primary" /> {f.name}
              {f.driveFolderId && <span title="Sincronizada con Drive" className="text-emerald-500">•</span>}
              <span className="text-[10px] text-muted-foreground">{docCount(f.id)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Documentos de la carpeta actual */}
      {folderDocs.length === 0 && subfolders.length === 0 ? (
        <Empty msg="Esta carpeta está vacía." />
      ) : folderDocs.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {folderDocs.map(d => {
            const linked = apunteAudios.filter(a => a.documentId === d.id);
            return (
              <button
                key={d.id}
                onClick={() => openDoc(d)}
                className="rounded-xl border bg-card/60 p-3 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  {d.title}
                  {d.googleDocUrl && <ExternalLink className="h-3 w-3 shrink-0 text-emerald-500" />}
                </p>
                {d.googleDocUrl ? (
                  <p className="mt-1 text-xs text-emerald-500">Google Docs</p>
                ) : (
                  <p className="mt-1 text-xs text-amber-500">Creando en Drive…</p>
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
      ) : null}

      {/* Herramienta aparte: Audio a texto */}
      <Section
        title="Audio a texto"
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
        {apunteAudios.length === 0 ? <Empty msg="Todavía no has subido ningún audio." /> : (
          <div className="space-y-2">
            {apunteAudios.map(a => {
              const meta = statusMeta(a.status);
              const linkedDoc = apunteDocs.find(d => d.id === a.documentId);
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
                    <div className="flex items-center gap-2">
                      <Select value={a.documentId || "__none"} onValueChange={(v) => linkApunteAudio(a.id, v === "__none" ? null : v)}>
                        <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue placeholder="Vincular a…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Sin vincular</SelectItem>
                          {flatFolderOptions.map(fo => apunteDocs.filter(d => d.folderId === fo.id).map(d => (
                            <SelectItem key={d.id} value={d.id}>{fo.label} / {d.title}</SelectItem>
                          )))}
                          {apunteDocs.filter(d => !d.folderId).map(d => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => openAudioNewDoc(a.id, a.title)}>
                        <Plus className="h-3.5 w-3.5" /> Nuevo
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
          <p className="text-xs text-muted-foreground">
            Se creará dentro de: <span className="font-medium text-foreground">{breadcrumb.map(b => b.label).join(" / ")}</span>
            {googleConnected && " — también se creará en Google Drive."}
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
            {subfolders.map(f => (
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
                    if (confirm(`¿Eliminar la carpeta "${f.name}"? Su contenido pasará al nivel superior.`)) {
                      delApunteFolder(f.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {subfolders.length === 0 && <p className="text-xs text-muted-foreground">No hay carpetas en este nivel.</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManageFoldersOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: gestionar documentos (nivel actual) */}
      <Dialog open={manageDocsOpen} onOpenChange={setManageDocsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gestionar documentos</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {folderDocs.map(d => (
              <div key={d.id} className="flex items-center gap-2">
                <Input
                  defaultValue={d.title}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== d.title && updateApunteDoc(d.id, { title: e.target.value.trim() })}
                  className="h-8"
                />
                {d.googleDocUrl && (
                  <Button size="icon" variant="ghost" asChild>
                    <a href={d.googleDocUrl} target="_blank" rel="noreferrer" title="Abrir en Google Docs">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`¿Eliminar el documento "${d.title}"? (el archivo en Drive no se borra)`)) {
                      delApunteDoc(d.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {folderDocs.length === 0 && <p className="text-xs text-muted-foreground">No hay documentos en esta carpeta.</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManageDocsOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: nuevo documento */}
      <Dialog open={newDocOpen} onOpenChange={setNewDocOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} placeholder="Título" />
            <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
              Se creará como Google Doc dentro de: <span className="font-medium text-foreground">{breadcrumb.map(b => b.label).join(" / ")}</span>
            </p>
            <Textarea
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              placeholder="Contenido inicial (opcional) — se pegará en el documento al crearlo…"
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewDocOpen(false)}>Cancelar</Button>
            <Button onClick={confirmNewDoc} disabled={!newDocTitle.trim() || creatingDoc}>
              {creatingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Crear y abrir en Drive
            </Button>
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
                <SelectItem value="__none">Sin vincular</SelectItem>
                {apunteDocs.map(d => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Se transcribirá y resumirá automáticamente. Si lo vinculas a un documento, el resumen se añadirá al final cuando esté listo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setUploadOpen(false); setPendingFile(null); }}>Cancelar</Button>
            <Button onClick={confirmUpload}>Subir y transcribir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: crear documento nuevo desde un audio */}
      <Dialog open={!!audioDocFor} onOpenChange={(o) => !o && setAudioDocFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo documento para este audio</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={audioDocTitle} onChange={(e) => setAudioDocTitle(e.target.value)} placeholder="Título del documento" />
            <Select value={audioDocFolder} onValueChange={setAudioDocFolder}>
              <SelectTrigger><SelectValue placeholder="Carpeta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__root">Archivo (raíz)</SelectItem>
                {flatFolderOptions.map(fo => <SelectItem key={fo.id} value={fo.id}>{fo.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Se creará en Google Docs y, si el audio ya tiene transcripción, se pegará el resumen y la transcripción dentro.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAudioDocFor(null)}>Cancelar</Button>
            <Button onClick={confirmAudioNewDoc} disabled={!audioDocTitle.trim() || creatingAudioDoc}>
              {creatingAudioDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Crear y vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
