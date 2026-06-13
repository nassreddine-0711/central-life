import { isBefore, startOfDay, isAfter } from "date-fns";
import { Plus, Inbox, Calendar as CalendarIcon, Flag, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { useCerebro } from "../CerebroContext";
import { Section, Empty, TaskList, TaskRow, WeekView, MonthView } from "../TaskComponents";
import { PRIO_LABEL } from "../types";
import { HistorialView } from "../HistorialView";
import { RutinasPanel } from "./RutinasPanel";

export function AccionEnfoquePanel() {
  const { tasks, fadingIds, toggleTask, delTask, updateTask, addTask, openTaskDialog, openQuickCapture } = useCerebro();
  const [quickTask, setQuickTask] = useState("");

  const addQuick = () => {
    if (!quickTask.trim()) return;
    addTask({ title: quickTask.trim(), inbox: true, priority: "med", category: "Otros" });
    setQuickTask("");
  };

  const inbox = tasks.filter(t => t.inbox && !t.done);
  const overdue = tasks.filter(t => !t.done && t.date && isBefore(new Date(t.date), startOfDay(new Date())));

  const pending = tasks.filter(t => !t.done);
  const byPrio = {
    high: pending.filter(t => t.priority === "high"),
    med: pending.filter(t => t.priority === "med"),
    low: pending.filter(t => t.priority === "low"),
  };

  const completed = tasks.filter(t => t.done);
  const uncomplete = (id: string) => updateTask(id, { done: false, completedAt: undefined });

  return (
    <div className="space-y-6">
      {/* Captura rápida */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card/70 p-2 shadow-sm backdrop-blur-sm">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Inbox className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={quickTask}
            onChange={e => setQuickTask(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addQuick()}
            placeholder="Captura rápida — añade ahora, clasifica después…"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button onClick={addQuick} size="sm" disabled={!quickTask.trim()} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4" /> Añadir
          </Button>
          <Button onClick={openQuickCapture} size="sm" variant="outline" className="flex-1 sm:flex-none">
            Captura
          </Button>
        </div>
      </div>

      {/* ── BLOQUE 1: TAREAS ── */}
      <div className="rounded-2xl border bg-card/50 p-4 shadow-sm backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-2">
          <Flag className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Tareas</h2>
        </div>

        <Tabs defaultValue="week" className="w-full">
          <div className="mb-4 -mx-1 overflow-x-auto px-1">
            <TabsList className="inline-flex h-auto w-max gap-1">
              <TabsTrigger value="week" className="whitespace-nowrap">
                <CalendarIcon className="mr-2 h-4 w-4" />Semana
              </TabsTrigger>
              <TabsTrigger value="month" className="whitespace-nowrap">
                <CalendarIcon className="mr-2 h-4 w-4" />Mes
              </TabsTrigger>
              <TabsTrigger value="prio" className="whitespace-nowrap">
                <Flag className="mr-2 h-4 w-4" />Prioridad
              </TabsTrigger>
              <TabsTrigger value="historial" className="whitespace-nowrap">
                <History className="mr-2 h-4 w-4" />Historial
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* LEFT */}
            <div className="min-w-0">
              <TabsContent value="week" className="mt-0 space-y-3">
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => openTaskDialog()}>
                    <Plus className="h-4 w-4" /> Nueva tarea
                  </Button>
                </div>
                <WeekView tasks={tasks} fadingIds={fadingIds} onToggle={toggleTask} onDelete={delTask} onUpdate={updateTask} />
              </TabsContent>

              <TabsContent value="month" className="mt-0">
                <MonthView
                  tasks={tasks}
                  fadingIds={fadingIds}
                  onToggle={toggleTask}
                  onDelete={delTask}
                  onUpdate={updateTask}
                  onNewTask={() => openTaskDialog()}
                />
              </TabsContent>

              <TabsContent value="prio" className="mt-0 space-y-3">
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => openTaskDialog()}>
                    <Plus className="h-4 w-4" /> Nueva tarea
                  </Button>
                </div>
                {(["high", "med", "low"] as const).map(p => (
                  <Section
                    key={p}
                    title={`${PRIO_LABEL[p]} · ${byPrio[p].length}`}
                    accent={p === "high" ? "text-rose-500" : p === "med" ? "text-amber-500" : "text-sky-500"}
                  >
                    {byPrio[p].length === 0
                      ? <Empty msg="Sin pendientes." />
                      : <TaskList tasks={byPrio[p]} fadingIds={fadingIds} onToggle={toggleTask} onDelete={delTask} onUpdate={updateTask} />
                    }
                  </Section>
                ))}
              </TabsContent>

              <TabsContent value="historial" className="mt-0">
                <HistorialView
                  tasks={completed}
                  onUncomplete={uncomplete}
                  onDelete={delTask}
                />
              </TabsContent>
            </div>

            {/* RIGHT: Inbox + Atrasadas */}
            <aside className="space-y-4">
              <Section title={`Inbox (${inbox.length})`} icon={<Inbox className="h-4 w-4" />}>
                {inbox.length === 0 ? <Empty msg="Inbox vacío." /> : (
                  <div className="space-y-2">
                    {inbox.map(t => (
                      <TaskRow key={t.id} task={t} compact fading={fadingIds.has(t.id)} onToggle={toggleTask} onDelete={delTask} onUpdate={updateTask} />
                    ))}
                  </div>
                )}
              </Section>
              {overdue.length > 0 && (
                <Section title={`Atrasadas (${overdue.length})`} accent="text-rose-500">
                  <TaskList tasks={overdue} fadingIds={fadingIds} onToggle={toggleTask} onDelete={delTask} onUpdate={updateTask} />
                </Section>
              )}
            </aside>
          </div>
        </Tabs>
      </div>

      {/* ── BLOQUE 2: RUTINAS SEMANALES ── */}
      <div className="rounded-2xl border bg-card/50 p-4 shadow-sm backdrop-blur-sm">
        <RutinasPanel />
      </div>
    </div>
  );
}