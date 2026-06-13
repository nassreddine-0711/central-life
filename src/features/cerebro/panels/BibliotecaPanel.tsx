import { GraduationCap, Languages, BookOpen, Film, Compass, Library as LibraryIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Section } from "../TaskComponents";
import { SkillTree } from "@/features/knowledge/SkillTree";
import { LanguageProgressList } from "@/features/knowledge/LanguageProgressList";
import { Library } from "@/features/knowledge/Library";
import { Audiovisual } from "@/features/knowledge/Audiovisual";

export function BibliotecaPanel() {
  return (
    <Tabs defaultValue="trayectoria" className="w-full">
      <div className="mb-6 -mx-1 flex justify-start overflow-x-auto px-1 sm:justify-center">
        <TabsList className="h-10 bg-transparent gap-1 border-b border-border/60 rounded-none p-0 w-auto">
          <TabsTrigger
            value="trayectoria"
            className="relative whitespace-nowrap rounded-none border-0 bg-transparent px-3 sm:px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:inset-x-2 after:-bottom-px after:h-px after:bg-primary after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
          >
            <Compass className="mr-2 h-4 w-4" /> Trayectoria & Idiomas
          </TabsTrigger>
          <TabsTrigger
            value="mediateca"
            className="relative whitespace-nowrap rounded-none border-0 bg-transparent px-3 sm:px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:inset-x-2 after:-bottom-px after:h-px after:bg-primary after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
          >
            <LibraryIcon className="mr-2 h-4 w-4" /> Mediateca / Consumo
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="trayectoria" className="space-y-6">
        <Section title="Trayectoria Académica y Profesional" icon={<GraduationCap className="h-4 w-4 text-primary" />}>
          <SkillTree />
        </Section>
        <Section title="Idiomas" icon={<Languages className="h-4 w-4 text-primary" />}>
          <LanguageProgressList />
        </Section>
      </TabsContent>

      <TabsContent value="mediateca" className="space-y-6">
        <Section title="Mediateca · Lecturas" icon={<BookOpen className="h-4 w-4 text-primary" />}>
          <Library />
        </Section>
        <Section title="Consumo Audiovisual" icon={<Film className="h-4 w-4 text-primary" />}>
          <Audiovisual />
        </Section>
      </TabsContent>
    </Tabs>
  );
}
