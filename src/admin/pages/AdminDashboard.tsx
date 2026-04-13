import { useState, useEffect } from "react";
import { adminApi } from "../api";
import { useAdminAuth } from "../AdminAuthContext";
import Icon from "@/components/ui/icon";

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
    <div className="bg-white border border-border rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[hsl(var(--muted-foreground))] text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-[hsl(var(--foreground))] text-2xl font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function QuickLinkCard({ link, onEdit, onDelete }: { link: QuickLink; onEdit: (l: QuickLink) => void; onDelete: (id: number) => void }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 flex items-center justify-between gap-3 hover:border-[hsl(var(--primary))] transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-[hsl(var(--muted))] rounded-lg flex items-center justify-center text-[hsl(var(--primary))] shrink-0">
          <Icon name={(link.icon || "Link") as "Link"} size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-[hsl(var(--foreground))] text-sm font-medium truncate">{link.title}</p>
          <p className="text-[hsl(var(--muted-foreground))] text-xs truncate">{link.url}</p>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onEdit(link)} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors" title="Редактировать">
          <Icon name="Pencil" size={14} />
        </button>
        <button onClick={() => onDelete(link.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors" title="Удалить">
          <Icon name="Trash2" size={14} />
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
      <div className="mb-8">
        <h1 className="text-[hsl(var(--foreground))] text-2xl font-bold">Главная</h1>
        <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">
          Добро пожаловать, {user?.full_name || user?.name}
        </p>
      </div>

      {/* Статистика */}
      <section className="mb-8">
        <h2 className="text-[hsl(var(--muted-foreground))] text-xs font-semibold uppercase tracking-widest mb-4">Статистика</h2>
        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-border rounded-2xl p-5 h-20 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Пользователи" value={stats?.users_count ?? 0} icon="👤" color="bg-blue-50" />
            <StatCard label="Объявления" value={stats?.ads_count ?? 0} icon="📋" color="bg-emerald-50" />
            <StatCard label="Онлайн сейчас" value={stats?.online_count ?? 0} icon="🟢" color="bg-amber-50" />
          </div>
        )}
      </section>

      {/* Быстрые блоки */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[hsl(var(--muted-foreground))] text-xs font-semibold uppercase tracking-widest">Быстрые блоки</h2>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--primary))] hover:opacity-90 text-white text-xs font-semibold rounded-lg transition-opacity"
          >
            <Icon name="Plus" size={12} />
            Добавить
          </button>
        </div>

        {linksLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white border border-border rounded-xl h-16 animate-pulse" />)}
          </div>
        ) : links.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-10 text-center">
            <p className="text-[hsl(var(--muted-foreground))] text-sm">Нет быстрых блоков</p>
            <button onClick={openCreate} className="mt-3 text-[hsl(var(--primary))] hover:opacity-80 text-sm transition-opacity">
              + Добавить первый
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {links.map((link, idx) => (
              <div key={link.id} className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveLink(idx, -1)} disabled={idx === 0} className="p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-20 transition-colors">
                    <Icon name="ChevronUp" size={12} />
                  </button>
                  <button onClick={() => moveLink(idx, 1)} disabled={idx === links.length - 1} className="p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-20 transition-colors">
                    <Icon name="ChevronDown" size={12} />
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

      {/* Модал */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-[hsl(var(--foreground))] font-semibold">{editLink ? "Редактировать блок" : "Новый быстрый блок"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block">Название</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Добавить объявление"
                  className="w-full bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] placeholder-[hsl(var(--muted-foreground))]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block">URL</label>
                <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="/admin/ads/new"
                  className="w-full bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] placeholder-[hsl(var(--muted-foreground))]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block">Иконка</label>
                <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
                  {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block">Порядок</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="w-full bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 bg-[hsl(var(--muted))] hover:opacity-80 text-[hsl(var(--foreground))] text-sm font-medium rounded-xl transition-opacity">
                Отмена
              </button>
              <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.url.trim()}
                className="flex-1 py-2.5 bg-[hsl(var(--primary))] hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-opacity">
                {saving ? "Сохраняю..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
