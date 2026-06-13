import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle, ArrowRight,
  TrendingUp, TrendingDown, Sparkles,
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useFinance, type ImportItem, type Category } from "./FinanceContext";

/* -------------------- Categorization (uses dynamic tags) -------------------- */
function categorize(concept: string, categories: Category[]): string | null {
  const c = concept.toLowerCase();
  for (const cat of categories) {
    if (cat.tags.some((k) => k && c.includes(k.toLowerCase()))) return cat.id;
  }
  return null;
}

/* -------------------- Parsers / cleaners -------------------- */
function cleanAmount(raw: string): number {
  if (raw == null) return NaN;
  const s = String(raw).trim();
  const match = s.replace(/\s/g, "").match(/-?[\d.]*,?\d+/);
  if (!match) return NaN;
  const cleaned = match[0].replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned);
}

function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString();
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return new Date(+y, +mo - 1, +d).toISOString();
  }
  const t = Date.parse(s);
  return isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

function pickField(row: Record<string, any>, candidates: string[]): string {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const found = keys.find((k) => k.trim().toLowerCase() === c.toLowerCase());
    if (found) return String(row[found] ?? "");
  }
  for (const c of candidates) {
    const found = keys.find((k) => k.toLowerCase().includes(c.toLowerCase()));
    if (found) return String(row[found] ?? "");
  }
  return "";
}

interface ParsedRow {
  date: string;
  concept: string;
  amount: number;
  categoryId: string | null;
  hash: string;
}

function rowsToParsed(rows: Record<string, any>[], categories: Category[]): ParsedRow[] {
  const out: ParsedRow[] = [];
  for (const r of rows) {
    const concept = pickField(r, ["concepto", "descripcion", "descripción", "detalle"]).trim();
    const dateRaw = pickField(r, ["fecha", "fecha valor", "fecha operacion", "date"]);
    const amountRaw = pickField(r, ["importe", "amount", "cantidad"]);
    if (!concept && !amountRaw) continue;
    const amount = cleanAmount(amountRaw);
    if (isNaN(amount)) continue;
    const date = parseDate(dateRaw);
    const hash = `${date.slice(0, 10)}|${concept.toLowerCase()}|${amount.toFixed(2)}`;
    // Incomes are auto-distributed by allocation %, no manual category needed
    const categoryId = amount >= 0 ? "all" : categorize(concept, categories);
    out.push({ date, concept, amount, categoryId, hash });
  }
  return out;
}

async function parseFile(file: File): Promise<Record<string, any>[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true, skipEmptyLines: true, delimiter: "",
        transformHeader: (h) => h.trim(),
        complete: (res) => resolve(res.data as Record<string, any>[]),
        error: reject,
      });
    });
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

