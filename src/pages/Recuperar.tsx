import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/button";

/** Página de un solo uso: devuelve a la nube los libros rescatados del navegador.
 *  Solo toca el campo "books"; idiomas, hitos y horario se dejan tal cual estén en tu
 *  cuenta ahora mismo (no se tocan ni se pisan). Se puede pulsar varias veces sin riesgo:
 *  siempre une con lo que haya, nunca sustituye ni borra. */
const Recuperar = () => {
  const { user } = useAuth();
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const say = (m: string) => setLog((l) => [...l, m]);

  const run = async () => {
    if (!user) return say("Inicia sesión primero.");
    setBusy(true);
    try {
      const k = await fetch("/recovery/knowledge.json").then((x) => x.json());

      const { data: kRow } = await supabase.from("user_data").select("data").eq("user_id", user.id).eq("module", "knowledge").maybeSingle();
      const cur = (kRow?.data ?? {}) as Record<string, unknown> & { books?: { id: string; title?: string }[] };
      const union = <T extends { id: string }>(server: T[] = [], rec: T[] = []) => {
        const ids = new Set(rec.map((x) => x.id));
        return [...rec, ...server.filter((x) => !ids.has(x.id))];
      };
      // Los libros de ejemplo (b1-b4) no cuentan como "reales": si están ahora mismo en la
      // nube es que se perdieron los de verdad, así que no se mezclan con los rescatados.
      const realBooks = (cur.books ?? []).filter((b) => !/^b[1-4]$/.test(b.id));
      const books: { id: string; title?: string }[] = union(realBooks, k.books ?? []);
      const knowledge = { ...cur, books };
      const res = await supabase.from("user_data").upsert(
        { user_id: user.id, module: "knowledge", data: knowledge, updated_at: new Date().toISOString() },
        { onConflict: "user_id,module" },
      );
      if (res.error) throw res.error;
      say(`Libros restaurados: ${books.length} (${books.map((b) => b.title).join(", ")})`);
      say("Listo. Recarga la página y revisa Biblioteca.");
    } catch (e) {
      say("Error: " + (e instanceof Error ? e.message : JSON.stringify(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-xl font-semibold">Recuperar libros</h1>
      <p className="text-sm text-muted-foreground">
        Restaura tus 6 libros (copia rescatada de Opera) en tu cuenta. Es seguro: solo toca
        el campo de libros, los une con los que haya ahora y no borra ni toca nada más.
      </p>
      <Button onClick={run} disabled={busy}>{busy ? "Restaurando…" : "Restaurar ahora"}</Button>
      <ul className="space-y-1 text-sm">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </div>
  );
};
export default Recuperar;
