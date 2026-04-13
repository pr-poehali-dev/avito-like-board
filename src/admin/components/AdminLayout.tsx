import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../AdminAuthContext";
import Icon from "@/components/ui/icon";

const navItems = [
  { to: "/admin", label: "Главная", icon: "LayoutDashboard", end: true },
  { to: "/admin/users", label: "Пользователи", icon: "Users", end: false },
  { to: "/admin/categories", label: "Категории", icon: "FolderOpen", end: false },
  { to: "/admin/ads", label: "Объявления", icon: "FileText", end: false },
  { to: "/admin/chat", label: "Чат", icon: "MessageCircle", end: false },
  { to: "/admin/logs", label: "Журнал", icon: "ScrollText", end: false },
  { to: "/admin/settings", label: "Настройки", icon: "Settings", end: false },
];

export default function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border h-14 px-6 flex items-center justify-between shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[hsl(var(--primary))] rounded-lg flex items-center justify-center">
            <Icon name="LayoutDashboard" size={14} className="text-white" />
          </div>
          <span className="font-semibold text-sm text-[hsl(var(--foreground))]">Панель управления</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-sm transition-colors flex items-center gap-1.5">
            <Icon name="ArrowLeft" size={14} />
            На сайт
          </a>
          <span className="text-[hsl(var(--muted-foreground))] text-sm hidden sm:block">
            {user?.full_name || user?.name}
          </span>
          <button
            onClick={handleLogout}
            className="text-[hsl(var(--muted-foreground))] hover:text-red-500 text-sm transition-colors flex items-center gap-1.5"
          >
            <Icon name="LogOut" size={14} />
            Выйти
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-52 bg-white border-r border-border flex flex-col py-3 shrink-0">
          <nav className="flex flex-col gap-0.5 px-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[hsl(var(--primary))] text-white"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                  }`
                }
              >
                <Icon name={item.icon as "Home"} size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto px-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <Icon name="LogOut" size={16} />
              Выход
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6 bg-[hsl(var(--background))]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
