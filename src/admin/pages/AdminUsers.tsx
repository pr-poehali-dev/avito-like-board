import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { adminApi } from "../api";

// ─── Общие вспомогательные компоненты ────────────────────────────────────────
function Input({ value, onChange, placeholder, type = "text", className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input type={type} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground))] ${className}`} />
  );
}

function Select({ value, onChange, options, className = "" }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] ${className}`}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--border))]"}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
      {label && <span className="text-sm text-[hsl(var(--muted-foreground))]">{label}</span>}
    </label>
  );
}

function SaveBtn({ saving, onClick, label = "Сохранить" }: { saving: boolean; onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} disabled={saving}
      className="flex items-center gap-2 px-5 py-2 bg-[hsl(var(--primary))] hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
      {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Сохраняю...</> : label}
    </button>
  );
}

// ─── Типы ─────────────────────────────────────────────────────────────────────
interface UserGroup {
  id: number; name: string; short_name: string | null; description: string | null;
  account_deletion_policy: number; can_view_offline: boolean; is_temporary: boolean;
  default_group_id: number | null; can_access_admin: boolean; can_edit_all_news: boolean;
}

interface UserRow {
  id: number; username: string; email: string;
  reg_date: string | null; last_visit: string | null;
  posts_count: number; is_banned: boolean; can_post: boolean; can_comment: boolean;
  group_id: number | null; group_name: string | null;
}

interface CustomField {
  id: number; name: string; description: string; field_type: string;
  options: string | null; show_on_registration: boolean; user_editable: boolean;
  is_private: boolean; sort_order: number; folder_id: number | null;
}

interface CfFolder {
  id: number; name: string; sort_order: number;
}

