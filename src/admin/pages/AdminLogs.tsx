import { useState, useEffect, useCallback } from "react";
import { adminApi } from "../api";

interface LogEntry {
  id: number;
  action: string;
  details: string;
  ip: string;
  status_code: number;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

const LEVELS = [
  { id: "all", label: "Все" },
  { id: "ok", label: "Успешные" },
  { id: "error", label: "Ошибки" },
];

const PAGE_SIZE = 50;

function StatusBadge({ code }: { code: number }) {
  const isError = code >= 400;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold ${
        isError
          ? "bg-red-100 text-red-600 border border-red-200"
          : "bg-emerald-100 text-emerald-700 border border-emerald-200"
      }`}
    >
      {code}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    login: "bg-blue-100 text-blue-700 border-blue-200",
    logout: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-border",
    settings_save: "bg-amber-100 text-amber-700 border-amber-200",
    ql_create: "bg-emerald-100 text-emerald-700 border-emerald-200",
    ql_update: "bg-blue-100 text-blue-700 border-blue-200",
    ql_delete: "bg-red-100 text-red-600 border-red-200",
  };
  const cls = colors[action] || "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono border ${cls}`}>
      {action}
    </span>
  );
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState("all");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const load = useCallback(async (lvl: string, pg: number) => {
    setLoading(true);
    const d = await adminApi.logs({ limit: PAGE_SIZE, offset: pg * PAGE_SIZE, level: lvl });
    setLogs((d.items as LogEntry[]) || []);
    setTotal((d.total as number) || 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(level, page); }, [level, page, load]);

  const handleLevel = (l: string) => { setLevel(l); setPage(0); };

  const filtered = search.trim()
    ? logs.filter((l) =>
        l.action.includes(search) ||
        (l.details || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.ip || "").includes(search) ||
        (l.user_name || "").toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Журнал событий</h1>
          <p className="text-gray-400 text-sm mt-1">Все действия администраторов и обращения к серверу</p>
        </div>
        <button
          onClick={() => load(level, page)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Обновить
        </button>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              onClick={() => handleLevel(l.id)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                level === l.id ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-48">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по действию, IP, пользователю..."
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600"
          />
        </div>
        <span className="text-gray-500 text-sm">Всего: {total}</span>
      </div>

      {/* Таблица */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 text-sm">Нет записей</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Время</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Действие</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Детали</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Пользователь</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">IP</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Код</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap font-mono">
                      {log.created_at.replace("T", " ").slice(0, 19)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs">
                      <span className="truncate block" title={log.details}>{log.details || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {log.user_name ? (
                        <div>
                          <p className="text-gray-200">{log.user_name}</p>
                          <p className="text-gray-600">{log.user_email}</p>
                        </div>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono whitespace-nowrap">
                      {log.ip || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge code={log.status_code} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 bg-gray-900 border border-gray-800 text-gray-400 text-sm rounded-xl hover:text-white disabled:opacity-30 transition-colors"
          >
            ← Назад
          </button>
          <span className="text-gray-500 text-sm">
            Стр. {page + 1} из {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 bg-gray-900 border border-gray-800 text-gray-400 text-sm rounded-xl hover:text-white disabled:opacity-30 transition-colors"
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}