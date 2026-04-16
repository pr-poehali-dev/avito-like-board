import { useEffect, useState, useCallback } from "react";
import { adminApi } from "../api";
import Icon from "@/components/ui/icon";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: number;
  username: string;
  email: string;
  reg_date: string | null;
  last_visit: string | null;
  posts_count: number;
  is_banned: boolean;
  can_post: boolean;
  can_comment: boolean;
  group_id: number | null;
  group_name: string | null;
}

interface Group {
  id: number;
  name: string;
  short_name: string | null;
  description: string | null;
  account_deletion_policy: number;
  can_view_offline: boolean;
  is_temporary: boolean;
  default_group_id: number | null;
  can_access_admin: boolean;
  can_edit_all_news: boolean;
  can_post: boolean;
}

interface CustomField {
  id: number;
  name: string;
  description: string | null;
  field_type: string;
  options: string | null;
  show_on_registration: boolean;
  user_editable: boolean;
  is_private: boolean;
  sort_order: number;
  folder_id: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon name={icon as "Home"} size={18} className="text-white" />
      </div>
      <div>
        <div className="text-xl font-bold text-[hsl(var(--foreground))]">{value}</div>
        <div className="text-xs text-[hsl(var(--muted-foreground))]">{label}</div>
      </div>
    </div>
  );
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Текст",
  textarea: "Многострочный",
  select: "Список",
  boolean: "Да/Нет",
  datetime: "Дата/Время",
};

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-semibold text-[hsl(var(--foreground))]">{title}</span>
          <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)]";
const btnPrimary = "bg-[hsl(var(--primary))] text-white text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium";
const btnGhost = "border border-border text-sm px-4 py-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors font-medium";
const btnDanger = "bg-red-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium";

// ─── Tab: Users ───────────────────────────────────────────────────────────────