/* -------------------- Component -------------------- */
export function BankImporter() {
  const { importTransactions, transactions, categories } = useFinance();
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    imported: number; skipped: number; spent: number; income: number;
    topCategoryId: string | null; variation: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const existingHashes = useMemo(
    () => new Set(transactions.map((t) => t.hash).filter(Boolean) as string[]),
    [transactions]
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setError(null);
    setParsing(true);
    try {
      const rawAll: Record<string, any>[] = [];
      for (const f of Array.from(files)) {
        const r = await parseFile(f);
        rawAll.push(...r);
      }
      const parsed = rowsToParsed(rawAll, categories);
      if (!parsed.length) {
        setError("No se han detectado filas válidas. Revisa que el archivo tenga columnas Concepto, Fecha e Importe.");
      }
      setRows(parsed);
    } catch (e: any) {
      setError(e?.message || "Error al leer el archivo");
    } finally {
      setParsing(false);
    }
  };

  const setRowCategory = (i: number, id: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, categoryId: id } : r)));
  };
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const pending = rows.filter((r) => !r.categoryId && !existingHashes.has(r.hash)).length;
  const ready   = rows.filter((r) => r.categoryId && !existingHashes.has(r.hash)).length;
  const dupes   = rows.filter((r) => existingHashes.has(r.hash)).length;

  const confirm = () => {
    const items: ImportItem[] = rows
      .filter((r) => r.categoryId && !existingHashes.has(r.hash))
      .map((r) => ({
        date: r.date, concept: r.concept, amount: r.amount,
        categoryId: r.categoryId as string, hash: r.hash,
      }));
    if (!items.length) return;

    const now = new Date();
    const prevM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthBalanceChange = transactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === prevM.getMonth() && d.getFullYear() === prevM.getFullYear();
      })
      .reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);

    const res = importTransactions(items);

    const spent = items.filter((i) => i.amount < 0).reduce((s, i) => s + Math.abs(i.amount), 0);
    const income = items.filter((i) => i.amount >= 0).reduce((s, i) => s + i.amount, 0);
    const counts: Record<string, number> = {};
    items.forEach((i) => { counts[i.categoryId] = (counts[i.categoryId] || 0) + 1; });
    const topCategoryId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const net = income - spent;
    const variation = prevMonthBalanceChange !== 0
      ? ((net - prevMonthBalanceChange) / Math.abs(prevMonthBalanceChange)) * 100
      : 0;

    setSummary({
      imported: res.imported, skipped: res.skipped + dupes,
      spent, income, topCategoryId, variation,
    });
    setRows([]);
  };

  const close = () => {
    setOpen(false); setRows([]); setError(null); setSummary(null);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fin-mono inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--fin-income)/0.4)] bg-[hsl(var(--fin-income)/0.1)] px-3 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-income))] hover:bg-[hsl(var(--fin-income)/0.2)]"
      >
        <Upload className="h-3.5 w-3.5" /> Importar Movimientos
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fin fixed inset-0 z-50 grid place-items-center bg-[hsl(var(--fin-bg)/0.85)] p-4 backdrop-blur-sm"
            onClick={close}
          >
            <motion.div
              initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
              className="fin-glass fin-brackets relative w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="fin-mono text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--fin-mute))]">
                    Importador · CSV / Excel
                  </p>
                  <h2 className="fin-mono mt-1 text-xl uppercase tracking-[0.2em] text-[hsl(var(--fin-ink))]">
                    Movimientos Bancarios
                  </h2>
                </div>
                <button onClick={close} className="text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-ink))]">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 flex-1 overflow-y-auto pr-2">
                {summary ? (
                  <SummaryView summary={summary} categories={categories} onClose={close} />
                ) : rows.length === 0 ? (
                  <Dropzone
                    drag={drag} setDrag={setDrag} parsing={parsing}
                    inputRef={inputRef} onFiles={handleFiles} error={error}
                  />
                ) : (
                  <PreviewTable
                    rows={rows} existingHashes={existingHashes} categories={categories}
                    onSetCategory={setRowCategory} onRemove={removeRow}
                  />
                )}
              </div>

              {!summary && rows.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--fin-line))] pt-4">
                  <div className="flex flex-wrap items-center gap-3 text-[10px] fin-mono uppercase tracking-widest text-[hsl(var(--fin-mute))]">
                    <span><span className="text-[hsl(var(--fin-income))]">{ready}</span> listos</span>
                    <span><span className="text-[hsl(var(--fin-warn))]">{pending}</span> pendientes</span>
                    <span><span className="text-[hsl(var(--fin-mute))]">{dupes}</span> duplicados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setRows([]); setError(null); }}
                      className="fin-mono rounded-md border border-[hsl(var(--fin-line))] px-3 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-ink))]"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirm}
                      disabled={ready === 0 || pending > 0}
                      className="fin-mono inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--fin-income)/0.5)] bg-[hsl(var(--fin-income)/0.15)] px-4 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-income))] disabled:cursor-not-allowed disabled:opacity-40"
                      title={pending > 0 ? "Asigna categoría a los movimientos pendientes" : ""}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar Importación ({ready})
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* -------------------- Subviews -------------------- */
function Dropzone({
  drag, setDrag, parsing, inputRef, onFiles, error,
}: {
  drag: boolean; setDrag: (b: boolean) => void; parsing: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onFiles: (files: FileList | null) => void;
  error: string | null;
}) {
  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
        className={`relative grid place-items-center rounded-2xl border-2 border-dashed p-12 transition ${
          drag ? "border-[hsl(var(--fin-income))] bg-[hsl(var(--fin-income)/0.08)]"
               : "border-[hsl(var(--fin-line))] bg-[hsl(var(--fin-input-bg))]"
        }`}
      >
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[hsl(var(--fin-income)/0.4)] bg-[hsl(var(--fin-income)/0.1)] shadow-[0_0_30px_hsl(var(--fin-income)/0.25)]">
            <FileSpreadsheet className="h-7 w-7 text-[hsl(var(--fin-income))]" />
          </div>
          <p className="fin-mono mt-4 text-xs uppercase tracking-[0.3em] text-[hsl(var(--fin-ink))]">
            {parsing ? "Analizando archivo..." : "Arrastra tu archivo aquí"}
          </p>
          <p className="fin-mono mt-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
            CSV (separador ;) · XLSX · XLS
          </p>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={parsing}
            className="fin-mono mt-5 inline-flex items-center gap-2 rounded-md border border-[hsl(var(--fin-income)/0.5)] bg-[hsl(var(--fin-income)/0.12)] px-4 py-2.5 text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-income))] hover:bg-[hsl(var(--fin-income)/0.2)] disabled:opacity-40"
          >
            <Upload className="h-3.5 w-3.5" /> Seleccionar archivo
          </button>
          <input
            ref={inputRef}
            type="file" accept=".csv,.txt,.xls,.xlsx" multiple
            onChange={(e) => onFiles(e.target.files)}
            className="hidden"
          />
        </div>
      </div>

      {error && (
        <div className="fin-mono mt-4 flex items-center gap-2 rounded-md border border-[hsl(var(--fin-warn)/0.5)] bg-[hsl(var(--fin-warn)/0.1)] px-3 py-2 text-[11px] text-[hsl(var(--fin-warn))]">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-md border border-[hsl(var(--fin-line))] bg-[hsl(var(--fin-input-bg))] p-3">
          <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
            Formato esperado
          </p>
          <p className="mt-1 text-xs text-[hsl(var(--fin-ink))]">
            Columnas: <span className="fin-mono">Concepto · Fecha · Importe · Saldo</span>
          </p>
        </div>
        <div className="rounded-md border border-[hsl(var(--fin-line))] bg-[hsl(var(--fin-input-bg))] p-3">
          <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
            Categorización
          </p>
          <p className="mt-1 text-xs text-[hsl(var(--fin-ink))]">
            Auto por <span className="fin-mono">tags</span> de tus categorías · Asignación manual para pendientes.
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewTable({
  rows, existingHashes, categories, onSetCategory, onRemove,
}: {
  rows: ParsedRow[]; existingHashes: Set<string>; categories: Category[];
  onSetCategory: (i: number, id: string) => void; onRemove: (i: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[hsl(var(--fin-line))]">
      <table className="w-full text-xs">
        <thead className="bg-[hsl(var(--fin-input-bg))]">
          <tr className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
            <th className="px-3 py-2 text-left">Fecha</th>
            <th className="px-3 py-2 text-left">Concepto</th>
            <th className="px-3 py-2 text-right">Importe</th>
            <th className="px-3 py-2 text-left">Categoría</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const dup = existingHashes.has(r.hash);
            const isExpense = r.amount < 0;
            const bg = dup ? "bg-[hsl(var(--fin-mute)/0.06)] opacity-50"
                           : isExpense ? "bg-[hsl(var(--fin-expense)/0.06)]" : "bg-[hsl(var(--fin-income)/0.06)]";
            return (
              <tr key={i} className={`border-t border-[hsl(var(--fin-line))] ${bg}`}>
                <td className="px-3 py-2 fin-mono text-[hsl(var(--fin-mute))]">
                  {new Date(r.date).toLocaleDateString("es-ES")}
                </td>
                <td className="px-3 py-2 text-[hsl(var(--fin-ink))]">
                  {r.concept}
                  {dup && <span className="fin-mono ml-2 text-[9px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">· duplicado</span>}
                </td>
                <td className={`px-3 py-2 text-right fin-mono font-semibold ${isExpense ? "text-[hsl(var(--fin-expense))]" : "text-[hsl(var(--fin-income))]"}`}>
                  {isExpense ? "−" : "+"}{Math.abs(r.amount).toFixed(2)} €
                </td>
                <td className="px-3 py-2">
                  {!isExpense ? (
                    <span className="fin-mono inline-flex items-center gap-1 rounded border border-[hsl(var(--fin-income)/0.4)] bg-[hsl(var(--fin-income)/0.1)] px-2 py-1 text-[9px] uppercase tracking-widest text-[hsl(var(--fin-income))]">
                      <Sparkles className="h-3 w-3" /> Auto reparto %
                    </span>
                  ) : (
                    <select
                      value={r.categoryId ?? ""}
                      onChange={(e) => onSetCategory(i, e.target.value)}
                      disabled={dup}
                      className={`fin-input fin-mono text-[10px] uppercase tracking-widest ${
                        !r.categoryId ? "border-[hsl(var(--fin-warn)/0.6)] text-[hsl(var(--fin-warn))]" : ""
                      }`}
                    >
                      <option value="" disabled>— Asignar —</option>
                      {categories.filter((c) => c.type !== "income").map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => onRemove(i)} className="text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-expense))]">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SummaryView({
  summary, categories, onClose,
}: {
  summary: {
    imported: number; skipped: number; spent: number; income: number;
    topCategoryId: string | null; variation: number;
  };
  categories: Category[];
  onClose: () => void;
}) {
  const top = summary.topCategoryId ? categories.find((c) => c.id === summary.topCategoryId) : null;
  const positive = summary.variation >= 0;

  return (
    <div>
      <div className="grid place-items-center py-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[hsl(var(--fin-income)/0.4)] bg-[hsl(var(--fin-income)/0.1)] shadow-[0_0_30px_hsl(var(--fin-income)/0.3)]">
          <CheckCircle2 className="h-8 w-8 text-[hsl(var(--fin-income))]" />
        </div>
        <p className="fin-mono mt-3 text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-mute))]">
          Importación Completada
        </p>
        <p className="mt-1 text-sm text-[hsl(var(--fin-ink))]">
          <span className="fin-mono text-[hsl(var(--fin-income))]">{summary.imported}</span> movimientos añadidos
          {summary.skipped > 0 && <> · <span className="fin-mono text-[hsl(var(--fin-mute))]">{summary.skipped}</span> duplicados omitidos</>}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-[hsl(var(--fin-expense)/0.3)] bg-[hsl(var(--fin-expense)/0.05)] p-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-[hsl(var(--fin-expense))]" />
            <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Total gastado</p>
          </div>
          <p className="fin-mono mt-2 text-2xl font-semibold text-[hsl(var(--fin-expense))]">−{summary.spent.toFixed(2)} €</p>
        </div>

        <div className="rounded-lg border border-[hsl(var(--fin-income)/0.3)] bg-[hsl(var(--fin-income)/0.05)] p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[hsl(var(--fin-income))]" />
            <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Total ingresado</p>
          </div>
          <p className="fin-mono mt-2 text-2xl font-semibold text-[hsl(var(--fin-income))]">+{summary.income.toFixed(2)} €</p>
        </div>

        <div className="rounded-lg border border-[hsl(var(--fin-line))] bg-[hsl(var(--fin-input-bg))] p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[hsl(var(--fin-ink))]" />
            <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Categoría más activa</p>
          </div>
          <p className="mt-2 text-lg font-semibold" style={{ color: top ? `hsl(${top.color})` : undefined }}>
            {top?.name ?? "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[hsl(var(--fin-line))] bg-[hsl(var(--fin-input-bg))] p-4">
        <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
          Variación frente al mes anterior
        </p>
        <p className={`fin-mono mt-2 text-xl font-semibold ${positive ? "text-[hsl(var(--fin-income))]" : "text-[hsl(var(--fin-expense))]"}`}>
          {positive ? "▲" : "▼"} {Math.abs(summary.variation).toFixed(1)}%
        </p>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="fin-mono inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--fin-income)/0.5)] bg-[hsl(var(--fin-income)/0.15)] px-4 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-income))]"
        >
          Cerrar <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
