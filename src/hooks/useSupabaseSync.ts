import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { toast } from "sonner";

/* ============================================================
   Sincronización con Supabase pensada para NO perder datos.

   - Lo local se guarda al instante en el navegador (lo hace cada contexto);
     en Supabase se guarda a los pocos cientos de ms de cada cambio, y de
     inmediato al ocultar/cerrar la pestaña o salir de la pantalla.
   - Si quedan cambios sin subir (pestaña cerrada, sin red…), se recuerdan
     en el navegador ("pendiente"). En la siguiente carga NO se descartan:
     se unen con lo que haya en el servidor.
   - Si la carga inicial falla, NO se guarda nada hasta cargar bien (antes un
     fallo de red dejaba guardar un estado vacío encima de los datos reales).
   - Si otro dispositivo/pestaña guardó entre medias, se unen ambas versiones
     (por id) en vez de pisar la del otro.
   - Devuelve { ready }: true cuando ya se ha cargado lo del servidor.
============================================================ */

const SAVE_DELAY_MS = 400;
const RETRY_DELAY_MS = 4000;

const pendingKey = (userId: string, module: string) => `sync-pending:${userId}:${module}`;
function readPending(key: string) {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
}
function writePending(key: string, on: boolean) {
  try { if (on) localStorage.setItem(key, "1"); else localStorage.removeItem(key); } catch { /* sin espacio / modo privado */ }
}

function isIdArray(v: unknown): v is { id: string }[] {
  return Array.isArray(v) && v.every(x => x && typeof x === "object" && typeof (x as { id?: unknown }).id === "string");
}

/** Une dos versiones sin perder nada: si el mismo id está en ambas, manda lo local; lo que solo existe en el servidor se conserva. */
function mergeData<T>(server: T, local: T): T {
  if (Array.isArray(server) && Array.isArray(local)) {
    if (isIdArray(server) && isIdArray(local)) {
      const localIds = new Set(local.map(x => x.id));
      return [...local, ...server.filter(x => !localIds.has(x.id))] as unknown as T;
    }
    // Listas de valores simples (p. ej. categorías): unión sin duplicados.
    const out: unknown[] = [...local];
    server.forEach(x => { if (!out.some(y => JSON.stringify(y) === JSON.stringify(x))) out.push(x); });
    return out as unknown as T;
  }
  if (server && local && typeof server === "object" && typeof local === "object" && !Array.isArray(server) && !Array.isArray(local)) {
    return { ...(server as object), ...(local as object) } as T;
  }
  return local;
}

export interface SyncOptions<T> {
  /** Dice si un valor es solo el contenido "de ejemplo"/vacío inicial. Evita que un dato de relleno
   *  pise (o sea pisado por) los datos reales que existen en otro sitio. */
  isDefault?: (v: T) => boolean;
}

