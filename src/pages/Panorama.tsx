import { Gauge } from "lucide-react";
import { FlywheelView } from "@/features/flywheel/FlywheelView";

export default function Panorama() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] w-full">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:px-8 md:py-12">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Gauge className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Panorama</h1>
            <p className="text-sm text-muted-foreground">
              El volante de inercia de tu vida: cuánto está girando cada área y qué mueve el conjunto.
            </p>
          </div>
        </div>

        <FlywheelView />
      </div>
    </div>
  );
}
