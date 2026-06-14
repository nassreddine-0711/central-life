import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ruler, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { useHealth } from "./HealthContext";
import { todayISO, formatISODate } from "./dateUtils";
import { fileToCompressedDataURL } from "@/features/knowledge/imageUtils";

const GREEN = "hsl(140 90% 55%)";
const CYAN = "hsl(190 95% 55%)";

export function MeasurementsPanel() {
  const { weights, addWeight, removeWeight } = useHealth();
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [legs, setLegs] = useState("");
  const [armLeft, setArmLeft] = useState("");
  const [armRight, setArmRight] = useState("");
  const [photo, setPhoto] = useState("");

  const submit = () => {
    if (!weight || !waist) return;
    addWeight({
      date,
      weight: parseFloat(weight),
      waist: parseFloat(waist),
      legs: legs ? parseFloat(legs) : undefined,
      armLeft: armLeft ? parseFloat(armLeft) : undefined,
      armRight: armRight ? parseFloat(armRight) : undefined,
      photo: photo || undefined,
    });
    setWeight(""); setWaist(""); setLegs(""); setArmLeft(""); setArmRight(""); setPhoto("");
  };

  const onPhotoFile = async (file?: File) => {
    if (!file) return;
    try {
      const compressed = await fileToCompressedDataURL(file);
      setPhoto(compressed);
    } catch (err) {
      console.error("Error compressing image", err);
    }
  };

  const sorted = [...weights].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-3xl p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <Ruler className="h-4 w-4" style={{ color: CYAN }} />
        <h3 className="text-sm font-semibold uppercase tracking-widest">Antropometría</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
        <Field label="Fecha" type="date" value={date} onChange={setDate} className="col-span-2" />
        <Field label="Peso (kg)" value={weight} onChange={setWeight} placeholder="78.4" />
        <Field label="Cintura (cm)" value={waist} onChange={setWaist} placeholder="84" />
        <Field label="Piernas (cm)" value={legs} onChange={setLegs} placeholder="60" />
        <Field label="Brazo Izq. (cm)" value={armLeft} onChange={setArmLeft} placeholder="36" />
        <Field label="Brazo Der. (cm)" value={armRight} onChange={setArmRight} placeholder="36" />
        <div className="col-span-2 flex flex-col gap-1 md:col-span-6">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Foto (opcional)</label>
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-xs hover:border-[hsl(190_95%_55%_/_0.5)]">
              <ImageIcon className="h-3.5 w-3.5" />
              Subir
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPhotoFile(e.target.files?.[0])}
              />
            </label>
            <input
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              placeholder="o pega una URL"
              className="flex-1 rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-xs outline-none focus:border-[hsl(190_95%_55%_/_0.5)]"
            />
            {photo && (
              <img src={photo} alt="preview" className="h-10 w-10 rounded-lg object-cover" />
            )}
          </div>
        </div>
        <button
          onClick={submit}
          className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-[hsl(140_90%_55%_/_0.4)] bg-[hsl(140_90%_55%_/_0.1)] px-3 py-2 text-xs font-semibold uppercase tracking-widest transition hover:bg-[hsl(140_90%_55%_/_0.2)] md:col-span-1"
          style={{ color: GREEN }}
        >
          <Plus className="h-3.5 w-3.5" /> Guardar
        </button>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          Historial ({sorted.length})
        </div>
        <div className="max-h-56 space-y-1.5 overflow-auto pr-1">
          <AnimatePresence>
            {sorted.map((w) => (
              <motion.div
                key={w.date}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center justify-between rounded-lg bg-background/20 px-3 py-2 text-xs"
              >
                <span className="font-mono text-muted-foreground">
                  {formatISODate(w.date, "dd LLL yyyy")}
                </span>
                <div className="flex items-center gap-3 font-mono tabular-nums">
                  <span>{w.weight} kg</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{w.waist} cm</span>
                  {w.legs != null && <><span className="text-muted-foreground">·</span><span>P {w.legs}</span></>}
                  {w.armLeft != null && <><span className="text-muted-foreground">·</span><span>BI {w.armLeft}</span></>}
                  {w.armRight != null && <><span className="text-muted-foreground">·</span><span>BD {w.armRight}</span></>}
                  {w.armLeft == null && w.armRight == null && w.arms != null && (
                    <><span className="text-muted-foreground">·</span><span>B {w.arms}</span></>
                  )}
                  <button
                    onClick={() => removeWeight(w.date)}
                    className="ml-2 text-muted-foreground hover:text-destructive"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, className = "",
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <input
        type={type}
        inputMode={type === "text" ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-sm font-mono outline-none focus:border-[hsl(190_95%_55%_/_0.5)]"
      />
    </div>
  );
}