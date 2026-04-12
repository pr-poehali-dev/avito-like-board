import { useState, useEffect } from "react";
import { toast } from "sonner";
import { adminApi } from "../api";

// ─── Типы ─────────────────────────────────────────────────────────────────────
interface Category {
  id: number; parent_id: number | null; name: string; alt_name: string | null;
  slug: string; meta_title: string | null; meta_description: string | null;
  short_description: string | null; sort_order: number; icon: string | null;
  show_in_menu: boolean; ads_count: number; children: Category[];
}

interface AcfFolder { id: number; name: string; sort_order: number; }

interface AdField {
  id: number; folder_id: number | null; folder_name: string | null;
  name: string; description: string | null; placeholder: string | null;
  field_type: string; options: string | null; is_optional: boolean;
  default_value: string | null; sort_order: number;
  categories: { id: number; name: string }[];
  add_groups: { id: number; name: string }[];
  view_groups: { id: number; name: string }[];
}

interface UserGroup { id: number; name: string; }

const TABS = [
  { id: "cats", label: "Список категорий" },
  { id: "fields", label: "Доп. поля объявлений" },
];

const FIELD_TYPES = [
  { value: "text", label: "Одна строка" }, { value: "textarea", label: "Несколько строк" },
  { value: "select", label: "Список" }, { value: "boolean", label: "Да / Нет" },
  { value: "datetime", label: "Дата и время" },
];

// ─── Мелкие UI-компоненты ─────────────────────────────────────────────────────
function Inp({ value, onChange, placeholder, type = "text", className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      className={`bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 ${className}`} />
  );
}

