import { motion } from "framer-motion";
import { Dumbbell, Flame, Trash2 } from "lucide-react";
import { useHealth } from "./HealthContext";
import { ACTIVITY_PRESETS } from "./foodDatabase";
import { NewActivityDialog } from "./CreateDialogs";

const GREEN = "hsl(140 90% 55%)";

export function ActivityCard() {
  const { activities, addActivity, customActivities, removeCustomActivity, hiddenPresets, hidePreset, restorePresets } = useHealth();


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4" style={{ color: GREEN }} />
          <h3 className="text-sm font-semibold uppercase tracking-widest">Actividad</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{activities.length} sesiones</span>
          {hiddenPresets.length > 0 && (
            <button
              onClick={restorePresets}
              className="rounded-md border border-border/40 px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
              title="Restaurar actividades por defecto"
            >
              Restaurar
            </button>
          )}
          <NewActivityDialog />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {!hiddenPresets.includes("gym") && (
          <ActivityButton
            label="Gimnasio"
            kcal={ACTIVITY_PRESETS.gym.kcal}
            icon={<Dumbbell className="h-5 w-5" />}
            onClick={() => addActivity(ACTIVITY_PRESETS.gym)}
            onDelete={() => hidePreset("gym")}
          />
        )}
        {!hiddenPresets.includes("boxing") && (
          <ActivityButton
            label="Boxeo"
            kcal={ACTIVITY_PRESETS.boxing.kcal}
            icon={<Flame className="h-5 w-5" />}
            onClick={() => addActivity(ACTIVITY_PRESETS.boxing)}
            onDelete={() => hidePreset("boxing")}
          />
        )}
        {customActivities.map((a) => (
          <ActivityButton
            key={a.id}
            label={a.type}
            kcal={a.kcal}
            icon={<Flame className="h-5 w-5" />}
            onClick={() => addActivity({ type: a.type, kcal: a.kcal })}
            onDelete={() => removeCustomActivity(a.id)}
          />
        ))}
      </div>

    </motion.div>
  );
}

function ActivityButton({
  label, kcal, icon, onClick, onDelete,
}: { label: string; kcal: number; icon: React.ReactNode; onClick: () => void; onDelete?: () => void }) {
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className="relative w-full overflow-hidden rounded-2xl border border-border/40 bg-background/30 p-4 text-left transition hover:border-[hsl(140_90%_55%_/_0.5)] hover:bg-[hsl(140_90%_55%_/_0.06)]"
      >
        <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[hsl(140_90%_55%_/_0.12)] blur-2xl transition group-hover:bg-[hsl(140_90%_55%_/_0.25)]" />
        <div className="relative flex flex-col gap-2">
          <span style={{ color: GREEN }}>{icon}</span>
          <div>
            <div className="text-sm font-semibold">{label}</div>
            <div className="font-mono text-xs text-muted-foreground">−{kcal} kcal</div>
          </div>
        </div>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute right-2 top-2 rounded-full bg-background/60 p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
          aria-label="Eliminar actividad"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
