import { Suspense, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings2, Plus, Trash2, TrendingUp, TrendingDown, Minus,
  HeartPulse, Wallet, Brain, Layers3, Plane, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useFlywheel, ComputedSpoke, SpokeType } from "./FlywheelContext";
import { GearScene } from "./GearScene";

const SPOKE_ROUTE: Partial<Record<SpokeType, string>> = {
  health: "/salud",
  finance: "/finanzas",
  secondBrain: "/cerebro",
  projects: "/cerebro",
  trips: "/viajes",
};

const SPOKE_ICON: Record<SpokeType, typeof HeartPulse> = {
  health: HeartPulse,
  finance: Wallet,
  secondBrain: Brain,
  projects: Layers3,
  trips: Plane,
  manual: Sparkles,
};

function TrendIcon({ trend, className }: { trend: "up" | "down" | "flat"; className?: string }) {
  if (trend === "up") return <TrendingUp className={cn("h-3 w-3 text-emerald-500", className)} />;
  if (trend === "down") return <TrendingDown className={cn("h-3 w-3 text-rose-500", className)} />;
  return <Minus className={cn("h-3 w-3 text-muted-foreground", className)} />;
}

/* ---------- Barra de composición: qué área pesa más en el conjunto ---------- */
function CompositionBar({ spokes }: { spokes: ComputedSpoke[] }) {
  const total = spokes.reduce((s, sp) => s + Math.max(sp.pct, 4), 0) || 1;
  return (
    <div className="w-full max-w-xl space-y-2.5">
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Qué mueve el conjunto
      </p>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
        {spokes.map((s) => (
          <div
            key={s.id}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(Math.max(s.pct, 4) / total) * 100}%`,
              background: s.color,
              opacity: 0.5 + (s.pct / 100) * 0.5,
            }}
            title={`${s.label}: ${s.pct}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {spokes.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
            {s.label} <span className="font-mono text-foreground/80">{s.pct}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Engranaje hero: el motor del conjunto ---------- */
function HeroGear({ pct, trend }: { pct: number; trend: "up" | "down" | "flat" }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="overflow-hidden rounded-full shadow-glow" style={{ width: 240, height: 240 }}>
        <Suspense fallback={<div style={{ width: 240, height: 240 }} />}>
          <GearScene pct={pct} accent="hsl(var(--primary))" size={240} big />
        </Suspense>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Momentum</p>
        <p className="font-mono text-[3rem] font-bold leading-none tracking-tight text-foreground tabular-nums">
          {pct}<span className="text-lg font-semibold text-muted-foreground">%</span>
        </p>
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          "Mi vida" <TrendIcon trend={trend} />
        </p>
      </div>
    </div>
  );
}

/* ---------- Engranaje individual ---------- */
function SpokeGear({ spoke }: { spoke: ComputedSpoke }) {
  const navigate = useNavigate();
  const route = SPOKE_ROUTE[spoke.type];
  const Icon = SPOKE_ICON[spoke.type];
  return (
    <button
      onClick={() => route && navigate(route)}
      className={cn(
        "group flex flex-col items-center gap-2.5 rounded-2xl border border-border/50 bg-card/50 p-4 transition-all",
        route ? "cursor-pointer hover:-translate-y-0.5 hover:border-border hover:bg-card/80 hover:shadow-lg" : "cursor-default",
      )}
    >
      <div className="overflow-hidden rounded-full ring-1 ring-border/40" style={{ width: 92, height: 92 }}>
        <Suspense fallback={<div style={{ width: 92, height: 92 }} />}>
          <GearScene pct={spoke.pct} accent={spoke.color} size={92} />
        </Suspense>
      </div>
      <div className="text-center">
        <p className="flex items-center justify-center gap-1 font-mono text-sm font-bold tabular-nums text-foreground">
          <Icon className="h-3 w-3" style={{ color: spoke.color }} /> {spoke.pct}%
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground">{spoke.label}</p>
        <p className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
          <TrendIcon trend={spoke.trend} />
          {spoke.trend === "up" ? "En subida" : spoke.trend === "down" ? "Frenando" : "Estable"}
        </p>
      </div>
    </button>
  );
}

export function FlywheelView() {
  const { computed, overallPct, overallTrend, addManualSpoke, updateSpoke, removeSpoke } = useFlywheel();
  const [editing, setEditing] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const enabled = useMemo(() => computed.filter((s) => s.enabled), [computed]);

  return (
    <div className="space-y-8">
      {/* Panel hero */}
      <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-b from-card/90 via-card/60 to-background/80 px-6 py-10 shadow-inner sm:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-40"
          style={{ background: "radial-gradient(ellipse 60% 100% at 50% 0%, hsl(var(--primary-glow) / 0.35), transparent)" }}
        />
        <div className="relative flex flex-col items-center gap-8">
          <HeroGear pct={overallPct} trend={overallTrend} />
          <CompositionBar spokes={enabled} />
        </div>
      </div>

      {/* Engranajes individuales */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {enabled.map((s) => <SpokeGear key={s.id} spoke={s} />)}
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
