import { HeartPulse, Plane, Wallet, Target, Brain, Gauge } from "lucide-react";

export const navItems = [
  { title: "Panorama", url: "/panorama", icon: Gauge },
  { title: "RoadMap", url: "/objetivos", icon: Target },
  { title: "Health", url: "/salud", icon: HeartPulse },
  { title: "Second Brain", url: "/cerebro", icon: Brain },
  { title: "Trips", url: "/viajes", icon: Plane },
  { title: "Finance", url: "/finanzas", icon: Wallet },
] as const;

// Target date for the 25th birthday countdown.
// TODO: replace with the user's actual date.
export const TARGET_DATE = new Date("2029-03-15T00:00:00");
