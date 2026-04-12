import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { adminApi } from "./api";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  full_name?: string;
  is_admin: boolean;
}

interface AdminAuthCtx {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthCtx>({} as AdminAuthCtx);

export function AdminAuthProvider({ children, basePath = "/admin" }: { children: ReactNode; basePath?: string }) {
  // Синхронизируем basePath в localStorage чтобы App.tsx читал при следующей загрузке
  if (typeof window !== "undefined") {
    localStorage.setItem("admin_path", basePath);
  }
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { setLoading(false); return; }
    adminApi.me().then((d) => {
      if (d.ok) setUser(d.user as AdminUser);
      else localStorage.removeItem("admin_token");
    }).finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    const d = await adminApi.login(email, password);
    if (d.ok) {
      localStorage.setItem("admin_token", d.token as string);
      setUser(d.user as AdminUser);
      return null;
    }
    return d.error as string || "Ошибка входа";
  };

  const logout = async () => {
    await adminApi.logout();
    localStorage.removeItem("admin_token");
    setUser(null);
  };

  return (
    <AdminAuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}