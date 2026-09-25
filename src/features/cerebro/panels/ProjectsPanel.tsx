import { useState } from "react";
import { ArrowLeft, FolderKanban, Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCerebro } from "../CerebroContext";
import { Project, PROJECT_STAGES, ProjectStage, Task } from "../types";
import { Empty } from "../TaskComponents";

export function ProjectsPanel() {
  const { projects, addProject, delProject, projectProgress } = useCerebro();
  const [openId, setOpenId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const active = projects.filter((p) => !p.archived);
  const openProject = active.find((p) => p.id === openId);

  if (openProject) {
    return <ProjectBoard project={openProject} onBack={() => setOpenId(null)} />;
  }

  const create = () => {
    const t = newTitle.trim();
    if (!t) return;
    const p = addProject({ title: t });
    setNewTitle("");
    setOpenId(p.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Nuevo proyecto…"
          className="max-w-xs"
        />
        <Button size="sm" onClick={create} disabled={!newTitle.trim()}>
          <Plus className="h-4 w-4" /> Crear proyecto
        </Button>
      </div>

      {active.length === 0 ? (
        <Empty msg="Sin proyectos todavía. Crea uno arriba, o marca un objetivo/hito de RoadMap como proyecto." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((p) => {
            const { done, total, pct } = projectProgress(p.id);
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => setOpenId(p.id)}
                onKeyDown={(e) => e.key === "Enter" && setOpenId(p.id)}
                className="group cursor-pointer rounded-xl border border-border bg-card/70 p-3 text-left shadow-sm transition hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium leading-tight text-foreground">{p.title}</h4>
                  <button
                    onClick={(e) => { e.stopPropagation(); delProject(p.id); }}
                    className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100"
                    title="Eliminar proyecto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {p.linkedGoalId && (
                  <Badge variant="outline" className="mt-1.5 gap-1 border-primary/30 bg-primary/5 text-[10px] text-primary">
                    <Link2 className="h-2.5 w-2.5" /> Vinculado a RoadMap
                  </Badge>
                )}
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{done}/{total} tareas</span>
                    <span className="font-medium text-foreground">{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectBoard({ project, onBack }: { project: Project; onBack: () => void }) {
  const { projectTasks, addTask, moveTaskStage, delTask, openTaskDialog, delProject } = useCerebro();
  const cards = projectTasks(project.id);
  const [drafts, setDrafts] = useState<Record<ProjectStage, string>>({ backlog: "", doing: "", blocked: "", done: "" });

  const addCard = (stage: ProjectStage) => {
    const t = drafts[stage].trim();
    if (!t) return;
    addTask({ title: t, projectId: project.id, stage, category: "Otros", priority: "med" });
    setDrafts((d) => ({ ...d, [stage]: "" }));
  };

  const removeProject = () => {
    delProject(project.id);
    onBack();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Proyectos
        </Button>
        <h3 className="flex-1 truncate text-sm font-semibold text-foreground">
          <FolderKanban className="mr-1.5 inline h-4 w-4 text-primary" /> {project.title}
        </h3>
        <Button variant="ghost" size="sm" onClick={removeProject} className="text-muted-foreground hover:text-rose-500">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PROJECT_STAGES.map(({ key, label }) => {
          const colCards = cards.filter((c: Task) => (c.stage ?? "backlog") === key);
          return (
            <div key={key} className="flex flex-col gap-2 rounded-xl border border-border bg-card/50 p-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
                <span className="text-[10px] text-muted-foreground">{colCards.length}</span>
              </div>

              <div className="min-h-[32px] space-y-1.5">
                {colCards.map((c) => (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openTaskDialog({ editId: c.id })}
                    onKeyDown={(e) => e.key === "Enter" && openTaskDialog({ editId: c.id })}
                    className="group cursor-pointer rounded-lg border border-border/70 bg-background p-2 text-xs shadow-sm transition hover:border-primary/40"
                  >
                    <p className="line-clamp-2 leading-snug text-foreground">{c.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {PROJECT_STAGES.filter((s) => s.key !== key).map((s) => (
                        <button
                          key={s.key}
                          onClick={(e) => { e.stopPropagation(); moveTaskStage(c.id, s.key); }}
                          title={`Mover a ${s.label}`}
                          className="rounded border border-border/60 px-1.5 py-0.5 text-[9px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                        >
                          → {s.label}
                        </button>
                      ))}
                      <button
                        onClick={(e) => { e.stopPropagation(); delTask(c.id); }}
                        className="ml-auto rounded p-0.5 text-muted-foreground opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <input
                value={drafts[key]}
                onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addCard(key)}
                placeholder="+ tarjeta…"
                className="h-7 w-full rounded-md border border-border/60 bg-background px-2 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