function TabUsers({ groups }: { groups: Group[] }) {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterBanned, setFilterBanned] = useState<"" | "true" | "false">("");
  const [filterCanPost, setFilterCanPost] = useState<"" | "true" | "false">("");
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkGroupId, setBulkGroupId] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const PER_PAGE = 25;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    const params: Record<string, unknown> = { page: p, per_page: PER_PAGE, sort_by: sortBy, sort_order: sortOrder };
    if (search) params.search = search;
    if (filterBanned !== "") params.banned = filterBanned;
    if (filterCanPost !== "") params.post_banned = filterCanPost === "false" ? "true" : "false";
    const res = await adminApi.usersList(params);
    if (res.ok) { setUsers(res.items || []); setTotal(res.total || 0); }
    setLoading(false);
  }, [search, filterBanned, filterCanPost, sortBy, sortOrder]);

  useEffect(() => { setPage(1); load(1); }, [search, filterBanned, filterCanPost, sortBy, sortOrder]);
  useEffect(() => { load(page); }, [page]);

  const toggleSelect = (id: number) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () =>
    setSelected(selected.length === users.length ? [] : users.map(u => u.id));

  const handleBulk = async () => {
    if (!bulkAction || selected.length === 0) return;
    setBulkLoading(true);
    const params = bulkAction === "change_group" && bulkGroupId ? { group_id: Number(bulkGroupId) } : {};
    await adminApi.usersBulk(selected, bulkAction, params);
    setSelected([]);
    setBulkAction("");
    setBulkGroupId("");
    await load(page);
    setBulkLoading(false);
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-border p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <input
            className={inputCls}
            placeholder="Поиск по имени или email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className={inputCls + " w-auto"} value={filterBanned} onChange={e => setFilterBanned(e.target.value as "" | "true" | "false")}>
          <option value="">Все пользователи</option>
          <option value="false">Не забанены</option>
          <option value="true">Забанены</option>
        </select>
        <select className={inputCls + " w-auto"} value={filterCanPost} onChange={e => setFilterCanPost(e.target.value as "" | "true" | "false")}>
          <option value="">Любые права</option>
          <option value="true">Могут публиковать</option>
          <option value="false">Публикация запрещена</option>
        </select>
        <select className={inputCls + " w-auto"} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="id">По ID</option>
          <option value="reg_date">По дате регистрации</option>
          <option value="last_visit">По последнему визиту</option>
          <option value="posts_count">По объявлениям</option>
        </select>
        <button
          onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}
          className={btnGhost + " flex items-center gap-1.5"}
        >
          <Icon name={sortOrder === "asc" ? "ArrowUp" : "ArrowDown"} size={14} />
          {sortOrder === "asc" ? "По возрастанию" : "По убыванию"}
        </button>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-medium text-blue-700">Выбрано: {selected.length}</span>
          <select className={inputCls + " w-auto"} value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
            <option value="">Действие...</option>
            <option value="ban">Забанить</option>
            <option value="unban">Разбанить</option>
            <option value="allow_post">Разрешить публикации</option>
            <option value="deny_post">Запретить публикации</option>
            <option value="change_group">Сменить группу</option>
          </select>
          {bulkAction === "change_group" && (
            <select className={inputCls + " w-auto"} value={bulkGroupId} onChange={e => setBulkGroupId(e.target.value)}>
              <option value="">Выберите группу</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
          <button onClick={handleBulk} disabled={bulkLoading || !bulkAction} className={btnPrimary}>
            {bulkLoading ? "Применяем..." : "Применить"}
          </button>
          <button onClick={() => setSelected([])} className={btnGhost}>Отмена</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[hsl(var(--muted))]">
                <th className="px-4 py-3 text-left w-10">
                  <input type="checkbox" checked={selected.length === users.length && users.length > 0} onChange={toggleAll} className="rounded" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Пользователь</th>
                <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Группа</th>
                <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Объявления</th>
                <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Регистрация</th>
                <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Последний визит</th>
                <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Статус</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-[hsl(var(--muted))] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[hsl(var(--muted-foreground))]">Пользователи не найдены</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="border-b border-border hover:bg-[hsl(var(--muted)/0.5)] transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-bold">{(u.username || "?")[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-medium text-[hsl(var(--foreground))]">{u.username}</div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{u.group_name || "—"}</td>
                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{u.posts_count}</td>
                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] text-xs">{fmtDate(u.reg_date)}</td>
                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] text-xs">{fmtDate(u.last_visit)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.is_banned && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Бан</span>}
                        {!u.can_post && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">Нет публикаций</span>}
                        {!u.is_banned && u.can_post && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">Активен</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Всего: {total}</span>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={btnGhost + " px-2 py-1.5 disabled:opacity-40"}>
                <Icon name="ChevronLeft" size={16} />
              </button>
              {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${page === p ? "bg-[hsl(var(--primary))] text-white" : "hover:bg-[hsl(var(--muted))]"}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={btnGhost + " px-2 py-1.5 disabled:opacity-40"}>
                <Icon name="ChevronRight" size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Groups ──────────────────────────────────────────────────────────────

const GROUP_DEFAULTS: Omit<Group, "id"> = {
  name: "", short_name: "", description: "",
  account_deletion_policy: 1, can_view_offline: false,
  is_temporary: false, default_group_id: null,
  can_access_admin: false, can_edit_all_news: false, can_post: true,
};

function TabGroups({ groups, reload }: { groups: Group[]; reload: () => void }) {
  const [modal, setModal] = useState<null | "create" | Group>(null);
  const [form, setForm] = useState<Omit<Group, "id">>(GROUP_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openCreate = () => { setForm(GROUP_DEFAULTS); setError(""); setModal("create"); };
  const openEdit = (g: Group) => { setForm({ ...g }); setError(""); setModal(g); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Название обязательно"); return; }
    setSaving(true);
    setError("");
    let res;
    if (modal === "create") {
      res = await adminApi.groupCreate(form as Record<string, unknown>);
    } else {
      res = await adminApi.groupUpdate({ ...(form as Record<string, unknown>), id: (modal as Group).id });
    }
    if (res.ok) { setModal(null); reload(); }
    else setError(res.error || "Ошибка");
    setSaving(false);
  };

  const handleDelete = async (g: Group) => {
    if (!confirm(`Удалить группу «${g.name}»?`)) return;
    const res = await adminApi.groupRemove(g.id);
    if (res.ok) reload();
    else alert(res.error || "Ошибка удаления");
  };

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className={btnPrimary + " flex items-center gap-2"}>
          <Icon name="Plus" size={16} />
          Создать группу
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[hsl(var(--muted))]">
              <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Название</th>
              <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Короткое</th>
              <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Права</th>
              <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Временная</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-[hsl(var(--muted-foreground))]">Групп нет</td></tr>
            ) : groups.map(g => (
              <tr key={g.id} className="border-b border-border hover:bg-[hsl(var(--muted)/0.5)] transition-colors">
                <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">{g.name}</td>
                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{g.short_name || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {g.can_access_admin && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Админ</span>}
                    {g.can_view_offline && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Офлайн</span>}
                    {g.can_edit_all_news && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Ред. объявления</span>}
                    {!g.can_post && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Нет публикаций</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{g.is_temporary ? "Да" : "Нет"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(g)} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors">
                      <Icon name="Pencil" size={15} />
                    </button>
                    <button onClick={() => handleDelete(g)} className="text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors">
                      <Icon name="Trash2" size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <Modal title={modal === "create" ? "Создать группу" : "Редактировать группу"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Название *">
              <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Например: Модераторы" />
            </Field>
            <Field label="Короткое название">
              <input className={inputCls} value={form.short_name || ""} onChange={e => set("short_name", e.target.value)} placeholder="Мод" maxLength={20} />
            </Field>
            <Field label="Описание">
              <textarea className={inputCls} rows={2} value={form.description || ""} onChange={e => set("description", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["can_access_admin", "Доступ в админку"],
                ["can_view_offline", "Видеть офлайн"],
                ["can_edit_all_news", "Редактировать объявления"],
                ["can_post", "Разрешить публикации"],
                ["is_temporary", "Временная группа"],
              ] as [keyof typeof form, string][]).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form[k]}
                    onChange={e => set(k, e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-[hsl(var(--foreground))]">{label}</span>
                </label>
              ))}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} className={btnGhost}>Отмена</button>
              <button onClick={handleSave} disabled={saving} className={btnPrimary}>
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Tab: Custom Fields ───────────────────────────────────────────────────────

const CF_DEFAULTS: Omit<CustomField, "id"> = {
  name: "", description: "", field_type: "text", options: null,
  show_on_registration: false, user_editable: true, is_private: false,
  sort_order: 0, folder_id: null,
};

function TabCustomFields() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "create" | CustomField>(null);
  const [form, setForm] = useState<Omit<CustomField, "id">>(CF_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await adminApi.cfList();
    if (res.ok) setFields(res.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(CF_DEFAULTS); setError(""); setModal("create"); };
  const openEdit = (f: CustomField) => { setForm({ ...f }); setError(""); setModal(f); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Название обязательно"); return; }
    setSaving(true);
    setError("");
    let res;
    if (modal === "create") {
      res = await adminApi.cfCreate(form as Record<string, unknown>);
    } else {
      res = await adminApi.cfUpdate({ ...(form as Record<string, unknown>), id: (modal as CustomField).id });
    }
    if (res.ok) { setModal(null); await load(); }
    else setError(res.error || "Ошибка");
    setSaving(false);
  };

  const handleDelete = async (f: CustomField) => {
    if (!confirm(`Удалить поле «${f.name}»?`)) return;
    const res = await adminApi.cfRemove(f.id);
    if (res.ok) await load();
    else alert(res.error || "Ошибка удаления");
  };

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className={btnPrimary + " flex items-center gap-2"}>
          <Icon name="Plus" size={16} />
          Добавить поле
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Загрузка...</div>
        ) : fields.length === 0 ? (
          <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">
            <Icon name="FormInput" size={32} className="mx-auto mb-2 opacity-40" />
            Нет кастомных полей
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[hsl(var(--muted))]">
                <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Название</th>
                <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Тип</th>
                <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Параметры</th>
                <th className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">Порядок</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map(f => (
                <tr key={f.id} className="border-b border-border hover:bg-[hsl(var(--muted)/0.5)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[hsl(var(--foreground))]">{f.name}</div>
                    {f.description && <div className="text-xs text-[hsl(var(--muted-foreground))]">{f.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                      {FIELD_TYPE_LABELS[f.field_type] || f.field_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {f.show_on_registration && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Регистрация</span>}
                      {f.user_editable && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Редактируемое</span>}
                      {f.is_private && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Приватное</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{f.sort_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(f)} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors">
                        <Icon name="Pencil" size={15} />
                      </button>
                      <button onClick={() => handleDelete(f)} className="text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors">
                        <Icon name="Trash2" size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal !== null && (
        <Modal title={modal === "create" ? "Добавить поле" : "Редактировать поле"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Название *">
              <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Например: Город" />
            </Field>
            <Field label="Описание">
              <input className={inputCls} value={form.description || ""} onChange={e => set("description", e.target.value)} placeholder="Подсказка для пользователя" />
            </Field>
            <Field label="Тип поля">
              <select className={inputCls} value={form.field_type} onChange={e => set("field_type", e.target.value)}>
                {Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            {form.field_type === "select" && (
              <Field label="Варианты (через запятую)">
                <input className={inputCls} value={form.options || ""} onChange={e => set("options", e.target.value)} placeholder="Вариант 1, Вариант 2, ..." />
              </Field>
            )}
            <Field label="Порядок сортировки">
              <input type="number" className={inputCls} value={form.sort_order} onChange={e => set("sort_order", Number(e.target.value))} />
            </Field>
            <div className="grid grid-cols-1 gap-2">
              {([
                ["show_on_registration", "Показывать при регистрации"],
                ["user_editable", "Пользователь может редактировать"],
                ["is_private", "Приватное (только для админа)"],
              ] as [keyof typeof form, string][]).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} className="rounded" />
                  <span className="text-sm text-[hsl(var(--foreground))]">{label}</span>
                </label>
              ))}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} className={btnGhost}>Отмена</button>
              <button onClick={handleSave} disabled={saving} className={btnPrimary}>
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "users" | "groups" | "fields";

export default function AdminUsers() {
  const [tab, setTab] = useState<Tab>("users");
  const [stats, setStats] = useState({ total: 0, banned: 0, no_post: 0, today: 0 });
  const [groups, setGroups] = useState<Group[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadGroups = async () => {
    const res = await adminApi.userGroups();
    if (res.ok) setGroups(res.items || []);
  };

  const loadStats = async () => {
    setStatsLoading(true);
    const [all, banned, noPost, today] = await Promise.all([
      adminApi.usersList({ page: 1, per_page: 1 }),
      adminApi.usersList({ page: 1, per_page: 1, banned: "true" }),
      adminApi.usersList({ page: 1, per_page: 1, post_banned: "true" }),
      adminApi.usersList({ page: 1, per_page: 1, reg_date_from: new Date().toISOString().slice(0, 10) }),
    ]);
    setStats({
      total: all.ok ? all.total : 0,
      banned: banned.ok ? banned.total : 0,
      no_post: noPost.ok ? noPost.total : 0,
      today: today.ok ? today.total : 0,
    });
    setStatsLoading(false);
  };

  useEffect(() => {
    loadStats();
    loadGroups();
  }, []);

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "users", label: "Пользователи", icon: "Users" },
    { id: "groups", label: "Группы", icon: "Shield" },
    { id: "fields", label: "Доп. поля профиля", icon: "FormInput" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Пользователи</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />)
        ) : (
          <>
            <StatCard icon="Users" label="Всего пользователей" value={stats.total} color="bg-[hsl(var(--primary))]" />
            <StatCard icon="UserPlus" label="Новых сегодня" value={stats.today} color="bg-emerald-500" />
            <StatCard icon="Ban" label="Забанено" value={stats.banned} color="bg-red-500" />
            <StatCard icon="AlertCircle" label="Без публикаций" value={stats.no_post} color="bg-amber-500" />
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            <Icon name={t.icon as "Home"} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "users" && <TabUsers groups={groups} />}
      {tab === "groups" && <TabGroups groups={groups} reload={loadGroups} />}
      {tab === "fields" && <TabCustomFields />}
    </div>
  );
}