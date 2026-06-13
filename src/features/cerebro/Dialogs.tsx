import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, FileText, Link2, Tag, Trash2, Calendar as CalendarIcon, Bookmark, ListTodo, StickyNote, Repeat, X, Image as ImageIcon, Zap, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Category, Priority, Complexity, CATEGORIES, DEFAULT_NOTE_CAT, uid,
  Recurrence, RecurrenceFreq, WEEKDAY_LABELS, WEEKDAY_FULL, describeRecurrence,
} from "./types";
import { useCerebro } from "./CerebroContext";

/* ---------- Task Dialog ---------- */
export function TaskDialog() {
  const { _taskDialogState: state, _setTaskDialogOpen, addTask, updateTask, tasks } = useCerebro();
  const editing = state.editId ? tasks.find(t => t.id === state.editId) : undefined;
  const isEdit = !!editing;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<Category>("Personal");
  const [priority, setPriority] = useState<Priority>("med");
  const [complexity, setComplexity] = useState<Complexity>("quick");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [recurrence, setRecurrence] = useState<Recurrence | undefined>(undefined);

  useEffect(() => {
    if (state.open) {
      if (editing) {
        setTitle(editing.title);
        setDescription(editing.description ?? "");
        setPhoto(editing.photo);
        setCategory(editing.category);
        setPriority(editing.priority);
        setComplexity(editing.complexity ?? "quick");
        setDate(editing.date ? new Date(editing.date) : undefined);
        setRecurrence(editing.recurrence);
      } else {
        setTitle(state.defaultTitle ?? "");
        setDescription("");
        setPhoto(undefined);
        setCategory("Personal");
        setPriority("med");
        setComplexity("quick");
        setDate(new Date());
        setRecurrence(undefined);
      }
    }
  }, [state.open, state.defaultTitle, editing]);

  const onPhotoFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!title.trim()) return;
    if (isEdit && editing) {
      updateTask(editing.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        photo: photo || undefined,
        category, priority, complexity,
        date: date?.toISOString(),
        recurrence,
      });
    } else {
      addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        photo: photo || undefined,
        category, priority, complexity,
        date: date?.toISOString(),
        inbox: false,
        linkedNoteId: state.linkedNoteId,
        linkedMilestoneId: state.linkedMilestoneId,
        recurrence,
      });
    }
    _setTaskDialogOpen(false);
  };

  return (
    <Dialog open={state.open} onOpenChange={_setTaskDialogOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Editar tarea" : "Nueva tarea"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Título de la tarea" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          <Textarea
            placeholder="Descripción (opcional)…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
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
                  <X className="h-3.5 w-3.5" />
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

          <div className="grid grid-cols-2 gap-2">
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="med">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hacer hoy shortcut */}
          <button
            type="button"
            onClick={() => { setPriority("high"); setDate(new Date()); }}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border p-2.5 text-left text-xs font-medium transition-all",
              priority === "high" && date && new Date(date).toDateString() === new Date().toDateString()
                ? "border-rose-500/60 bg-rose-500/10 text-rose-500"
                : "border-border bg-background text-muted-foreground hover:border-rose-500/40 hover:text-rose-500"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            <span>Hacer hoy</span>
            <span className="ml-auto text-[10px] opacity-60">Prioridad alta · fecha de hoy</span>
          </button>

          {/* Complexity selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tipo de tarea</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setComplexity("quick")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-3 text-left transition-all",
                  complexity === "quick"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                )}
              >
                <Zap className={cn("h-4 w-4 shrink-0", complexity === "quick" ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className="text-xs font-semibold">Rápida</p>
                  <p className="text-[10px] opacity-70">Menos de 30 min</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setComplexity("deep")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-3 text-left transition-all",
                  complexity === "deep"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                )}
              >
                <Brain className={cn("h-4 w-4 shrink-0", complexity === "deep" ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className="text-xs font-semibold">Profunda</p>
                  <p className="text-[10px] opacity-70">Más de 30 min</p>
                </div>
              </button>
            </div>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="h-4 w-4" />
                {date ? format(date, "PPP", { locale: es }) : "Sin fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={setDate} locale={es} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <RecurrencePicker value={recurrence} onChange={setRecurrence} />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => _setTaskDialogOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={!title.trim()}>{isEdit ? "Guardar" : "Crear"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Recurrence Picker ---------- */
function RecurrencePicker({ value, onChange }: { value?: Recurrence; onChange: (r?: Recurrence) => void }) {
  const [open, setOpen] = useState(false);
  const [freq, setFreq] = useState<RecurrenceFreq>(value?.freq ?? "weekly");
  const [weekdays, setWeekdays] = useState<number[]>(value?.weekdays ?? []);

  useEffect(() => {
    if (open) {
      setFreq(value?.freq ?? "weekly");
      setWeekdays(value?.weekdays ?? []);
    }
  }, [open, value]);

  const toggleDay = (i: number) =>
    setWeekdays(d => d.includes(i) ? d.filter(x => x !== i) : [...d, i].sort((a, b) => a - b));

  const apply = () => {
    const rec: Recurrence = { freq };
    if (freq === "weekly" && weekdays.length > 0) rec.weekdays = weekdays;
    onChange(rec);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex-1 justify-start">
            <Repeat className="h-4 w-4" />
            {value ? describeRecurrence(value) : "Repetir tarea"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 space-y-3" align="start">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Frecuencia</label>
            <Select value={freq} onValueChange={v => setFreq(v as RecurrenceFreq)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Cada día</SelectItem>
                <SelectItem value="weekly">Cada semana</SelectItem>
                <SelectItem value="monthly">Cada mes</SelectItem>
                <SelectItem value="yearly">Cada año</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {freq === "weekly" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Días de la semana <span className="text-[10px]">(opcional)</span>
              </label>
              <div className="flex gap-1">
                {WEEKDAY_LABELS.map((lbl, i) => {
                  const active = weekdays.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      title={WEEKDAY_FULL[i]}
                      className={cn(
                        "h-8 w-8 rounded-md border text-xs font-semibold transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-accent"
                      )}
                    >{lbl}</button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Si no seleccionas días, se repetirá cada 7 días.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={apply}>Aplicar</Button>
          </div>
        </PopoverContent>
      </Popover>
      {value && (
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onChange(undefined)} title="Quitar repetición">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/* ---------- Note Sheet (with linkedTo support) ---------- */
export function NoteSheet() {
  const { _noteSheetState: state, _setNoteSheetOpen, addNote, noteCats, addNoteCategory } = useCerebro();
  const [kind, setKind] = useState<"note" | "ref">("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState<string>(DEFAULT_NOTE_CAT);
  const [newCat, setNewCat] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (state.open) {
      setKind("note");
      setContent(""); setUrl(""); setTags(""); setNewCat(""); setPhoto(undefined);
      setTitle(state.linkedTo ? `Notas sobre ${state.linkedTo.title}` : "");
      setCategory(state.defaultCategory ?? DEFAULT_NOTE_CAT);
    }
  }, [state.open, state.linkedTo, state.defaultCategory]);

  const onPhotoFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!title.trim()) return;
    const autoTag = state.linkedTo ? [state.linkedTo.kind] : [];
    addNote({
      id: uid(),
      kind,
      title: title.trim(),
      content: content.trim(),
      url: url.trim() || undefined,
      photo: photo || undefined,
      tags: [...autoTag, ...tags.split(",").map(t => t.trim()).filter(Boolean)],
      category: category || DEFAULT_NOTE_CAT,
      createdAt: new Date().toISOString(),
      linkedTo: state.linkedTo,
    });
    _setNoteSheetOpen(false);
  };

  const handleAddCat = () => {
    const n = newCat.trim();
    if (!n) return;
    addNoteCategory(n);
    setCategory(n);
    setNewCat("");
  };

  return (
    <Sheet open={state.open} onOpenChange={_setNoteSheetOpen}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nueva {kind === "ref" ? "referencia" : "nota"}</SheetTitle>
          {state.linkedTo && (
            <SheetDescription className="flex items-center gap-1.5 pt-1">
              <Bookmark className="h-3.5 w-3.5" />
              Vinculada a <span className="font-medium text-foreground">{state.linkedTo.title}</span>
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <Tabs value={kind} onValueChange={(v) => setKind(v as "note" | "ref")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="note"><FileText className="mr-2 h-4 w-4" />Nota</TabsTrigger>
              <TabsTrigger value="ref"><Link2 className="mr-2 h-4 w-4" />Referencia</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          {kind === "ref" && <Input placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} />}
          <Textarea placeholder={kind === "ref" ? "Por qué lo guardas…" : "Contenido / pensamiento…"} value={content} onChange={e => setContent(e.target.value)} rows={6} />

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
                  <X className="h-3.5 w-3.5" />
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

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Categoría</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {noteCats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input placeholder="Crear nueva categoría…" value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddCat()} />
              <Button type="button" variant="outline" size="sm" onClick={handleAddCat} disabled={!newCat.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Input placeholder="Etiquetas (separadas por coma)" value={tags} onChange={e => setTags(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => _setNoteSheetOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={!title.trim()}>Guardar</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- Manage Categories ---------- */
export function ManageCategoriesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { noteCats, notes, addNoteCategory, deleteNoteCategory } = useCerebro();
  const [name, setName] = useState("");
  const counts = new Map<string, number>();
  notes.forEach(n => counts.set(n.category, (counts.get(n.category) ?? 0) + 1));

  const submit = () => { if (!name.trim()) return; addNoteCategory(name); setName(""); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Gestionar categorías</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Nueva categoría…" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} autoFocus />
            <Button onClick={submit} disabled={!name.trim()}><Plus className="h-4 w-4" /> Añadir</Button>
          </div>
          <div className="space-y-1.5">
            {noteCats.map(c => (
              <div key={c} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{c}</span>
                  <span className="text-xs text-muted-foreground">({counts.get(c) ?? 0})</span>
                  {c === DEFAULT_NOTE_CAT && <Badge variant="secondary" className="h-5 text-[10px]">Por defecto</Badge>}
                </div>
                <Button
                  size="icon" variant="ghost" className="h-7 w-7"
                  disabled={c === DEFAULT_NOTE_CAT}
                  onClick={() => deleteNoteCategory(c)}
                  title={c === DEFAULT_NOTE_CAT ? "Categoría protegida" : "Eliminar (las notas pasan a General)"}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Quick Capture Drawer ---------- */
export function QuickCaptureDrawer() {
  const { _quickOpen, _setQuickOpen, openTaskDialog, openNoteSheet, addTask } = useCerebro();
  const [text, setText] = useState("");

  const quickTask = () => {
    if (!text.trim()) return;
    addTask({ title: text.trim(), inbox: true, priority: "med", category: "Otros" });
    setText("");
    _setQuickOpen(false);
  };

  return (
    <Drawer open={_quickOpen} onOpenChange={_setQuickOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Captura rápida</DrawerTitle>
        </DrawerHeader>
        <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-8">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Tarea al vuelo</label>
            <div className="flex gap-2">
              <Input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && quickTask()}
                placeholder="Escribe y pulsa Enter…"
                autoFocus
              />
              <Button onClick={quickTask} disabled={!text.trim()}><Plus className="h-4 w-4" /></Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Se añade al Inbox para clasificar después.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { _setQuickOpen(false); openTaskDialog(); }}>
              <ListTodo className="h-4 w-4" /> Tarea detallada
            </Button>
            <Button variant="outline" onClick={() => { _setQuickOpen(false); openNoteSheet(); }}>
              <StickyNote className="h-4 w-4" /> Nueva nota
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}