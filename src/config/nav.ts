import { HeartPulse, Plane, Wallet, Brain, History } from "lucide-react";

export const navItems = [
  { title: "Health", url: "/salud", icon: HeartPulse },
  { title: "Second Brain", url: "/cerebro", icon: Brain },
  { title: "Trips", url: "/viajes", icon: Plane },
  { title: "Finance", url: "/finanzas", icon: Wallet },
  { title: "Evolución Temporal", url: "/objetivos", icon: History },
] as const;
