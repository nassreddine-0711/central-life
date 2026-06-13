import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Wallet, TrendingUp, TrendingDown, Plus, Minus, Settings2,
  ArrowRight, History, LayoutGrid, Trash2, PiggyBank, X
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useFinance, getCategoryIcon, type Category } from "@/features/finance/FinanceContext";
import { CategoryManager, AllocationEditor } from "@/features/finance/CategoryManager";
import { BankImporter } from "@/features/finance/BankImporter";
import "@/features/finance/finance.css";

function fmt(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/* ----------------------------- Quick Income ----------------------------- */
function QuickIncome() {
  const { addIncome, categories } = useFinance();
  const [value, setValue] = useState("");
  const amount = Number(value) || 0;
  const allocated = categories.filter((c) => (c.type === "savings" || c.type === "available") && c.allocation > 0);

  return (
    <div className="fin-glass fin-brackets relative p-4 sm:p-6 border">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--fin-income))] shadow-[0_0_10px_hsl(var(--fin-income))]" />
          <p className="fin-mono truncate text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[hsl(var(--fin-mute))]">
            Ingreso Rápido · Repartidor Automático
          </p>
        </div>
        <TrendingUp className="h-4 w-4 shrink-0 text-[hsl(var(--fin-income))]" />
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="flex items-baseline gap-2 lg:w-56 lg:shrink-0">
          <span className="fin-mono text-xl sm:text-2xl text-[hsl(var(--fin-mute))]">€</span>
          <input
            type="number" inputMode="decimal" placeholder="0" value={value}
            onChange={(e) => setValue(e.target.value)}
            className="fin-mono w-full min-w-0 bg-transparent text-3xl sm:text-4xl font-semibold tracking-tight text-[hsl(var(--fin-ink))] outline-none placeholder:text-[hsl(var(--fin-mute))/0.3]"
          />
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          {allocated.map((c) => {
            const part = (amount * c.allocation) / 100;
            return (
              <div
                key={c.id} className="min-w-0 rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3"
                style={{ borderColor: `hsl(${c.color} / 0.3)`, background: `hsl(${c.color} / 0.08)` }}
              >
                <p className="fin-mono truncate text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
                  {c.name} · {c.allocation}%
                </p>
                <p className="fin-mono mt-1.5 text-lg sm:text-xl font-semibold tabular-nums break-all" style={{ color: `hsl(${c.color})` }}>
                  +{fmt(part)} €
                </p>
              </div>
            );
          })}
        </div>

        <button
          disabled={amount <= 0} onClick={() => { addIncome(amount); setValue(""); }}
          className="fin-mono inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[hsl(var(--fin-income)/0.5)] bg-[hsl(var(--fin-income)/0.12)] px-5 py-2.5 text-xs uppercase tracking-[0.3em] text-[hsl(var(--fin-income))] transition hover:bg-[hsl(var(--fin-income)/0.2)] disabled:cursor-not-allowed disabled:opacity-40 lg:w-52 lg:shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Ingresar
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Year Select ------------------------------ */
function YearSelect({ value, years, onChange }: {
  value: number; years: number[]; onChange: (y: number) => void; color: string;
}) {
  return (
    <select
      value={value} onChange={(e) => onChange(Number(e.target.value))} onClick={(e) => e.stopPropagation()}
      className="fin-mono rounded-md border border-[hsl(var(--fin-line))] bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-ink))] focus:outline-none"
    >
      {years.map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  );
}

/* ------------------------------ Box Card ------------------------------ */
function BoxCard({ category, onClick, onSpend, onIncome }: {
  category: Category;
  onClick: () => void;
  onSpend: (id: string) => void;
  onIncome: (id: string) => void;
}) {
  const { transactions, balances } = useFinance();
  const Icon = getCategoryIcon(category.icon);
  const isSavings = category.type === "savings" || category.type === "available";
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const availableYears = useMemo(() => {
    const ys = new Set<number>();
    ys.add(new Date().getFullYear());
    for (const t of transactions) {
      if (t.type === "expense" && t.categoryId === category.id) ys.add(new Date(t.date).getFullYear());
      else if (t.type === "income" && t.split && t.split[category.id]) ys.add(new Date(t.date).getFullYear());
    }
    return Array.from(ys).sort((a, b) => b - a);
  }, [transactions, category.id]);

  const { displayValue, referenceMax, monthRemaining, monthSpent, totalSpent, assignedTotal } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    if (isSavings) {
      return {
        displayValue: balances[category.id] || 0, referenceMax: category.budget || 1,
        monthRemaining: 0, monthSpent: 0, totalSpent: 0, assignedTotal: 0,
      };
    }

    let spentMonth = 0, spentYear = 0;
    for (const t of transactions) {
      const d = new Date(t.date);
      const ty = d.getFullYear();
      if (t.type === "expense" && t.categoryId === category.id) {
        if (ty === selectedYear) spentYear += t.amount;
        if (d.getMonth() === currentMonth && ty === currentYear) spentMonth += t.amount;
      }
    }

    let elapsedMonths = 12;
    if (selectedYear === currentYear) {
      elapsedMonths = currentMonth + 1;
    } else if (selectedYear > currentYear) {
      elapsedMonths = 0;
    }

    const calculatedAssignedYear = category.budget * elapsedMonths;
    const remaining = +(category.budget - spentMonth).toFixed(2);

    return {
      displayValue: remaining, referenceMax: category.budget || 1,
      monthRemaining: remaining, monthSpent: +spentMonth.toFixed(2),
      totalSpent: +spentYear.toFixed(2), assignedTotal: calculatedAssignedYear,
    };
  }, [transactions, balances, category, isSavings, selectedYear]);

  const pct = Math.max(0, Math.min(100, (balances[category.id] / (category.budget || 1)) * 100));
  const monthBudget = category.budget || 0;
  const over = !isSavings && monthBudget > 0 && monthSpent > monthBudget;
  const isUnplanned = !isSavings && monthBudget <= 0;

  return (
    <motion.div
      whileHover={{ y: -3 }} className="fin-glass fin-brackets group relative cursor-pointer p-4 sm:p-5 border flex flex-col justify-between"
      style={{ boxShadow: balances[category.id] > 0 ? `0 0 30px hsl(${category.color} / 0.15)` : undefined }}
      onClick={onClick}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
              style={{ background: `hsl(${category.color} / 0.15)`, color: `hsl(${category.color})` }}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-semibold truncate text-[hsl(var(--fin-ink))]">{category.name}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end shrink-0">
            {!isSavings && (
              <button
                onClick={(e) => { e.stopPropagation(); onSpend(category.id); }}
                className="shrink-0 opacity-100 sm:opacity-0 transition sm:group-hover:opacity-100"
              >
                <span className="fin-mono inline-flex items-center gap-1 rounded-md border border-[hsl(var(--fin-expense)/0.5)] bg-[hsl(var(--fin-expense)/0.1)] px-2 py-1 text-[9px] uppercase tracking-widest text-[hsl(var(--fin-expense))]">
                  <Minus className="h-3 w-3" /> Gasto
                </span>
              </button>
            )}
            {isSavings && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onSpend(category.id); }}
                  className="shrink-0 opacity-100 sm:opacity-0 transition sm:group-hover:opacity-100"
                >
                  <span className="fin-mono inline-flex items-center gap-1 rounded-md border border-[hsl(var(--fin-expense)/0.5)] bg-[hsl(var(--fin-expense)/0.1)] px-2 py-1 text-[9px] uppercase tracking-widest text-[hsl(var(--fin-expense))]">
                    <Minus className="h-3 w-3" /> Gasto
                  </span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onIncome(category.id); }}
                  className="shrink-0 opacity-100 sm:opacity-0 transition sm:group-hover:opacity-100"
                >
                  <span className="fin-mono inline-flex items-center gap-1 rounded-md border border-[hsl(var(--fin-income)/0.5)] bg-[hsl(var(--fin-income)/0.1)] px-2 py-1 text-[9px] uppercase tracking-widest text-[hsl(var(--fin-income))]">
                    <Plus className="h-3 w-3" /> Ingreso
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {isSavings && category.image && (
          <div className="mt-3 w-full h-24 overflow-hidden rounded-xl border border-white/5">
            <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="mt-4 sm:mt-5">
          <p className="fin-mono text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--fin-mute))]">
            {isSavings ? "Saldo Disponible Real" : isUnplanned ? "Gastado este mes" : "Disponible este mes"}
          </p>
          <div className="mt-1 flex items-baseline gap-1 flex-wrap">
            <span
              className="fin-mono text-3xl sm:text-4xl font-semibold tabular-nums break-all leading-tight"
              style={{ color: isSavings ? `hsl(${category.color})` : isUnplanned ? `hsl(var(--fin-expense))` : monthRemaining < 0 ? `hsl(var(--fin-expense))` : `hsl(${category.color})` }}
            >
              {fmt(isSavings ? balances[category.id] : isUnplanned ? monthSpent : monthRemaining)}
            </span>
            <span className="fin-mono text-base text-[hsl(var(--fin-mute))]">€</span>
          </div>
        </div>

        {isUnplanned ? (
          <div className="mt-4 rounded-xl border border-[hsl(var(--fin-line))] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="fin-mono text-[11px] uppercase tracking-[0.25em] text-[hsl(var(--fin-mute))]">Histórico</p>
              <YearSelect value={selectedYear} years={availableYears} onChange={setSelectedYear} color={category.color} />
            </div>
            <div className="mt-3">
              <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Total gastado · {selectedYear}</p>
              <p className="fin-mono text-lg font-semibold text-[hsl(var(--fin-ink))]">{fmt(totalSpent)} €</p>
            </div>
          </div>
        ) : !isSavings ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="fin-mono text-[11px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Presupuesto mes</p>
              <p className="fin-mono text-[11px]" style={{ color: over ? `hsl(var(--fin-expense))` : `hsl(var(--fin-ink))` }}>
                {fmt(monthSpent)} / {fmt(monthBudget)} €
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${over ? 100 : Math.min(100, (monthSpent / (monthBudget || 1)) * 100)}%`,
                  background: over ? `hsl(var(--fin-expense))` : `hsl(${category.color})`
                }}
              />
            </div>
          </div>
        ) : (
          category.budget > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="fin-mono text-[11px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Meta · {fmt(category.budget)} €</p>
                <p className="fin-mono text-[11px] text-[hsl(var(--fin-mute))]">{pct.toFixed(0)}%</p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `hsl(${category.color})` }} />
              </div>
            </div>
          )
        )}

        {!isSavings && !isUnplanned && (assignedTotal > 0 || totalSpent > 0) && (
          <div className="mt-4 rounded-xl border border-[hsl(var(--fin-line))] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="fin-mono text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--fin-mute))]">Bote Acumulado Progresivo</p>
              <YearSelect value={selectedYear} years={availableYears} onChange={setSelectedYear} color={category.color} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-white/[0.04] p-1.5">
                <p className="fin-mono text-[8px] uppercase text-[hsl(var(--fin-mute))]">Asignado</p>
                <p className="fin-mono font-semibold text-xs text-[hsl(var(--fin-ink))]">{fmt(assignedTotal)}€</p>
              </div>
              <div className="rounded-lg bg-white/[0.04] p-1.5">
                <p className="fin-mono text-[8px] uppercase text-[hsl(var(--fin-mute))]">Gastado</p>
                <p className="fin-mono font-semibold text-xs text-[hsl(var(--fin-expense))]">{fmt(totalSpent)}€</p>
              </div>
              <div className="rounded-lg bg-white/[0.04] p-1.5">
                <p className="fin-mono text-[8px] uppercase text-[hsl(var(--fin-mute))]">Saldo</p>
                <p className="fin-mono font-semibold text-xs text-[hsl(var(--fin-income))]">{fmt(assignedTotal - totalSpent)}€</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------ Modals ------------------------------ */
function ExpenseModal({ categoryId, onClose }: { categoryId: string; onClose: () => void }) {
  const { addExpense, categories } = useFinance();
  const cat = categories.find((c) => c.id === categoryId);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  if (!cat) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="fin-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-expense))]">Registrar Gasto · {cat.name}</p>
        <input type="number" placeholder="Importe €" value={amount} onChange={(e) => setAmount(e.target.value)} className="fin-input fin-mono text-xl mt-3" />
        <input placeholder="Concepto" value={note} onChange={(e) => setNote(e.target.value)} className="fin-input mt-2" />
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="fin-mono rounded-md border px-3 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Cancelar</button>
          <button onClick={() => { addExpense(categoryId, Number(amount) || 0, note); onClose(); }} className="fin-mono rounded-md bg-red-500 text-white px-4 py-2 text-[10px] uppercase tracking-widest">Restar</button>
        </div>
      </div>
    </div>
  );
}

function IncomeModal({ categoryId, onClose }: { categoryId: string; onClose: () => void }) {
  const { addIncome, categories } = useFinance();
  const cat = categories.find((c) => c.id === categoryId);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  if (!cat) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="fin-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-income))]">Ingreso Directo · {cat.name}</p>
        <input type="number" placeholder="Importe €" value={amount} onChange={(e) => setAmount(e.target.value)} className="fin-input fin-mono text-xl mt-3" />
        <input placeholder="Concepto" value={note} onChange={(e) => setNote(e.target.value)} className="fin-input mt-2" />
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="fin-mono rounded-md border px-3 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Cancelar</button>
          <button onClick={() => { addIncome(Number(amount) || 0, note, categoryId); onClose(); }} className="fin-mono rounded-md bg-emerald-500 text-white px-4 py-2 text-[10px] uppercase tracking-widest">Inyectar</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Charts ------------------------------ */
function MonthlyChart() {
  const { transactions } = useFinance();
  const data = useMemo(() => {
    const map = new Map<string, { month: string; income: number; expense: number }>();
    for (const t of transactions) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, { month: key, income: 0, expense: 0 });
      const row = map.get(key)!;
      if (t.type === "income") row.income += t.amount; else row.expense += t.amount;
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [transactions]);

  return (
    <div className="fin-glass fin-brackets p-5 w-full">
      <p className="fin-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-mute))] font-semibold">
        Ingresos vs Gastos · Últimos 6 meses
      </p>
      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="hsl(var(--fin-line))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="hsl(var(--fin-mute))" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
            <YAxis stroke="hsl(var(--fin-mute))" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
            <Tooltip contentStyle={{ background: "white", border: "1px solid hsl(var(--fin-line))", fontSize: 12 }} />
            <Bar dataKey="income" fill="hsl(var(--fin-income))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" fill="hsl(var(--fin-expense))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ExpensePie() {
  const { transactions, categories } = useFinance();
  const data = useMemo(() => {
    const now = new Date();
    const m = now.getMonth(), y = now.getFullYear();
    const totals: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type !== "expense" || t.categoryId === "all") continue;
      const d = new Date(t.date);
      if (d.getMonth() !== m || d.getFullYear() !== y) continue;
      totals[t.categoryId] = (totals[t.categoryId] || 0) + t.amount;
    }
    return categories
      .map((c) => ({ name: c.name, value: totals[c.id] || 0, color: c.color, key: c.id }))
      .filter((d) => d.value > 0);
  }, [transactions, categories]);

  return (
    <div className="fin-glass fin-brackets p-5 w-full">
      <p className="fin-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-mute))] font-semibold">
        Distribución del Gasto · Mes Actual
      </p>
      <div className="mt-4 h-56 w-full">
        {data.length === 0 ? (
          <div className="grid h-full place-items-center fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
            Sin gastos registrados este mes
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={4}>
                {data.map((d) => <Cell key={d.key} fill={`hsl(${d.color})`} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "white", border: "1px solid hsl(var(--fin-line))", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ History List ------------------------------ */
function HistoryList() {
  const { transactions, categories, removeTransaction, removeMonth } = useFinance();
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const [filter, setFilter] = useState<"all" | "imported" | "manual">("all");
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  
  const [monthToDelete, setMonthToDelete] = useState<{ key: string; label: string } | null>(null);
  const [confirmInput, setConfirmInput] = useState("");

  const handleDelete = (id: string, note?: string) => {
    if (window.confirm(`¿Borrar movimiento "${note || id}"?`)) removeTransaction(id);
  };

  const handleExecuteDeleteMonth = () => {
    if (confirmInput !== "BORRAR" || !monthToDelete) return;
    const [year, month] = monthToDelete.key.split("-").map(Number);
    removeMonth(year, month - 1);
    setMonthToDelete(null);
    setConfirmInput("");
  };

  const filtered = useMemo(() => {
    if (filter === "imported") return transactions.filter((t) => t.imported);
    if (filter === "manual") return transactions.filter((t) => !t.imported);
    return transactions;
  }, [transactions, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; items: typeof filtered; income: number; expense: number }>();
    const monthFmt = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
    for (const t of filtered) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, { label: monthFmt.format(d), items: [], income: 0, expense: 0 });
      const g = map.get(key)!;
      g.items.push(t);
      if (t.type === "income") g.income += t.amount; else g.expense += t.amount;
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div className="fin-glass fin-brackets p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[hsl(var(--fin-mute))]" />
          <p className="fin-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-mute))]">Resumen Mensual de Flujos</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setFilter("all")} className={`fin-mono rounded-md border px-2 py-1 text-[9px] uppercase tracking-widest ${filter === "all" ? "border-black text-black" : "text-neutral-400"}`}>Todos</button>
          <button onClick={() => setFilter("imported")} className={`fin-mono rounded-md border px-2 py-1 text-[9px] uppercase tracking-widest ${filter === "imported" ? "border-black text-black" : "text-neutral-400"}`}>Importados</button>
          <button onClick={() => setFilter("manual")} className={`fin-mono rounded-md border px-2 py-1 text-[9px] uppercase tracking-widest ${filter === "manual" ? "border-black text-black" : "text-neutral-400"}`}>Manuales</button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {grouped.map(([key, g]) => {
          const open = openMonths[key] ?? false;
          return (
            <div key={key} className="rounded-md border border-[hsl(var(--fin-line))]">
              <div className="flex w-full items-center justify-between px-3 py-2 bg-neutral-50/50">
                <button onClick={() => setOpenMonths(p => ({ ...p, [key]: !open }))} className="flex items-center gap-2 text-left flex-1 font-mono text-xs uppercase tracking-wider">
                  <span>{open ? "▼" : "▶"}</span>
                  <span>{g.label}</span>
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-emerald-600 font-semibold">+{fmt(g.income)}€</span>
                  <span className="text-xs font-mono text-red-500 font-semibold">-{fmt(g.expense)}€</span>
                  <button
                    onClick={() => setMonthToDelete({ key, label: g.label })}
                    className="p-1 text-red-400 hover:text-red-600 transition"
                    title="Borrar mes entero"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {open && (
                <div className="divide-y border-t px-3 text-xs font-mono">
                  {g.items.map((t) => {
                    const cat = t.categoryId !== "all" ? catMap[t.categoryId] : null;
                    return (
                      <div key={t.id} className="flex items-center justify-between py-2 group">
                        <div>
                          <p className="text-neutral-800 font-medium">{t.note || (t.type === "income" ? "Ingreso" : `Gasto · ${cat?.name ?? ""}`)}</p>
                          <p className="text-[10px] text-neutral-400">{new Date(t.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={t.type === "income" ? "text-emerald-600" : "text-red-500"}>
                            {t.type === "income" ? "+" : "-"}{fmt(t.amount)}€
                          </span>
                          <button onClick={() => handleDelete(t.id, t.note)} className="opacity-0 group-hover:opacity-100 transition">
                            <X className="h-3 w-3 text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de confirmación BORRAR */}
      <AnimatePresence>
        {monthToDelete && (
          <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 backdrop-blur-xs">
            <div className="bg-white p-6 rounded-xl border max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-red-600">⚠️ Confirmación Crítica</h3>
              <p className="text-xs text-neutral-600 mt-2">Estás a punto de eliminar todos los movimientos de <b>{monthToDelete.label}</b>. Esta acción recalculará los saldos de tus cajas.</p>
              <p className="text-xs text-neutral-500 mt-3 font-mono">Escribe <b>BORRAR</b> abajo para autorizar:</p>
              <input
                value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Escribe BORRAR" className="fin-input mt-2 font-mono text-center uppercase tracking-widest text-red-600 border-red-300 outline-none"
              />
              <div className="flex justify-end gap-2 mt-4 text-xs font-mono">
                <button onClick={() => { setMonthToDelete(null); setConfirmInput(""); }} className="px-3 py-1.5 border rounded">Cancelar</button>
                <button
                  disabled={confirmInput !== "BORRAR"} onClick={handleExecuteDeleteMonth}
                  className="px-4 py-1.5 bg-red-600 text-white rounded disabled:opacity-40 font-semibold"
                >
                  Eliminar todo
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */
export default function Finanzas() {
  const navigate = useNavigate();
  const [expenseCat, setExpenseCat] = useState<string | null>(null);
  const [directIncomeCat, setDirectIncomeCat] = useState<string | null>(null);
  const [allocation, setAllocation] = useState(false);
  const [manager, setManager] = useState(false);
  const { transactions, categories, balances } = useFinance();

  const expenseCategories = useMemo(() => categories.filter((c) => c.type === "expense"), [categories]);
  const savingsCategories = useMemo(() => categories.filter((c) => c.type === "savings" || c.type === "available"), [categories]);

  const totalNet = useMemo(() => {
    let total = 0;
    for (const c of categories) {
      if (c.type === "savings" || c.type === "available") {
        total += balances[c.id] || 0;
      }
    }
    return +total.toFixed(2);
  }, [balances, categories]);

  const monthIncome = useMemo(() => {
    const now = new Date(); const m = now.getMonth(), y = now.getFullYear();
    return transactions.filter(t => t.type === "income" && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y)
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions]);
  const monthExpense = useMemo(() => {
    const now = new Date(); const m = now.getMonth(), y = now.getFullYear();
    return transactions.filter(t => t.type === "expense" && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y)
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  return (
    <div className="fin min-h-[calc(100vh-3.5rem)] w-full">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:px-8 md:py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                <span className="text-gradient">Finance</span>
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="glass rounded-2xl px-4 py-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground">Patrimonio Neto Líquido</p>
              <p className="mt-0.5 text-lg font-semibold text-foreground">{fmt(totalNet)} €</p>
            </div>
            <BankImporter />
            <button onClick={() => setManager(true)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition hover:text-foreground">
              <LayoutGrid className="h-3.5 w-3.5" /> Categorías
            </button>
            <button onClick={() => setAllocation(true)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition hover:text-foreground">
              <Settings2 className="h-3.5 w-3.5" /> Ajustes Reparto
            </button>
          </div>
        </motion.div>

        <QuickIncome />

        <div className="mt-6 flex flex-col gap-6">
          {/* Gastos */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-[hsl(var(--fin-expense))]" />
              <p className="fin-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-mute))]">Cajas de Gastos (Flujo Mensual)</p>
              <div className="h-[1px] flex-1 bg-[hsl(var(--fin-line))]" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {expenseCategories.map((c) => (
                <BoxCard key={c.id} category={c} onClick={() => setExpenseCat(c.id)} onSpend={(id) => setExpenseCat(id)} onIncome={(id) => setDirectIncomeCat(id)} />
              ))}
            </div>
          </div>

          {/* Capital de Ahorro y Dinero Disponible */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-[hsl(45_95%_58%)]" />
              <p className="fin-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-mute))]">Botes de Reserva (Ahorros & Disponible)</p>
              <div className="h-[1px] flex-1 bg-[hsl(var(--fin-line))]" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {savingsCategories.map((c) => (
                <BoxCard key={c.id} category={c} onClick={() => { if (c.route) navigate(c.route); }} onSpend={(id) => setExpenseCat(id)} onIncome={(id) => setDirectIncomeCat(id)} />
              ))}
            </div>
          </div>
        </div>

        {/* Gráficas */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MonthlyChart />
          <ExpensePie />
        </div>

        {/* Resumen e Historial Mensual */}
        <div className="mt-8">
          <HistoryList />
        </div>
      </div>

      <AnimatePresence>
        {expenseCat && <ExpenseModal categoryId={expenseCat} onClose={() => setExpenseCat(null)} />}
        {directIncomeCat && <IncomeModal categoryId={directIncomeCat} onClose={() => setDirectIncomeCat(null)} />}
        {allocation && <AllocationEditor onClose={() => setAllocation(false)} />}
        {manager && <CategoryManager onClose={() => setManager(false)} />}
      </AnimatePresence>
    </div>
  );
}