function Sel({ value, onChange, options, className = "" }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Tog({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-indigo-600" : "bg-gray-700"}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      {label && <span className="text-sm text-gray-300">{label}</span>}
    </label>
  );
}

function Btn({ onClick, children, variant = "primary", disabled = false, className = "" }: {
  onClick?: () => void; children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger"; disabled?: boolean; className?: string;
}) {
  const cls = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white",
    secondary: "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700",
    danger: "bg-red-900/30 hover:bg-red-900/60 text-red-400",
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${cls} ${className}`}>
      {children}
    </button>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
}

// ─── Утилиты ──────────────────────────────────────────────────────────────────
function flattenTree(tree: Category[], depth = 0): { cat: Category; depth: number }[] {
  const res: { cat: Category; depth: number }[] = [];
  for (const c of tree) {
    res.push({ cat: c, depth });
    res.push(...flattenTree(c.children, depth + 1));
  }
  return res;
}

function buildSelectOpts(flat: { cat: Category; depth: number }[]) {
  return flat.map(({ cat, depth }) => ({ value: String(cat.id), label: "— ".repeat(depth) + cat.name }));
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, "-").replace(/^-+|-+$/g, "") || "category";
}

// ═══════════════════════════════════════════════════════════════════════════════
// ТАБ 1: КАТЕГОРИИ
// ═══════════════════════════════════════════════════════════════════════════════
const CAT_DEFAULTS = {
  id: 0, parent_id: 0, name: "", alt_name: "", slug: "", meta_title: "",
  meta_description: "", short_description: "", sort_order: 0, icon: "", show_in_menu: true,
};

function CatForm({ initial, flatCats, onSave, onCancel }: {
  initial: typeof CAT_DEFAULTS;
  flatCats: { cat: Category; depth: number }[];
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Укажите название"); return; }
    const slug = form.slug.trim() || slugify(form.name);
    setSaving(true);
    await onSave({ ...form, slug, parent_id: form.parent_id || null });
    setSaving(false);
  };

  const parentOpts = buildSelectOpts(flatCats.filter((f) => f.cat.id !== form.id));

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Название *</label>
          <Inp value={form.name} onChange={(v) => { set("name", v); if (!form.slug) set("slug", slugify(v)); }} placeholder="Транспорт" className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Альтернативное название</label>
          <Inp value={form.alt_name} onChange={(v) => set("alt_name", v)} placeholder="Необязательно" className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Родительская категория</label>
          <Sel value={String(form.parent_id || "")} onChange={(v) => set("parent_id", v ? Number(v) : 0)} className="w-full"
            options={[{ value: "", label: "— корневая категория —" }, ...parentOpts]} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">URL-псевдоним (slug)</label>
          <Inp value={form.slug} onChange={(v) => set("slug", v)} placeholder="transport" className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Мета-заголовок (Title)</label>
          <Inp value={form.meta_title} onChange={(v) => set("meta_title", v)} placeholder="SEO заголовок" className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Порядок сортировки</label>
          <input type="number" value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-gray-400 text-xs">Мета-описание (Description)</label>
          <textarea value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)}
            rows={2} placeholder="SEO описание"
            className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 resize-none" />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-gray-400 text-xs">Краткое описание</label>
          <textarea value={form.short_description} onChange={(e) => set("short_description", e.target.value)}
            rows={3} placeholder="Описание для страницы категории"
            className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 resize-none" />
        </div>
      </div>
      <Tog checked={form.show_in_menu} onChange={(v) => set("show_in_menu", v)} label="Показывать в главном меню" />
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
          {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Сохраняю...</> : "Сохранить"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-xl transition-colors">Отмена</button>
      </div>
    </div>
  );
}

function CatNode({ cat, depth, flatCats, expanded, onToggle, onEdit, onAddChild, onDelete, editId }: {
  cat: Category; depth: number; flatCats: { cat: Category; depth: number }[];
  expanded: Set<number>; onToggle: (id: number) => void;
  onEdit: (c: Category) => void; onAddChild: (parentId: number) => void;
  onDelete: (id: number) => void; editId: number | null;
}) {
  const hasChildren = cat.children.length > 0;
  const isExpanded = expanded.has(cat.id);

  return (
    <div>
      <div className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-800/40 rounded-lg group ${editId === cat.id ? "bg-indigo-900/20" : ""}`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}>
        <button onClick={() => onToggle(cat.id)}
          className={`w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors text-xs ${!hasChildren ? "invisible" : ""}`}>
          {isExpanded ? "▼" : "▶"}
        </button>
        <span className="text-gray-500 text-xs w-8 shrink-0">#{cat.id}</span>
        <span className="text-white text-sm font-medium flex-1 truncate">{cat.name}</span>
        {cat.slug && <span className="text-gray-600 text-xs hidden sm:block truncate max-w-[120px]">/{cat.slug}</span>}
        <span className="text-gray-500 text-xs shrink-0">{cat.ads_count} объявл.</span>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Btn onClick={() => onEdit(cat)} variant="secondary" className="!text-xs !py-1 !px-2">✏️</Btn>
          <Btn onClick={() => onAddChild(cat.id)} variant="secondary" className="!text-xs !py-1 !px-2">+</Btn>
          <Btn onClick={() => onDelete(cat.id)} variant="danger" className="!text-xs !py-1 !px-2">🗑</Btn>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {cat.children.map((child) => (
            <CatNode key={child.id} cat={child} depth={depth + 1} flatCats={flatCats}
              expanded={expanded} onToggle={onToggle} onEdit={onEdit} onAddChild={onAddChild}
              onDelete={onDelete} editId={editId} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoriesTab() {
  const [tree, setTree] = useState<Category[]>([]);
  const [flat, setFlat] = useState<{ cat: Category; depth: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editCat, setEditCat] = useState<typeof CAT_DEFAULTS | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createParentId, setCreateParentId] = useState<number>(0);

  const load = async () => {
    const d = await adminApi.catList();
    const t = (d.items as Category[]) || [];
    setTree(t);
    setFlat(flattenTree(t));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleAll = (expand: boolean) => {
    if (expand) setExpanded(new Set(flat.map((f) => f.cat.id)));
    else setExpanded(new Set());
  };

  const onToggle = (id: number) => setExpanded((p) => {
    const next = new Set(p);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    return next;
  });

  const handleCreate = async (data: Record<string, unknown>) => {
    const d = await adminApi.catCreate(data);
    if (d.ok) { toast.success("Категория создана"); setShowCreate(false); setEditCat(null); load(); }
    else toast.error(d.error || "Ошибка");
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    const d = await adminApi.catUpdate(data);
    if (d.ok) { toast.success("Категория обновлена"); setEditCat(null); setShowCreate(false); load(); }
    else toast.error(d.error || "Ошибка");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить категорию?")) return;
    const d = await adminApi.catRemove(id);
    if (d.ok) { toast.success("Удалено"); load(); }
    else toast.error(d.error || "Ошибка");
  };

  const onEdit = (c: Category) => {
    setEditCat({ ...CAT_DEFAULTS, ...c, parent_id: c.parent_id || 0,
      alt_name: c.alt_name || "", meta_title: c.meta_title || "",
      meta_description: c.meta_description || "", short_description: c.short_description || "",
      icon: c.icon || "" });
    setShowCreate(false);
  };

  const onAddChild = (parentId: number) => {
    setCreateParentId(parentId);
    setEditCat(null);
    setShowCreate(true);
    if (parentId) setExpanded((p) => new Set([...p, parentId]));
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <Btn onClick={() => { setShowCreate(true); setCreateParentId(0); setEditCat(null); }} variant="primary">
            + Корневая категория
          </Btn>
          <Btn onClick={() => toggleAll(true)} variant="secondary">Развернуть всё</Btn>
          <Btn onClick={() => toggleAll(false)} variant="secondary">Свернуть всё</Btn>
        </div>
        <span className="text-gray-500 text-sm">Всего: {flat.length}</span>
      </div>

      {/* Форма создания / редактирования вверху */}
      {(showCreate || editCat) && (
        <CatForm
          initial={editCat || { ...CAT_DEFAULTS, parent_id: createParentId }}
          flatCats={flat}
          onSave={editCat ? handleUpdate : handleCreate}
          onCancel={() => { setEditCat(null); setShowCreate(false); }}
        />
      )}

      {tree.length === 0 && !showCreate ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center py-16 text-gray-500 text-sm">
          Нет категорий. Создайте первую.
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden py-2">
          {tree.map((cat) => (
            <CatNode key={cat.id} cat={cat} depth={0} flatCats={flat}
              expanded={expanded} onToggle={onToggle} onEdit={onEdit}
              onAddChild={onAddChild} onDelete={handleDelete}
              editId={editCat?.id || null} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ТАБ 2: ДОП. ПОЛЯ ОБЪЯВЛЕНИЙ
// ═══════════════════════════════════════════════════════════════════════════════
const ACF_DEFAULTS = {
  id: 0, folder_id: 0, name: "", description: "", placeholder: "",
  field_type: "text", options: "", is_optional: false,
  default_value: "", sort_order: 0,
  category_ids: [] as number[], add_group_ids: [] as number[], view_group_ids: [] as number[],
};

function MultiCheck({ label, items, selected, onChange }: {
  label: string; items: { id: number; name: string }[]; selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-gray-400 text-xs">{label}</label>
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex flex-col gap-1.5 max-h-40 overflow-y-auto">
        {items.length === 0
          ? <span className="text-gray-600 text-xs italic">Нет доступных элементов</span>
          : items.map((item) => (
            <label key={item.id} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} className="rounded accent-indigo-600" />
              <span className="text-sm text-gray-300">{item.name}</span>
            </label>
          ))}
      </div>
      {selected.length > 0 && <p className="text-xs text-indigo-400">Выбрано: {selected.length}</p>}
    </div>
  );
}

function AcfForm({ initial, folders, flatCats, groups, onSave, onCancel }: {
  initial: typeof ACF_DEFAULTS;
  folders: AcfFolder[];
  flatCats: { cat: Category; depth: number }[];
  groups: UserGroup[];
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

  const allCats = flatCats.map(({ cat, depth }) => ({ id: cat.id, name: "— ".repeat(depth) + cat.name }));

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Название поля *</label>
          <Inp value={form.name} onChange={(v) => set("name", v)} placeholder="Пробег" className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Тип поля</label>
          <Sel value={form.field_type} onChange={(v) => set("field_type", v)} className="w-full" options={FIELD_TYPES} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Папка</label>
          <Sel value={String(form.folder_id || "")} onChange={(v) => set("folder_id", v ? Number(v) : 0)} className="w-full"
            options={[{ value: "", label: "— без папки —" }, ...folders.map((f) => ({ value: String(f.id), label: f.name }))]} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Подсказка (placeholder)</label>
          <Inp value={form.placeholder} onChange={(v) => set("placeholder", v)} placeholder="Введите значение..." className="w-full" />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-gray-400 text-xs">Описание поля</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
            rows={2} placeholder="Пояснение для пользователя"
            className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 resize-none" />
        </div>
        {form.field_type === "select" && (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-gray-400 text-xs">Варианты списка (по одному на строку)</label>
            <textarea value={form.options} onChange={(e) => set("options", e.target.value)}
              rows={4} placeholder={"Вариант 1\nВариант 2\nВариант 3"}
              className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 resize-none" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Значение по умолчанию</label>
          <Inp value={form.default_value} onChange={(v) => set("default_value", v)} placeholder="Необязательно" className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">Порядок сортировки</label>
          <input type="number" value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
        </div>
      </div>

      <Tog checked={form.is_optional} onChange={(v) => set("is_optional", v)} label="Использовать при желании (необязательное поле)" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MultiCheck label="Категории (все если не выбрано)" items={allCats}
          selected={form.category_ids} onChange={(ids) => set("category_ids", ids)} />
        <MultiCheck label="Группы для заполнения (все если не выбрано)" items={groups}
          selected={form.add_group_ids} onChange={(ids) => set("add_group_ids", ids)} />
        <MultiCheck label="Группы для просмотра (все если не выбрано)" items={groups}
          selected={form.view_group_ids} onChange={(ids) => set("view_group_ids", ids)} />
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
          {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Сохраняю...</> : "Сохранить"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-xl transition-colors">Отмена</button>
      </div>
    </div>
  );
}

function AdFieldsTab() {
  const [folders, setFolders] = useState<AcfFolder[]>([]);
  const [fields, setFields] = useState<AdField[]>([]);
  const [flatCats, setFlatCats] = useState<{ cat: Category; depth: number }[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolderId, setActiveFolderId] = useState<number | null | "all">("all");
  const [editId, setEditId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editFolderId, setEditFolderId] = useState<number | null>(null);
  const [showFolderCreate, setShowFolderCreate] = useState(false);
  const [folderForm, setFolderForm] = useState({ name: "", sort_order: 0 });
  const [editFolderForm, setEditFolderForm] = useState({ id: 0, name: "", sort_order: 0 });

  const load = async () => {
    const [fld, af, cats, grp] = await Promise.all([
      adminApi.acfFolderList(), adminApi.acfList(), adminApi.catList(), adminApi.userGroups(),
    ]);
    setFolders((fld.items as AcfFolder[]) || []);
    setFields((af.items as AdField[]) || []);
    const t = (cats.items as Category[]) || [];
    setFlatCats(flattenTree(t));
    setGroups((grp.items as UserGroup[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const visibleFields = activeFolderId === "all"
    ? fields
    : activeFolderId === null
      ? fields.filter((f) => !f.folder_id)
      : fields.filter((f) => f.folder_id === activeFolderId);

  const handleCreate = async (data: Record<string, unknown>) => {
    const d = await adminApi.acfCreate(data);
    if (d.ok) { toast.success("Поле создано"); setShowCreate(false); load(); }
    else toast.error(d.error || "Ошибка");
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    const d = await adminApi.acfUpdate(data);
    if (d.ok) { toast.success("Поле сохранено"); setEditId(null); load(); }
    else toast.error(d.error || "Ошибка");
  };

  const handleRemove = async (id: number) => {
    if (!confirm("Удалить поле?")) return;
    const d = await adminApi.acfRemove(id);
    if (d.ok) { toast.success("Удалено"); load(); }
    else toast.error(d.error || "Ошибка");
  };

  const handleFolderCreate = async () => {
    if (!folderForm.name.trim()) { toast.error("Укажите название"); return; }
    const d = await adminApi.acfFolderCreate(folderForm as unknown as Record<string, unknown>);
    if (d.ok) { toast.success("Папка создана"); setShowFolderCreate(false); setFolderForm({ name: "", sort_order: 0 }); load(); }
    else toast.error(d.error || "Ошибка");
  };

  const handleFolderUpdate = async () => {
    if (!editFolderForm.name.trim()) { toast.error("Укажите название"); return; }
    const d = await adminApi.acfFolderUpdate(editFolderForm as unknown as Record<string, unknown>);
    if (d.ok) { toast.success("Папка сохранена"); setEditFolderId(null); load(); }
    else toast.error(d.error || "Ошибка");
  };

  const handleFolderRemove = async (id: number) => {
    if (!confirm("Удалить папку? Поля останутся без папки.")) return;
    const d = await adminApi.acfFolderRemove(id);
    if (d.ok) { toast.success("Папка удалена"); if (activeFolderId === id) setActiveFolderId("all"); load(); }
    else toast.error(d.error || "Ошибка");
  };

  const ftLabel = (ft: string) => FIELD_TYPES.find((o) => o.value === ft)?.label || ft;

  if (loading) return <Spinner />;

  const initialForEdit = (f: AdField): typeof ACF_DEFAULTS => ({
    ...ACF_DEFAULTS, ...f,
    folder_id: f.folder_id || 0,
    description: f.description || "", placeholder: f.placeholder || "",
    options: f.options || "", default_value: f.default_value || "",
    category_ids: f.categories.map((c) => c.id),
    add_group_ids: f.add_groups.map((g) => g.id),
    view_group_ids: f.view_groups.map((g) => g.id),
  });

  return (
    <div className="flex gap-4">
      {/* Левая панель: папки */}
      <div className="w-56 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Папки</span>
          <button onClick={() => setShowFolderCreate(true)} className="text-indigo-400 hover:text-indigo-300 text-xs transition-colors">+ Папка</button>
        </div>

        {showFolderCreate && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex flex-col gap-2">
            <Inp value={folderForm.name} onChange={(v) => setFolderForm((p) => ({ ...p, name: v }))} placeholder="Название" className="w-full" />
            <div className="flex gap-2">
              <button onClick={handleFolderCreate} className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors">Создать</button>
              <button onClick={() => setShowFolderCreate(false)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors">✕</button>
            </div>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <button onClick={() => setActiveFolderId("all")}
            className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-gray-800 ${activeFolderId === "all" ? "bg-indigo-600/20 text-indigo-300" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
            Все поля <span className="text-xs text-gray-500 ml-1">({fields.length})</span>
          </button>
          <button onClick={() => setActiveFolderId(null)}
            className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-gray-800 ${activeFolderId === null ? "bg-indigo-600/20 text-indigo-300" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
            Без папки <span className="text-xs text-gray-500 ml-1">({fields.filter((f) => !f.folder_id).length})</span>
          </button>
          {folders.map((folder) => (
            <div key={folder.id} className="border-b border-gray-800 last:border-0">
              {editFolderId === folder.id ? (
                <div className="p-2 flex flex-col gap-2">
                  <Inp value={editFolderForm.name} onChange={(v) => setEditFolderForm((p) => ({ ...p, name: v }))} className="w-full" />
                  <div className="flex gap-1">
                    <button onClick={handleFolderUpdate} className="flex-1 py-1 bg-indigo-600 text-white text-xs rounded-lg">Сохранить</button>
                    <button onClick={() => setEditFolderId(null)} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-lg">✕</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center group">
                  <button onClick={() => setActiveFolderId(folder.id)}
                    className={`flex-1 text-left px-3 py-2.5 text-sm transition-colors ${activeFolderId === folder.id ? "bg-indigo-600/20 text-indigo-300" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    📁 {folder.name}
                    <span className="text-xs text-gray-500 ml-1">({fields.filter((f) => f.folder_id === folder.id).length})</span>
                  </button>
                  <div className="flex gap-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditFolderId(folder.id); setEditFolderForm({ ...folder }); }}
                      className="p-1 text-gray-500 hover:text-white rounded text-xs">✏️</button>
                    <button onClick={() => handleFolderRemove(folder.id)}
                      className="p-1 text-red-600 hover:text-red-400 rounded text-xs">🗑</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Правая панель: поля */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex justify-between items-center">
          <p className="text-gray-400 text-sm">
            {activeFolderId === "all" ? "Все поля" : activeFolderId === null ? "Без папки" : `Папка: ${folders.find((f) => f.id === activeFolderId)?.name}`}
            <span className="text-gray-600 ml-2">({visibleFields.length})</span>
          </p>
          <Btn onClick={() => { setShowCreate(true); setEditId(null); }} variant="primary">+ Добавить поле</Btn>
        </div>

        {showCreate && (
          <AcfForm initial={{ ...ACF_DEFAULTS, folder_id: typeof activeFolderId === "number" ? activeFolderId : 0 }}
            folders={folders} flatCats={flatCats} groups={groups}
            onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        )}

        {visibleFields.length === 0 && !showCreate ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl text-center py-16 text-gray-500 text-sm">
            Нет полей в выбранной папке
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="p-3 text-left text-gray-400 font-medium">Название</th>
                  <th className="p-3 text-left text-gray-400 font-medium">Тип</th>
                  <th className="p-3 text-left text-gray-400 font-medium hidden md:table-cell">Категории</th>
                  <th className="p-3 text-center text-gray-400 font-medium">Необяз.</th>
                  <th className="p-3 text-right text-gray-400 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {visibleFields.map((f) => (
                  <>
                    <tr key={f.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="p-3">
                        <p className="text-white font-medium">{f.name}</p>
                        {f.folder_name && <p className="text-gray-600 text-xs">📁 {f.folder_name}</p>}
                      </td>
                      <td className="p-3 text-gray-400">{ftLabel(f.field_type)}</td>
                      <td className="p-3 text-gray-500 text-xs hidden md:table-cell">
                        {f.categories.length === 0
                          ? <span className="text-gray-600">Все категории</span>
                          : f.categories.map((c) => c.name).join(", ")}
                      </td>
                      <td className="p-3 text-center">{f.is_optional ? <span className="text-green-400">✓</span> : <span className="text-gray-600">✗</span>}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-1.5 justify-end">
                          <Btn onClick={() => { setEditId(f.id); setShowCreate(false); }} variant="secondary" className="!text-xs !py-1">Изменить</Btn>
                          <Btn onClick={() => handleRemove(f.id)} variant="danger" className="!text-xs !py-1">Удалить</Btn>
                        </div>
                      </td>
                    </tr>
                    {editId === f.id && (
                      <tr key={`edit-${f.id}`}><td colSpan={5} className="px-3 pb-3">
                        <AcfForm initial={initialForEdit(f)} folders={folders} flatCats={flatCats} groups={groups}
                          onSave={handleUpdate} onCancel={() => setEditId(null)} />
                      </td></tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminCategories() {
  const [activeTab, setActiveTab] = useState("cats");

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Категории</h1>
        <p className="text-gray-400 text-sm mt-1">Управление деревом категорий и дополнительными полями объявлений</p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "cats" && <CategoriesTab />}
      {activeTab === "fields" && <AdFieldsTab />}
    </div>
  );
}