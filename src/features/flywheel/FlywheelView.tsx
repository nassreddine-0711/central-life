import { useMemo, useState } from "react";
import { Settings2, Plus, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useFlywheel, ComputedSpoke } from "./FlywheelContext";
import { MachineScene } from "./MachineScene";

function TrendIcon({ trend, className }: { trend: "up" | "down" | "flat"; className?: string }) {
  if (trend === "up") return <TrendingUp className={cn("h-3 w-3 text-emerald-500", className)} />;
  if (trend === "down") return <TrendingDown className={cn("h-3 w-3 text-rose-500", className)} />;
  return <Minus className={cn("h-3 w-3 text-muted-foreground", className)} />;
}

/* ---------- Barra de composición: qué área pesa más en el conjunto ---------- */
function CompositionBar({ spokes }: { spokes: ComputedSpoke[] }) {
  const total = spokes.reduce((s, sp) => s + Math.max(sp.pct, 4), 0) || 1;
  return (
    <div className="mx-auto w-full max-w-xl space-y-2.5">
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

export function FlywheelView() {
  const { computed, overallPct, overallTrend, addManualSpoke, updateSpoke, removeSpoke } = useFlywheel();
  const [editing, setEditing] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const enabled = useMemo(() => computed.filter((s) => s.enabled), [computed]);

  return (
    <div className="space-y-6">
      {/* La máquina: núcleo "Life Integrity" + engranajes periféricos conectados */}
      <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-black shadow-glow">
        <MachineScene overallPct={overallPct} spokes={enabled} height={520} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-6 pb-6 pt-16">
          <div className="mx-auto flex max-w-md flex-col items-center gap-1 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-300/80">Life Integrity</span>
            <p className="font-mono text-3xl font-bold leading-none tracking-tight text-white tabular-nums">
              {overallPct}<span className="text-base font-semibold text-white/60">%</span>
            </p>
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-white/60">
              "Mi vida" <TrendIcon trend={overallTrend} className={overallTrend === "flat" ? "text-white/50" : undefined} />
            </p>
          </div>
        </div>
      </div>

      <CompositionBar spokes={enabled} />

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
