import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/button";

/** Página de un solo uso: devuelve a la nube los libros y el horario rescatados del navegador. */
const Recuperar = () => {
  const { user } = useAuth();
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const say = (m: string) => setLog((l) => [...l, m]);

  const run = async () => {
    if (!user) return say("Inicia sesión primero.");
    setBusy(true);
    try {
      const [k, r] = await Promise.all([
        fetch("/recovery/knowledge.json").then((x) => x.json()),
        fetch("/recovery/routines.json").then((x) => x.json()),
      ]);

      // Libros / idiomas / hitos: se unen con lo que haya en la nube (lo recuperado manda si coincide el id).
      const { data: kRow } = await supabase.from("user_data").select("data").eq("user_id", user.id).eq("module", "knowledge").maybeSingle();
      const cur = (kRow?.data ?? {}) as { books?: { id: string }[]; languages?: { id: string }[]; milestones?: { id: string }[] };
      const union = <T extends { id: string }>(server: T[] = [], rec: T[] = []) => {
        const ids = new Set(rec.map((x) => x.id));
        return [...rec, ...server.filter((x) => !ids.has(x.id))];
      };
      const realBooks = (cur.books ?? []).filter((b) => !/^b[1-4]$/.test(b.id));
      const knowledge = {
        books: union(realBooks, k.books),
        languages: k.languages ?? cur.languages,
        milestones: k.milestones ?? cur.milestones,
      };
      let res = await supabase.from("user_data").upsert(
        { user_id: user.id, module: "knowledge", data: knowledge, updated_at: new Date().toISOString() },
        { onConflict: "user_id,module" },
      );
      if (res.error) throw res.error;
      say(`Libros restaurados: ${knowledge.books.length}`);

      res = await supabase.from("user_data").upsert(
        { user_id: user.id, module: "cerebro_routines", data: r, updated_at: new Date().toISOString() },
        { onConflict: "user_id,module" },
      );
      if (res.error) throw res.error;
      try { localStorage.setItem("cerebro.routines.v1", JSON.stringify(r)); } catch { /* */ }
      say("Horario semanal restaurado.");
      say("Listo. Recarga la página y revisa Biblioteca y Horario.");
    } catch (e) {
      say("Error: " + (e instanceof Error ? e.message : JSON.stringify(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-xl font-semibold">Recuperar libros y horario</h1>
      <p className="text-sm text-muted-foreground">
        Restaura tus 6 libros y tu horario semanal (copia rescatada de Opera) en tu cuenta. Es seguro: une los libros con los que haya, sin borrar nada.
      </p>
      <Button onClick={run} disabled={busy}>{busy ? "Restaurando…" : "Restaurar ahora"}</Button>
      <ul className="space-y-1 text-sm">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </div>
  );
};
export default Recuperar;
