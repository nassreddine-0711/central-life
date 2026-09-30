import { useMemo, useRef, useState } from "react";
import {
  Folder, FolderPlus, FolderKanban, FileText, Link2, Search, Tag, ChevronRight,
  Mic, Upload, Loader2, CheckCircle2, AlertCircle, Trash2, Pencil, ExternalLink, RefreshCw,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useCerebro } from "../CerebroContext";
import { Section, Empty } from "../TaskComponents";
import { NoteCard } from "../NoteComponents";
import { ManageCategoriesDialog } from "../Dialogs";
import { ApunteDoc } from "../types";

/* ============================================================
   Archivo y Referencias: un único árbol de carpetas (libre, tal
   como el usuario lo organice) que mezcla notas, referencias y
   apuntes. Cada carpeta puede tener un espejo real en Google
   Drive; los "documentos" (apuntes o notas convertidas) redirigen
   al Google Doc real para editarlo con todas sus herramientas.
   Además de las carpetas reales hay dos ramas virtuales siempre
   presentes en la raíz: "Proyectos" (una subcarpeta automática
   por cada proyecto, con sus notas/referencias vinculadas) y
   "Audios" (grabaciones subidas y transcritas).
============================================================ */

const NODE_ROOT = null;
const NODE_PROJECTS = "__projects";
const NODE_AUDIOS = "__audios";
const projectNode = (id: string) => `__project:${id}`;
const isProjectNode = (id: string) => id.startsWith("__project:");
const projectNodeId = (id: string) => id.slice("__project:".length);

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
    notes, noteCats, projects,
    apunteFolders, apunteDocs, apunteAudios,
    addApunteFolder, renameApunteFolder, delApunteFolder, folderPath,
    addApunteDoc, updateApunteDoc, delApunteDoc,
    delApunteAudio, linkApunteAudio, uploadApunteAudio,
    googleConnected, connectGoogleDrive, refreshDriveFolders,
    openNoteSheet,
  } = useCerebro();

  const [node, setNode] = useState<string | null>(NODE_ROOT);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "note" | "ref">("all");
  const [manageCatsOpen, setManageCatsOpen] = useState(false);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [manageFoldersOpen, setManageFoldersOpen] = useState(false);

  const [editingDoc, setEditingDoc] = useState<ApunteDoc | null>(null);
  const [docEditorOpen, setDocEditorOpen] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDoc, setUploadDoc] = useState<string>("__none");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRealFolder = node !== NODE_ROOT && node !== NODE_PROJECTS && node !== NODE_AUDIOS && !isProjectNode(node ?? "");
  const realFolderId = node === NODE_ROOT ? null : (isRealFolder ? node : null);

  /* ---------- breadcrumb ---------- */
  const breadcrumb = useMemo(() => {
    const chain: { id: string | null; label: string }[] = [{ id: NODE_ROOT, label: "Archivo" }];
    if (node === NODE_ROOT) return chain;
    if (node === NODE_PROJECTS) { chain.push({ id: NODE_PROJECTS, label: "Proyectos" }); return chain; }
    if (node === NODE_AUDIOS) { chain.push({ id: NODE_AUDIOS, label: "Audios" }); return chain; }
    if (node && isProjectNode(node)) {
      const p = projects.find(pr => pr.id === projectNodeId(node));
      chain.push({ id: NODE_PROJECTS, label: "Proyectos" });
      chain.push({ id: node, label: p?.title ?? "Proyecto" });
      return chain;
    }
    folderPath(node).forEach(f => chain.push({ id: f.id, label: f.name }));
    return chain;
  }, [node, projects, folderPath]);

  /* ---------- listados del nodo actual ---------- */
  const subfolders = useMemo(() => {
    if (node === NODE_ROOT) return apunteFolders.filter(f => !f.parentId);
    if (isRealFolder) return apunteFolders.filter(f => f.parentId === node);
    return [];
  }, [node, apunteFolders, isRealFolder]);

  const q = search.toLowerCase().trim();
  const matchesQuery = (title: string, content?: string) =>
    !q || title.toLowerCase().includes(q) || (content ?? "").toLowerCase().includes(q);

  const folderNotes = useMemo(() => {
    let list: typeof notes;
    if (node === NODE_ROOT) list = notes.filter(n => !n.folderId && !n.projectId);
    else if (isRealFolder) list = notes.filter(n => (n.folderId ?? null) === node);
    else if (node && isProjectNode(node)) list = notes.filter(n => n.projectId === projectNodeId(node));
    else list = [];
    return list.filter(n => (kindFilter === "all" || n.kind === kindFilter) && matchesQuery(n.title, n.content));
  }, [node, notes, isRealFolder, kindFilter, q]);

  const folderDocs = useMemo(() => {
    if (node === NODE_ROOT) return apunteDocs.filter(d => !d.folderId).filter(d => matchesQuery(d.title, d.content));
    if (isRealFolder) return apunteDocs.filter(d => d.folderId === node).filter(d => matchesQuery(d.title, d.content));
    return [];
  }, [node, apunteDocs, isRealFolder, q]);

  const docCount = (folderId: string | null) =>
    apunteDocs.filter(d => (d.folderId ?? null) === folderId).length +
    notes.filter(n => (n.folderId ?? null) === folderId).length;

  /* ---------- acciones ---------- */
  const openFolder = (id: string) => { setNode(id); setSearch(""); };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    addApunteFolder(newFolderName.trim(), isRealFolder ? node : null);
    setNewFolderName("");
    setNewFolderOpen(false);
  };

  const openNewDoc = () => {
    setEditingDoc(null);
    setDocTitle("");
    setDocContent("");
    setDocEditorOpen(true);
  };

  const openEditDoc = (d: ApunteDoc) => {
    setEditingDoc(d);
    setDocTitle(d.title);
    setDocContent(d.content);
    setDocEditorOpen(true);
  };

  const saveDoc = async () => {
    if (!docTitle.trim()) return;
    if (editingDoc) {
      updateApunteDoc(editingDoc.id, {
        title: docTitle.trim(),
        ...(editingDoc.googleDocId ? {} : { content: docContent }),
      });
      setDocEditorOpen(false);
    } else {
      setSavingDoc(true);
      await addApunteDoc({ title: docTitle.trim(), content: docContent, folderId: realFolderId });
      setSavingDoc(false);
      setDocEditorOpen(false);
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

  const addNoteHere = (kind: "note" | "ref") => {
    openNoteSheet({
      defaultKind: kind,
      defaultFolderId: isRealFolder ? node : undefined,
      defaultProjectId: node && isProjectNode(node) ? projectNodeId(node) : undefined,
    });
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-5">
      {/* Estado de Google Drive */}
      {!googleConnected && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-sm">
          <span className="text-muted-foreground">Conecta Google Drive para que tus carpetas y apuntes se reflejen como Google Docs editables.</span>
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
          {(node === NODE_ROOT || isRealFolder) && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setNewFolderOpen(true)}>
                <FolderPlus className="h-4 w-4" /> Carpeta
              </Button>
              <Button size="sm" variant="outline" onClick={() => addNoteHere("note")}>
                <FileText className="h-4 w-4" /> Nota
              </Button>
              <Button size="sm" variant="outline" onClick={() => addNoteHere("ref")}>
                <Link2 className="h-4 w-4" /> Referencia
              </Button>
              <Button size="sm" variant="outline" onClick={openNewDoc}>
                <FileText className="h-4 w-4" /> Apunte
              </Button>
            </>
          )}
          {node && isProjectNode(node) && (
            <>
              <Button size="sm" variant="outline" onClick={() => addNoteHere("note")}>
                <FileText className="h-4 w-4" /> Nota
              </Button>
              <Button size="sm" variant="outline" onClick={() => addNoteHere("ref")}>
                <Link2 className="h-4 w-4" /> Referencia
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setManageCatsOpen(true)}>
            <Tag className="h-4 w-4" /> Categorías
          </Button>
        </div>
      </div>

      {(node === NODE_ROOT || isRealFolder) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Tabs value={kindFilter} onValueChange={(v) => setKindFilter(v as "all" | "note" | "ref")}>
            <TabsList>
              <TabsTrigger value="all">Todo</TabsTrigger>
              <TabsTrigger value="note"><FileText className="mr-2 h-4 w-4" />Notas</TabsTrigger>
              <TabsTrigger value="ref"><Link2 className="mr-2 h-4 w-4" />Referencias</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Subcarpetas (incluye ramas virtuales en la raíz) */}
      {(node === NODE_ROOT || isRealFolder || node === NODE_PROJECTS) && (
        <div className="flex flex-wrap gap-2">
          {node === NODE_ROOT && (
            <button
              onClick={() => openFolder(NODE_PROJECTS)}
              className="flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2 text-sm shadow-sm transition hover:border-primary/40"
            >
              <FolderKanban className="h-4 w-4 text-primary" /> Proyectos
              <span className="text-[10px] text-muted-foreground">{projects.length}</span>
            </button>
          )}
          {node === NODE_ROOT && (
            <button
              onClick={() => openFolder(NODE_AUDIOS)}
              className="flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2 text-sm shadow-sm transition hover:border-primary/40"
            >
              <Mic className="h-4 w-4 text-primary" /> Audios
              <span className="text-[10px] text-muted-foreground">{apunteAudios.length}</span>
            </button>
          )}
          {node === NODE_PROJECTS && projects.map(p => (
            <button
              key={p.id}
              onClick={() => openFolder(projectNode(p.id))}
              className="flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2 text-sm shadow-sm transition hover:border-primary/40"
            >
              <Folder className="h-4 w-4 text-primary" /> {p.title}
              <span className="text-[10px] text-muted-foreground">{notes.filter(n => n.projectId === p.id).length}</span>
            </button>
          ))}
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
          {isRealFolder && (
            <Button size="sm" variant="ghost" onClick={() => setManageFoldersOpen(true)}>
              <Pencil className="h-4 w-4" /> Gestionar carpetas
            </Button>
          )}
          {node === NODE_ROOT && apunteFolders.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setManageFoldersOpen(true)}>
              <Pencil className="h-4 w-4" /> Gestionar carpetas
            </Button>
          )}
        </div>
      )}

      {/* Contenido: Proyectos (solo carpetas, sin items propios) */}
      {node === NODE_PROJECTS && projects.length === 0 && <Empty msg="Todavía no tienes proyectos." />}

      {/* Contenido: Audios */}
      {node === NODE_AUDIOS && (
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
          {apunteAudios.length === 0 ? <Empty msg="Todavía no has subido ningún audio." /> : (
            <div className="space-y-2">
              {apunteAudios.map(a => {
                const meta = statusMeta(a.status);
                const linkedDoc = apunteDocs.find(d => d.id === a.documentId);
                return (
                  <div key={a.id} className="rounded-xl border bg-card/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                        <p className={`flex items-center gap-1 text-[11px] ${meta.cls}`}>
                          {meta.icon} {meta.label}{a.errorMessage ? ` · ${a.errorMessage}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={a.documentId || "__none"} onValueChange={(v) => linkApunteAudio(a.id, v === "__none" ? null : v)}>
                          <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue placeholder="Vincular a…" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">Sin vincular</SelectItem>
                            {apunteDocs.map(d => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
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
      )}

      {/* Contenido: notas/referencias + apuntes de la carpeta actual (raíz, carpeta real o proyecto) */}
      {(node === NODE_ROOT || isRealFolder || (node && isProjectNode(node))) && (
        <>
          {folderDocs.length > 0 && (
            <Section title="Apuntes" icon={<FileText className="h-4 w-4 text-primary" />}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {folderDocs.map(d => {
                  const linked = apunteAudios.filter(a => a.documentId === d.id);
                  return (
                    <button
                      key={d.id}
                      onClick={() => openEditDoc(d)}
                      className="rounded-xl border bg-card/60 p-3 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md"
                    >
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                        {d.title}
                        {d.googleDocId && <ExternalLink className="h-3 w-3 shrink-0 text-emerald-500" />}
                      </p>
                      {d.googleDocId ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-emerald-500">Google Docs</p>
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
            </Section>
          )}

          <Section title="Notas y referencias" icon={<FileText className="h-4 w-4 text-primary" />}>
            {folderNotes.length === 0 && folderDocs.length === 0 ? (
              <Empty msg="Esta carpeta está vacía." />
            ) : folderNotes.length === 0 ? null : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {folderNotes.map(n => <NoteCard key={n.id} note={n} hideFolderPicker={node !== NODE_ROOT && !isRealFolder} />)}
              </div>
            )}
          </Section>
        </>
      )}

      <ManageCategoriesDialog open={manageCatsOpen} onOpenChange={setManageCatsOpen} />

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

      {/* Dialog: editor de apunte */}
      <Dialog open={docEditorOpen} onOpenChange={setDocEditorOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editingDoc ? "Editar apunte" : "Nuevo apunte"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Título" />
            {editingDoc?.googleDocId ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Este apunte vive en Google Docs — edítalo allí, con todas sus herramientas.
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
                Se creará como Google Doc dentro de: <span className="font-medium text-foreground">{breadcrumb.map(b => b.label).join(" / ")}</span>
              </p>
            ) : (
              <Textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="Escribe tus apuntes aquí…"
                className="min-h-[320px] font-mono text-sm"
              />
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
    </div>
  );
}
