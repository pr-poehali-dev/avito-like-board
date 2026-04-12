import { useState, useEffect } from "react";
import { adminApi } from "../api";
import { useAdminAuth } from "../AdminAuthContext";

interface QuickLink {
  id: number;
  title: string;
  url: string;
  icon: string;
  sort_order: number;
}

interface Stats {
  users_count: number;
  ads_count: number;
  online_count: number;
}

const ICON_OPTIONS = ["Link", "Plus", "Users", "Settings", "FileText", "Star", "Bell", "Shield", "CreditCard", "Package"];

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-white text-2xl font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function QuickLinkCard({ link, onEdit, onDelete }: { link: QuickLink; onEdit: (l: QuickLink) => void; onDelete: (id: number) => void }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-3 hover:border-gray-700 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-400 text-sm font-bold shrink-0">
          {link.icon?.slice(0, 2) || "🔗"}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{link.title}</p>
          <p className="text-gray-500 text-xs truncate">{link.url}</p>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(link)}
          className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          title="Редактировать"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(link.id)}
          className="p-1.5 rounded-lg hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-colors"
          title="Удалить"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const emptyForm = { title: "", url: "", icon: "Link", sort_order: 0 };

export default function AdminDashboard() {
  const { user } = useAdminAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [linksLoading, setLinksLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editLink, setEditLink] = useState<QuickLink | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.stats().then((d) => {
      if (!d.error) setStats(d as unknown as Stats);
      setStatsLoading(false);
    });
    loadLinks();
  }, []);

  const loadLinks = () => {
    setLinksLoading(true);
    adminApi.quickLinks().then((d) => {
      setLinks((d.items as QuickLink[]) || []);
      setLinksLoading(false);
    });
  };

  const openCreate = () => {
    setEditLink(null);
    setForm({ ...emptyForm, sort_order: links.length + 1 });
    setModalOpen(true);
  };

  const openEdit = (link: QuickLink) => {
    setEditLink(link);
    setForm({ title: link.title, url: link.url, icon: link.icon || "Link", sort_order: link.sort_order });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить эту ссылку?")) return;
    await adminApi.qlDelete(id);
    loadLinks();
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    setSaving(true);
    if (editLink) {
      await adminApi.qlUpdate({ id: editLink.id, ...form });
    } else {
      await adminApi.qlCreate(form);
    }
    setSaving(false);
    setModalOpen(false);
    loadLinks();
  };

  const moveLink = async (idx: number, dir: -1 | 1) => {
    const newLinks = [...links];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= newLinks.length) return;
    [newLinks[idx], newLinks[swapIdx]] = [newLinks[swapIdx], newLinks[idx]];
    const reordered = newLinks.map((l, i) => ({ ...l, sort_order: i + 1 }));
    setLinks(reordered);
    await adminApi.qlReorder(reordered.map((l) => ({ id: l.id, sort_order: l.sort_order })));
  };

  return (
    <div className="max-w-5xl">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-white text-2xl font-bold">Главная</h1>
        <p className="text-gray-400 text-sm mt-1">
          Добро пожаловать, {user?.full_name || user?.name}
        </p>
      </div>

      {/* Статистика */}
      <section className="mb-8">
        <h2 className="text-gray-300 text-xs font-semibold uppercase tracking-widest mb-4">Статистика</h2>
        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 h-20 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Пользователи" value={stats?.users_count ?? 0} icon="👤" color="bg-indigo-900/50" />
            <StatCard label="Объявления" value={stats?.ads_count ?? 0} icon="📋" color="bg-emerald-900/50" />
            <StatCard label="Онлайн сейчас" value={stats?.online_count ?? 0} icon="🟢" color="bg-amber-900/50" />
          </div>
        )}
      </section>

      {/* Быстрые блоки */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-300 text-xs font-semibold uppercase tracking-widest">Быстрые блоки</h2>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Добавить
          </button>
        </div>

        {linksLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl h-16 animate-pulse" />)}
          </div>
        ) : links.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
            <p className="text-gray-500 text-sm">Нет быстрых блоков</p>
            <button onClick={openCreate} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
              + Добавить первый
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {links.map((link, idx) => (
              <div key={link.id} className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveLink(idx, -1)} disabled={idx === 0} className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors">
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15" /></svg>
                  </button>
                  <button onClick={() => moveLink(idx, 1)} disabled={idx === links.length - 1} className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-20 transition-colors">
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                </div>
                <div className="flex-1">
                  <QuickLinkCard link={link} onEdit={openEdit} onDelete={handleDelete} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Модал создания/редактирования */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-white font-semibold">{editLink ? "Редактировать блок" : "Новый быстрый блок"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Название</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Добавить объявление"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">URL</label>
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="/admin/ads/new"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Иконка</label>
                <select
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ICON_OPTIONS.map((ic) => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Порядок</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition-colors">
                Отмена
              </button>
              <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.url.trim()} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                {saving ? "Сохраняю..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
