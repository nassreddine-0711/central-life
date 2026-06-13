import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTravel, type CountryStatus } from "./TravelContext";
import { getCountryNameES } from "./countryNamesES";
import { Check, MapPin, Sparkles, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountryModalProps {
  countryID: string | null;
  countryName?: string | null;
  onClose: () => void;
  onVisitedConfirmed: (id: string) => void;
}

export function CountryModal({ countryID, countryName, onClose, onVisitedConfirmed }: CountryModalProps) {
  const { entries, upsert, remove } = useTravel();
  const existing = countryID ? entries[countryID] : undefined;
  const hasState = existing && existing.status !== "none";

  const [status, setStatus] = useState<CountryStatus>("wishlist");
  const [date, setDate] = useState("");
  const [age, setAge] = useState("");
  const [mediaLink, setMediaLink] = useState("");
  const [spend, setSpend] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (countryID) {
      setStatus(existing?.status === "none" || !existing ? "wishlist" : existing.status);
      setDate(existing?.date ?? "");
      setAge(existing?.age ?? "");
      setMediaLink(existing?.mediaLink ?? "");
      setSpend(existing?.spend ? String(existing.spend) : "");
      setNotes(existing?.notes ?? "");
    }
  }, [countryID, existing]);

  if (!countryID) return null;
  const displayName = getCountryNameES(countryID, countryName ?? undefined);

  const handleSave = () => {
    const wasVisited = existing?.status === "visited";
    upsert(countryID, {
      status,
      date,
      age,
      mediaLink,
      spend: Number(spend) || 0,
      notes,
      countryName: displayName,
    });
    if (status === "visited" && !wasVisited) {
      onVisitedConfirmed(countryID);
    }
    onClose();
  };

  const handleRemove = () => {
    remove(countryID);
    onClose();
  };

  return (
    <Dialog open={!!countryID} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong max-w-md border-border/40">
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            <MapPin className="h-3 w-3" />
            <span>País · {countryID}</span>
          </div>
          <DialogTitle className="font-mono text-3xl uppercase tracking-wider text-foreground">
            {displayName}
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {hasState
              ? existing?.status === "visited"
                ? "✓ Marcado como visitado"
                : "◌ En tu lista de deseados"
              : "Sin estado · selecciona una acción"}
          </DialogDescription>
        </DialogHeader>

        {/* Status toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setStatus("visited")}
            className={cn(
              "group relative flex flex-col items-center gap-1 rounded-lg border px-4 py-3 text-xs font-mono uppercase tracking-wider transition-all",
              status === "visited"
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                : "border-border/50 text-muted-foreground hover:border-emerald-500/30 hover:text-foreground",
            )}
          >
            <Check className="h-4 w-4" />
            Visitado
          </button>
          <button
            onClick={() => setStatus("wishlist")}
            className={cn(
              "group relative flex flex-col items-center gap-1 rounded-lg border px-4 py-3 text-xs font-mono uppercase tracking-wider transition-all",
              status === "wishlist"
                ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                : "border-border/50 text-muted-foreground hover:border-cyan-500/30 hover:text-foreground",
            )}
          >
            <Sparkles className="h-4 w-4" />
            Próximo destino
          </button>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="date" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Fecha del viaje
            </Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="font-mono" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="age" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Edad
              </Label>
              <Input id="age" type="number" min="0" value={age} onChange={(e) => setAge(e.target.value)} className="font-mono" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="spend" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Gasto (€)
              </Label>
              <Input id="spend" type="number" min="0" value={spend} onChange={(e) => setSpend(e.target.value)} className="font-mono" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="media" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Link a galería (Drive / Fotos)
            </Label>
            <Input
              id="media"
              type="url"
              placeholder="https://"
              value={mediaLink}
              onChange={(e) => setMediaLink(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {status === "visited" ? "Descripción del viaje · recuerdos" : "Descripción · qué te atrae de este destino"}
            </Label>
            <Textarea
              id="notes"
              rows={4}
              placeholder={
                status === "visited"
                  ? "Lugares favoritos, anécdotas, gente, sabores..."
                  : "Lugares por descubrir, motivaciones, planes..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="font-mono text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
          {hasState ? (
            <Button
              variant="ghost"
              onClick={handleRemove}
              className="font-mono text-xs uppercase tracking-wider text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Eliminar de la lista
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose} className="font-mono text-xs uppercase tracking-wider">
              Cancelar
            </Button>
          )}
          <Button onClick={handleSave} className="font-mono text-xs uppercase tracking-wider">
            {hasState ? (
              <>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Modificar datos
              </>
            ) : status === "visited" ? (
              "Marcar como visitado"
            ) : (
              "Añadir a deseados"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
