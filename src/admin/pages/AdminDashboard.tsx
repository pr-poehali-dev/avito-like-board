import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../api";
import { useAdminAuth } from "../AdminAuthContext";
import Icon from "@/components/ui/icon";

interface Stats {
  users_count: number;
  ads_count: number;
  online_count: number;
  pending_ads_count?: number;
  new_users_today?: number;
}

interface RecentAd {
  id: number;
  title: string;
  status: string;
  city: string;
  created_at: string;
}

interface RecentUser {
  id: number;
  name: string;
  full_name?: string;
  email: string;
  created_at: string;
  is_banned: boolean;
}

interface LogEntry {
  id: number;
  action: string;
  details: string;
  status_code: number;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Активно", color: "bg-green-100 text-green-700" },
  pending: { label: "На модерации", color: "bg-yellow-100 text-yellow-700" },
  rejected: { label: "Отклонено", color: "bg-red-100 text-red-700" },
  closed: { label: "Закрыто", color: "bg-gray-100 text-gray-500" },
  archived: { label: "Архив", color: "bg-gray-100 text-gray-400" },
};

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  onClick,
}: {
  icon: string;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-border p-5 flex items-start gap-4 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon name={icon as "Home"} size={20} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-[hsl(var(--foreground))]">{value}</div>
        <div className="text-sm text-[hsl(var(--muted-foreground))]">{label}</div>
        {sub && <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function SectionHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon name={icon as "Home"} size={16} className="text-[hsl(var(--muted-foreground))]" />
        <span className="font-semibold text-sm text-[hsl(var(--foreground))]">{title}</span>
      </div>
      {action && (
        <button onClick={action.onClick} className="text-xs text-[hsl(var(--primary))] hover:underline">
          {action.label}
        </button>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAdminAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats | null>(null);
  const [recentAds, setRecentAds] = useState<RecentAd[]>([]);
  const [pendingAds, setPendingAds] = useState<RecentAd[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [statsRes, adsRes, pendingRes, usersRes, logsRes] = await Promise.all([
          adminApi.stats(),
          adminApi.adsList({ limit: 5, offset: 0, status: "active", sort: "created_at", order: "desc" }),
          adminApi.adsList({ limit: 5, offset: 0, status: "pending", sort: "created_at", order: "desc" }),
          adminApi.usersList({ limit: 5, offset: 0, sort: "created_at", order: "desc" }),
          adminApi.logs({ limit: 7 }),
        ]);
        if (statsRes.ok) setStats(statsRes);
        if (adsRes.ok) setRecentAds(adsRes.ads || []);
        if (pendingRes.ok) setPendingAds(pendingRes.ads || []);
        if (usersRes.ok) setRecentUsers(usersRes.users || []);
        if (logsRes.ok) setLogs(logsRes.logs || []);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 6) return "Доброй ночи";
    if (h < 12) return "Доброе утро";
    if (h < 18) return "Добрый день";
    return "Добрый вечер";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-[hsl(var(--muted))] rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-52 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
          {greeting()}, {user?.full_name || user?.name}
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
          {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="Users"
          label="Пользователей"
          value={stats?.users_count ?? "—"}
          sub={stats?.new_users_today ? `+${stats.new_users_today} сегодня` : undefined}
          color="bg-[hsl(var(--primary))]"
          onClick={() => navigate("/admin/users")}
        />
        <StatCard
          icon="FileText"
          label="Объявлений"
          value={stats?.ads_count ?? "—"}
          color="bg-emerald-500"
          onClick={() => navigate("/admin/ads")}
        />
        <StatCard
          icon="Clock"
          label="На модерации"
          value={stats?.pending_ads_count ?? pendingAds.length}
          color="bg-amber-500"
          onClick={() => navigate("/admin/ads")}
        />
        <StatCard
          icon="Activity"
          label="Онлайн сейчас"
          value={stats?.online_count ?? "—"}
          color="bg-violet-500"
        />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-border p-5">
        <SectionHeader title="Быстрые действия" icon="Zap" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: "Пользователи", icon: "Users", to: "/admin/users", color: "text-[hsl(var(--primary))] bg-blue-50 hover:bg-blue-100" },
            { label: "Объявления", icon: "FileText", to: "/admin/ads", color: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" },
            { label: "Категории", icon: "FolderOpen", to: "/admin/categories", color: "text-orange-600 bg-orange-50 hover:bg-orange-100" },
            { label: "Чат", icon: "MessageCircle", to: "/admin/chat", color: "text-violet-600 bg-violet-50 hover:bg-violet-100" },
            { label: "Журнал", icon: "ScrollText", to: "/admin/logs", color: "text-gray-600 bg-gray-50 hover:bg-gray-100" },
            { label: "Настройки", icon: "Settings", to: "/admin/settings", color: "text-slate-600 bg-slate-50 hover:bg-slate-100" },
          ].map((a) => (
            <button
              key={a.to}
              onClick={() => navigate(a.to)}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${a.color}`}
            >
              <Icon name={a.icon as "Home"} size={20} />
              <span className="text-xs font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending ads */}
        <div className="bg-white rounded-xl border border-border p-5">
          <SectionHeader
            title="Ожидают модерации"
            icon="Clock"
            action={{ label: "Все объявления →", onClick: () => navigate("/admin/ads") }}
          />
          {pendingAds.length === 0 ? (
            <div className="text-center py-8 text-[hsl(var(--muted-foreground))] text-sm">
              <Icon name="CheckCircle" size={32} className="mx-auto mb-2 text-green-400" />
              Нет объявлений на модерации
            </div>
          ) : (
            <div className="space-y-2">
              {pendingAds.map((ad) => (
                <div
                  key={ad.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-amber-50 cursor-pointer transition-colors"
                  onClick={() => navigate("/admin/ads")}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{ad.title}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      {ad.city} · {formatDate(ad.created_at)}
                    </div>
                  </div>
                  <span className="ml-2 shrink-0 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                    На модерации
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent users */}
        <div className="bg-white rounded-xl border border-border p-5">
          <SectionHeader
            title="Новые пользователи"
            icon="UserPlus"
            action={{ label: "Все пользователи →", onClick: () => navigate("/admin/users") }}
          />
          {recentUsers.length === 0 ? (
            <div className="text-center py-8 text-[hsl(var(--muted-foreground))] text-sm">Нет данных</div>
          ) : (
            <div className="space-y-2">
              {recentUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => navigate("/admin/users")}
                >
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">
                      {(u.full_name || u.name || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                      {u.full_name || u.name}
                    </div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">{u.email}</div>
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] shrink-0">
                    {formatDate(u.created_at)}
                  </div>
                  {u.is_banned && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Бан</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent ads */}
        <div className="bg-white rounded-xl border border-border p-5">
          <SectionHeader
            title="Последние объявления"
            icon="FileText"
            action={{ label: "Все →", onClick: () => navigate("/admin/ads") }}
          />
          {recentAds.length === 0 ? (
            <div className="text-center py-8 text-[hsl(var(--muted-foreground))] text-sm">Нет данных</div>
          ) : (
            <div className="space-y-2">
              {recentAds.map((ad) => {
                const s = STATUS_LABELS[ad.status] || { label: ad.status, color: "bg-gray-100 text-gray-500" };
                return (
                  <div
                    key={ad.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-emerald-50 cursor-pointer transition-colors"
                    onClick={() => navigate("/admin/ads")}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{ad.title}</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">
                        {ad.city} · {formatDate(ad.created_at)}
                      </div>
                    </div>
                    <span className={`ml-2 shrink-0 text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="bg-white rounded-xl border border-border p-5">
          <SectionHeader
            title="Журнал активности"
            icon="ScrollText"
            action={{ label: "Полный журнал →", onClick: () => navigate("/admin/logs") }}
          />
          {logs.length === 0 ? (
            <div className="text-center py-8 text-[hsl(var(--muted-foreground))] text-sm">Нет записей</div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--muted))]">
                  <div
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${log.status_code < 400 ? "bg-green-400" : "bg-red-400"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[hsl(var(--foreground))]">{log.action}</div>
                    {log.details && (
                      <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">{log.details}</div>
                    )}
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] shrink-0">
                    {formatDate(log.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}