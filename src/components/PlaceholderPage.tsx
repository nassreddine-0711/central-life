import { LucideIcon } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
}

export function PlaceholderPage({ title, subtitle, description, icon: Icon }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-20">
      <div className="glass relative overflow-hidden rounded-3xl p-10 md:p-16">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative flex flex-col items-start gap-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>

          <div>
            <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
              {subtitle}
            </span>
            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
              <span className="text-gradient">{title}</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {description}
            </p>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-4 py-2 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse-slow rounded-full bg-primary" />
            En construcción · Próximamente
          </div>
        </div>
      </div>
    </div>
  );
}
