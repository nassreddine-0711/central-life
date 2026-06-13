import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Wallet, TrendingUp, TrendingDown, Plus, Minus, Settings2,
  ArrowRight, History, LayoutGrid, Trash2, PiggyBank,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, LineChart, Line,
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
  const allocated = categories.filter((c) => c.allocation > 0);

  return (
    <div className="fin-glass fin-brackets relative p-4 sm:p-6 border">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--fin-income))] shadow-[0_0_10px_hsl(var(--fin-income))]" />
          <p className="fin-mono truncate text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[hsl(var(--fin-mute))]">
            Ingreso Rápido · Repartidor
          </p>
        </div>
        <TrendingUp className="h-4 w-4 shrink-0 text-[hsl(var(--fin-income))]" />
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        {/* Importe */}
        <div className="flex items-baseline gap-2 lg:w-56 lg:shrink-0">
          <span className="fin-mono text-xl sm:text-2xl text-[hsl(var(--fin-mute))]">€</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="fin-mono w-full min-w-0 bg-transparent text-3xl sm:text-4xl font-semibold tracking-tight text-[hsl(var(--fin-ink))] outline-none placeholder:text-[hsl(var(--fin-mute))/0.3]"
          />
        </div>

        {/* Splits */}
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          {allocated.map((c) => {
            const part = (amount * c.allocation) / 100;
            return (
              <div
                key={c.id}
                className="min-w-0 rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3"
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
          {allocated.length === 0 && (
            <p className="fin-mono col-span-full self-center text-center text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
              Configura porcentajes en "Ajustes Reparto"
            </p>
          )}
        </div>

        {/* Botón */}
        <button
          disabled={amount <= 0}
          onClick={() => { addIncome(amount); setValue(""); }}
          className="fin-mono inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[hsl(var(--fin-income)/0.5)] bg-[hsl(var(--fin-income)/0.12)] px-5 py-2.5 text-xs uppercase tracking-[0.3em] text-[hsl(var(--fin-income))] transition hover:bg-[hsl(var(--fin-income)/0.2)] disabled:cursor-not-allowed disabled:opacity-40 lg:w-52 lg:shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Ingresar
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Year Select ------------------------------ */
function YearSelect({ value, years, onChange, color }: {
  value: number; years: number[]; onChange: (y: number) => void; color: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      onClick={(e) => e.stopPropagation()}
      className="fin-mono rounded-md border border-[hsl(var(--fin-line))] bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-ink))] hover:border-[hsl(var(--fin-accent))] focus:outline-none"
      style={{ boxShadow: `0 0 8px hsl(${color} / 0.15)` }}
    >
      {years.map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  );
}

/* ------------------------------ Box Card ------------------------------ */
function BoxCard({ category, onClick, onSpend, overspendDeduction = 0 }: {
  category: Category;
  onClick: () => void;
  onSpend: (id: string) => void;
  overspendDeduction?: number;
}) {
  const { transactions, balances, categories: allCategories } = useFinance();
  const Icon = getCategoryIcon(category.icon);
  const isSavings = category.type === "savings";

  // Año seleccionado para el "Bote acumulado" / "Histórico"
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

  const { displayValue, referenceMax, label, monthRemaining, monthSpent, totalSpent, assignedTotal } = useMemo(() => {
    if (isSavings) {
      // Cada caja de ahorro acumula su parte asignada menos sus propios gastos.
      let ownAcc = 0;
      for (const t of transactions) {
        if (t.type === "income" && t.split && t.split[category.id]) ownAcc += t.split[category.id];
        else if (t.type === "expense" && t.categoryId === category.id) ownAcc -= t.amount;
      }
      // Aplicar descuento por sobregiro mensual real (proporcional).
      ownAcc -= overspendDeduction;

      return {
        displayValue: +ownAcc.toFixed(2),
        referenceMax: category.budget || 1,
        label: "Acumulado",
        monthRemaining: 0,
        monthSpent: 0,
        totalSpent: 0,
        assignedTotal: 0,
      };
    }

    const now = new Date();
    const m = now.getMonth(), y = now.getFullYear();
    let assignedYear = 0, spentYear = 0, spentMonth = 0;
    for (const t of transactions) {
      const d = new Date(t.date);
      const ty = d.getFullYear();
      if (t.type === "income" && t.split && t.split[category.id]) {
        if (ty === selectedYear) assignedYear += t.split[category.id];
      } else if (t.type === "expense" && t.categoryId === category.id) {
        if (ty === selectedYear) spentYear += t.amount;
        if (d.getMonth() === m && ty === y) spentMonth += t.amount;
      }
    }
    const monthBudget = category.budget || 0;
    const remaining = +(monthBudget - spentMonth).toFixed(2);
    const available = +(assignedYear - spentYear).toFixed(2);
    return {
      displayValue: available,
      referenceMax: monthBudget || assignedYear || 1,
      label: "Disponible",
      monthRemaining: remaining,
      monthSpent: +spentMonth.toFixed(2),
      totalSpent: +spentYear.toFixed(2),
      assignedTotal: +assignedYear.toFixed(2),
    };
  }, [transactions, balances, category, isSavings, allCategories, selectedYear, overspendDeduction]);

  const balance = displayValue;
  const pct = Math.max(0, Math.min(100, (balance / referenceMax) * 100));
  const monthBudget = category.budget || 0;
  const monthPct = !isSavings && monthBudget > 0
    ? Math.max(0, Math.min(100, (monthRemaining / monthBudget) * 100))
    : 0;
  const low = !isSavings && monthBudget > 0 && monthPct < 10;
  const over = !isSavings && monthBudget > 0 && monthSpent > monthBudget;
  // "Imprevisto": categoría sin presupuesto configurado.
  const isUnplanned = !isSavings && monthBudget <= 0;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="fin-glass fin-brackets group relative cursor-pointer p-4 sm:p-5 border"
      style={{ boxShadow: balance > 0 ? `0 0 30px hsl(${category.color} / 0.35)` : undefined }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
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
        <button
          onClick={(e) => { e.stopPropagation(); onSpend(category.id); }}
          className="shrink-0 opacity-100 sm:opacity-0 transition sm:group-hover:opacity-100"
          title="Registrar gasto"
        >
          <span className="fin-mono inline-flex items-center gap-1 rounded-md border border-[hsl(var(--fin-expense)/0.5)] bg-[hsl(var(--fin-expense)/0.1)] px-2 py-1 text-[9px] uppercase tracking-widest text-[hsl(var(--fin-expense))]">
            <Minus className="h-3 w-3" /> Gasto
          </span>
        </button>
      </div>

      {/* Cifra principal */}
      <div className="mt-4 sm:mt-5">
        <p className="fin-mono text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--fin-mute))]">
          {isSavings
            ? "Acumulado"
            : isUnplanned
              ? "Gastado este mes"
              : "Disponible este mes"}
        </p>
        <div className="mt-1 flex items-baseline gap-1 flex-wrap">
          <span
            className="fin-mono text-3xl sm:text-4xl font-semibold tabular-nums break-all leading-tight"
            style={{
              color: isSavings
                ? `hsl(${category.color})`
                : isUnplanned
                  ? `hsl(var(--fin-expense))`
                  : monthRemaining < 0
                    ? `hsl(var(--fin-expense))`
                    : `hsl(${category.color})`,
            }}
          >
            {fmt(isSavings ? balance : isUnplanned ? monthSpent : monthRemaining)}
          </span>
          <span className="fin-mono text-base text-[hsl(var(--fin-mute))]">€</span>
        </div>
      </div>

      {/* Bloque mensual (gastos) o progreso ahorro */}
      {isUnplanned ? (
        <div className="mt-4 rounded-xl border border-[hsl(var(--fin-line))] bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ background: `hsl(${category.color})` }} />
              <p className="fin-mono text-[11px] uppercase tracking-[0.25em] text-[hsl(var(--fin-mute))]">
                Histórico
              </p>
            </div>
            <YearSelect
              value={selectedYear}
              years={availableYears}
              onChange={setSelectedYear}
              color={category.color}
            />
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
              Total gastado · {selectedYear}
            </p>
            <p className="fin-mono text-lg tabular-nums font-semibold text-[hsl(var(--fin-ink))] break-all leading-tight">
              {fmt(totalSpent)} €
            </p>
          </div>
          <p className="fin-mono mt-3 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
            Sin presupuesto · gastos imprevistos
          </p>

        </div>
      ) : !isSavings ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="fin-mono text-[11px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
              Presupuesto mes
            </p>
            <p
              className="fin-mono text-[11px] tabular-nums"
              style={{ color: over ? `hsl(var(--fin-expense))` : `hsl(var(--fin-ink))` }}
            >
              {fmt(monthSpent)} / {fmt(monthBudget)} €
            </p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${over ? 100 : Math.min(100, (monthSpent / monthBudget) * 100)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background: over
                  ? `linear-gradient(90deg, hsl(var(--fin-expense)), hsl(var(--fin-expense) / 0.7))`
                  : low
                    ? `linear-gradient(90deg, hsl(var(--fin-warn)), hsl(var(--fin-expense)))`
                    : `linear-gradient(90deg, hsl(${category.color}), hsl(${category.color} / 0.6))`,
                boxShadow: over
                  ? `0 0 12px hsl(var(--fin-expense) / 0.6)`
                  : low ? `0 0 12px hsl(var(--fin-warn) / 0.6)` : `0 0 12px hsl(${category.color} / 0.45)`,
              }}
            />
          </div>
          {over ? (
            <p className="fin-mono text-[11px] uppercase tracking-widest text-[hsl(var(--fin-expense))]">
              ⚠ sobregiro · {fmt(monthSpent - monthBudget)} €
            </p>
          ) : low && (
            <p className="fin-mono text-[11px] uppercase tracking-widest text-[hsl(var(--fin-warn))]">
              ⚠ saldo bajo
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="fin-mono text-[11px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
              Objetivo · {fmt(referenceMax)} €
            </p>
            <p className="fin-mono text-[11px] tabular-nums text-[hsl(var(--fin-mute))]">
              {pct.toFixed(0)}%
            </p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, hsl(${category.color}), hsl(${category.color} / 0.6))`,
                boxShadow: `0 0 12px hsl(${category.color} / 0.45)`,
              }}
            />
          </div>
        </div>
      )}

      {/* Bote acumulado — solo gastos planificados */}
      {!isSavings && !isUnplanned && (assignedTotal > 0 || totalSpent > 0) && (
        <div className="mt-4 rounded-xl border border-[hsl(var(--fin-line))] bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ background: `hsl(${category.color})` }} />
              <p className="fin-mono text-[11px] uppercase tracking-[0.25em] text-[hsl(var(--fin-mute))]">
                Bote acumulado · {selectedYear}
              </p>
            </div>
            <YearSelect
              value={selectedYear}
              years={availableYears}
              onChange={setSelectedYear}
              color={category.color}
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="min-w-0 rounded-lg bg-white/[0.04] p-2">
              <p className="fin-mono text-[9px] uppercase tracking-wider text-[hsl(var(--fin-mute))] truncate">Asignado</p>
              <p className="fin-mono mt-1 text-[13px] tabular-nums font-semibold text-[hsl(var(--fin-ink))] break-all leading-tight">{fmt(assignedTotal)}<span className="text-[hsl(var(--fin-mute))] ml-0.5">€</span></p>
            </div>
            <div className="min-w-0 rounded-lg bg-white/[0.04] p-2">
              <p className="fin-mono text-[9px] uppercase tracking-wider text-[hsl(var(--fin-mute))] truncate">Gastado</p>
              <p className="fin-mono mt-1 text-[13px] tabular-nums font-semibold text-[hsl(var(--fin-ink))] break-all leading-tight">{fmt(totalSpent)}<span className="text-[hsl(var(--fin-mute))] ml-0.5">€</span></p>
            </div>
            <div className="min-w-0 rounded-lg bg-white/[0.04] p-2">
              <p className="fin-mono text-[9px] uppercase tracking-wider text-[hsl(var(--fin-mute))] truncate">Saldo</p>
              <p
                className="fin-mono mt-1 text-[13px] tabular-nums font-semibold break-all leading-tight"
                style={{ color: balance < 0 ? `hsl(var(--fin-expense))` : `hsl(${category.color})` }}
              >
                {fmt(balance)}<span className="opacity-60 ml-0.5">€</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {category.route && (
        <div className="fin-mono mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
          ir a sección <ArrowRight className="h-3 w-3" />
        </div>
      )}
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
        <p className="fin-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-mute))]">
          Gasto · {cat.name}
        </p>
        <div className="mt-4">
          <input
            type="number" placeholder="Importe" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="fin-input fin-mono text-2xl"
          />
        </div>
        <div className="mt-3">
          <input placeholder="Concepto (opcional)" value={note}
            onChange={(e) => setNote(e.target.value)}
            className="fin-input"
          />
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="fin-mono rounded-md border border-[hsl(var(--fin-line))] px-3 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-ink))]">
            Cancelar
          </button>
          <button
            onClick={() => { addExpense(categoryId, Number(amount) || 0, note); onClose(); }}
            className="fin-mono rounded-md border border-[hsl(var(--fin-expense)/0.5)] bg-[hsl(var(--fin-expense)/0.15)] px-4 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-expense))]"
          >
            Restar
          </button>
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
    <div className="fin-glass fin-brackets p-5">
      <p className="fin-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-mute))]">
        Ingresos vs Gastos · 6 meses
      </p>
      <div className="mt-3 h-56">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid stroke="hsl(var(--fin-line))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="hsl(var(--fin-mute))" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
            <YAxis stroke="hsl(var(--fin-mute))" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} />
            <Tooltip contentStyle={{ background: "hsl(var(--fin-bg))", border: "1px solid hsl(var(--fin-line))", fontFamily: "JetBrains Mono", fontSize: 12 }} />
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
    <div className="fin-glass fin-brackets p-5">
      <p className="fin-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-mute))]">
        Distribución del Gasto · Mes actual
      </p>
      <div className="mt-3 h-56">
        {data.length === 0 ? (
          <div className="grid h-full place-items-center fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
            Sin gastos registrados
          </div>
        ) : (
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {data.map((d) => <Cell key={d.key} fill={`hsl(${d.color})`} stroke="hsl(var(--fin-bg))" />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--fin-bg))", border: "1px solid hsl(var(--fin-line))", fontFamily: "JetBrains Mono", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function SavingsHistory({ onClose }: { onClose: () => void }) {
  const { transactions, categories } = useFinance();
  const savingsIds = useMemo(
    () => new Set(categories.filter((c) => c.type === "savings").map((c) => c.id)),
    [categories]
  );
  const data = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let acc = 0;
    return sorted
      .filter((t) =>
        (t.type === "income" && t.split && Object.keys(t.split).some((k) => savingsIds.has(k))) ||
        (t.type === "expense" && savingsIds.has(t.categoryId as string))
      )
      .map((t) => {
        if (t.type === "income" && t.split) {
          for (const [k, v] of Object.entries(t.split)) {
            if (savingsIds.has(k)) acc += v;
          }
        } else if (t.type === "expense") {
          acc -= t.amount;
        }
        return { date: new Date(t.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }), balance: +acc.toFixed(2) };
      });
  }, [transactions, savingsIds]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="fin-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-mute))]">
          Evolución del Ahorro
        </p>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid stroke="hsl(var(--fin-line))" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="hsl(var(--fin-mute))" tick={{ fontSize: 10 }} />
              <YAxis stroke="hsl(var(--fin-mute))" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--fin-bg))", border: "1px solid hsl(var(--fin-line))", fontFamily: "JetBrains Mono", fontSize: 12 }} />
              <Line type="monotone" dataKey="balance" stroke="hsl(45 95% 58%)" strokeWidth={2} dot={{ fill: "hsl(45 95% 58%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <button onClick={onClose} className="fin-mono mt-4 rounded-md border border-[hsl(var(--fin-line))] px-3 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
          Cerrar
        </button>
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
  const [confirmMonth, setConfirmMonth] = useState<{ key: string; label: string; count: number } | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = (id: string, note?: string) => {
    if (window.confirm(`¿Borrar movimiento "${note || id}"?\nEl saldo se ajustará automáticamente.`)) {
      removeTransaction(id);
    }
  };

  const doDeleteMonth = () => {
    if (!confirmMonth || confirmText !== "BORRAR") return;
    const [y, m] = confirmMonth.key.split("-").map(Number);
    removeMonth(y, m - 1);
    setConfirmMonth(null);
    setConfirmText("");
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
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  // Collapsed by default; user must click to expand
  const isOpen = (k: string) => openMonths[k] ?? false;

  const FilterBtn = ({ id, label }: { id: typeof filter; label: string }) => (
    <button
      onClick={() => setFilter(id)}
      className={`fin-mono rounded-md border px-2.5 py-1 text-[9px] uppercase tracking-widest transition ${
        filter === id
          ? "border-[hsl(var(--fin-accent))] text-[hsl(var(--fin-ink))]"
          : "border-[hsl(var(--fin-line))] text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-ink))]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fin-glass fin-brackets p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[hsl(var(--fin-mute))]" />
          <p className="fin-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-mute))]">
            Movimientos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterBtn id="all" label={`Todos (${transactions.length})`} />
          <FilterBtn id="imported" label={`Importados (${transactions.filter(t => t.imported).length})`} />
          <FilterBtn id="manual" label="Manuales" />
        </div>
      </div>

      {grouped.length === 0 && (
        <p className="fin-mono py-6 text-center text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
          Sin movimientos
        </p>
      )}

      <div className="mt-4 space-y-2">
        {grouped.map(([key, g]) => {
          const open = isOpen(key);
          return (
            <div key={key} className="rounded-md border border-[hsl(var(--fin-line))]">
              <div className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <button
                  onClick={() => setOpenMonths((p) => ({ ...p, [key]: !open }))}
                  className="flex flex-1 min-w-0 items-center gap-2 text-left"
                >
                  <span className={`fin-mono text-[10px] text-[hsl(var(--fin-mute))] transition ${open ? "rotate-90" : ""}`}>▶</span>
                  <span className="fin-mono truncate text-[11px] uppercase tracking-widest text-[hsl(var(--fin-ink))]">
                    {g.label}
                  </span>
                  <span className="fin-mono shrink-0 text-[9px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
                    · {g.items.length} mov.
                  </span>
                </button>
                <div className="flex items-center gap-2 fin-mono text-[10px] tabular-nums">
                  <span style={{ color: "hsl(var(--fin-income))" }}>+{fmt(g.income)} €</span>
                  <span style={{ color: "hsl(var(--fin-expense))" }}>−{fmt(g.expense)} €</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmMonth({ key, label: g.label, count: g.items.length }); setConfirmText(""); }}
                    title="Borrar mes completo"
                    className="ml-1 text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-expense))]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {open && (
                <div className="divide-y divide-white/5 border-t border-[hsl(var(--fin-line))] px-3">
                  {g.items.map((t) => {
                    const cat = t.categoryId !== "all" ? catMap[t.categoryId] : null;
                    const color = t.type === "income" ? "var(--fin-income)" : "var(--fin-expense)";
                    return (
                      <div key={t.id} className="group flex items-center justify-between gap-2 py-2.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md" style={{ background: `hsl(${color} / 0.15)`, color: `hsl(${color})` }}>
                            {t.type === "income" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-[hsl(var(--fin-ink))]">
                              {t.note || (t.type === "income" ? "Ingreso · Repartido" : `Gasto · ${cat?.name ?? ""}`)}
                            </p>
                            <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
                              {new Date(t.date).toLocaleDateString("es-ES")}
                              {t.imported && <span className="ml-1.5 text-[9px] text-[hsl(var(--fin-warn))]">· importado</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <p className="fin-mono text-sm font-semibold tabular-nums" style={{ color: `hsl(${color})` }}>
                            {t.type === "income" ? "+" : "−"}{fmt(t.amount)} €
                          </p>
                          <button
                            onClick={() => handleDelete(t.id, t.note)}
                            className="opacity-100 sm:opacity-0 transition sm:group-hover:opacity-100"
                            title="Borrar movimiento"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-[hsl(var(--fin-expense))] hover:text-[hsl(var(--fin-warn))]" />
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

      {confirmMonth && (
        <div
          className="fin fixed inset-0 z-50 grid place-items-center bg-[hsl(var(--fin-bg)/0.85)] p-4 backdrop-blur-sm"
          onClick={() => { setConfirmMonth(null); setConfirmText(""); }}
        >
          <div
            className="fin-glass fin-brackets w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="fin-mono text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--fin-expense))]">
              Acción irreversible
            </p>
            <h3 className="fin-mono mt-1 text-lg uppercase tracking-[0.2em] text-[hsl(var(--fin-ink))]">
              Borrar mes completo
            </h3>
            <p className="mt-3 text-sm text-[hsl(var(--fin-ink))]">
              Vas a borrar <span className="fin-mono text-[hsl(var(--fin-warn))]">{confirmMonth.count}</span> movimientos de{" "}
              <span className="fin-mono uppercase">{confirmMonth.label}</span>. Los saldos se ajustarán automáticamente.
            </p>
            <p className="fin-mono mt-4 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">
              Escribe <span className="text-[hsl(var(--fin-expense))]">BORRAR</span> para confirmar
            </p>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && confirmText === "BORRAR") doDeleteMonth(); }}
              placeholder="BORRAR"
              className="fin-input mt-2 w-full fin-mono uppercase tracking-widest"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setConfirmMonth(null); setConfirmText(""); }}
                className="fin-mono rounded-md border border-[hsl(var(--fin-line))] px-3 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))] hover:text-[hsl(var(--fin-ink))]"
              >
                Cancelar
              </button>
              <button
                onClick={doDeleteMonth}
                disabled={confirmText !== "BORRAR"}
                className="fin-mono inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--fin-expense)/0.5)] bg-[hsl(var(--fin-expense)/0.15)] px-4 py-2 text-[10px] uppercase tracking-widest text-[hsl(var(--fin-expense))] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Borrar mes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */
export default function Finanzas() {
  const navigate = useNavigate();
  const [expenseCat, setExpenseCat] = useState<string | null>(null);
  const [allocation, setAllocation] = useState(false);
  const [manager, setManager] = useState(false);
  const [savingsHistory, setSavingsHistory] = useState(false);
  const { transactions, categories } = useFinance();

  const expenseCategories = useMemo(() => categories.filter((c) => c.type === "expense"), [categories]);
  const savingsCategories = useMemo(() => categories.filter((c) => c.type === "savings"), [categories]);

  // Sobregiro del mes actual: suma de excedentes (gastado - presupuesto) de cajas de gasto planificado.
  const monthlyOverspend = useMemo(() => {
    const now = new Date();
    const m = now.getMonth(), y = now.getFullYear();
    let over = 0;
    for (const c of categories) {
      if (c.type !== "expense") continue;
      const budget = c.budget || 0;
      if (budget <= 0) continue; // categorías sin presupuesto (imprevistos) no aplican
      let spent = 0;
      for (const t of transactions) {
        if (t.type !== "expense" || t.categoryId !== c.id) continue;
        const d = new Date(t.date);
        if (d.getMonth() === m && d.getFullYear() === y) spent += t.amount;
      }
      if (spent > budget) over += spent - budget;
    }
    return +over.toFixed(2);
  }, [transactions, categories]);

  // Reparto proporcional del sobregiro entre cajas de ahorro (por allocation, fallback equitativo).
  const overspendByBox = useMemo(() => {
    const result: Record<string, number> = {};
    const savings = categories.filter((c) => c.type === "savings");
    if (savings.length === 0 || monthlyOverspend <= 0) return result;
    const totalAlloc = savings.reduce((s, c) => s + (c.allocation || 0), 0);
    if (totalAlloc > 0) {
      savings.forEach((c) => {
        result[c.id] = +(monthlyOverspend * (c.allocation || 0) / totalAlloc).toFixed(2);
      });
    } else {
      const share = +(monthlyOverspend / savings.length).toFixed(2);
      savings.forEach((c) => { result[c.id] = share; });
    }
    return result;
  }, [categories, monthlyOverspend]);

  const totalNet = useMemo(() => {
    // Patrimonio = suma real de las cajas de ahorro (asignado - gastado propio) − sobregiro del mes.
    let total = 0;
    for (const c of categories) {
      if (c.type !== "savings") continue;
      for (const t of transactions) {
        if (t.type === "income" && t.split && t.split[c.id]) total += t.split[c.id];
        else if (t.type === "expense" && t.categoryId === c.id) total -= t.amount;
      }
    }
    total -= monthlyOverspend;
    return +total.toFixed(2);
  }, [transactions, categories, monthlyOverspend]);

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

  const handleBoxClick = (cat: Category) => {
    if (cat.route) { navigate(cat.route); return; }
    if (cat.type === "savings") { setSavingsHistory(true); return; }
    setExpenseCat(cat.id);
  };

  return (
    <div className="fin min-h-[calc(100vh-3.5rem)] w-full">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:px-8 md:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-wrap items-center justify-between gap-4"
        >
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
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground">Patrimonio</p>
              <p className="mt-0.5 text-lg font-semibold text-foreground">{fmt(totalNet)} €</p>
            </div>
            <BankImporter />
            <button
              onClick={() => setManager(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition hover:text-foreground hover:bg-secondary"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Configurar Categorías
            </button>
            <button
              onClick={() => setAllocation(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition hover:text-foreground hover:bg-secondary"
            >
              <Settings2 className="h-3.5 w-3.5" /> Ajustes Reparto
            </button>
          </div>
        </motion.div>


        {/* Ingreso rápido — horizontal arriba */}
        <div className="mt-8">
          <QuickIncome />
        </div>

        {/* Cajas: gastos + ahorros */}
        <div className="mt-6 flex flex-col gap-6">
          {/* Gastos */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-[hsl(var(--fin-expense))]" />
              <p className="fin-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-mute))]">
                Cajas de Gastos
              </p>
              <div className="h-[1px] flex-1 bg-[hsl(var(--fin-line))]" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {expenseCategories.map((c) => (
                <BoxCard
                  key={c.id}
                  category={c}
                  onClick={() => handleBoxClick(c)}
                  onSpend={(id) => setExpenseCat(id)}
                />
              ))}
            </div>
          </div>

          {/* Ahorros */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-[hsl(45_95%_58%)]" />
              <p className="fin-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--fin-mute))]">
                Cajas de Ahorro
              </p>
              <div className="h-[1px] flex-1 bg-[hsl(var(--fin-line))]" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {savingsCategories.map((c) => (
                <BoxCard
                  key={c.id}
                  category={c}
                  onClick={() => handleBoxClick(c)}
                  onSpend={(id) => setExpenseCat(id)}
                  overspendDeduction={overspendByBox[c.id] || 0}
                />
              ))}

            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="fin-glass p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[hsl(var(--fin-income))]" />
              <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Ingresos del mes</p>
            </div>
            <p className="fin-mono mt-2 text-2xl font-semibold text-[hsl(var(--fin-income))]">+{fmt(monthIncome)} €</p>
          </div>
          <div className="fin-glass p-5">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-[hsl(var(--fin-expense))]" />
              <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Gastos del mes</p>
            </div>
            <p className="fin-mono mt-2 text-2xl font-semibold text-[hsl(var(--fin-expense))]">−{fmt(monthExpense)} €</p>
          </div>
          <div className="fin-glass p-5">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[hsl(var(--fin-ink))]" />
              <p className="fin-mono text-[10px] uppercase tracking-widest text-[hsl(var(--fin-mute))]">Balance del mes</p>
            </div>
            <p className={`fin-mono mt-2 text-2xl font-semibold ${monthIncome - monthExpense >= 0 ? "text-[hsl(var(--fin-income))]" : "text-[hsl(var(--fin-expense))]"}`}>
              {fmt(monthIncome - monthExpense)} €
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MonthlyChart />
          <ExpensePie />
        </div>

        {/* History */}
        <div className="mt-6">
          <HistoryList />
        </div>
      </div>

      <AnimatePresence>
        {expenseCat && <ExpenseModal categoryId={expenseCat} onClose={() => setExpenseCat(null)} />}
        {allocation && <AllocationEditor onClose={() => setAllocation(false)} />}
        {manager && <CategoryManager onClose={() => setManager(false)} />}
        {savingsHistory && <SavingsHistory onClose={() => setSavingsHistory(false)} />}
      </AnimatePresence>
    </div>
  );
}
