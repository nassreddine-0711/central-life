import { useMemo, useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  DndContext, useDraggable, useDroppable, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus, Inbox, FolderKanban, Settings2, Trash2, Calendar as CalendarIcon, Hourglass,
  ArrowRight, ChevronRight, GripVertical, MessageSquarePlus, ListTodo, FileText, Target,
  Wallet, BookOpen, Clock, Check, X as XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useCerebro } from "../CerebroContext";
import { Empty, TaskList } from "../TaskComponents";
import { NoteEditorDialog } from "../ApunteNoteDialog";
import {
  Project, ProjectStatus, ProjectStage, PROJECT_STAGES, PROJECT_KANBAN_STATUSES,
  PROJECT_STATUS_LABEL, PROJECT_CAT_PALETTE, Objetivo, WEEKDAY_FULL, RetroResult, RETRO_RESULT_LABEL,
} from "../types";

/* ============================================================
   Proyectos: kanban superior (siguiente / en curso / finalizado)
   + Inbox de ideas debajo, con drag-and-drop (@dnd-kit) entre
   ambos; tarjeta con vista previa editable; al abrir un proyecto,
   un pop-up grande por pestañas: resumen, tareas, objetivos,
   notas y referencias, presupuesto, tiempo dedicado y retrospectiva.
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
  const done = tasks.filter(t => t.done).length;

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

/* ---------- Kanban de Objetivos (arrastrar y soltar entre columnas) ---------- */
function ObjetivoCardMini({ objetivo, onDelete }: { objetivo: Objetivo; onDelete: () => void }) {
  const { updateObjetivo } = useCerebro();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `obj:${objetivo.id}` });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "group cursor-grab touch-none rounded-lg border bg-card/70 p-2 text-xs transition active:cursor-grabbing",
        isDragging && "z-50 opacity-60 shadow-lg",
      )}
    >
      <div className="flex items-start gap-1">
        <Input
          defaultValue={objetivo.title}
          onBlur={(e) => e.target.value.trim() && e.target.value !== objetivo.title && updateObjetivo(objetivo.id, { title: e.target.value.trim() })}
          className="h-6 flex-1 border-none bg-transparent px-0 text-xs font-medium shadow-none focus-visible:ring-0"
        />
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

