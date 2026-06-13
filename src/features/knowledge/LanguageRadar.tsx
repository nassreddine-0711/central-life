import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Languages, Plus, Trash2 } from "lucide-react";
import { useKnowledge, LangLevel, LEVEL_VALUE } from "./KnowledgeContext";

const LEVELS: LangLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function LanguageRadar() {
  const { languages, upsertLanguage, removeLanguage } = useKnowledge();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; current: LangLevel; target: LangLevel; mastered: boolean }>({ name: "", current: "A1", target: "B1", mastered: false });
  const [animKey, setAnimKey] = useState(0);

  const data = useMemo(() => {
    return languages.map((l) => ({
      lang: l.name,
      mastered: l.mastered ? LEVEL_VALUE[l.current] : 0,
      learning: !l.mastered ? LEVEL_VALUE[l.current] : 0,
    }));
  }, [languages]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="atelier-mono text-[10px] uppercase tracking-[0.35em] text-[hsl(var(--atelier-accent))] atelier-text-glow-cyan">
            ◌ Radar Lingüístico
          </p>
          <h3 className="atelier-serif mt-1 text-2xl text-[hsl(var(--atelier-ink))]">Idiomas · MCER A1→C2</h3>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="atelier-mono inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--atelier-accent)/0.4)] bg-[hsl(var(--atelier-accent)/0.08)] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-accent))] transition hover:bg-[hsl(var(--atelier-accent)/0.18)] hover:atelier-glow-cyan"
        >
          <Plus className="h-3 w-3" /> Idioma
        </button>
      </div>

      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-4 overflow-hidden rounded-2xl border border-[hsl(var(--atelier-line))] bg-[hsl(var(--atelier-form-bg))] p-4">
          <div className="grid grid-cols-2 gap-3">
            <input className="atelier-input col-span-2" placeholder="Idioma" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="atelier-input" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value as LangLevel })}>
              {LEVELS.map((l) => <option key={l} value={l}>Actual: {l}</option>)}
            </select>
            <select className="atelier-input" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value as LangLevel })}>
              {LEVELS.map((l) => <option key={l} value={l}>Objetivo: {l}</option>)}
            </select>
            <label className="atelier-mono col-span-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-mute))]">
              <input type="checkbox" checked={form.mastered} onChange={(e) => setForm({ ...form, mastered: e.target.checked })} />
              Marcar como dominado
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="atelier-mono rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--atelier-mute))]">Cancelar</button>
            <button
              onClick={() => {
                if (!form.name.trim()) return;
                upsertLanguage({ name: form.name, current: form.current, target: form.target, mastered: form.mastered });
                setForm({ name: "", current: "A1", target: "B1", mastered: false });
                setOpen(false);
                setAnimKey((k) => k + 1);
              }}
              className="atelier-mono rounded-full bg-[hsl(var(--atelier-accent))] px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] font-medium text-[hsl(var(--atelier-on-accent))] hover:atelier-glow-cyan"
            >
              Guardar
            </button>
          </div>
        </motion.div>
      )}

      <div className="atelier-brackets rounded-2xl border border-[hsl(var(--atelier-line))] bg-[hsl(var(--atelier-radar-bg))] p-4 backdrop-blur-md">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart key={animKey} data={data} outerRadius="78%">
              <PolarGrid stroke="hsl(var(--atelier-accent) / 0.18)" />
              <PolarAngleAxis dataKey="lang" tick={{ fill: "hsl(var(--atelier-ink))", fontSize: 12, fontFamily: "Lora, serif" }} />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 6]}
                tickCount={7}
                tick={{ fill: "hsl(var(--atelier-mute))", fontSize: 10, fontFamily: "Roboto Mono, monospace" }}
                tickFormatter={(v) => (v === 0 ? "" : LEVELS[v - 1])}
                stroke="hsl(var(--atelier-accent) / 0.25)"
              />
              <Radar
                name="Aprendiendo"
                dataKey="learning"
                stroke="hsl(var(--atelier-neon))"
                fill="hsl(var(--atelier-neon))"
                fillOpacity={0.15}
                strokeWidth={1.5}
                isAnimationActive
                animationDuration={1200}
              />
              <Radar
                name="Dominados"
                dataKey="mastered"
                stroke="hsl(var(--atelier-accent))"
                fill="hsl(var(--atelier-accent))"
                fillOpacity={0.22}
                strokeWidth={2}
                isAnimationActive
                animationDuration={1400}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="atelier-mono mt-3 flex flex-wrap items-center gap-4 border-t border-[hsl(var(--atelier-line))] pt-3 text-[10px] uppercase tracking-[0.2em]">
          <span className="inline-flex items-center gap-1.5 text-[hsl(var(--atelier-accent))]">
            <span className="h-2 w-2 rounded-sm bg-[hsl(var(--atelier-accent))] atelier-glow-cyan" /> Dominados
          </span>
          <span className="inline-flex items-center gap-1.5 text-[hsl(var(--atelier-neon))]">
            <span className="h-2 w-2 rounded-sm bg-[hsl(var(--atelier-neon))] atelier-glow-neon" /> Aprendiendo
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[hsl(var(--atelier-mute))]">
            <Languages className="h-3.5 w-3.5" /> {languages.length} lenguas
          </span>
        </div>

        <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {languages.map((l) => (
            <li key={l.id} className="group flex items-center justify-between rounded-lg border border-transparent px-2 py-1.5 text-sm text-[hsl(var(--atelier-ink))] hover:border-[hsl(var(--atelier-line))] hover:bg-[hsl(var(--atelier-accent)/0.04)]">
              <span className="atelier-serif">{l.name}</span>
              <span className="flex items-center gap-2">
                <span className="atelier-mono text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--atelier-mute))]">
                  {l.current}{l.target ? <span className="text-[hsl(var(--atelier-accent))]"> → {l.target}</span> : ""}
                </span>
                <button onClick={() => removeLanguage(l.id)} className="rounded p-0.5 text-[hsl(var(--atelier-mute))] opacity-0 transition hover:text-[hsl(var(--atelier-ink))] group-hover:opacity-100">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
