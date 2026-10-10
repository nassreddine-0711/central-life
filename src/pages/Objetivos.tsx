import { motion } from "framer-motion";
import { History } from "lucide-react";
import { VersionsModule } from "@/features/versions/VersionsModule";

/* ============================================================
   Evolución Temporal (antes "RoadMap"): la parte de Visión Actual
   se movió a Proyectos > Sueños. Aquí solo queda la evolución
   temporal de la app (versiones/snapshots).
============================================================ */
export default function Objetivos() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] w-full">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-radial opacity-60" />

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:px-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mb-8 flex items-center gap-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <History className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            <span className="text-gradient">Evolución Temporal</span>
          </h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <VersionsModule />
        </motion.div>
      </div>
    </div>
  );
}
