import { Brain, ListTodo, Library as LibraryIcon, Archive } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AccionEnfoquePanel } from "@/features/cerebro/panels/AccionEnfoquePanel";
import { BibliotecaPanel } from "@/features/cerebro/panels/BibliotecaPanel";
import { ArchivoPanel } from "@/features/cerebro/panels/ArchivoPanel";
import { TaskDialog, NoteSheet, QuickCaptureDrawer } from "@/features/cerebro/Dialogs";
import "@/features/knowledge/atelier.css";

function CerebroShell() {
  return (
    <div className="w-full px-4 py-8 md:px-8 md:py-12">
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

      {/* Mounted modals */}
      <TaskDialog />
      <NoteSheet />
      <QuickCaptureDrawer />
    </div>
  );
}

export default function Cerebro() {
  return <CerebroShell />;
}