export function useSupabaseSync<T>(
  module: string,
  value: T,
  setValue: (v: T) => void,
  options?: SyncOptions<T>
): { ready: boolean } {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const [ready, setReady] = useState(false);

  const initialized = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const setValueRef = useRef(setValue);
  setValueRef.current = setValue;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const mountValueRef = useRef(value);
  const mountJsonRef = useRef<string | null>(null);
  const dirtyBeforeLoadRef = useRef(false); // el usuario/la app cambió algo mientras cargaba
  const versionRef = useRef(0);             // cuenta de cambios locales
  const stampRef = useRef<string | null>(null); // updated_at de la última versión del servidor que conocemos
  const runningRef = useRef(false);
  const againRef = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Sube la versión más reciente. Une con el servidor si alguien más guardó entre medias. */
  const persist = useCallback(async () => {
    if (!userId) return;
    const key = pendingKey(userId, module);

    // Espejo en localStorage para el módulo de Versiones/Snapshots.
    try { localStorage.setItem(module, JSON.stringify(valueRef.current)); } catch (e) {
      console.error("Error al guardar espejo en localStorage para", module, e);
    }

    const { data: cur } = await supabase
      .from("user_data")
      .select("data, updated_at")
      .eq("user_id", userId)
      .eq("module", module)
      .maybeSingle();

    // Tomamos lo más reciente DESPUÉS de la espera, por si se ha seguido escribiendo.
    let toSave = valueRef.current;
    if (cur && cur.data !== null && cur.data !== undefined) {
      const changedElsewhere =
        stampRef.current === null || new Date(cur.updated_at).getTime() !== new Date(stampRef.current).getTime();
      if (changedElsewhere) {
        toSave = mergeData(cur.data as T, valueRef.current);
        valueRef.current = toSave;
        setValueRef.current(toSave);
      }
    }
    const version = versionRef.current;
    const stampSent = new Date().toISOString();

    const { data: up, error } = await supabase
      .from("user_data")
      .upsert(
        { user_id: userId, module, data: toSave as Json, updated_at: stampSent },
        { onConflict: "user_id,module" }
      )
      .select("updated_at")
      .maybeSingle();

    if (error) throw error;

    let stamp = up?.updated_at ?? null;
    if (!stamp) {
      const { data: after } = await supabase
        .from("user_data").select("updated_at").eq("user_id", userId).eq("module", module).maybeSingle();
      stamp = after?.updated_at ?? stampSent;
    }
    stampRef.current = stamp;
    if (versionRef.current === version) writePending(key, false);
  }, [userId, module]);

  const flush = useCallback(async () => {
    if (!userId || !initialized.current) return;
    if (runningRef.current) { againRef.current = true; return; }
    runningRef.current = true;
    try {
      do {
        againRef.current = false;
        await persist();
      } while (againRef.current);
    } catch (e) {
      console.error(`Error saving module ${module} to Supabase:`, e);
      toast.error("Error de sincronización", {
        description: `No se pudieron guardar los datos de ${module}. Se reintentará solo; tus cambios siguen guardados en este navegador.`,
      });
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
      retryTimeout.current = setTimeout(() => { void flushRef.current(); }, RETRY_DELAY_MS);
    } finally {
      runningRef.current = false;
    }
  }, [userId, module, persist]);
  const flushRef = useRef(flush);
  flushRef.current = flush;

  // Carga inicial desde Supabase
  useEffect(() => {
    if (initialized.current) return;
    if (!userId) {
      if (!loading) setReady(true); // sin sesión: solo local
      return;
    }
    let cancelled = false;
    const key = pendingKey(userId, module);

    const attempt = async () => {
      const { data, error } = await supabase
        .from("user_data")
        .select("data, updated_at")
        .eq("user_id", userId)
        .eq("module", module)
        .maybeSingle();
      if (cancelled) return;

      if (error) {
        // No inicializamos: mientras no carguemos bien, NO se guarda nada (así no se pisa lo del servidor).
        console.error(`Error loading module ${module} from Supabase:`, error);
        retryTimeout.current = setTimeout(attemptSafe, RETRY_DELAY_MS);
        return;
      }

      const local = valueRef.current;
      const localNewer = dirtyBeforeLoadRef.current || readPending(key);
      stampRef.current = data?.updated_at ?? null;
      const serverData = data?.data as T | null | undefined;

      if (serverData === null || serverData === undefined) {
        initialized.current = true;
        setReady(true);
        // El servidor aún no tiene nada de este módulo: se sube lo local (así nace la copia en la nube).
        const placeholder = optionsRef.current?.isDefault?.(local) ?? false;
        if (localNewer || (!placeholder && !(Array.isArray(local) && local.length === 0))) {
          versionRef.current += 1;
          writePending(key, true);
          void flushRef.current();
        }
        return;
      }

      // Si lo del servidor es solo contenido de relleno y lo local son datos reales, mandan los reales.
      const isDef = optionsRef.current?.isDefault;
      const localBeatsPlaceholder = !!isDef && isDef(serverData) && !isDef(local);

      if (localNewer || localBeatsPlaceholder) {
        // Hay cambios locales sin subir: se unen con el servidor, nunca se descartan.
        const merged = mergeData(serverData, local);
        valueRef.current = merged;
        setValueRef.current(merged);
        initialized.current = true;
        setReady(true);
        versionRef.current += 1;
        writePending(key, true);
        void flushRef.current();
      } else {
        setValueRef.current(serverData);
        initialized.current = true;
        setReady(true);
      }
    };

    // Un fallo de red también lanza excepción: reintentamos sin inicializar (no se guarda nada hasta cargar bien).
    const attemptSafe = async () => {
      try { await attempt(); } catch (e) {
        if (cancelled) return;
        console.error(`Error loading module ${module} from Supabase:`, e);
        retryTimeout.current = setTimeout(attemptSafe, RETRY_DELAY_MS);
      }
    };

    void attemptSafe();
    return () => {
      cancelled = true;
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
    };
  }, [userId, loading, module]);

  // Cada cambio: se marca como pendiente y se guarda enseguida.
  useEffect(() => {
    if (value === mountValueRef.current) return;
    if (!initialized.current) {
      // Solo cuenta como "cambio" si cambia el CONTENIDO (no basta con que sea un objeto nuevo).
      try {
        if (mountJsonRef.current === null) mountJsonRef.current = JSON.stringify(mountValueRef.current);
        if (JSON.stringify(value) !== mountJsonRef.current) dirtyBeforeLoadRef.current = true;
      } catch { dirtyBeforeLoadRef.current = true; }
      return;
    }
    versionRef.current += 1;
    if (userId) writePending(pendingKey(userId, module), true);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => { saveTimeout.current = null; void flushRef.current(); }, SAVE_DELAY_MS);
  }, [value, userId, module]);

  // Guardar ya al ocultar/cerrar la pestaña o salir de la pantalla.
  useEffect(() => {
    if (!userId) return;
    const key = pendingKey(userId, module);
    const flushNow = () => {
      if (saveTimeout.current) { clearTimeout(saveTimeout.current); saveTimeout.current = null; }
      if (initialized.current && readPending(key)) void flushRef.current();
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") flushNow(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushNow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushNow);
      flushNow(); // al desmontar
    };
  }, [userId, module]);

  return { ready };
}

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]
