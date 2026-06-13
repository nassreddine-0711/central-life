import { useState } from "react";
import { motion } from "framer-motion";
import { Award, ListPlus, StickyNote, ListTodo, FileText } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Milestone } from "./KnowledgeContext";
import { useCerebro } from "@/features/cerebro/CerebroContext";
import { TaskRow } from "@/features/cerebro/TaskComponents";
import { NoteCard } from "@/features/cerebro/NoteComponents";

type View = "tasks" | "notes";

export function MilestoneDetailSheet({
  milestone, open, onOpenChange,
}: { milestone: Milestone | null; open: boolean; onOpenChange: (v: boolean) => void; }) {
  const cerebro = useCerebro();
  const [view, setView] = useState<View>("tasks");

  if (!milestone) return null;

  const tasks = cerebro.tasksByMilestone(milestone.id);
  const notes = cerebro.notesByMilestone(milestone.id);
  const { done, total, pct } = cerebro.milestoneProgress(milestone.id);
  const pending = tasks.filter(t => !t.done);
  const completed = tasks.filter(t => t.done);

  const statusLabel: Record<Milestone["status"], string> = {
    completed: "Finalizado", active: "En curso", planned: "Planificado",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="atelier w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--atelier-gold)/0.5)] bg-[hsl(var(--atelier-gold)/0.08)] text-[hsl(var(--atelier-gold))]">
              <Award className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="atelier-serif text-2xl text-[hsl(var(--atelier-ink))]">
                {milestone.title}
              </SheetTitle>
              <SheetDescription className="atelier-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-mute))]">
                {milestone.institution ? `${milestone.institution} · ` : ""}{milestone.year} · {statusLabel[milestone.status]}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Progress */}
        <div className="mt-6 rounded-2xl border border-[hsl(var(--atelier-line))] bg-[hsl(var(--atelier-panel-bg))] p-4">
          <div className="atelier-mono mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-mute))]">
            <span>Progreso de tareas</span>
            <span className="text-[hsl(var(--atelier-neon))]">{done}/{total || 0} · {pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[hsl(var(--atelier-track-bg))] ring-1 ring-inset ring-[hsl(var(--atelier-line))]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--atelier-neon))] to-[hsl(var(--atelier-accent))] shadow-[0_0_12px_hsl(var(--atelier-neon)/0.5)]"
            />
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="mt-5 flex justify-center">
          <div className="atelier-glass inline-flex items-center gap-1 rounded-full p-1">
            {([
              { k: "tasks" as const, label: "Tareas", icon: ListTodo, count: tasks.length },
              { k: "notes" as const, label: "Documentación", icon: FileText, count: notes.length },
            ]).map(t => {
              const Icon = t.icon;
              const active = view === t.k;
              return (
                <button
                  key={t.k}
                  onClick={() => setView(t.k)}
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-4 py-1.5 atelier-mono text-[10px] uppercase tracking-[0.25em] transition-colors",
                    active ? "text-[hsl(var(--atelier-ink))]" : "text-[hsl(var(--atelier-mute))] hover:text-[hsl(var(--atelier-ink))]",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="milestone-detail-pill"
                      className="absolute inset-0 rounded-full border border-[hsl(var(--atelier-accent)/0.5)] bg-[hsl(var(--atelier-accent)/0.12)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="relative h-3 w-3" />
                  <span className="relative">{t.label} ({t.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="mt-5">
          {view === "tasks" ? (
            <div className="space-y-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => cerebro.openTaskDialog({ linkedMilestoneId: milestone.id, defaultTitle: "" })}
              >
                <ListPlus className="mr-2 h-4 w-4" /> Añadir tarea relacionada
              </Button>

              <div>
                <p className="atelier-mono mb-2 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-mute))]">Pendientes ({pending.length})</p>
                {pending.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[hsl(var(--atelier-line))] py-4 text-center text-xs text-[hsl(var(--atelier-mute))]">
                    Sin tareas pendientes.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pending.map(t => (
                      <TaskRow key={t.id} task={t} fading={cerebro.fadingIds.has(t.id)} onToggle={cerebro.toggleTask} onDelete={cerebro.delTask} onUpdate={cerebro.updateTask} />
                    ))}
                  </div>
                )}
              </div>

              {completed.length > 0 && (
                <div>
                  <p className="atelier-mono mb-2 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-mute))]">Completadas ({completed.length})</p>
                  <div className="space-y-2">
                    {completed.map(t => (
                      <TaskRow key={t.id} task={t} onToggle={cerebro.toggleTask} onDelete={cerebro.delTask} onUpdate={cerebro.updateTask} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => cerebro.openNoteSheet({ linkedTo: { kind: "milestone", id: milestone.id, title: milestone.title } })}
              >
                <StickyNote className="mr-2 h-4 w-4" /> Nueva nota / referencia
              </Button>
              {notes.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[hsl(var(--atelier-line))] py-6 text-center text-xs text-[hsl(var(--atelier-mute))]">
                  Aún no hay documentación vinculada a este hito.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {notes.map(n => <NoteCard key={n.id} note={n} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
