import { motion } from "framer-motion";
import { Award, GraduationCap, CircleDot, Trash2, Plus, ListPlus, StickyNote, CalendarPlus, ChevronRight, FileText, ListTodo } from "lucide-react";
import { useKnowledge, Milestone } from "./KnowledgeContext";
import { useState } from "react";
import { useCerebro } from "@/features/cerebro/CerebroContext";
import { MilestoneDetailSheet } from "./MilestoneDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function MilestoneIcon({ status }: { status: Milestone["status"] }) {
  if (status === "completed") return <Award className="h-4 w-4" strokeWidth={1.5} />;
  if (status === "active") return <GraduationCap className="h-4 w-4" strokeWidth={1.5} />;
  return <CircleDot className="h-4 w-4" strokeWidth={1.5} />;
}

export function SkillTree() {
  const { milestones, addMilestone, removeMilestone } = useKnowledge();
  const cerebro = useCerebro();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", institution: "", year: "", status: "completed" as Milestone["status"], progress: 0, detail: "" });
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailMilestone = detailId ? milestones.find(m => m.id === detailId) ?? null : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Trayectoria</p>
          <h3 className="mt-0.5 text-xl font-semibold text-foreground">Diplomas & Hitos</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> Hito
        </Button>
      </div>

      {/* Add form */}
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-5 overflow-hidden"
        >
          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="col-span-2 h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Título"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <input
                  className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Institución"
                  value={form.institution}
                  onChange={(e) => setForm({ ...form, institution: e.target.value })}
                />
                <input
                  className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Año (ej. 2024)"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                />
                <select
                  className="col-span-2 h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Milestone["status"] })}
                >
                  <option value="completed">Finalizado</option>
                  <option value="active">En curso</option>
                  <option value="planned">Planificado</option>
                </select>
                {form.status === "active" && (
                  <>
                    <input
                      className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Progreso %"
                      value={form.progress}
                      onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
                    />
                    <input
                      className="h-9 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Detalle (ej. 2/4 años)"
                      value={form.detail}
                      onChange={(e) => setForm({ ...form, detail: e.target.value })}
                    />
                  </>
                )}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!form.title.trim()) return;
                    addMilestone({ title: form.title, institution: form.institution, year: form.year, status: form.status, progress: form.status === "active" ? form.progress : undefined, detail: form.status === "active" ? form.detail : undefined });
                    setForm({ title: "", institution: "", year: "", status: "completed", progress: 0, detail: "" });
                    setOpen(false);
                  }}
                >
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Timeline */}
      <div className="relative pl-6">
        <div className="absolute bottom-2 left-[10px] top-2 w-px bg-gradient-to-b from-primary/40 via-border to-transparent" />
        <div className="space-y-3">
          {milestones.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="relative"
            >
              {/* Timeline dot */}
              <span
                className={`absolute -left-[18px] top-4 flex h-5 w-5 items-center justify-center rounded-full border ${
                  m.status === "completed"
                    ? "border-amber-400/60 bg-amber-400/10 text-amber-400"
                    : m.status === "active"
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              </span>

              <Card className="group border-border/60 bg-card/80 backdrop-blur-sm transition-all hover:border-border hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                        m.status === "completed"
                          ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                          : m.status === "active"
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      <MilestoneIcon status={m.status} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold leading-tight text-foreground">{m.title}</h4>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {m.institution ? `${m.institution} · ` : ""}{m.year}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {m.status === "completed" && (
                            <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-400 text-[10px]">
                              <Award className="mr-1 h-3 w-3" /> Cert.
                            </Badge>
                          )}
                          {m.status === "active" && (
                            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px]">
                              En curso
                            </Badge>
                          )}
                          {m.status === "planned" && (
                            <Badge variant="outline" className="text-[10px]">
                              Planificado
                            </Badge>
                          )}
                          <button
                            onClick={() => removeMilestone(m.id)}
                            className="rounded-full p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress bar (active) */}
                      {m.status === "active" && (
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{m.detail ?? "Progreso"}</span>
                            <span className="font-medium text-primary">{m.progress ?? 0}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${m.progress ?? 0}%` }}
                              transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 + i * 0.05 }}
                              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                            />
                          </div>
                        </div>
                      )}

                      {/* Task progress + notes count */}
                      {(() => {
                        const { done, total, pct } = cerebro.milestoneProgress(m.id);
                        const notesCount = cerebro.notesByMilestone(m.id).length;
                        if (total === 0 && notesCount === 0) return null;
                        return (
                          <div className="mt-3 space-y-1.5">
                            {total > 0 && (
                              <>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1.5"><ListTodo className="h-3 w-3" /> Tareas {done}/{total}</span>
                                  <span className="font-medium text-foreground">{pct}%</span>
                                </div>
                                <div className="h-1 overflow-hidden rounded-full bg-muted">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                                  />
                                </div>
                              </>
                            )}
                            {notesCount > 0 && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <FileText className="h-3 w-3" /> {notesCount} {notesCount === 1 ? "nota" : "notas"} vinculadas
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Action buttons */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => cerebro.openTaskDialog({ linkedMilestoneId: m.id, defaultTitle: "" })}
                        >
                          <ListPlus className="h-3 w-3" /> Tarea
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => cerebro.openNoteSheet({ linkedTo: { kind: "milestone", id: m.id, title: m.title } })}
                        >
                          <StickyNote className="h-3 w-3" /> Nota
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2.5 text-xs text-amber-500 hover:bg-amber-500/10 hover:text-amber-500"
                          onClick={() => cerebro.openTaskDialog({ linkedMilestoneId: m.id, defaultTitle: m.title })}
                        >
                          <CalendarPlus className="h-3 w-3" /> Calendario
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-7 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setDetailId(m.id)}
                        >
                          Detalle <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <MilestoneDetailSheet
        milestone={detailMilestone}
        open={!!detailId}
        onOpenChange={(v) => { if (!v) setDetailId(null); }}
      />
    </div>
  );
}