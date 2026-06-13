import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useHealth } from "./HealthContext";

export function NewFoodDialog() {
  const { addCustomFood } = useHealth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState<number | "">("");
  const [protein, setProtein] = useState<number | "">("");
  const [carbs, setCarbs] = useState<number | "">("");
  const [fat, setFat] = useState<number | "">("");

  const reset = () => { setName(""); setKcal(""); setProtein(""); setCarbs(""); setFat(""); };
  const valid = name.trim() && typeof kcal === "number" && kcal >= 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-primary transition hover:bg-primary/20">
          <Plus className="h-3 w-3" /> Nuevo
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Nuevo Alimento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Tortilla francesa (1 ud)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calorías (kcal)" v={kcal} setV={setKcal} />
            <Field label="Proteínas (g)" v={protein} setV={setProtein} />
            <Field label="Carbohidratos (g)" v={carbs} setV={setCarbs} />
            <Field label="Grasas (g)" v={fat} setV={setFat} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={!valid}
            onClick={() => {
              addCustomFood({
                name: name.trim(),
                kcal: Number(kcal) || 0,
                protein: Number(protein) || 0,
                carbs: Number(carbs) || 0,
                fat: Number(fat) || 0,
              });
              setOpen(false);
              reset();
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewActivityDialog() {
  const { addCustomActivity } = useHealth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState<number | "">("");

  const valid = name.trim() && typeof kcal === "number" && kcal > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setName(""); setKcal(""); } }}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-full border border-[hsl(140_90%_55%_/_0.4)] bg-[hsl(140_90%_55%_/_0.08)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-[hsl(140_90%_55%)] transition hover:bg-[hsl(140_90%_55%_/_0.18)]">
          <Plus className="h-3 w-3" /> Nueva
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nueva Actividad</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Natación" />
          </div>
          <div className="space-y-1.5">
            <Label>Calorías quemadas por sesión</Label>
            <Input
              type="number"
              min={1}
              value={kcal}
              onChange={(e) => setKcal(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={!valid}
            onClick={() => {
              addCustomActivity({ type: name.trim(), kcal: Number(kcal) });
              setOpen(false);
              setName(""); setKcal("");
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, v, setV }: { label: string; v: number | ""; setV: (n: number | "") => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        step="0.1"
        value={v}
        onChange={(e) => setV(e.target.value === "" ? "" : Number(e.target.value))}
      />
    </div>
  );
}
