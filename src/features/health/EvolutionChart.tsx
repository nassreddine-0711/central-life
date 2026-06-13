import { motion } from "framer-motion";
import { TrendingDown } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useHealth } from "./HealthContext";
import { formatISODate } from "./dateUtils";

const COLORS = {
  Peso: "hsl(140 90% 55%)",       // verde neón
  Cintura: "hsl(190 95% 55%)",    // cian
  Piernas: "hsl(265 90% 70%)",    // violeta
  "Brazo Izq.": "hsl(35 95% 60%)", // ámbar
  "Brazo Der.": "hsl(10 90% 62%)", // rojo coral
};

export function EvolutionChart() {
  const { weights } = useHealth();
  const data = [...weights]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({
      date: formatISODate(w.date, "LLL yy"),
      Peso: w.weight,
      Cintura: w.waist,
      Piernas: w.legs ?? null,
      "Brazo Izq.": w.armLeft ?? w.arms ?? null,
      "Brazo Der.": w.armRight ?? w.arms ?? null,
    }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4" style={{ color: COLORS.Peso }} />
          <h3 className="text-sm font-semibold uppercase tracking-widest">Tendencia Multivariable</h3>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2 }}
              iconType="circle"
            />
            <Line type="monotone" dataKey="Peso" stroke={COLORS.Peso} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} connectNulls />
            <Line type="monotone" dataKey="Cintura" stroke={COLORS.Cintura} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} connectNulls />
            <Line type="monotone" dataKey="Piernas" stroke={COLORS.Piernas} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} connectNulls />
            <Line type="monotone" dataKey="Brazo Izq." stroke={COLORS["Brazo Izq."]} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} connectNulls />
            <Line type="monotone" dataKey="Brazo Der." stroke={COLORS["Brazo Der."]} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
