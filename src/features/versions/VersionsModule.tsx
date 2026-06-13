import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Plus, Trash2, TrendingUp, TrendingDown, Minus,
  Activity, BookOpen, Plane, Wallet, Target, History, X, Maximize2,
} from "lucide-react";
import {
  Snapshot, loadSnapshots, saveSnapshots, createSnapshot,
  suggestNextLabel, diffPct, listDiff,
} from "./snapshots";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

/* ---------------- trend chip ---------------- */
function Trend({
  delta, suffix = "", invert = false,
}: { delta: number | null; suffix?: string; invert?: boolean }) {
  if (delta === null) return <span className="font-mono text-[10px] text-muted-foreground">—</span>;
  const positive = invert ? delta < 0 : delta > 0;
  const negative = invert ? delta > 0 : delta < 0;
  const Icon = delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const cls = delta === 0
    ? "text-muted-foreground"
    : positive
      ? "text-emerald-500 dark:text-emerald-300"
      : negative
        ? "text-rose-500 dark:text-rose-300"
        : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[10px] font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {delta > 0 ? "+" : ""}{delta}{suffix}
    </span>
  );
}

/* ---------------- metric row (A vs B) ---------------- */
function MetricRow({
  label, a, b, unit = "", invert = false, pct = true,
}: { label: string; a: number | undefined; b: number | undefined; unit?: string; invert?: boolean; pct?: boolean }) {
  const av = a ?? 0, bv = b ?? 0;
  const delta = pct ? diffPct(av, bv) : (bv - av);
  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm tabular-nums text-foreground/80">
        {a !== undefined ? `${av}${unit}` : "—"}
      </span>
      <span className="font-mono text-sm tabular-nums text-foreground font-semibold text-right">
        {b !== undefined ? `${bv}${unit}` : "—"}
      </span>
      <Trend delta={delta} suffix={pct ? "%" : unit} invert={invert} />
    </div>
  );
}

/* ---------------- card shell ---------------- */
function CompareCard({
  title, icon: Icon, accent, children,
}: { title: string; icon: typeof Activity; accent: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-2xl border border-border/60 overflow-hidden"
    >
      <div className="flex items-center gap-3 border-b border-border/50 px-5 py-3" style={{ background: `linear-gradient(90deg, hsl(var(--${accent}) / 0.12), transparent)` }}>
        <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `hsl(var(--${accent}) / 0.18)`, color: `hsl(var(--${accent}))` }}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

