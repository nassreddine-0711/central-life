import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings2, Plus, Trash2, TrendingUp, TrendingDown, Minus,
  HeartPulse, Wallet, Brain, FolderKanban, Plane, Sparkles, Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useFlywheel, ComputedSpoke, SpokeType } from "./FlywheelContext";

const SPOKE_ICON: Record<SpokeType, typeof HeartPulse> = {
  health: HeartPulse,
  finance: Wallet,
  secondBrain: Brain,
  projects: FolderKanban,
  trips: Plane,
  manual: Sparkles,
};

const SPOKE_ROUTE: Partial<Record<SpokeType, string>> = {
  health: "/salud",
  finance: "/finanzas",
  secondBrain: "/cerebro",
  projects: "/cerebro",
  trips: "/viajes",
};

function spinDuration(pct: number) {
  // pct alto → giro rápido (pocos segundos). pct bajo → giro casi detenido.
  return `${Math.max(2.5, 30 - (pct / 100) * 25)}s`;
}

function CircularGauge({ pct, size, strokeWidth, color }: { pct: number; size: number; strokeWidth: number; color: string }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={strokeWidth} fill="none" className="stroke-muted/25" />
      <circle
        cx={size / 2} cy={size / 2} r={r} strokeWidth={strokeWidth} fill="none"
        stroke={color} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
    </svg>
  );
}

function TrendIcon({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (trend === "down") return <TrendingDown className="h-3 w-3 text-rose-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function SpokeWheel({ spoke }: { spoke: ComputedSpoke }) {
  const navigate = useNavigate();
  const Icon = SPOKE_ICON[spoke.type];
  const route = SPOKE_ROUTE[spoke.type];
  return (
    <button
      onClick={() => route && navigate(route)}
      className={cn(
        "group flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm backdrop-blur-sm transition",
        route ? "cursor-pointer hover:border-primary/40 hover:shadow-md" : "cursor-default",
      )}
    >
      <div className="relative grid place-items-center">
        <CircularGauge pct={spoke.pct} size={84} strokeWidth={7} color={spoke.color} />
        <div
          className="absolute inset-0 grid place-items-center"
          style={{ animation: `flywheel-spin ${spinDuration(spoke.pct)} linear infinite` }}
        >
          <Icon className="h-6 w-6" style={{ color: spoke.color }} strokeWidth={1.75} />
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-foreground">{spoke.label}</p>
        <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          {spoke.pct}% <TrendIcon trend={spoke.trend} />
        </p>
      </div>
    </button>
  );
}

export function FlywheelView() {
  const { computed, overallPct, overallTrend, addManualSpoke, updateSpoke, removeSpoke } = useFlywheel();
  const [editing, setEditing] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const enabled = computed.filter((s) => s.enabled);

  return (
    <div className="space-y-6">
      <style>{"@keyframes flywheel-spin { to { transform: rotate(360deg); } }"}</style>
      {/* Volante grande */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-8 shadow-sm backdrop-blur-sm">
        <div className="relative grid place-items-center">
          <CircularGauge pct={overallPct} size={220} strokeWidth={16} color="hsl(var(--primary))" />
          <div
            className="absolute inset-0 grid place-items-center"
            style={{ animation: `flywheel-spin ${spinDuration(overallPct)} linear infinite` }}
          >
            <Gauge className="h-16 w-16 text-primary" strokeWidth={1.25} />
          </div>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-foreground">{overallPct}%</p>
          <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            Momentum de "Mi vida" <TrendIcon trend={overallTrend} />
          </p>
        </div>
      </div>

      {/* Volantes pequeños */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {enabled.map((s) => <SpokeWheel key={s.id} spoke={s} />)}
      </div>

      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)} className="gap-1.5">
          <Settings2 className="h-3.5 w-3.5" /> {editing ? "Cerrar edición" : "Editar volantes"}
        </Button>
      </div>

      {editing && (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Volantes</p>
          <div className="space-y-2">
            {computed.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-background/40 p-2.5">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
                <Input
                  value={s.label}
                  onChange={(e) => updateSpoke(s.id, { label: e.target.value })}
                  className="h-8 max-w-[160px] text-xs"
                />
                {s.type === "trips" && (
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    Viajes/año:
                    <Input
                      type="number" min={1}
                      value={s.target ?? 1}
                      onChange={(e) => updateSpoke(s.id, { target: Math.max(1, Number(e.target.value)) })}
                      className="h-8 w-16 text-xs"
                    />
                  </label>
                )}
                {s.type === "manual" && (
                  <label className="flex flex-1 items-center gap-2 text-[11px] text-muted-foreground">
                    Valor:
                    <input
                      type="range" min={0} max={100}
                      value={s.manualValue ?? 50}
                      onChange={(e) => updateSpoke(s.id, { manualValue: Number(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="w-8 text-right text-foreground">{s.manualValue ?? 50}%</span>
                  </label>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <Switch checked={s.enabled} onCheckedChange={(v) => updateSpoke(s.id, { enabled: v })} />
                  <button
                    onClick={() => removeSpoke(s.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                    title="Eliminar volante"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-border/50 pt-3">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newLabel.trim()) { addManualSpoke(newLabel.trim()); setNewLabel(""); } }}
              placeholder="Nuevo volante manual (ej. Idiomas)…"
              className="h-8 max-w-xs text-xs"
            />
            <Button
              size="sm" variant="outline"
              onClick={() => { if (newLabel.trim()) { addManualSpoke(newLabel.trim()); setNewLabel(""); } }}
              disabled={!newLabel.trim()}
            >
              <Plus className="h-3.5 w-3.5" /> Añadir
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Los volantes de Salud, Finanzas, Second Brain, Proyectos y Viajes se calculan solos a partir de tus datos.
            Un volante manual lo ajustas tú mismo con el deslizador.
          </p>
        </div>
      )}
    </div>
  );
}
