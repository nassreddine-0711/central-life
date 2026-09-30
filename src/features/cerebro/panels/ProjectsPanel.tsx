import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  DndContext, useDraggable, useDroppable, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus, Inbox, FolderKanban, Settings2, Trash2, Calendar as CalendarIcon, X as XIcon,
  ArrowRight, ChevronRight, GripVertical, MessageSquarePlus, ListTodo, FileText, Link2, Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCerebro } from "../CerebroContext";
import { Empty } from "../TaskComponents";
import {
  Project, ProjectStatus, ProjectStage, PROJECT_STAGES, PROJECT_KANBAN_STATUSES,
  PROJECT_STATUS_LABEL, PROJECT_CAT_PALETTE,
} from "../types";

/* ============================================================
   Proyectos: kanban superior (siguiente / en curso / finalizado)
   + Inbox de ideas debajo, con drag-and-drop (@dnd-kit) entre
   ambos; tarjeta con vista previa editable; al abrir un proyecto,
   un pop-up grande con descripción, actualizaciones ("commits"),
   kanban interno de tareas y archivos/referencias vinculados.
============================================================ */

function catColor(hex?: string) {
  return hex || "#6366f1";
}

/* ---------- Tarjeta de proyecto (arrastrable) ---------- */
function ProjectCard({ project, onOpen }: { project: Project; onOpen: (id: string) => void }) {
  const { projectCategories, projectTasks, updateProject, delProject } = useCerebro();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id });
  const [open, setOpen] = useState(false);

  const cat = project.categoryId ? projectCategories.find(c => c.id === project.categoryId) : undefined;
  const tasks = projectTasks(project.id);
  const done = tasks.filter(t => t.stage === "done").length;

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div ref={setNodeRef} style={style} className={cn("relative", isDragging && "z-50 opacity-70")}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            className="group flex cursor-pointer flex-col gap-1.5 rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur-sm transition-colors hover:border-primary/40"
            onClick={() => setOpen(true)}
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
                title="Arrastrar"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">{project.title}</p>
            </div>
            {project.description && (
              <p className="line-clamp-2 pl-5 text-xs text-muted-foreground">{project.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 pl-5">
              {cat && (
                <Badge variant="outline" className="h-5 gap-1 text-[10px]" style={{ borderColor: `${catColor(cat.color)}66`, background: `${catColor(cat.color)}1a`, color: catColor(cat.color) }}>
                  {cat.name}
                </Badge>
              )}
              {project.dueDate && (
                <Badge variant="outline" className="h-5 gap-1 text-[10px] text-muted-foreground">
                  <CalendarIcon className="h-2.5 w-2.5" />
                  {format(new Date(project.dueDate), "d MMM", { locale: es })}
                </Badge>
              )}
              {tasks.length > 0 && (
                <span className="text-[10px] text-muted-foreground">{done}/{tasks.length} tareas</span>
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-3" align="start" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{project.title}</p>
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => { delProject(project.id); setOpen(false); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Textarea
            placeholder="Descripción del proyecto…"
            value={project.description ?? ""}
            onChange={(e) => updateProject(project.id, { description: e.target.value })}
            rows={3}
            className="text-xs"
          />

          <div className="grid grid-cols-2 gap-2">
            <Select value={project.categoryId ?? "__none"} onValueChange={(v) => updateProject(project.id, { categoryId: v === "__none" ? undefined : v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sin categoría</SelectItem>
                {projectCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="h-8 text-xs"
              value={project.dueDate ? project.dueDate.slice(0, 10) : ""}
              onChange={(e) => updateProject(project.id, { dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(["inbox", ...PROJECT_KANBAN_STATUSES] as ProjectStatus[])
              .filter(s => s !== project.status)
              .map(s => (
                <Button key={s} size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => updateProject(project.id, { status: s, archived: s === "done" })}>
                  <ArrowRight className="h-3 w-3" /> {PROJECT_STATUS_LABEL[s]}
                </Button>
              ))}
          </div>

          <Button size="sm" className="w-full" onClick={() => { setOpen(false); onOpen(project.id); }}>
            Abrir proyecto <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ---------- Columna / zona soltable ---------- */
function DropZone({ id, title, count, children, empty }: { id: string; title: string; count: number; children: React.ReactNode; empty: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[140px] flex-col gap-2 rounded-xl border-2 border-dashed p-2.5 transition-colors",
        isOver ? "border-primary/60 bg-primary/5" : "border-border/60 bg-background/30",
      )}
    >
      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <span className="text-[10px] text-muted-foreground">{count}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {count === 0 ? <Empty msg={empty} /> : children}
      </div>
    </div>
  );
}

/* ---------- Gestión de categorías de proyecto ---------- */
function ManageProjectCategoriesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { projectCategories, addProjectCategory, updateProjectCategory, delProjectCategory } = useCerebro();
  const [name, setName] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Categorías de proyecto</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {projectCategories.length === 0 && <Empty msg="Aún no tienes categorías de proyecto." />}
          {projectCategories.map(c => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg border p-2">
              <div className="flex gap-1">
                {PROJECT_CAT_PALETTE.map(hex => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => updateProjectCategory(c.id, { color: hex })}
                    className={cn("h-4 w-4 rounded-full border", c.color === hex && "ring-2 ring-offset-1 ring-foreground")}
                    style={{ background: hex }}
                  />
                ))}
              </div>
              <Input
                value={c.name}
                onChange={(e) => updateProjectCategory(c.id, { name: e.target.value })}
                className="h-8 flex-1 text-xs"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => delProjectCategory(c.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t pt-3">
          <Input
            placeholder="Nueva categoría…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { addProjectCategory(name.trim(), PROJECT_CAT_PALETTE[projectCategories.length % PROJECT_CAT_PALETTE.length]); setName(""); } }}
            className="h-8 text-xs"
          />
          <Button
            size="sm"
            onClick={() => { if (name.trim()) { addProjectCategory(name.trim(), PROJECT_CAT_PALETTE[projectCategories.length % PROJECT_CAT_PALETTE.length]); setName(""); } }}
            disabled={!name.trim()}
          >
            <Plus className="h-3.5 w-3.5" /> Añadir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Kanban interno de tareas de un proyecto (arrastrar y soltar entre columnas) ---------- */
function TaskCardMini({ task, onOpen, onDelete }: { task: { id: string; title: string }; onOpen: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `task:${task.id}` });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={cn(
        "group cursor-grab touch-none rounded-lg border bg-card/70 p-2 text-xs transition active:cursor-grabbing",
        isDragging && "z-50 opacity-60 shadow-lg",
      )}
    >
      <div className="flex items-start gap-1">
        <p className="min-w-0 flex-1 truncate font-medium" title={task.title}>{task.title}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function StageColumn({ stageKey, label, count, children }: { stageKey: ProjectStage; label: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${stageKey}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-background/40 p-2.5 transition-colors",
        isOver && "border-primary/60 bg-primary/5 ring-1 ring-primary/30",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label} · {count}</p>
      <div className="flex min-h-[32px] flex-col gap-1.5">{children}</div>
    </div>
  );
}

/* ---------- Pop-up de proyecto abierto (kanban interno + updates + archivos) ---------- */
function ProjectModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const {
    projects, updateProject, projectCategories,
    projectTasks, moveTaskStage, addTask, openTaskDialog, delTask,
    projectUpdatesFor, addProjectUpdate, delProjectUpdate,
    projectNotes, notes, updateNote,
  } = useCerebro();
  const project = projects.find(p => p.id === projectId);
  const [newUpdate, setNewUpdate] = useState("");
  const [newCardTitle, setNewCardTitle] = useState<Record<ProjectStage, string>>({ todo: "", doing: "", blocked: "", done: "" });
  const [linkNoteId, setLinkNoteId] = useState<string>("__none");

  if (!project) return null;

  const tasks = projectTasks(project.id);
  const updates = projectUpdatesFor(project.id);
  const linkedNotes = projectNotes(project.id);
  const unlinkedNotes = notes.filter(n => !n.projectId);

  const addCard = (stage: ProjectStage) => {
    const title = newCardTitle[stage].trim();
    if (!title) return;
    addTask({ title, projectId: project.id, stage, category: "Otros", priority: "med" });
    setNewCardTitle(s => ({ ...s, [stage]: "" }));
  };

  const taskDndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onTaskDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith("task:") || !overId.startsWith("stage:")) return;
    const taskId = activeId.slice("task:".length);
    const stage = overId.slice("stage:".length) as ProjectStage;
    moveTaskStage(taskId, stage);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-6xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Input
              value={project.title}
              onChange={(e) => updateProject(project.id, { title: e.target.value })}
              className="h-8 max-w-sm border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
            />
            <Badge variant="outline" className="text-[10px]">{PROJECT_STATUS_LABEL[project.status]}</Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            {/* IZQUIERDA: descripción + kanban de tareas */}
            <div className="min-w-0 space-y-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Descripción</label>
                <Textarea
                  value={project.description ?? ""}
                  onChange={(e) => updateProject(project.id, { description: e.target.value })}
                  rows={3}
                  placeholder="Descripción completa del proyecto…"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Tareas del proyecto</p>
                </div>
                <DndContext sensors={taskDndSensors} onDragEnd={onTaskDragEnd}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {PROJECT_STAGES.map(({ key, label }) => (
                    <StageColumn key={key} stageKey={key} label={label} count={tasks.filter(t => t.stage === key).length}>
                      {tasks.filter(t => t.stage === key).map(t => (
                        <TaskCardMini key={t.id} task={t} onOpen={() => openTaskDialog({ editId: t.id })} onDelete={() => delTask(t.id)} />
                      ))}
                      <div className="flex gap-1">
                        <Input
                          value={newCardTitle[key]}
                          onChange={(e) => setNewCardTitle(s => ({ ...s, [key]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && addCard(key)}
                          placeholder="+ tarjeta…"
                          className="h-7 text-[11px]"
                        />
                      </div>
                    </StageColumn>
                  ))}
                </div>
                </DndContext>
              </div>
            </div>

            {/* DERECHA: actualizaciones + archivos/referencias */}
            <div className="min-w-0 space-y-5">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <MessageSquarePlus className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Actualizaciones</p>
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={newUpdate}
                    onChange={(e) => setNewUpdate(e.target.value)}
                    placeholder="Añade una actualización (commit)…"
                    rows={2}
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    className="h-auto shrink-0"
                    disabled={!newUpdate.trim()}
                    onClick={() => { addProjectUpdate(project.id, newUpdate.trim()); setNewUpdate(""); }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  {updates.length === 0 ? <Empty msg="Sin actualizaciones todavía." /> : updates.map(u => (
                    <div key={u.id} className="group flex items-start gap-2 rounded-lg border bg-card/60 p-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap break-words">{u.text}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{format(new Date(u.createdAt), "d MMM yyyy · HH:mm", { locale: es })}</p>
                      </div>
                      <button onClick={() => delProjectUpdate(u.id)} className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Archivos y referencias</p>
                </div>
                <div className="flex gap-2">
                  <Select value={linkNoteId} onValueChange={setLinkNoteId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Vincular nota o referencia…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Elegir…</SelectItem>
                      {unlinkedNotes.map(n => <SelectItem key={n.id} value={n.id}>{n.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={linkNoteId === "__none"}
                    onClick={() => { if (linkNoteId !== "__none") { updateNote(linkNoteId, { projectId: project.id }); setLinkNoteId("__none"); } }}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-3 space-y-1.5">
                  {linkedNotes.length === 0 ? <Empty msg="Sin archivos vinculados." /> : linkedNotes.map(n => (
                    <div key={n.id} className="flex items-center gap-2 rounded-lg border bg-card/60 p-2 text-xs">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{n.title}</span>
                      <button onClick={() => updateNote(n.id, { projectId: undefined })} className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-rose-500" title="Desvincular">
                        <Unlink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Panel principal ---------- */
export function ProjectsPanel() {
  const { projects, addProject, moveProjectStatus } = useCerebro();
  const [newTitle, setNewTitle] = useState("");
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [manageCatsOpen, setManageCatsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStatus = useMemo(() => {
    const m: Record<ProjectStatus, Project[]> = { inbox: [], next: [], doing: [], done: [] };
    projects.forEach(p => m[p.status]?.push(p));
    return m;
  }, [projects]);

  const activeProject = activeId ? projects.find(p => p.id === activeId) : undefined;

  const addQuick = () => {
    if (!newTitle.trim()) return;
    addProject({ title: newTitle.trim() });
    setNewTitle("");
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const status = over.id as ProjectStatus;
    if (!["inbox", "next", "doing", "done"].includes(status)) return;
    const project = projects.find(p => p.id === active.id);
    if (!project || project.status === status) return;
    moveProjectStatus(active.id as string, status);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Proyectos</h2>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setManageCatsOpen(true)}>
          <Settings2 className="h-4 w-4" /> Categorías
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card/70 p-2 shadow-sm backdrop-blur-sm">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addQuick()}
          placeholder="Nuevo proyecto o idea… (va al Inbox)"
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button onClick={addQuick} size="sm" disabled={!newTitle.trim()}>
          <Plus className="h-4 w-4" /> Añadir
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {/* Kanban superior */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PROJECT_KANBAN_STATUSES.map(status => (
            <DropZone key={status} id={status} title={PROJECT_STATUS_LABEL[status]} count={byStatus[status].length} empty="Sin proyectos aquí.">
              {byStatus[status].map(p => <ProjectCard key={p.id} project={p} onOpen={setOpenProjectId} />)}
            </DropZone>
          ))}
        </div>

        {/* Inbox debajo, mismo ancho */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Inbox className="h-3.5 w-3.5" /> Inbox de proyectos e ideas
          </div>
          <DropZone id="inbox" title="Inbox" count={byStatus.inbox.length} empty="Sin ideas guardadas. Añade una abajo.">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {byStatus.inbox.map(p => <ProjectCard key={p.id} project={p} onOpen={setOpenProjectId} />)}
            </div>
          </DropZone>
        </div>

        <DragOverlay>
          {activeProject && (
            <div className="rounded-xl border bg-card p-3 shadow-lg">
              <p className="text-sm font-semibold">{activeProject.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {openProjectId && <ProjectModal projectId={openProjectId} onClose={() => setOpenProjectId(null)} />}
      <ManageProjectCategoriesDialog open={manageCatsOpen} onOpenChange={setManageCatsOpen} />
    </div>
  );
}