/* ============================================================
   Main module
============================================================ */
export function VersionsModule() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => loadSnapshots());
  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");

  const sorted = useMemo(
    () => [...snapshots].sort((x, y) => x.createdAt.localeCompare(y.createdAt)),
    [snapshots],
  );

  // Default selection: oldest vs newest
  useEffect(() => {
    if (sorted.length >= 2 && !aId && !bId) {
      setAId(sorted[0].id);
      setBId(sorted[sorted.length - 1].id);
    } else if (sorted.length === 1 && !bId) {
      setBId(sorted[0].id);
    }
  }, [sorted, aId, bId]);

  const A = sorted.find((s) => s.id === aId);
  const B = sorted.find((s) => s.id === bId);

  const persist = (list: Snapshot[]) => { setSnapshots(list); saveSnapshots(list); };

  const onGenerate = () => {
    const label = labelDraft.trim() || suggestNextLabel(snapshots);
    const snap = createSnapshot(label);
    const next = [...snapshots, snap];
    persist(next);
    setShowLabelInput(false);
    setLabelDraft("");
    if (!aId) setAId(snap.id);
    setBId(snap.id);
  };

  const onDelete = (id: string) => {
    const next = snapshots.filter((s) => s.id !== id);
    persist(next);
    if (aId === id) setAId("");
    if (bId === id) setBId("");
  };

  /* ---------------- empty state ---------------- */
  if (snapshots.length === 0) {
    return (
      <section>
        <Header onGenerate={() => setShowLabelInput(true)} />
        <AnimatePresence>
          {showLabelInput && (
            <LabelInput
              defaultValue={suggestNextLabel(snapshots)}
              value={labelDraft} onChange={setLabelDraft}
              onCancel={() => { setShowLabelInput(false); setLabelDraft(""); }}
              onConfirm={onGenerate}
            />
          )}
        </AnimatePresence>
        <div className="mt-6 glass rounded-2xl border border-dashed border-border p-10 text-center">
          <Camera className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Aún no tienes versiones guardadas. Crea tu primera instantánea para empezar a medir tu evolución.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <Header onGenerate={() => setShowLabelInput(true)} />
      <AnimatePresence>
        {showLabelInput && (
          <LabelInput
            defaultValue={suggestNextLabel(snapshots)}
            value={labelDraft} onChange={setLabelDraft}
            onCancel={() => { setShowLabelInput(false); setLabelDraft(""); }}
            onConfirm={onGenerate}
          />
        )}
      </AnimatePresence>

      {/* Selector + saved list */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <SnapshotSelect
          label="Versión Antigua"
          accent="primary"
          value={aId}
          onChange={setAId}
          snapshots={sorted}
        />
        <SnapshotSelect
          label="Versión Actual"
          accent="accent"
          value={bId}
          onChange={setBId}
          snapshots={sorted}
        />
      </div>

      {/* Saved snapshots strip */}
      <div className="mt-4 flex flex-wrap gap-2">
        {sorted.map((s) => (
          <div key={s.id} className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
            <span className="font-medium">{s.label}</span>
            <span className="text-muted-foreground">· {fmtDate(s.createdAt)}</span>
            <button onClick={() => onDelete(s.id)} className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-rose-500">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Comparison grid */}
      {A && B ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <HealthCompareCard A={A} B={B} />
          <FinanceCompareCard A={A} B={B} />
          <KnowledgeCompareCard A={A} B={B} />
          <TravelCompareCard A={A} B={B} />
          <LegacyCompareCard A={A} B={B} className="lg:col-span-2" />
        </div>
      ) : (
        <div className="mt-8 glass rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {sorted.length < 2
              ? "Necesitas al menos dos versiones para comparar tu evolución."
              : "Selecciona dos versiones arriba para ver la comparativa."}
          </p>
        </div>
      )}
    </section>
  );
}

/* ============================================================
   Header & selectors
============================================================ */
function Header({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Retrospectiva · cada 6 meses
        </span>
        <h2 className="mt-1 text-xl font-semibold md:text-2xl">
          Versiones de <span className="text-gradient">Mí Mismo</span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Captura quién eres hoy y compárate frente a versiones anteriores.
        </p>
      </div>
      <button
        onClick={onGenerate}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition hover:shadow-elegant"
      >
        <Plus className="h-4 w-4" /> Generar nueva versión
      </button>
    </div>
  );
}

function LabelInput({
  defaultValue, value, onChange, onCancel, onConfirm,
}: { defaultValue: string; value: string; onChange: (v: string) => void; onCancel: () => void; onConfirm: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-4 overflow-hidden"
    >
      <div className="glass rounded-xl border border-border p-4 flex flex-wrap items-center gap-3">
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={defaultValue}
          className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button onClick={onConfirm} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
          Guardar instantánea
        </button>
        <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground transition">
          Cancelar
        </button>
      </div>
    </motion.div>
  );
}

function SnapshotSelect({
  label, accent, value, onChange, snapshots,
}: { label: string; accent: string; value: string; onChange: (id: string) => void; snapshots: Snapshot[] }) {
  return (
    <div className="glass rounded-xl border border-border p-4">
      <label className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: `hsl(var(--${accent}))` }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      >
        <option value="">— Seleccionar —</option>
        {snapshots.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label} · {fmtDate(s.createdAt)}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ============================================================
   Compare cards
============================================================ */
function HealthCompareCard({ A, B }: { A: Snapshot; B: Snapshot }) {
  const [lightbox, setLightbox] = useState<{ src: string; label: string } | null>(null);
  return (
    <CompareCard title="Salud y Físico" icon={Activity} accent="primary">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <PhotoSlot label={A.label} photo={A.health.lastPhoto} onOpen={(src) => setLightbox({ src, label: A.label })} />
        <PhotoSlot label={B.label} photo={B.health.lastPhoto} onOpen={(src) => setLightbox({ src, label: B.label })} />
      </div>

      <MetricGroup title="Medidas corporales">
        <MetricRow label="Peso (kg)" a={A.health.lastWeight} b={B.health.lastWeight} invert />
        <MetricRow label="Cintura (cm)" a={A.health.lastWaist} b={B.health.lastWaist} invert />
        {(A.health.lastArmLeft || B.health.lastArmLeft) && (
          <MetricRow label="Brazo Izq. (cm)" a={A.health.lastArmLeft} b={B.health.lastArmLeft} />
        )}
        {(A.health.lastArmRight || B.health.lastArmRight) && (
          <MetricRow label="Brazo Der. (cm)" a={A.health.lastArmRight} b={B.health.lastArmRight} />
        )}
        {(A.health.lastLegs || B.health.lastLegs) && (
          <MetricRow label="Piernas (cm)" a={A.health.lastLegs} b={B.health.lastLegs} />
        )}
      </MetricGroup>

      <MetricGroup title="Calorías y nutrición">
        <MetricRow label="Cal. medias / día" a={A.health.avgKcal} b={B.health.avgKcal} />
        <MetricRow label="Proteína media (g)" a={A.health.avgProtein} b={B.health.avgProtein} />
        <MetricRow label="Carbohidratos (g)" a={A.health.avgCarbs} b={B.health.avgCarbs} />
        <MetricRow label="Grasas (g)" a={A.health.avgFat} b={B.health.avgFat} invert />
      </MetricGroup>

      <MetricGroup title="Hidratación y actividad">
        <MetricRow label="Agua (vasos/día)" a={A.health.avgWater} b={B.health.avgWater} />
        <MetricRow label="Días entrenados" a={A.health.trainedPct} b={B.health.trainedPct} unit="%" />
      </MetricGroup>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[100] grid place-items-center bg-black/85 backdrop-blur-sm p-4 cursor-zoom-out"
          >
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
              className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[90vh] max-w-[90vw] cursor-default"
            >
              <img src={lightbox.src} alt={lightbox.label} className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl" />
              <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white">
                {lightbox.label}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CompareCard>
  );
}

function MetricGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{title}</p>
      <div className="rounded-xl border border-border/50 px-3 py-1">
        {children}
      </div>
    </div>
  );
}

function PhotoSlot({ label, photo, onOpen }: { label: string; photo?: string; onOpen?: (src: string) => void }) {
  const clickable = !!photo && !!onOpen;
  return (
    <div
      className={`group relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-muted/40 ${clickable ? "cursor-zoom-in" : ""}`}
      onClick={() => clickable && onOpen!(photo!)}
    >
      {photo ? (
        <img src={photo} alt={label} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
      ) : (
        <div className="grid h-full place-items-center text-muted-foreground">
          <Camera className="h-6 w-6" />
        </div>
      )}
      {clickable && (
        <div className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100">
          <Maximize2 className="h-3.5 w-3.5" />
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/95 to-transparent p-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/90">{label}</span>
      </div>
    </div>
  );
}

function FinanceCompareCard({ A, B }: { A: Snapshot; B: Snapshot }) {
  return (
    <CompareCard title="Finanzas" icon={Wallet} accent="primary">
      <div className="rounded-xl border border-border/50 px-3 py-1">
        <MetricRow label="Capital ahorrado total (€)" a={A.finance.totalSaved} b={B.finance.totalSaved} />
        <MetricRow label="Ahorrado en 6m (€)" a={A.finance.saved6m} b={B.finance.saved6m} />
        <MetricRow label="Tasa de ahorro" a={A.finance.savingsRate} b={B.finance.savingsRate} unit="%" pct={false} />
        <MetricRow label="Ingresos 6m (€)" a={A.finance.income6m} b={B.finance.income6m} />
        <MetricRow label="Gastos 6m (€)" a={A.finance.expenses6m} b={B.finance.expenses6m} invert />
      </div>
    </CompareCard>
  );
}

function KnowledgeCompareCard({ A, B }: { A: Snapshot; B: Snapshot }) {
  const newBooks = listDiff(
    A.knowledge.readTitles.map((b) => b.title),
    B.knowledge.readTitles.map((b) => b.title),
  ).added;
  return (
    <CompareCard title="Conocimiento" icon={BookOpen} accent="primary">
      <div className="rounded-xl border border-border/50 px-3 py-1 mb-3">
        <MetricRow label="Libros leídos (total)" a={A.knowledge.booksRead} b={B.knowledge.booksRead} pct={false} />
        <MetricRow label="Idiomas registrados" a={A.knowledge.languages.length} b={B.knowledge.languages.length} pct={false} />
        <MetricRow label="Hitos académicos" a={A.knowledge.milestones.length} b={B.knowledge.milestones.length} pct={false} />
      </div>
      {newBooks.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Nuevos libros devorados ({newBooks.length})
          </p>
          <ul className="space-y-1.5">
            {newBooks.slice(0, 6).map((t) => (
              <li key={t} className="text-xs text-foreground/85 flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                {t}
              </li>
            ))}
            {newBooks.length > 6 && (
              <li className="text-[11px] text-muted-foreground">+{newBooks.length - 6} más…</li>
            )}
          </ul>
        </div>
      )}
    </CompareCard>
  );
}

function TravelCompareCard({ A, B }: { A: Snapshot; B: Snapshot }) {
  const newCountries = listDiff(A.travel.countries, B.travel.countries).added;
  return (
    <CompareCard title="Viajes" icon={Plane} accent="accent">
      <div className="rounded-xl border border-border/50 px-3 py-1 mb-3">
        <MetricRow label="Países visitados" a={A.travel.visitedCount} b={B.travel.visitedCount} pct={false} />
        <MetricRow label="Lista de deseos" a={A.travel.wishlistCount} b={B.travel.wishlistCount} pct={false} />
        <MetricRow label="Gasto total (€)" a={A.travel.totalSpend} b={B.travel.totalSpend} />
      </div>
      {newCountries.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Nuevos destinos ({newCountries.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {newCountries.map((c) => (
              <span key={c} className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </CompareCard>
  );
}

function LegacyCompareCard({ A, B, className = "" }: { A: Snapshot; B: Snapshot; className?: string }) {
  const countByLevel = (snap: Snapshot, level: string) =>
    snap.legacy.completed.filter((g) => g.level === level).length;

  const aDreams = countByLevel(A, "dream");
  const bDreams = countByLevel(B, "dream");
  const aObjectives = countByLevel(A, "objective");
  const bObjectives = countByLevel(B, "objective");
  const aMilestones = countByLevel(A, "milestone");
  const bMilestones = countByLevel(B, "milestone");

  const aTitles = A.legacy.completed.map((g) => g.title);
  const bTitles = B.legacy.completed.map((g) => g.title);
  const newOnes = listDiff(aTitles, bTitles).added;

  const newByLevel: Record<string, { title: string; level: string }[]> = {
    dream: [], objective: [], milestone: [],
  };
  newOnes.forEach((t) => {
    const g = B.legacy.completed.find((x) => x.title === t);
    if (!g) return;
    (newByLevel[g.level] ||= []).push({ title: t, level: g.level });
  });

  const levelMeta: Record<string, { label: string; accent: string }> = {
    dream: { label: "Sueños", accent: "bg-fuchsia-500" },
    objective: { label: "Objetivos", accent: "bg-amber-500" },
    milestone: { label: "Hitos", accent: "bg-emerald-500" },
  };

  return (
    <div className={className}>
      <CompareCard title="Legado y Objetivos" icon={Target} accent="primary">
        <div className="rounded-xl border border-border/50 px-3 py-1 mb-4">
          <MetricRow label="Sueños completados" a={aDreams} b={bDreams} pct={false} />
          <MetricRow label="Objetivos completados" a={aObjectives} b={bObjectives} pct={false} />
          <MetricRow label="Hitos completados" a={aMilestones} b={bMilestones} pct={false} />
          <MetricRow label="Total completado" a={A.legacy.completed.length} b={B.legacy.completed.length} pct={false} />
        </div>
        {newOnes.length > 0 ? (
          <div className="space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-500 inline-flex items-center gap-2">
              <History className="h-3 w-3" /> Logros nuevos en este periodo ({newOnes.length})
            </p>
            {(["dream", "objective", "milestone"] as const).map((lvl) => {
              const items = newByLevel[lvl];
              if (!items || items.length === 0) return null;
              const meta = levelMeta[lvl];
              return (
                <div key={lvl}>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    {meta.label} ({items.length})
                  </p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {items.map((it) => (
                      <li key={it.title} className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${meta.accent} shrink-0`} />
                        <p className="text-xs text-foreground/90 break-words min-w-0">{it.title}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Sin nuevos logros entre estas dos versiones.</p>
        )}
      </CompareCard>
    </div>
  );
}