const TABS = [
  { id: "users", label: "Пользователи" },
  { id: "fields", label: "Доп. поля профиля" },
  { id: "groups", label: "Группы" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ТАБ 1: ПОЛЬЗОВАТЕЛИ
// ═══════════════════════════════════════════════════════════════════════════════
function UsersTab() {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkGroupId, setBulkGroupId] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const [filter, setFilter] = useState({
    search: "", exact_match: false,
    post_banned: "", banned: "", comment_banned: "",
    reg_date_from: "", reg_date_to: "",
    last_visit_from: "", last_visit_to: "",
    posts_min: "", posts_max: "",
    sort_by: "id", sort_order: "asc",
    per_page: "25", page: 1,
  });
  const [appliedFilter, setAppliedFilter] = useState({ ...filter });

  const fStr = (k: keyof typeof filter) => filter[k] as string;
  const fBool = (k: keyof typeof filter) => filter[k] as boolean;
  const setF = (k: keyof typeof filter, v: string | boolean | number) => setFilter((p) => ({ ...p, [k]: v }));

  const loadGroups = useCallback(async () => {
    const d = await adminApi.userGroups();
    if (d.items) setGroups(d.items as UserGroup[]);
  }, []);

  const loadUsers = useCallback(async (f: typeof appliedFilter) => {
    setLoading(true);
    const params: Record<string, unknown> = {
      page: f.page, per_page: Number(f.per_page),
      sort_by: f.sort_by, sort_order: f.sort_order,
    };
    if (f.search) { params.search = f.search; if (f.exact_match) params.exact_match = true; }
    if (f.banned !== "") params.banned = f.banned === "1";
    if (f.post_banned !== "") params.post_banned = f.post_banned === "1";
    if (f.comment_banned !== "") params.comment_banned = f.comment_banned === "1";
    if (f.reg_date_from) params.reg_date_from = f.reg_date_from;
    if (f.reg_date_to) params.reg_date_to = f.reg_date_to;
    if (f.last_visit_from) params.last_visit_from = f.last_visit_from;
    if (f.last_visit_to) params.last_visit_to = f.last_visit_to;
    if (f.posts_min !== "") params.posts_min = Number(f.posts_min);
    if (f.posts_max !== "") params.posts_max = Number(f.posts_max);
    const d = await adminApi.usersList(params);
    setUsers((d.items as UserRow[]) || []);
    setTotal(d.total || 0);
    setLoading(false);
  }, []);

  useEffect(() => { loadGroups(); loadUsers(appliedFilter); }, []);

  const applyFilter = () => { const f = { ...filter, page: 1 }; setAppliedFilter(f); loadUsers(f); };
  const resetFilter = () => {
    const def = { search: "", exact_match: false, post_banned: "", banned: "", comment_banned: "",
      reg_date_from: "", reg_date_to: "", last_visit_from: "", last_visit_to: "",
      posts_min: "", posts_max: "", sort_by: "id", sort_order: "asc", per_page: "25", page: 1 };
    setFilter(def); setAppliedFilter(def); loadUsers(def as typeof filter);
  };
  const goPage = (p: number) => { const f = { ...appliedFilter, page: p }; setAppliedFilter(f); loadUsers(f); };

  const toggleSelect = (id: number) =>
    setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleAll = () =>
    setSelected(selected.length === users.length ? [] : users.map((u) => u.id));

  const applyBulk = async () => {
    if (!selected.length || !bulkAction) return;
    if (bulkAction === "change_group") { setShowBulkModal(true); return; }
    setBulkApplying(true);
    const d = await adminApi.usersBulk(selected, bulkAction);
    setBulkApplying(false);
    if (d.ok) { toast.success(`Применено к ${d.affected} пользователям`); setSelected([]); loadUsers(appliedFilter); }
    else toast.error(d.error || "Ошибка");
  };

  const applyBulkGroup = async () => {
    if (!bulkGroupId) return;
    setBulkApplying(true);
    const d = await adminApi.usersBulk(selected, "change_group", { group_id: Number(bulkGroupId) });
    setBulkApplying(false);
    setShowBulkModal(false);
    if (d.ok) { toast.success(`Группа изменена для ${d.affected} пользователей`); setSelected([]); loadUsers(appliedFilter); }
    else toast.error(d.error || "Ошибка");
  };

  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString("ru-RU") : "—";
  const totalPages = Math.ceil(total / Number(appliedFilter.per_page));

  return (
    <div className="flex flex-col gap-4">
      {/* Фильтр */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <h3 className="text-[hsl(var(--foreground))] font-semibold text-sm mb-4">Фильтр пользователей</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[hsl(var(--muted-foreground))] text-xs">Поиск по логину / Email</label>
            <Input value={fStr("search")} onChange={(v) => setF("search", v)} placeholder="Логин или email" />
            <label className="flex items-center gap-2 mt-1 cursor-pointer">
              <input type="checkbox" checked={fBool("exact_match")} onChange={(e) => setF("exact_match", e.target.checked)} className="rounded accent-indigo-600" />
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Точное совпадение</span>
            </label>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[hsl(var(--muted-foreground))] text-xs">Статус бана</label>
            <Select value={fStr("banned")} onChange={(v) => setF("banned", v)}
              options={[{ value: "", label: "Все" }, { value: "1", label: "Только забаненные" }, { value: "0", label: "Не забаненные" }]} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[hsl(var(--muted-foreground))] text-xs">Запрет публикаций</label>
            <Select value={fStr("post_banned")} onChange={(v) => setF("post_banned", v)}
              options={[{ value: "", label: "Все" }, { value: "1", label: "Только с запретом" }, { value: "0", label: "Без запрета" }]} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[hsl(var(--muted-foreground))] text-xs">Запрет комментариев</label>
            <Select value={fStr("comment_banned")} onChange={(v) => setF("comment_banned", v)}
              options={[{ value: "", label: "Все" }, { value: "1", label: "С запретом" }, { value: "0", label: "Без запрета" }]} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[hsl(var(--muted-foreground))] text-xs">Дата регистрации</label>
            <div className="flex gap-2">
              <Input value={fStr("reg_date_from")} onChange={(v) => setF("reg_date_from", v)} type="date" className="flex-1" />
              <Input value={fStr("reg_date_to")} onChange={(v) => setF("reg_date_to", v)} type="date" className="flex-1" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[hsl(var(--muted-foreground))] text-xs">Последнее посещение</label>
            <div className="flex gap-2">
              <Input value={fStr("last_visit_from")} onChange={(v) => setF("last_visit_from", v)} type="date" className="flex-1" />
              <Input value={fStr("last_visit_to")} onChange={(v) => setF("last_visit_to", v)} type="date" className="flex-1" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[hsl(var(--muted-foreground))] text-xs">Кол-во публикаций (от / до)</label>
            <div className="flex gap-2">
              <Input value={fStr("posts_min")} onChange={(v) => setF("posts_min", v)} type="number" placeholder="от" className="flex-1" />
              <Input value={fStr("posts_max")} onChange={(v) => setF("posts_max", v)} type="number" placeholder="до" className="flex-1" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={applyFilter} className="px-4 py-2 bg-[hsl(var(--primary))] hover:opacity-90 text-white text-sm font-medium rounded-xl transition-colors">
            Применить фильтр
          </button>
          <button onClick={resetFilter} className="px-4 py-2 bg-[hsl(var(--muted))] hover:opacity-80 text-[hsl(var(--foreground))] border border-border text-sm rounded-xl transition-colors">
            Сбросить
          </button>
        </div>
      </div>

      {/* Сортировка и пагинация */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={fStr("sort_by")} onChange={(v) => { setF("sort_by", v); }} className="min-w-[160px]"
          options={[{ value: "id", label: "По ID" }, { value: "username", label: "По логину" },
            { value: "reg_date", label: "По дате регистрации" }, { value: "last_visit", label: "По посещению" },
            { value: "posts_count", label: "По публикациям" }]} />
        <Select value={fStr("sort_order")} onChange={(v) => setF("sort_order", v)}
          options={[{ value: "asc", label: "По возрастанию" }, { value: "desc", label: "По убыванию" }]} />
        <Select value={fStr("per_page")} onChange={(v) => setF("per_page", v)}
          options={[{ value: "10", label: "10 на странице" }, { value: "25", label: "25 на странице" },
            { value: "50", label: "50 на странице" }, { value: "100", label: "100 на странице" }]} />
        <button onClick={applyFilter} className="px-3 py-2 bg-[hsl(var(--muted))] hover:opacity-80 text-[hsl(var(--muted-foreground))] border border-border text-sm rounded-xl transition-colors">
          Применить
        </button>
        <span className="text-[hsl(var(--muted-foreground))] text-sm ml-auto">Всего: {total}</span>
      </div>

      {/* Таблица */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-[hsl(var(--muted-foreground))] text-sm">Пользователи не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-left">
                    <input type="checkbox" checked={selected.length === users.length && users.length > 0}
                      onChange={toggleAll} className="rounded accent-indigo-600" />
                  </th>
                  <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium">Логин</th>
                  <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium">Email</th>
                  <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium">Регистрация</th>
                  <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium">Посещение</th>
                  <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium">Объявл.</th>
                  <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium">Статус</th>
                  <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium">Группа</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-[hsl(var(--muted))]">
                    <td className="p-3">
                      <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} className="rounded accent-indigo-600" />
                    </td>
                    <td className="p-3 text-[hsl(var(--foreground))] font-medium">{u.username || "—"}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{u.email}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{fmtDate(u.reg_date)}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{fmtDate(u.last_visit)}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{u.posts_count}</td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {u.is_banned && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-xs rounded-md">Бан</span>}
                        {!u.can_post && <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 text-xs rounded-md">-пост</span>}
                        {!u.can_comment && <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-600 text-xs rounded-md">-коммент</span>}
                        {u.is_banned === false && u.can_post && u.can_comment && (
                          <span className="px-1.5 py-0.5 bg-green-50 text-green-600 text-xs rounded-md">Активен</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{u.group_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          <button onClick={() => goPage(Math.max(1, appliedFilter.page - 1))} disabled={appliedFilter.page === 1}
            className="px-3 py-1.5 bg-[hsl(var(--muted))] hover:opacity-80 disabled:opacity-40 text-[hsl(var(--muted-foreground))] text-sm rounded-lg transition-colors">←</button>
          <span className="text-[hsl(var(--muted-foreground))] text-sm">{appliedFilter.page} / {totalPages}</span>
          <button onClick={() => goPage(Math.min(totalPages, appliedFilter.page + 1))} disabled={appliedFilter.page === totalPages}
            className="px-3 py-1.5 bg-[hsl(var(--muted))] hover:opacity-80 disabled:opacity-40 text-[hsl(var(--muted-foreground))] text-sm rounded-lg transition-colors">→</button>
        </div>
      )}

      {/* Групповые действия */}
      {selected.length > 0 && (
        <div className="bg-white border border-[hsl(var(--primary))]/30 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <span className="text-[hsl(var(--primary))] text-sm font-medium">Выбрано: {selected.length}</span>
          <Select value={bulkAction} onChange={setBulkAction}
            options={[{ value: "", label: "Выберите действие..." },
              { value: "ban", label: "Забанить" }, { value: "unban", label: "Разбанить" },
              { value: "change_group", label: "Изменить группу" },
              { value: "allow_post", label: "Разрешить публикации" }, { value: "deny_post", label: "Запретить публикации" }]} />
          <SaveBtn saving={bulkApplying} onClick={applyBulk} label="Применить" />
          <button onClick={() => setSelected([])} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-sm transition-colors">Снять выбор</button>
        </div>
      )}

      {/* Модальное окно выбора группы */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white border border-border rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-[hsl(var(--foreground))] font-semibold mb-4">Выберите группу</h3>
            <Select value={bulkGroupId} onChange={setBulkGroupId} className="w-full mb-4"
              options={[{ value: "", label: "— выберите группу —" }, ...groups.map((g) => ({ value: String(g.id), label: g.name }))]} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 bg-[hsl(var(--muted))] hover:opacity-80 text-[hsl(var(--foreground))] border border-border text-sm rounded-xl transition-colors">Отмена</button>
              <SaveBtn saving={bulkApplying} onClick={applyBulkGroup} label="Применить" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ТАБ 2: ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ
// ═══════════════════════════════════════════════════════════════════════════════
const FIELD_TYPE_OPTS = [
  { value: "text", label: "Одна строка" }, { value: "textarea", label: "Несколько строк" },
  { value: "select", label: "Список" }, { value: "boolean", label: "Да / Нет" },
  { value: "datetime", label: "Дата и время" },
];

const CF_DEFAULTS = {
  id: 0, name: "", description: "", field_type: "text", options: "",
  show_on_registration: false, user_editable: true, is_private: false, sort_order: 0, folder_id: 0,
};

function CfForm({ initial, folders, onSave, onCancel }: {
  initial: typeof CF_DEFAULTS;
  folders: CfFolder[];
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Укажите название поля"); return; }
    setSaving(true);
    await onSave({ ...form, folder_id: form.folder_id || null });
    setSaving(false);
  };

  return (
    <div className="bg-[hsl(var(--muted))]/50 border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Название поля *</label>
          <Input value={form.name} onChange={(v) => set("name", v)} placeholder="Например: Город" className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Тип поля</label>
          <Select value={form.field_type} onChange={(v) => set("field_type", v)} className="w-full" options={FIELD_TYPE_OPTS} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Папка</label>
          <Select value={String(form.folder_id || "")} onChange={(v) => set("folder_id", v ? Number(v) : 0)} className="w-full"
            options={[{ value: "", label: "— без папки —" }, ...folders.map((f) => ({ value: String(f.id), label: f.name }))]} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Порядок сортировки</label>
          <input type="number" value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))}
            className="bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] w-full" />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Описание / подсказка</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
            rows={2} placeholder="Подсказка для пользователя"
            className="bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground))] resize-none" />
        </div>
        {form.field_type === "select" && (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-[hsl(var(--muted-foreground))] text-xs">Варианты списка (по одному на строку)</label>
            <textarea value={form.options || ""} onChange={(e) => set("options", e.target.value)}
              rows={4} placeholder={"Вариант 1\nВариант 2\nВариант 3"}
              className="bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground))] resize-none" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-4">
        <Toggle checked={form.show_on_registration} onChange={(v) => set("show_on_registration", v)} label="Показывать при регистрации" />
        <Toggle checked={form.user_editable} onChange={(v) => set("user_editable", v)} label="Редактируется пользователем" />
        <Toggle checked={form.is_private} onChange={(v) => set("is_private", v)} label="Личное (только для администратора)" />
      </div>
      <div className="flex gap-2 pt-1">
        <SaveBtn saving={saving} onClick={handleSave} />
        <button onClick={onCancel} className="px-4 py-2 bg-[hsl(var(--muted))] hover:opacity-80 text-[hsl(var(--muted-foreground))] text-sm rounded-xl transition-colors">Отмена</button>
      </div>
    </div>
  );
}

// Форма создания/редактирования папки (инлайн)
function FolderForm({ initial, onSave, onCancel }: {
  initial: { id: number; name: string; sort_order: number };
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  return (
    <div className="flex items-center gap-2 py-1">
      <Input value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="Название папки" className="flex-1" />
      <input type="number" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
        placeholder="Порядок" className="bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] w-24" />
      <SaveBtn saving={saving} onClick={async () => {
        if (!form.name.trim()) { toast.error("Введите название"); return; }
        setSaving(true); await onSave(form); setSaving(false);
      }} label="Сохранить" />
      <button onClick={onCancel} className="px-3 py-2 bg-[hsl(var(--muted))] hover:opacity-80 text-[hsl(var(--muted-foreground))] text-sm rounded-xl transition-colors">✕</button>
    </div>
  );
}

function CustomFieldsTab() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [folders, setFolders] = useState<CfFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editFolderId, setEditFolderId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showFolderCreate, setShowFolderCreate] = useState(false);
  const [activeFolderFilter, setActiveFolderFilter] = useState<number | null | "none">("none");

  const load = async () => {
    const [fd, fld] = await Promise.all([adminApi.cfList(), adminApi.cfFolderList()]);
    setFields((fd.items as CustomField[]) || []);
    setFolders((fld.items as CfFolder[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (data: Record<string, unknown>) => {
    const d = await adminApi.cfCreate(data);
    if (d.ok) { toast.success("Поле создано"); setShowCreate(false); load(); }
    else toast.error(d.error || "Ошибка");
  };
  const handleUpdate = async (data: Record<string, unknown>) => {
    const d = await adminApi.cfUpdate(data);
    if (d.ok) { toast.success("Поле сохранено"); setEditId(null); load(); }
    else toast.error(d.error || "Ошибка");
  };
  const handleRemove = async (id: number) => {
    if (!confirm("Удалить поле?")) return;
    const d = await adminApi.cfRemove(id);
    if (d.ok) { toast.success("Удалено"); load(); }
    else toast.error(d.error || "Ошибка");
  };

  const handleFolderCreate = async (data: Record<string, unknown>) => {
    const d = await adminApi.cfFolderCreate(data);
    if (d.ok) { toast.success("Папка создана"); setShowFolderCreate(false); load(); }
    else toast.error(d.error || "Ошибка");
  };
  const handleFolderUpdate = async (data: Record<string, unknown>) => {
    const d = await adminApi.cfFolderUpdate(data);
    if (d.ok) { toast.success("Папка сохранена"); setEditFolderId(null); load(); }
    else toast.error(d.error || "Ошибка");
  };
  const handleFolderRemove = async (id: number) => {
    if (!confirm("Удалить папку? Поля в ней останутся, но без папки.")) return;
    const d = await adminApi.cfFolderRemove(id);
    if (d.ok) { toast.success("Папка удалена"); if (activeFolderFilter === id) setActiveFolderFilter("none"); load(); }
    else toast.error(d.error || "Ошибка");
  };

  const ftLabel = (ft: string) => FIELD_TYPE_OPTS.find((o) => o.value === ft)?.label || ft;

  const visibleFields = activeFolderFilter === "none"
    ? fields
    : activeFolderFilter === null
      ? fields.filter((f) => !f.folder_id)
      : fields.filter((f) => f.folder_id === activeFolderFilter);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Заголовок + кнопки */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="text-[hsl(var(--muted-foreground))] text-sm">Дополнительные поля профиля пользователя</p>
        <div className="flex gap-2">
          <button onClick={() => { setShowFolderCreate(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--muted))] hover:opacity-80 text-[hsl(var(--foreground))] border border-border text-sm rounded-xl transition-colors">
            + Папка
          </button>
          <button onClick={() => { setShowCreate(true); setEditId(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] hover:opacity-90 text-white text-sm font-medium rounded-xl transition-colors">
            + Добавить поле
          </button>
        </div>
      </div>

      {/* Форма создания папки */}
      {showFolderCreate && (
        <div className="bg-white border border-border rounded-xl px-4 py-3">
          <p className="text-[hsl(var(--muted-foreground))] text-xs mb-2">Новая папка</p>
          <FolderForm initial={{ id: 0, name: "", sort_order: 0 }} onSave={handleFolderCreate} onCancel={() => setShowFolderCreate(false)} />
        </div>
      )}

      {/* Список папок */}
      {folders.length > 0 && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-[hsl(var(--muted-foreground))] text-xs font-medium uppercase tracking-wider">Папки</span>
          </div>
          <div className="divide-y divide-border/50">
            {folders.map((folder) => (
              <div key={folder.id}>
                {editFolderId === folder.id ? (
                  <div className="px-4 py-2">
                    <FolderForm initial={{ ...folder }} onSave={handleFolderUpdate} onCancel={() => setEditFolderId(null)} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-[hsl(var(--muted))] group">
                    <span className="text-[hsl(var(--muted-foreground))] text-sm">📁</span>
                    <button onClick={() => setActiveFolderFilter(activeFolderFilter === folder.id ? "none" : folder.id)}
                      className={`flex-1 text-left text-sm font-medium transition-colors ${activeFolderFilter === folder.id ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))]"}`}>
                      {folder.name}
                      <span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">
                        ({fields.filter((f) => f.folder_id === folder.id).length})
                      </span>
                    </button>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditFolderId(folder.id)}
                        className="px-2 py-1 bg-[hsl(var(--muted))] hover:opacity-80 text-[hsl(var(--foreground))] text-xs rounded-lg transition-colors">
                        Изменить
                      </button>
                      <button onClick={() => handleFolderRemove(folder.id)}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs rounded-lg transition-colors">
                        Удалить
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Фильтр по папкам + форма создания поля */}
      {folders.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[hsl(var(--muted-foreground))] text-xs">Показать:</span>
          <button onClick={() => setActiveFolderFilter("none")}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${activeFolderFilter === "none" ? "bg-[hsl(var(--primary))] text-white" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"}`}>
            Все
          </button>
          <button onClick={() => setActiveFolderFilter(null)}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${activeFolderFilter === null ? "bg-[hsl(var(--primary))] text-white" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"}`}>
            Без папки
          </button>
          {folders.map((folder) => (
            <button key={folder.id} onClick={() => setActiveFolderFilter(folder.id)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${activeFolderFilter === folder.id ? "bg-[hsl(var(--primary))] text-white" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"}`}>
              📁 {folder.name}
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <CfForm initial={CF_DEFAULTS} folders={folders} onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      )}

      {/* Таблица полей */}
      {visibleFields.length === 0 && !showCreate ? (
        <div className="bg-white border border-border rounded-2xl text-center py-16 text-[hsl(var(--muted-foreground))] text-sm">
          {activeFolderFilter === "none" ? "Нет дополнительных полей" : "В этой папке нет полей"}
        </div>
      ) : visibleFields.length > 0 && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium">Название</th>
                <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium">Тип</th>
                <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium">Папка</th>
                <th className="p-3 text-center text-[hsl(var(--muted-foreground))] font-medium">Регистрация</th>
                <th className="p-3 text-center text-[hsl(var(--muted-foreground))] font-medium">Редактирует</th>
                <th className="p-3 text-center text-[hsl(var(--muted-foreground))] font-medium">Личное</th>
                <th className="p-3 text-center text-[hsl(var(--muted-foreground))] font-medium">№</th>
                <th className="p-3 text-right text-[hsl(var(--muted-foreground))] font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {visibleFields.map((f) => (
                <>
                  <tr key={f.id} className="border-b border-border/50 hover:bg-[hsl(var(--muted))]">
                    <td className="p-3 text-[hsl(var(--foreground))] font-medium">{f.name}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{ftLabel(f.field_type)}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))] text-xs">
                      {f.folder_id ? (folders.find((fd) => fd.id === f.folder_id)?.name ?? "—") : "—"}
                    </td>
                    <td className="p-3 text-center">{f.show_on_registration ? <span className="text-green-600">✓</span> : <span className="text-[hsl(var(--muted-foreground))]">✗</span>}</td>
                    <td className="p-3 text-center">{f.user_editable ? <span className="text-green-600">✓</span> : <span className="text-[hsl(var(--muted-foreground))]">✗</span>}</td>
                    <td className="p-3 text-center">{f.is_private ? <span className="text-yellow-600">✓</span> : <span className="text-[hsl(var(--muted-foreground))]">✗</span>}</td>
                    <td className="p-3 text-center text-[hsl(var(--muted-foreground))]">{f.sort_order}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditId(f.id); setShowCreate(false); }}
                          className="px-2.5 py-1 bg-[hsl(var(--muted))] hover:opacity-80 text-[hsl(var(--foreground))] text-xs rounded-lg transition-colors">
                          Изменить
                        </button>
                        <button onClick={() => handleRemove(f.id)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs rounded-lg transition-colors">
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editId === f.id && (
                    <tr key={`edit-${f.id}`}><td colSpan={8} className="px-4 pb-3">
                      <CfForm
                        initial={{ ...CF_DEFAULTS, ...f, options: f.options || "", description: f.description || "", folder_id: f.folder_id || 0 }}
                        folders={folders} onSave={handleUpdate} onCancel={() => setEditId(null)} />
                    </td></tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ТАБ 3: ГРУППЫ
// ═══════════════════════════════════════════════════════════════════════════════
const GROUP_DEFAULTS = {
  id: 0, name: "", short_name: "", description: "",
  account_deletion_policy: 1, can_view_offline: false, is_temporary: false,
  default_group_id: 0, can_access_admin: false, can_edit_all_news: false,
};

function GroupForm({ initial, allGroups, onSave, onCancel }: {
  initial: typeof GROUP_DEFAULTS; allGroups: UserGroup[];
  onSave: (data: Record<string, unknown>) => Promise<void>; onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Укажите название группы"); return; }
    if (form.is_temporary && !form.default_group_id) { toast.error("Выберите основную группу для возврата"); return; }
    setSaving(true);
    await onSave({ ...form, default_group_id: form.default_group_id || null });
    setSaving(false);
  };

  const otherGroups = allGroups.filter((g) => g.id !== form.id);

  return (
    <div className="bg-[hsl(var(--muted))]/50 border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Название группы *</label>
          <Input value={form.name} onChange={(v) => set("name", v)} placeholder="Администраторы" className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Краткое название (макс. 20 символов)</label>
          <Input value={form.short_name || ""} onChange={(v) => set("short_name", v.slice(0, 20))} placeholder="Админы" className="w-full" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[hsl(var(--muted-foreground))] text-xs">Разрешение на самостоятельное удаление аккаунта</label>
        <div className="flex flex-col gap-2">
          {[{ v: 1, l: "Запретить удаление" }, { v: 2, l: "Разрешить самостоятельное удаление" }, { v: 3, l: "Отправлять запрос администрации" }].map((opt) => (
            <label key={opt.v} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name={`adp-${form.id}`} checked={form.account_deletion_policy === opt.v}
                onChange={() => set("account_deletion_policy", opt.v)} className="accent-indigo-600" />
              <span className="text-sm text-[hsl(var(--foreground))]">{opt.l}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Toggle checked={form.can_view_offline} onChange={(v) => set("can_view_offline", v)} label="Доступ к сайту в режиме offline" />
        <Toggle checked={form.can_access_admin} onChange={(v) => set("can_access_admin", v)} label="Доступ в админпанель" />
        <Toggle checked={form.can_edit_all_news} onChange={(v) => set("can_edit_all_news", v)} label="Редактирование всех публикаций" />
      </div>

      <div className="flex flex-col gap-2">
        <Toggle checked={form.is_temporary} onChange={(v) => set("is_temporary", v)} label="Временное размещение в группе" />
        {form.is_temporary && (
          <div className="flex flex-col gap-1 ml-12">
            <label className="text-[hsl(var(--muted-foreground))] text-xs">Основная группа по окончании срока *</label>
            <Select value={String(form.default_group_id || "")} onChange={(v) => set("default_group_id", v ? Number(v) : 0)} className="w-full max-w-xs"
              options={[{ value: "", label: "— выберите группу —" }, ...otherGroups.map((g) => ({ value: String(g.id), label: g.name }))]} />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <SaveBtn saving={saving} onClick={handleSave} />
        <button onClick={onCancel} className="px-4 py-2 bg-[hsl(var(--muted))] hover:opacity-80 text-[hsl(var(--muted-foreground))] text-sm rounded-xl transition-colors">Отмена</button>
      </div>
    </div>
  );
}

function GroupsTab() {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => { const d = await adminApi.userGroups(); setGroups((d.items as UserGroup[]) || []); setLoading(false); };
  useEffect(() => { load(); }, []);

  const handleCreate = async (data: Record<string, unknown>) => {
    const d = await adminApi.groupCreate(data);
    if (d.ok) { toast.success("Группа создана"); setShowCreate(false); load(); }
    else toast.error(d.error || "Ошибка");
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    const d = await adminApi.groupUpdate(data);
    if (d.ok) { toast.success("Группа сохранена"); setEditId(null); load(); }
    else toast.error(d.error || "Ошибка");
  };

  const handleRemove = async (id: number) => {
    if (!confirm("Удалить группу? Убедитесь, что в ней нет пользователей.")) return;
    const d = await adminApi.groupRemove(id);
    if (d.ok) { toast.success("Группа удалена"); load(); }
    else toast.error(d.error || "Ошибка");
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <p className="text-[hsl(var(--muted-foreground))] text-sm">Группы определяют права и возможности пользователей</p>
        <button onClick={() => { setShowCreate(true); setEditId(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] hover:opacity-90 text-white text-sm font-medium rounded-xl transition-colors">
          + Добавить группу
        </button>
      </div>

      {showCreate && (
        <GroupForm initial={GROUP_DEFAULTS} allGroups={groups} onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      )}

      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        {groups.length === 0 ? (
          <div className="text-center py-16 text-[hsl(var(--muted-foreground))] text-sm">Нет групп</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium w-10">ID</th>
                <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium">Название</th>
                <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium">Краткое</th>
                <th className="p-3 text-center text-[hsl(var(--muted-foreground))] font-medium">Админ</th>
                <th className="p-3 text-right text-[hsl(var(--muted-foreground))] font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <>
                  <tr key={g.id} className="border-b border-border/50 hover:bg-[hsl(var(--muted))]">
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{g.id}</td>
                    <td className="p-3 text-[hsl(var(--foreground))] font-medium">{g.name}</td>
                    <td className="p-3 text-[hsl(var(--muted-foreground))]">{g.short_name || "—"}</td>
                    <td className="p-3 text-center">{g.can_access_admin ? <span className="text-green-600">✓</span> : <span className="text-[hsl(var(--muted-foreground))]">✗</span>}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditId(g.id); setShowCreate(false); }}
                          className="px-2.5 py-1 bg-[hsl(var(--muted))] hover:opacity-80 text-[hsl(var(--foreground))] text-xs rounded-lg transition-colors">
                          Изменить
                        </button>
                        <button onClick={() => handleRemove(g.id)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs rounded-lg transition-colors">
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editId === g.id && (
                    <tr key={`edit-${g.id}`}><td colSpan={5} className="px-4 pb-3">
                      <GroupForm
                        initial={{ ...GROUP_DEFAULTS, ...g, short_name: g.short_name || "", description: g.description || "", default_group_id: g.default_group_id || 0 }}
                        allGroups={groups} onSave={handleUpdate} onCancel={() => setEditId(null)} />
                    </td></tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-[hsl(var(--foreground))] text-2xl font-bold">Пользователи</h1>
        <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">Управление пользователями, группами и полями профиля</p>
      </div>

      <div className="flex gap-1 mb-6 bg-white border border-border rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id ? "bg-[hsl(var(--primary))] text-white" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "users" && <UsersTab />}
      {activeTab === "fields" && <CustomFieldsTab />}
      {activeTab === "groups" && <GroupsTab />}
    </div>
  );
}