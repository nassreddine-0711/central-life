import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeartPulse, Activity, LineChart as LineChartIcon } from "lucide-react";
import { HealthProvider } from "@/features/health/HealthContext";
import { EnergyBalanceCore } from "@/features/health/EnergyBalanceCore";
import { FoodIntakeCard } from "@/features/health/FoodIntakeCard";
import { ActivityCard } from "@/features/health/ActivityCard";
import { HydrationTracker } from "@/features/health/HydrationTracker";
import { EvolutionChart } from "@/features/health/EvolutionChart";
import { TimeLapseGallery } from "@/features/health/TimeLapseGallery";
import { DailySummary } from "@/features/health/DailySummary";
import { MeasurementsPanel } from "@/features/health/MeasurementsPanel";
import { HistoryCalendar } from "@/features/health/HistoryCalendar";
import { DateNavigator } from "@/features/health/DateNavigator";

type Tab = "daily" | "evolution";

const Salud = () => {
  const [tab, setTab] = useState<Tab>("daily");

  return (
    <HealthProvider>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <HeartPulse className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                <span className="text-gradient">Health</span>
              </h1>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1 shadow-sm">
            <TabButton active={tab === "daily"} onClick={() => setTab("daily")} icon={<Activity className="h-3.5 w-3.5" />}>
              Control Diario
            </TabButton>
            <TabButton active={tab === "evolution"} onClick={() => setTab("evolution")} icon={<LineChartIcon className="h-3.5 w-3.5" />}>
              Evolución
            </TabButton>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {tab === "daily" ? (
            <motion.section
              key="daily"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <DateNavigator />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <EnergyBalanceCore />
                </div>
                <div className="space-y-6">
                  <HydrationTracker />
                  <ActivityCard />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <FoodIntakeCard />
                <DailySummary />
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="evolution"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <MeasurementsPanel />
              <HistoryCalendar />
              <EvolutionChart />
              <TimeLapseGallery />
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </HealthProvider>
  );
};

function TabButton({
  active, onClick, icon, children,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest transition ${
        active ? "text-primary-foreground" : "text-neutral-600 hover:text-neutral-900"
      }`}
    >
      {active && (
        <motion.span
          layoutId="tab-pill"
          className="absolute inset-0 rounded-full bg-gradient-primary shadow-glow"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {children}
      </span>
    </button>
  );
}

export default Salud;
