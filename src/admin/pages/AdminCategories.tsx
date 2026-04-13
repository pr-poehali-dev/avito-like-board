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
      className={`bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground))] ${className}`} />
  );
}

function Sel({ value, onChange, options, className = "" }: {
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

function Tog({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--border))]"}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      {label && <span className="text-sm text-[hsl(var(--muted-foreground))]">{label}</span>}
    </label>
  );
}

function Btn({ onClick, children, variant = "primary", disabled = false, className = "" }: {
  onClick?: () => void; children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger"; disabled?: boolean; className?: string;
}) {
  const cls = {
    primary: "bg-[hsl(var(--primary))] hover:opacity-90 text-white",
    secondary: "bg-[hsl(var(--muted))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] border border-border",
    danger: "bg-red-50 hover:bg-red-100 text-red-500",
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${cls} ${className}`}>
      {children}
    </button>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" /></div>;
}

// ─── Массовое добавление категорий ────────────────────────────────────────────
interface BulkAddProps {
  flat: { cat: Category; depth: number }[];
  onDone: () => void;
  onCancel: () => void;
}

function BulkAddCategories({ flat, onDone, onCancel }: BulkAddProps) {
  const [text, setText] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ name: string; status: "pending" | "ok" | "err" }[]>([]);
  const [started, setStarted] = useState(false);

  const parentOpts = buildSelectOpts(flat);

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const handleRun = async () => {
    if (!lines.length) return;
    const tasks = lines.map((name) => ({ name, status: "pending" as const }));
    setProgress(tasks);
    setStarted(true);
    setSaving(true);

    for (let i = 0; i < lines.length; i++) {
      const name = lines[i];
      const slug = name
        .toLowerCase()
        .split("")
        .map((c: string) => ({"а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"zh","з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"kh","ц":"ts","ч":"ch","ш":"sh","щ":"shch","ъ":"","ы":"y","ь":"","э":"e","ю":"yu","я":"ya"} as Record<string,string>)[c] ?? c)
        .join("")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || `cat-${Date.now()}`;

      const d = await adminApi.catCreate({
        name,
        slug,
        parent_id: parentId ? Number(parentId) : null,
        sort_order: i,
        show_in_menu: true,
      });

      setProgress((p) => p.map((t, idx) => idx === i ? { ...t, status: d.ok ? "ok" : "err" } : t));
    }

    setSaving(false);
    onDone();
  };

  const doneCount = progress.filter((p) => p.status === "ok").length;
  const errCount = progress.filter((p) => p.status === "err").length;

  return (
    <div className="bg-white border border-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[hsl(var(--foreground))] font-semibold text-sm">Массовое добавление категорий</h3>
          <p className="text-[hsl(var(--muted-foreground))] text-xs mt-0.5">Введите названия — по одному на строку</p>
        </div>
        <button onClick={onCancel} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors text-lg leading-none">✕</button>
      </div>

      {!started ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-[hsl(var(--muted-foreground))] text-xs">Родительская категория (необязательно)</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)}
              className="bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
              <option value="">— корневые категории —</option>
              {parentOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[hsl(var(--muted-foreground))] text-xs">Названия категорий <span className="opacity-60">(одна строка — одна категория)</span></label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={"Транспорт\nАвтомобили\nМотоциклы\nГрузовые авто\nЗапчасти"}
              className="bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground))] resize-none font-mono"
            />
            <p className="text-[hsl(var(--muted-foreground))] text-xs">
              {lines.length > 0 ? <span className="text-[hsl(var(--primary))]">{lines.length} категорий будет создано</span> : "Введите хотя бы одно название"}
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={onCancel} className="px-4 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] text-sm rounded-xl transition-colors border border-border">
              Отмена
            </button>
            <button onClick={handleRun} disabled={!lines.length || saving}
              className="flex items-center gap-2 px-5 py-2 bg-[hsl(var(--primary))] hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-opacity">
              Создать {lines.length > 0 && `${lines.length} категорий`}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
            {progress.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[hsl(var(--muted))]">
                <span className="text-base leading-none shrink-0">
                  {p.status === "pending" ? "⏳" : p.status === "ok" ? "✅" : "❌"}
                </span>
                <span className="text-sm text-[hsl(var(--foreground))] flex-1 truncate">{p.name}</span>
              </div>
            ))}
          </div>
          {!saving && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                <span className="text-green-600">{doneCount} создано</span>
                {errCount > 0 && <span className="text-red-500 ml-2">{errCount} ошибок</span>}
              </p>
              <button onClick={onCancel} className="px-4 py-2 bg-[hsl(var(--primary))] hover:opacity-90 text-white text-sm font-semibold rounded-xl transition-opacity">
                Готово
              </button>
            </div>
          )}
          {saving && (
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] text-xs pt-1">
              <div className="w-3.5 h-3.5 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
              Создаю категории...
            </div>
          )}
        </div>
      )}
    </div>
  );
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

const TRANSLIT_MAP: Record<string, string> = {
  а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",
  к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
  х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .split("")
    .map((c) => TRANSLIT_MAP[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "category";
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
  const [slugEdited, setSlugEdited] = useState(!!initial.slug);
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
    <div className="bg-[hsl(var(--muted))] border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Название *</label>
          <Inp value={form.name} onChange={(v) => { set("name", v); if (!slugEdited) set("slug", slugify(v)); }} placeholder="Транспорт" className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Альтернативное название</label>
          <Inp value={form.alt_name} onChange={(v) => set("alt_name", v)} placeholder="Необязательно" className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Родительская категория</label>
          <Sel value={String(form.parent_id || "")} onChange={(v) => set("parent_id", v ? Number(v) : 0)} className="w-full"
            options={[{ value: "", label: "— корневая категория —" }, ...parentOpts]} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">URL-псевдоним (slug)</label>
          <Inp value={form.slug} onChange={(v) => { set("slug", v); setSlugEdited(true); }} placeholder="transport" className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Мета-заголовок (Title)</label>
          <Inp value={form.meta_title} onChange={(v) => set("meta_title", v)} placeholder="SEO заголовок" className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Порядок сортировки</label>
          <input type="number" value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))}
            className="bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] w-full" />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Мета-описание (Description)</label>
          <textarea value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)}
            rows={2} placeholder="SEO описание"
            className="bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground))] resize-none" />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Краткое описание</label>
          <textarea value={form.short_description} onChange={(e) => set("short_description", e.target.value)}
            rows={3} placeholder="Описание для страницы категории"
            className="bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground))] resize-none" />
        </div>
      </div>
      <Tog checked={form.show_in_menu} onChange={(v) => set("show_in_menu", v)} label="Показывать в главном меню" />
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-[hsl(var(--primary))] hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-opacity">
          {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Сохраняю...</> : "Сохранить"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-sm rounded-xl transition-colors">Отмена</button>
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
      <div className={`flex items-center gap-2 py-2 px-3 hover:bg-[hsl(var(--muted))] rounded-lg group ${editId === cat.id ? "bg-[hsl(var(--primary))]/10" : ""}`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}>
        <button onClick={() => onToggle(cat.id)}
          className={`w-5 h-5 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors text-xs ${!hasChildren ? "invisible" : ""}`}>
          {isExpanded ? "▼" : "▶"}
        </button>
        <span className="text-[hsl(var(--muted-foreground))] text-xs w-8 shrink-0">#{cat.id}</span>
        <span className="text-[hsl(var(--foreground))] text-sm font-medium flex-1 truncate">{cat.name}</span>
        {cat.slug && <span className="text-[hsl(var(--muted-foreground))] text-xs hidden sm:block truncate max-w-[120px]">/{cat.slug}</span>}
        <span className="text-[hsl(var(--muted-foreground))] text-xs shrink-0">{cat.ads_count} объявл.</span>
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
  const [showBulk, setShowBulk] = useState(false);
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
        <div className="flex gap-2 flex-wrap">
          <Btn onClick={() => { setShowCreate(true); setCreateParentId(0); setEditCat(null); setShowBulk(false); }} variant="primary">
            + Корневая категория
          </Btn>
          <Btn onClick={() => { setShowBulk(true); setShowCreate(false); setEditCat(null); }} variant="secondary">
            + Несколько сразу
          </Btn>
          <Btn onClick={() => toggleAll(true)} variant="secondary">Развернуть всё</Btn>
          <Btn onClick={() => toggleAll(false)} variant="secondary">Свернуть всё</Btn>
        </div>
        <span className="text-[hsl(var(--muted-foreground))] text-sm">Всего: {flat.length}</span>
      </div>

      {/* Массовое добавление */}
      {showBulk && (
        <BulkAddCategories
          flat={flat}
          onDone={() => { setShowBulk(false); load(); }}
          onCancel={() => setShowBulk(false)}
        />
      )}

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
        <div className="bg-white border border-border rounded-2xl text-center py-16 text-[hsl(var(--muted-foreground))] text-sm">
          Нет категорий. Создайте первую.
        </div>
      ) : (
        <div className="bg-white border border-border rounded-2xl overflow-hidden py-2">
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
      <label className="text-[hsl(var(--muted-foreground))] text-xs">{label}</label>
      <div className="bg-[hsl(var(--muted))] border border-border rounded-xl p-3 flex flex-col gap-1.5 max-h-40 overflow-y-auto">
        {items.length === 0
          ? <span className="text-[hsl(var(--muted-foreground))] text-xs italic">Нет доступных элементов</span>
          : items.map((item) => (
            <label key={item.id} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} className="rounded accent-[hsl(var(--primary))]" />
              <span className="text-sm text-[hsl(var(--foreground))]">{item.name}</span>
            </label>
          ))}
      </div>
      {selected.length > 0 && <p className="text-xs text-[hsl(var(--primary))]">Выбрано: {selected.length}</p>}
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
    <div className="bg-[hsl(var(--muted))] border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Название поля *</label>
          <Inp value={form.name} onChange={(v) => set("name", v)} placeholder="Пробег" className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Тип поля</label>
          <Sel value={form.field_type} onChange={(v) => set("field_type", v)} className="w-full" options={FIELD_TYPES} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Папка</label>
          <Sel value={String(form.folder_id || "")} onChange={(v) => set("folder_id", v ? Number(v) : 0)} className="w-full"
            options={[{ value: "", label: "— без папки —" }, ...folders.map((f) => ({ value: String(f.id), label: f.name }))]} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Подсказка (placeholder)</label>
          <Inp value={form.placeholder} onChange={(v) => set("placeholder", v)} placeholder="Введите значение..." className="w-full" />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Описание поля</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
            rows={2} placeholder="Пояснение для пользователя"
            className="bg-[hsl(var(--card))] border border-border text-[hsl(var(--foreground))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground))] resize-none" />
        </div>
        {form.field_type === "select" && (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-[hsl(var(--muted-foreground))] text-xs">Варианты списка (по одному на строку)</label>
            <textarea value={form.options} onChange={(e) => set("options", e.target.value)}
              rows={4} placeholder={"Вариант 1\nВариант 2\nВариант 3"}
              className="bg-[hsl(var(--card))] border border-border text-[hsl(var(--foreground))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground))] resize-none" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Значение по умолчанию</label>
          <Inp value={form.default_value} onChange={(v) => set("default_value", v)} placeholder="Необязательно" className="w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[hsl(var(--muted-foreground))] text-xs">Порядок сортировки</label>
          <input type="number" value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))}
            className="bg-[hsl(var(--card))] border border-border text-[hsl(var(--foreground))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] w-full" />
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
          className="flex items-center gap-2 px-5 py-2 bg-[hsl(var(--primary))] hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-opacity">
          {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Сохраняю...</> : "Сохранить"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-sm rounded-xl transition-colors">Отмена</button>
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
          <span className="text-[hsl(var(--muted-foreground))] text-xs font-medium uppercase tracking-wider">Папки</span>
          <button onClick={() => setShowFolderCreate(true)} className="text-[hsl(var(--primary))] hover:opacity-80 text-xs transition-opacity">+ Папка</button>
        </div>

        {showFolderCreate && (
          <div className="bg-[hsl(var(--muted))] border border-border rounded-xl p-3 flex flex-col gap-2">
            <Inp value={folderForm.name} onChange={(v) => setFolderForm((p) => ({ ...p, name: v }))} placeholder="Название" className="w-full" />
            <div className="flex gap-2">
              <button onClick={handleFolderCreate} className="flex-1 py-1 bg-[hsl(var(--primary))] hover:opacity-90 text-white text-xs rounded-lg transition-opacity">Создать</button>
              <button onClick={() => setShowFolderCreate(false)} className="px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] text-xs rounded-lg">✕</button>
            </div>
          </div>
        )}

        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <button onClick={() => setActiveFolderId("all")}
            className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-border ${activeFolderId === "all" ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"}`}>
            Все поля <span className="text-xs opacity-60 ml-1">({fields.length})</span>
          </button>
          <button onClick={() => setActiveFolderId(null)}
            className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-border ${activeFolderId === null ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"}`}>
            Без папки <span className="text-xs opacity-60 ml-1">({fields.filter((f) => !f.folder_id).length})</span>
          </button>
          {folders.map((folder) => (
            <div key={folder.id} className="border-b border-border last:border-0">
              {editFolderId === folder.id ? (
                <div className="p-2 flex flex-col gap-2">
                  <Inp value={editFolderForm.name} onChange={(v) => setEditFolderForm((p) => ({ ...p, name: v }))} className="w-full" />
                  <div className="flex gap-1">
                    <button onClick={handleFolderUpdate} className="flex-1 py-1 bg-[hsl(var(--primary))] text-white text-xs rounded-lg">Сохранить</button>
                    <button onClick={() => setEditFolderId(null)} className="px-2 py-1 bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] text-xs rounded-lg">✕</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center group">
                  <button onClick={() => setActiveFolderId(folder.id)}
                    className={`flex-1 text-left px-3 py-2.5 text-sm transition-colors ${activeFolderId === folder.id ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"}`}>
                    📁 {folder.name}
                    <span className="text-xs opacity-60 ml-1">({fields.filter((f) => f.folder_id === folder.id).length})</span>
                  </button>
                  <div className="flex gap-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditFolderId(folder.id); setEditFolderForm({ ...folder }); }}
                      className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded text-xs">✏️</button>
                    <button onClick={() => handleFolderRemove(folder.id)}
                      className="p-1 text-red-500 hover:text-red-600 rounded text-xs">🗑</button>
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
          <p className="text-[hsl(var(--muted-foreground))] text-sm">
            {activeFolderId === "all" ? "Все поля" : activeFolderId === null ? "Без папки" : `Папка: ${folders.find((f) => f.id === activeFolderId)?.name}`}
            <span className="opacity-60 ml-2">({visibleFields.length})</span>
          </p>
          <Btn onClick={() => { setShowCreate(true); setEditId(null); }} variant="primary">+ Добавить поле</Btn>
        </div>

        {showCreate && (
          <AcfForm initial={{ ...ACF_DEFAULTS, folder_id: typeof activeFolderId === "number" ? activeFolderId : 0 }}
            folders={folders} flatCats={flatCats} groups={groups}
            onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        )}

        {visibleFields.length === 0 && !showCreate ? (
          <div className="bg-white border border-border rounded-2xl text-center py-16 text-[hsl(var(--muted-foreground))] text-sm">
            Нет полей в выбранной папке
          </div>
        ) : (
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium">Название</th>
                  <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium">Тип</th>
                  <th className="p-3 text-left text-[hsl(var(--muted-foreground))] font-medium hidden md:table-cell">Категории</th>
                  <th className="p-3 text-center text-[hsl(var(--muted-foreground))] font-medium">Необяз.</th>
                  <th className="p-3 text-right text-[hsl(var(--muted-foreground))] font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {visibleFields.map((f) => (
                  <>
                    <tr key={f.id} className="border-b border-border hover:bg-[hsl(var(--muted))]">
                      <td className="p-3">
                        <p className="text-[hsl(var(--foreground))] font-medium">{f.name}</p>
                        {f.folder_name && <p className="text-[hsl(var(--muted-foreground))] text-xs">📁 {f.folder_name}</p>}
                      </td>
                      <td className="p-3 text-[hsl(var(--muted-foreground))]">{ftLabel(f.field_type)}</td>
                      <td className="p-3 text-[hsl(var(--muted-foreground))] text-xs hidden md:table-cell">
                        {f.categories.length === 0
                          ? <span className="opacity-60">Все категории</span>
                          : f.categories.map((c) => c.name).join(", ")}
                      </td>
                      <td className="p-3 text-center">{f.is_optional ? <span className="text-green-600">✓</span> : <span className="text-[hsl(var(--muted-foreground))]">✗</span>}</td>
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
        <h1 className="text-[hsl(var(--foreground))] text-2xl font-bold">Категории</h1>
        <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">Управление деревом категорий и дополнительными полями объявлений</p>
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

      {activeTab === "cats" && <CategoriesTab />}
      {activeTab === "fields" && <AdFieldsTab />}
    </div>
  );
}