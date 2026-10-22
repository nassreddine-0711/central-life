import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Json } from "@/integrations/supabase/types";

/** Copia de seguridad automática: cada vez que se guarda un módulo, la base de datos
 *  archiva (ella sola, con un trigger) la versión anterior en "user_data_history" ANTES
 *  de sobrescribirla. Esta página solo lee esas versiones archivadas y permite traer
 *  cualquiera de vuelta. Restaurar una versión antigua tampoco borra nada: la versión
 *  actual también queda archivada justo antes de ser reemplazada. */

const MODULES: { key: string; label: string }[] = [
  { key: "knowledge", label: "Biblioteca y conocimiento" },
  { key: "audiovisual", label: "Audiovisual (pelis / podcasts)" },
  { key: "finance", label: "Finanzas" },
  { key: "health", label: "Salud" },
  { key: "travel", label: "Viajes" },
  { key: "cerebro_tasks", label: "Tareas" },
  { key: "cerebro_notes", label: "Notas" },
  { key: "cerebro_notecats", label: "Categorías de notas" },
  { key: "cerebro_projects", label: "Proyectos" },
  { key: "cerebro_project_categories", label: "Categorías de proyectos" },
  { key: "cerebro_project_updates", label: "Actualizaciones de proyectos" },
  { key: "cerebro_apunte_folders", label: "Carpetas de archivo" },
  { key: "cerebro_apunte_docs", label: "Documentos de archivo" },
  { key: "cerebro_apunte_audios", label: "Audios de archivo" },
  { key: "cerebro_objetivos", label: "Objetivos" },
  { key: "cerebro_retro_entries", label: "Retrospectivas" },
  { key: "cerebro_project_expenses", label: "Gastos de proyectos" },
  { key: "cerebro_project_time_entries", label: "Tiempo de proyectos" },
  { key: "cerebro_dreams", label: "Sueños" },
  { key: "cerebro_dreams_config", label: "Configuración de sueños" },
  { key: "cerebro_routines", label: "Horario / rutinas" },
];

type Version = { id: number; data: Json; archived_at: string };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });

const summarize = (data: Json): string => {
  if (Array.isArray(data)) return `${data.length} elemento${data.length === 1 ? "" : "s"}`;
  if (data && typeof data === "object") {
    const obj = data as Record<string, Json | undefined>;
    const arrayCounts = Object.entries(obj)
      .filter(([, v]) => Array.isArray(v))
      .map(([k, v]) => `${k}: ${(v as Json[]).length}`);
    if (arrayCounts.length) return arrayCounts.join(" · ");
    return `${Object.keys(obj).length} campo${Object.keys(obj).length === 1 ? "" : "s"}`;
  }
  return "—";
};

const Historial = () => {
  const { user } = useAuth();
  const [moduleKey, setModuleKey] = useState<string>("");
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const loadVersions = async (key: string) => {
    if (!user) return;
    setModuleKey(key);
    setVersions(null);
    setMsg(null);
    setConfirmId(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_data_history")
        .select("id, data, archived_at")
        .eq("user_id", user.id)
        .eq("module", key)
        .order("archived_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      setVersions((data ?? []) as Version[]);
    } catch (e) {
      setMsg("Error al cargar el historial: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  const restore = async (version: Version) => {
    if (!user || !moduleKey) return;
    setRestoringId(version.id);
    setMsg(null);
    try {
      const { error } = await supabase.from("user_data").upsert(
        { user_id: user.id, module: moduleKey, data: version.data, updated_at: new Date().toISOString() },
        { onConflict: "user_id,module" },
      );
      if (error) throw error;
      setMsg(`Restaurado el guardado del ${fmt(version.archived_at)}. Recarga la página para verlo.`);
      setConfirmId(null);
      // la versión que acaba de quedar "actual" también se archiva sola, así que
      // recargamos la lista para que aparezca.
      loadVersions(moduleKey);
    } catch (e) {
      setMsg("Error al restaurar: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Historial y recuperación</h1>
      <p className="text-sm text-muted-foreground">
        Cada vez que se guarda cualquier parte de la app, la base de datos guarda aparte,
        ella sola, la versión que había justo antes. Nada de este historial se puede borrar
        desde la app ni por un fallo del código: solo se puede leer y restaurar. Elige qué
        quieres revisar.
      </p>

      <Select value={moduleKey} onValueChange={loadVersions}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Elige una sección…" />
        </SelectTrigger>
        <SelectContent>
          {MODULES.map((m) => (
            <SelectItem key={m.key} value={m.key}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {msg && <p className="text-sm">{msg}</p>}

      {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}

      {versions && versions.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">
          Todavía no hay versiones guardadas de esta sección (aparecerán después del
          próximo cambio que hagas ahí).
        </p>
      )}

      {versions && versions.length > 0 && (
        <div className="space-y-2">
          {versions.map((v) => (
            <Card key={v.id}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between gap-3">
                  <span>{fmt(v.archived_at)}</span>
                  <span className="text-xs font-normal text-muted-foreground">{summarize(v.data)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                {confirmId === v.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Esto reemplaza lo que hay ahora (quedará también archivado, no se pierde).
                    </span>
                    <Button size="sm" variant="destructive" disabled={restoringId === v.id} onClick={() => restore(v)}>
                      {restoringId === v.id ? "Restaurando…" : "Sí, restaurar"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setConfirmId(v.id)}>
                    Restaurar esta versión
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Historial;
