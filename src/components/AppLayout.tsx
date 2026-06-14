import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AppLayout() {
  return (
    <SidebarProvider>
      {/* CAMBIO CLAVE: min-h-[100dvh] en lugar de min-h-screen para evitar problemas con la barra del navegador móvil */}
      <div className="flex min-h-[100dvh] w-full bg-background selection:bg-primary/20 overflow-x-hidden">
        <AppSidebar />
        
        {/* max-w-[100vw] asegura que nunca haya scroll horizontal en móvil */}
        <div className="relative flex flex-1 flex-col min-w-0 w-full max-w-[100vw] overflow-x-hidden">
          {/* Ambient backdrop blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
            <div className="absolute -top-40 left-1/3 h-[300px] w-[300px] sm:h-[500px] sm:w-[500px] rounded-full bg-primary/5 blur-[80px] sm:blur-[120px]" />
            <div className="absolute bottom-0 right-0 h-[250px] w-[250px] sm:h-[400px] sm:w-[400px] rounded-full bg-accent/5 blur-[80px] sm:blur-[120px]" />
          </div>

          <header className="sticky top-0 z-30 flex h-14 w-full items-center gap-3 border-b border-border/40 bg-background/80 px-3 sm:px-4 backdrop-blur-xl shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground h-9 w-9 rounded-xl" />
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
            </div>
          </header>

          <main className="relative flex-1 w-full max-w-full overflow-x-hidden overflow-y-auto z-10 pb-6 sm:pb-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}