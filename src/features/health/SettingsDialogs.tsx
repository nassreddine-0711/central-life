import { useState } from "react";
import { Settings2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useHealth } from "./HealthContext";

export function BmrSettingsDialog() {
  const { bmr, setBmr } = useHealth();
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(bmr);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setVal(bmr); }}>
      <DialogTrigger asChild>
        <button
          className="rounded-full border border-border/50 bg-background/30 p-1 text-muted-foreground transition hover:text-foreground"
          aria-label="Editar metabolismo basal"
        >
          <Settings2 className="h-3 w-3" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Metabolismo Basal (TMB)</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Calorías diarias en reposo</Label>
          <Input
            type="number"
            min={500}
            value={val}
            onChange={(e) => setVal(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Estas calorías se restan automáticamente del balance diario.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => { setBmr(val); setOpen(false); }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HydrationSettingsDialog({ trigger }: { trigger: React.ReactNode }) {
  const { hydrationGoal, setHydrationGoal, glassMl, setGlassMl } = useHealth();
  const [open, setOpen] = useState(false);
  const [g, setG] = useState(hydrationGoal);
  const [ml, setMl] = useState(glassMl);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setG(hydrationGoal); setMl(glassMl); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Objetivo de Hidratación</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Vasos al día</Label>
            <Input type="number" min={1} max={30} value={g} onChange={(e) => setG(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Tamaño de vaso (ml)</Label>
            <Input type="number" min={50} step={50} value={ml} onChange={(e) => setMl(Number(e.target.value))} />
          </div>
          <p className="text-xs text-muted-foreground">
            Total diario: <span className="font-mono text-foreground">{g * ml} ml</span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => { setHydrationGoal(g); setGlassMl(ml); setOpen(false); }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
