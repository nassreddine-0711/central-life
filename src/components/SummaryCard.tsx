import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

interface SummaryCardProps {
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  to: string;
  metric?: string;
  accent?: "primary" | "accent" | "rose" | "emerald";
}

const accentMap = {
  primary: "from-primary/30 to-primary/5",
  accent: "from-accent/30 to-accent/5",
  rose: "from-[hsl(330_80%_60%)]/30 to-[hsl(330_80%_60%)]/5",
  emerald: "from-[hsl(160_70%_50%)]/30 to-[hsl(160_70%_50%)]/5",
};

export function SummaryCard({
  title,
  subtitle,
  description,
  icon: Icon,
  to,
  metric,
  accent = "primary",
}: SummaryCardProps) {
  return (
    <Link
      to={to}
      className="group relative block overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-xl transition-all duration-500 hover:border-primary/40 hover:shadow-glow-soft"
    >
      {/* Accent gradient */}
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${accentMap[accent]} blur-2xl opacity-70 transition-opacity duration-500 group-hover:opacity-100`}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-background/60">
          <Icon className="h-5 w-5 text-foreground/80" />
        </div>
        <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      <div className="relative mt-6">
        <div className="text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
          {subtitle}
        </div>
        <div className="mt-1 text-xl font-semibold text-foreground">{title}</div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>

      {metric && (
        <div className="relative mt-6 flex items-baseline gap-2 border-t border-border/50 pt-4">
          <span className="font-mono text-2xl font-bold text-foreground">{metric}</span>
          <span className="text-xs text-muted-foreground">próximamente</span>
        </div>
      )}
    </Link>
  );
}
