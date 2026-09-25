import { BookOpen, Film } from "lucide-react";
import { Section } from "../TaskComponents";
import { Library } from "@/features/knowledge/Library";
import { Audiovisual } from "@/features/knowledge/Audiovisual";

export function BibliotecaPanel() {
  return (
    <div className="space-y-6">
      <Section title="Mediateca · Lecturas" icon={<BookOpen className="h-4 w-4 text-primary" />}>
        <Library />
      </Section>
      <Section title="Consumo Audiovisual" icon={<Film className="h-4 w-4 text-primary" />}>
        <Audiovisual />
      </Section>
    </div>
  );
}
