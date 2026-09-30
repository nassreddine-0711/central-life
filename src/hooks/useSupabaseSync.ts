import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { toast } from "sonner";

export function useSupabaseSync<T>(
  module: string,
  value: T,
  setValue: (v: T) => void
) {
  const { user } = useAuth();
  const initialized = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guardamos siempre el valor más reciente en una ref (para poder leerlo desde
  // el callback async de la carga inicial, que si no vería el valor "congelado"
  // del momento en que se creó el efecto).
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  // Valor con el que arrancó este módulo (antes de terminar de cargar desde
  // Supabase). Si cambia respecto a este antes de que la carga responda,
  // significa que el usuario ya ha hecho algo (p. ej. justo después de recargar
  // la página tras un despliegue) — y no hay que dejar que la carga inicial lo
  // pise y lo "borre".
  const mountValueRef = useRef(value);
  const dirtySinceMountRef = useRef(false);
  useEffect(() => {
    if (value !== mountValueRef.current) dirtySinceMountRef.current = true;
  }, [value]);

  // Guardado con debounce
  const save = useCallback(async (val: T) => {
    if (!user) return;

    // Guardado espejo en localStorage para que el módulo de Snapshots ("Versiones") pueda leer los datos
    try {
      localStorage.setItem(module, JSON.stringify(val));
    } catch (e) {
      console.error("Error al guardar espejo en localStorage para", module, e);
    }

    const { error } = await supabase
      .from("user_data")
      .upsert(
        {
          user_id: user.id,
          module,
          data: val as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,module" }
      );

    // Manejo de errores silenciosos
    if (error) {
      console.error(`Error saving module ${module} to Supabase:`, error);
      toast.error("Error de sincronización", {
        description: `No se pudieron guardar los datos de ${module}. Revisa tu conexión.`,
      });
    }
  }, [user, module]);

  // Carga inicial desde Supabase
  useEffect(() => {
    if (!user || initialized.current) return;

    supabase
      .from("user_data")
      .select("data")
      .eq("user_id", user.id)
      .eq("module", module)
      .maybeSingle()
      .then(({ data, error }) => {
        // Si el usuario ya cambió algo localmente mientras esta carga estaba en
        // marcha, no lo sobrescribimos con lo que había guardado antes: nos
        // quedamos con lo que hay ahora mismo y lo guardamos ya, para no
        // perder ese cambio (antes se descartaba en silencio porque el guardado
        // por debounce todavía no se consideraba "inicializado").
        if (dirtySinceMountRef.current) {
          initialized.current = true;
          save(valueRef.current);
          return;
        }
        if (!error && data && data.data) {
          setValue(data.data as T);
        }
        initialized.current = true;
      });
  }, [user, module, setValue, save]);

  useEffect(() => {
    if (!initialized.current) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => save(value), 1000);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [value, save]);
}

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]
