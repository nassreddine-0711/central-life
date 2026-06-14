import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { FinanceProvider } from "@/features/finance/FinanceContext";
import { HealthProvider } from "@/features/health/HealthContext";
import { TravelProvider } from "@/features/travel/TravelContext";
import { KnowledgeProvider } from "@/features/knowledge/KnowledgeContext";
import { AudiovisualProvider } from "@/features/knowledge/AudiovisualContext";
import { CerebroProvider } from "@/features/cerebro/CerebroContext";
import Login from "./pages/Login";
import Salud from "./pages/Salud.tsx";
import Viajes from "./pages/Viajes.tsx";
import Finanzas from "./pages/Finanzas.tsx";
import Objetivos from "./pages/Objetivos.tsx";
import Cerebro from "./pages/Cerebro.tsx";
import NotFound from "./pages/NotFound.tsx";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <FinanceProvider>
      <HealthProvider>
        <TravelProvider>
          <KnowledgeProvider>
            <AudiovisualProvider>
              <CerebroProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <Routes>
                      <Route element={<AppLayout />}>
                        <Route path="/" element={<Navigate to="/objetivos" replace />} />
                        <Route path="/salud" element={<Salud />} />
                        <Route path="/conocimiento" element={<Navigate to="/cerebro" replace />} />
                        <Route path="/viajes" element={<Viajes />} />
                        <Route path="/finanzas" element={<Finanzas />} />
                        <Route path="/objetivos" element={<Objetivos />} />
                        <Route path="/cerebro" element={<Cerebro />} />
                      </Route>
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </TooltipProvider>
              </CerebroProvider>
            </AudiovisualProvider>
          </KnowledgeProvider>
        </TravelProvider>
      </HealthProvider>
    </FinanceProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;