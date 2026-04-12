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
import ChatPage from "./pages/ChatPage";
import UserProfilePage from "./pages/UserProfilePage";
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

    const adminToken = localStorage.getItem("admin_token");

    fetch(ADS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status" }),
    })
      .then((r) => r.json())
      .then(async (d) => {
        if (!d.offline) { setChecked(true); return; }

        // Сайт offline — проверяем есть ли валидный admin_token
        if (!adminToken) { setOffline(true); setChecked(true); return; }

        // Передаём токен в теле запроса (заголовки фильтруются прокси)
        const r2 = await fetch(ADS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "categories", admin_token: adminToken }),
        });
        const d2 = await r2.json();
        if (!d2.ok) setOffline(true);
        setChecked(true);
      })
      .catch(() => setChecked(true));
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
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/user/:userId" element={<UserProfilePage />} />
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