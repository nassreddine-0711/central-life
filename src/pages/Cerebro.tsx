import { Brain, ListTodo, Library as LibraryIcon, Archive, Plus, X, StickyNote, Zap } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CerebroProvider, useCerebro } from "@/features/cerebro/CerebroContext";
import { KnowledgeProvider } from "@/features/knowledge/KnowledgeContext";
import { AudiovisualProvider } from "@/features/knowledge/AudiovisualContext";
import { AccionEnfoquePanel } from "@/features/cerebro/panels/AccionEnfoquePanel";
import { BibliotecaPanel } from "@/features/cerebro/panels/BibliotecaPanel";
import { ArchivoPanel } from "@/features/cerebro/panels/ArchivoPanel";
import { TaskDialog, NoteSheet, QuickCaptureDrawer } from "@/features/cerebro/Dialogs";
import "@/features/knowledge/atelier.css";

function CerebroShell() {
  const { openTaskDialog, openNoteSheet, openQuickCapture } = useCerebro();
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-gradient">Second Brain</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main tabs */}
      <Tabs defaultValue="accion" className="w-full">
        <div className="mb-6 flex justify-center overflow-x-auto">
          <TabsList className="inline-flex h-auto items-center gap-1 rounded-full border border-neutral-200 bg-white p-1 shadow-sm">
            <TabsTrigger value="accion" className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-600 transition data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow whitespace-nowrap">
              <ListTodo className="mr-2 h-3.5 w-3.5" />Acción y Enfoque
            </TabsTrigger>
            <TabsTrigger value="biblioteca" className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-600 transition data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow whitespace-nowrap">
              <LibraryIcon className="mr-2 h-3.5 w-3.5" />Biblioteca Mental
            </TabsTrigger>
            <TabsTrigger value="archivo" className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-600 transition data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow whitespace-nowrap">
              <Archive className="mr-2 h-3.5 w-3.5" />Archivo & Referencias
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="accion"><AccionEnfoquePanel /></TabsContent>
        <TabsContent value="biblioteca"><BibliotecaPanel /></TabsContent>
        <TabsContent value="archivo"><ArchivoPanel /></TabsContent>
      </Tabs>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {fabOpen && (
          <>
            <Button className="shadow-lg" onClick={() => { openTaskDialog(); setFabOpen(false); }}>
              <ListTodo className="h-4 w-4" /> Tarea
            </Button>
            <Button className="shadow-lg" variant="secondary" onClick={() => { openNoteSheet(); setFabOpen(false); }}>
              <StickyNote className="h-4 w-4" /> Nota
            </Button>
            <Button className="shadow-lg" variant="outline" onClick={() => { openQuickCapture(); setFabOpen(false); }}>
              <Zap className="h-4 w-4" /> Captura rápida
            </Button>
          </>
        )}
        <Button size="icon" className="h-14 w-14 rounded-full shadow-glow" onClick={() => setFabOpen(o => !o)}>
          {fabOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mounted modals */}
      <TaskDialog />
      <NoteSheet />
      <QuickCaptureDrawer />
    </div>
  );
}

export default function Cerebro() {
  return (
    <KnowledgeProvider>
      <AudiovisualProvider>
        <CerebroProvider>
          <CerebroShell />
        </CerebroProvider>
      </AudiovisualProvider>
    </KnowledgeProvider>
  );
}