/* ---------- Pestaña: Resumen (fechas + cuenta atrás + actualizaciones) ---------- */
function ResumenTab({ project }: { project: Project }) {
  const { updateProject, projectUpdatesFor, addProjectUpdate, delProjectUpdate } = useCerebro();
  const [newUpdate, setNewUpdate] = useState("");
  const updates = projectUpdatesFor(project.id);

  const countdown = project.dueDate ? differenceInCalendarDays(new Date(project.dueDate), new Date()) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="min-w-0 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Descripción / objetivo principal</label>
          <Textarea
            value={project.description ?? ""}
            onChange={(e) => updateProject(project.id, { description: e.target.value })}
            rows={4}
            placeholder="¿Cuál es el objetivo principal de este proyecto?"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Fecha de inicio</label>
            <Input
              type="date"
              value={project.startDate ? project.startDate.slice(0, 10) : ""}
              onChange={(e) => updateProject(project.id, { startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Fecha final</label>
            <Input
              type="date"
              value={project.dueDate ? project.dueDate.slice(0, 10) : ""}
              onChange={(e) => updateProject(project.id, { dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            />
          </div>
        </div>
        {countdown !== null && (
          <div className={cn(
            "flex items-center gap-2 rounded-lg border p-2.5 text-sm",
            countdown < 0 ? "border-rose-500/40 bg-rose-500/5 text-rose-500" : "border-primary/30 bg-primary/5 text-primary",
          )}>
            <Hourglass className="h-4 w-4 shrink-0" />
            {countdown > 0 ? <span>Quedan <strong>{countdown}</strong> día{countdown === 1 ? "" : "s"}.</span>
              : countdown === 0 ? <span>¡La fecha final es <strong>hoy</strong>!</span>
              : <span>La fecha final pasó hace <strong>{Math.abs(countdown)}</strong> día{Math.abs(countdown) === 1 ? "" : "s"}.</span>}
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-2">
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
    </div>
  );
}

/* ---------- Pestaña: Tareas (pendientes / completadas, sin kanban) ---------- */
function TareasTab({ project }: { project: Project }) {
  const { projectTasks, toggleTask, delTask, updateTask, openTaskDialog } = useCerebro();
  const tasks = projectTasks(project.id);
  const pending = tasks.filter(t => !t.done);
  const completed = tasks.filter(t => t.done);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => openTaskDialog({ defaultProjectId: project.id })}>
          <Plus className="h-4 w-4" /> Nueva tarea
        </Button>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pendientes · {pending.length}</p>
        {pending.length === 0 ? <Empty msg="Sin tareas pendientes." /> : (
          <TaskList tasks={pending} onToggle={toggleTask} onDelete={delTask} onUpdate={updateTask} columns={2} />
        )}
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completadas · {completed.length}</p>
        {completed.length === 0 ? <Empty msg="Todavía no se ha completado ninguna." /> : (
          <TaskList tasks={completed} onToggle={toggleTask} onDelete={delTask} onUpdate={updateTask} columns={2} />
        )}
      </div>
    </div>
  );
}

/* ---------- Pestaña: Objetivos (kanban interno, antes era de tareas) ---------- */
function ObjetivosTab({ project }: { project: Project }) {
  const { objetivosFor, addObjetivo, delObjetivo, moveObjetivoStage } = useCerebro();
  const objetivos = objetivosFor(project.id);
  const [newTitle, setNewTitle] = useState<Record<ProjectStage, string>>({ todo: "", doing: "", blocked: "", done: "" });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith("obj:") || !overId.startsWith("stage:")) return;
    moveObjetivoStage(activeId.slice("obj:".length), overId.slice("stage:".length) as ProjectStage);
  };

  const addCard = (stage: ProjectStage) => {
    const title = newTitle[stage].trim();
    if (!title) return;
    addObjetivo(project.id, title, stage);
    setNewTitle(s => ({ ...s, [stage]: "" }));
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PROJECT_STAGES.map(({ key, label }) => (
          <StageColumn key={key} stageKey={key} label={label} count={objetivos.filter(o => o.stage === key).length}>
            {objetivos.filter(o => o.stage === key).map(o => (
              <ObjetivoCardMini key={o.id} objetivo={o} onDelete={() => delObjetivo(o.id)} />
            ))}
            <Input
              value={newTitle[key]}
              onChange={(e) => setNewTitle(s => ({ ...s, [key]: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addCard(key)}
              placeholder="+ objetivo…"
              className="h-7 text-[11px]"
            />
          </StageColumn>
        ))}
      </div>
    </DndContext>
  );
}

/* ---------- Pestaña: Notas y referencias (carpeta del proyecto en Archivo) ---------- */
function NotasTab({ project }: { project: Project }) {
  const { projectFolder, apunteDocs, delApunteDoc } = useCerebro();
  const folder = projectFolder(project.id);
  const docs = useMemo(() => apunteDocs.filter(d => folder && d.folderId === folder.id), [apunteDocs, folder]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> Nueva nota
        </Button>
      </div>
      {docs.length === 0 ? <Empty msg="Sin notas ni referencias todavía." /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {docs.map(d => (
            <div key={d.id} className="group rounded-xl border bg-card/60 p-3 text-left shadow-sm transition hover:border-primary/40">
              <button className="w-full text-left" onClick={() => { setEditingId(d.id); setDialogOpen(true); }}>
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                  <FileText className="h-4 w-4 shrink-0 text-primary" /> {d.title}
                </p>
                {d.content && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.content}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {d.tags.map(t => <Badge key={t} variant="outline" className="h-4.5 text-[10px]">{t}</Badge>)}
                </div>
              </button>
              <button
                onClick={() => delApunteDoc(d.id)}
                className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500"
              >
                <Trash2 className="h-3 w-3" /> Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
      <NoteEditorDialog open={dialogOpen} onOpenChange={setDialogOpen} folderId={folder?.id ?? null} editingId={editingId} />
    </div>
  );
}

/* ---------- Pestaña: Presupuesto ---------- */
function PresupuestoTab({ project }: { project: Project }) {
  const { updateProject, expensesFor, addExpense, delExpense, projectBudgetRemaining } = useCerebro();
  const expenses = expensesFor(project.id);
  const remaining = projectBudgetRemaining(project.id);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");

  const addRow = () => {
    const n = parseFloat(amount.replace(",", "."));
    if (!title.trim() || !Number.isFinite(n)) return;
    addExpense(project.id, { title: title.trim(), amount: n });
    setTitle("");
    setAmount("");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Presupuesto total (€)</label>
          <Input
            type="number"
            value={project.budgetTotal ?? ""}
            onChange={(e) => updateProject(project.id, { budgetTotal: e.target.value ? parseFloat(e.target.value) : undefined })}
          />
        </div>
        <div className="rounded-lg border bg-card/60 p-2.5">
          <p className="text-[10px] uppercase text-muted-foreground">Gastado</p>
          <p className="text-sm font-semibold">{expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)} €</p>
        </div>
        <div className={cn("rounded-lg border p-2.5", remaining < 0 ? "border-rose-500/40 bg-rose-500/5" : "bg-card/60")}>
          <p className="text-[10px] uppercase text-muted-foreground">Queda</p>
          <p className={cn("text-sm font-semibold", remaining < 0 && "text-rose-500")}>{remaining.toFixed(2)} €</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Concepto del gasto…" className="flex-1" />
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Importe" className="w-28" />
        <Button onClick={addRow} disabled={!title.trim() || !amount.trim()}><Plus className="h-4 w-4" /></Button>
      </div>

      <div className="space-y-1.5">
        {expenses.length === 0 ? <Empty msg="Sin gastos todavía." /> : expenses.map(e => (
          <div key={e.id} className="group flex items-center gap-2 rounded-lg border bg-card/60 p-2 text-xs">
            <Wallet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{e.title}</span>
            <span className="font-medium">{e.amount.toFixed(2)} €</span>
            <span className="text-[10px] text-muted-foreground">{format(new Date(e.date), "d MMM", { locale: es })}</span>
            <button onClick={() => delExpense(e.id)} className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Pestaña: Acumulador de tiempo dedicado ---------- */
function TiempoTab({ project }: { project: Project }) {
  const { updateProjectTimeSchedule, pendingTimeConfirmations, confirmTimeSession, declineTimeSession, projectAccumulatedMinutes } = useCerebro();
  const schedule = project.timeSchedule ?? [];
  const pending = pendingTimeConfirmations(project.id);
  const totalMinutes = projectAccumulatedMinutes(project.id);

  const minutesFor = (weekday: number) => schedule.find(s => s.weekday === weekday)?.minutes ?? 0;
  const setDay = (weekday: number, minutes: number | null) => {
    const next = schedule.filter(s => s.weekday !== weekday);
    if (minutes !== null && minutes > 0) next.push({ weekday, minutes });
    updateProjectTimeSchedule(project.id, next);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card/60 p-4 text-center">
        <p className="text-[11px] uppercase text-muted-foreground">Tiempo acumulado</p>
        <p className="text-2xl font-bold text-primary">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}min</p>
      </div>

      {pending.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
          <p className="text-xs font-semibold text-amber-600">¿Hiciste estas sesiones programadas?</p>
          {pending.map(p => (
            <div key={p.date} className="flex items-center justify-between gap-2 rounded-lg border bg-background/60 p-2 text-xs">
              <span>{format(new Date(p.date), "EEEE d MMM", { locale: es })} · {p.minutes} min</span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => confirmTimeSession(project.id, p.date, p.minutes)}>
                  <Check className="h-3 w-3" /> Sí
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={() => declineTimeSession(project.id, p.date)}>
                  <XIcon className="h-3 w-3" /> No
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Horario semanal</p>
        <div className="space-y-1.5">
          {WEEKDAY_FULL.map((label, weekday) => {
            const m = minutesFor(weekday);
            const active = m > 0;
            return (
              <div key={weekday} className="flex items-center gap-2">
                <button
                  onClick={() => setDay(weekday, active ? null : 30)}
                  className={cn(
                    "w-28 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                    active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground",
                  )}
                >
                  {label}
                </button>
                {active && (
                  <>
                    <Input
                      type="number"
                      value={m}
                      onChange={(e) => setDay(weekday, parseInt(e.target.value, 10) || 0)}
                      className="h-8 w-20 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Pestaña: Diario de retrospectiva ---------- */
function RetrospectivaTab({ project }: { project: Project }) {
  const { retroEntriesFor, addRetroEntry, delRetroEntry } = useCerebro();
  const entries = retroEntriesFor(project.id);
  const [wentWell, setWentWell] = useState("");
  const [toImprove, setToImprove] = useState("");
  const [result, setResult] = useState<RetroResult>("pending");

  const submit = () => {
    if (!wentWell.trim() && !toImprove.trim()) return;
    addRetroEntry(project.id, { wentWell, toImprove, result });
    setWentWell("");
    setToImprove("");
    setResult("pending");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-xl border bg-card/60 p-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">¿Qué salió bien?</label>
          <Textarea value={wentWell} onChange={(e) => setWentWell(e.target.value)} rows={2} placeholder="«Mantuve el hábito por 3 semanas seguidas»" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">¿Qué se puede mejorar?</label>
          <Textarea value={toImprove} onChange={(e) => setToImprove(e.target.value)} rows={2} placeholder="«Los fines de semana me cuesta más sentarme»" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={result} onValueChange={(v) => setResult(v as RetroResult)}>
            <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="achieved">{RETRO_RESULT_LABEL.achieved}</SelectItem>
              <SelectItem value="pending">{RETRO_RESULT_LABEL.pending}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={submit} disabled={!wentWell.trim() && !toImprove.trim()}><Plus className="h-3.5 w-3.5" /> Añadir entrada</Button>
        </div>
      </div>

      <div className="space-y-2">
        {entries.length === 0 ? <Empty msg="Sin entradas todavía." /> : entries.map(e => (
          <div key={e.id} className="group rounded-xl border bg-card/60 p-3 text-xs">
            <div className="mb-1 flex items-center justify-between">
              <Badge variant="outline" className={cn("text-[10px]", e.result === "achieved" ? "border-emerald-500/40 text-emerald-500" : "border-amber-500/40 text-amber-500")}>
                {RETRO_RESULT_LABEL[e.result]}
              </Badge>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{format(new Date(e.createdAt), "d MMM yyyy", { locale: es })}</span>
                <button onClick={() => delRetroEntry(e.id)} className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            {e.wentWell && <p><span className="font-semibold">Bien:</span> {e.wentWell}</p>}
            {e.toImprove && <p className="mt-1"><span className="font-semibold">Mejorar:</span> {e.toImprove}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Pop-up de proyecto abierto (por pestañas) ---------- */
function ProjectModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { projects, updateProject } = useCerebro();
  const project = projects.find(p => p.id === projectId);
  if (!project) return null;

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
          <Tabs defaultValue="resumen" className="w-full">
            <div className="mb-4 -mx-1 overflow-x-auto px-1">
              <TabsList className="inline-flex h-auto w-max gap-1">
                <TabsTrigger value="resumen" className="whitespace-nowrap"><CalendarIcon className="mr-1.5 h-3.5 w-3.5" />Resumen</TabsTrigger>
                <TabsTrigger value="tareas" className="whitespace-nowrap"><ListTodo className="mr-1.5 h-3.5 w-3.5" />Tareas</TabsTrigger>
                <TabsTrigger value="objetivos" className="whitespace-nowrap"><Target className="mr-1.5 h-3.5 w-3.5" />Objetivos</TabsTrigger>
                <TabsTrigger value="notas" className="whitespace-nowrap"><FileText className="mr-1.5 h-3.5 w-3.5" />Notas</TabsTrigger>
                <TabsTrigger value="presupuesto" className="whitespace-nowrap"><Wallet className="mr-1.5 h-3.5 w-3.5" />Presupuesto</TabsTrigger>
                <TabsTrigger value="tiempo" className="whitespace-nowrap"><Clock className="mr-1.5 h-3.5 w-3.5" />Tiempo</TabsTrigger>
                <TabsTrigger value="retro" className="whitespace-nowrap"><BookOpen className="mr-1.5 h-3.5 w-3.5" />Retrospectiva</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="resumen" className="mt-0"><ResumenTab project={project} /></TabsContent>
            <TabsContent value="tareas" className="mt-0"><TareasTab project={project} /></TabsContent>
            <TabsContent value="objetivos" className="mt-0"><ObjetivosTab project={project} /></TabsContent>
            <TabsContent value="notas" className="mt-0"><NotasTab project={project} /></TabsContent>
            <TabsContent value="presupuesto" className="mt-0"><PresupuestoTab project={project} /></TabsContent>
            <TabsContent value="tiempo" className="mt-0"><TiempoTab project={project} /></TabsContent>
            <TabsContent value="retro" className="mt-0"><RetrospectivaTab project={project} /></TabsContent>
          </Tabs>
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
