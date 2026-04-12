import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminApp from "./admin/AdminApp";
import CategoryPage from "./pages/CategoryPage";
import OfflinePage from "./pages/OfflinePage";
import { ADS_URL } from "./pages/index/types";

const queryClient = new QueryClient();
const adminPath = (localStorage.getItem("admin_path") || "/admin").replace(/\/$/, "") || "/admin";

function SiteGuard({ children }: { children: React.ReactNode }) {
  const [offline, setOffline] = useState(false);
  const [checked, setChecked] = useState(false);
  const location = useLocation();

  // Админ-маршруты пропускаем без проверки
  const isAdminRoute = location.pathname.startsWith(adminPath);

  useEffect(() => {
    if (isAdminRoute) { setChecked(true); return; }
    // Проверяем статус сайта
    fetch(ADS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.offline) {
          // Проверяем — может пользователь admin (есть admin-token в localStorage)
          const adminToken = localStorage.getItem("admin_token");
          if (!adminToken) {
            setOffline(true);
          } else {
            // Проверяем валидность admin-токена через ответ categories
            fetch(ADS_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
              body: JSON.stringify({ action: "categories" }),
            })
              .then((r2) => r2.json())
              .then((d2) => { setOffline(!d2.ok); })
              .catch(() => { setOffline(true); });
          }
        }
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, [isAdminRoute]);

  if (!checked) return null;
  if (offline) return <OfflinePage />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SiteGuard>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/:slug" element={<CategoryPage />} />
            <Route path="/:slug/:subslug" element={<CategoryPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path={`${adminPath}/*`} element={<AdminApp basePath={adminPath} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SiteGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
