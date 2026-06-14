import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

export function useSupabaseSync<T>(
  module: string,
  value: T,
  setValue: (v: T) => void
) {
  const { user } = useAuth();
  const initialized = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        if (!error && data && data.data) {
          setValue(data.data as T);
        }
        initialized.current = true;
      });
  }, [user, module, setValue]);

  // Guardado con debounce
  const save = useCallback(async (val: T) => {
    if (!user || !initialized.current) return;

    await supabase
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
  }, [user, module]);

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