import { useMemo, useState } from "react";
import { Plus, StickyNote, Search, Tag, FileText, Link2, Archive, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCerebro } from "../CerebroContext";
import { Section, Empty } from "../TaskComponents";
import { NoteCard, CategoryChip } from "../NoteComponents";
import { ManageCategoriesDialog } from "../Dialogs";
import { ApuntesPanel } from "./ApuntesPanel";

export function ArchivoPanel() {
  const { notes, noteCats, openNoteSheet } = useCerebro();
  const [search, setSearch] = useState("");
  const [activeNoteCat, setActiveNoteCat] = useState<string>("__all");
  const [noteKindFilter, setNoteKindFilter] = useState<"all" | "note" | "ref">("all");
  const [manageCatsOpen, setManageCatsOpen] = useState(false);

  const filteredNotes = useMemo(() => {
    const q = search.toLowerCase().trim();
    return notes.filter(n => {
      if (noteKindFilter !== "all" && n.kind !== noteKindFilter) return false;
      if (activeNoteCat !== "__all" && n.category !== activeNoteCat) return false;
      if (!q) return true;
      return n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q));
    });
  }, [notes, search, noteKindFilter, activeNoteCat]);

  const noteCountByCat = useMemo(() => {
    const m = new Map<string, number>();
    notes.forEach(n => m.set(n.category, (m.get(n.category) ?? 0) + 1));
    return m;
  }, [notes]);

  return (
    <Tabs defaultValue="archivo" className="w-full">
      <div className="mb-4 -mx-1 overflow-x-auto px-1">
        <TabsList className="inline-flex h-auto w-max gap-1">
          <TabsTrigger value="archivo" className="whitespace-nowrap">
            <Archive className="mr-2 h-4 w-4" />Archivo
          </TabsTrigger>
          <TabsTrigger value="apuntes" className="whitespace-nowrap">
            <NotebookPen className="mr-2 h-4 w-4" />Apuntes
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="archivo" className="mt-0">
        <div className="space-y-6">
          <Section title="Knowledge Vault" icon={<StickyNote className="h-4 w-4" />} action={
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setManageCatsOpen(true)}>
                <Tag className="h-4 w-4" /> Categorías
              </Button>
              <Button size="sm" variant="outline" onClick={() => openNoteSheet({ defaultCategory: activeNoteCat !== "__all" ? activeNoteCat : undefined })}>
                <Plus className="h-4 w-4" /> Nueva nota
              </Button>
            </div>
          }>
            <div className="relative mb-3">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar notas y referencias…" className="pl-8" />
            </div>

            <div className="mb-3">
              <Tabs value={noteKindFilter} onValueChange={(v) => setNoteKindFilter(v as "all" | "note" | "ref")}>
                <TabsList>
                  <TabsTrigger value="all">Todo</TabsTrigger>
                  <TabsTrigger value="note"><FileText className="mr-2 h-4 w-4" />Notas</TabsTrigger>
                  <TabsTrigger value="ref"><Link2 className="mr-2 h-4 w-4" />Referencias</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <CategoryChip label={`Todas (${notes.length})`} active={activeNoteCat === "__all"} onClick={() => setActiveNoteCat("__all")} />
              {noteCats.map(c => (
                <CategoryChip
                  key={c}
                  label={`${c} (${noteCountByCat.get(c) ?? 0})`}
                  active={activeNoteCat === c}
                  onClick={() => setActiveNoteCat(c)}
                />
              ))}
            </div>

            {filteredNotes.length === 0 ? <Empty msg="Sin notas en esta vista." /> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredNotes.map(n => <NoteCard key={n.id} note={n} />)}
              </div>
            )}
          </Section>

          <ManageCategoriesDialog open={manageCatsOpen} onOpenChange={setManageCatsOpen} />
        </div>
      </TabsContent>

      <TabsContent value="apuntes" className="mt-0">
        <ApuntesPanel />
      </TabsContent>
    </Tabs>
  );
}