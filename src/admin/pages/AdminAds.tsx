import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { adminApi } from "../api";

// ─── Типы ─────────────────────────────────────────────────────────────────────
interface AdRow {
  id: number; title: string; price: number; status: string;
  views: number; created_at: string | null;
  category: string; category_id: number | null; city: string;
  author_name: string; author_email: string; author_id: number;
}

interface CfField { id: number; name: string; field_type: string; folder_name: string | null; }

// ─── Утилиты ──────────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active:   { label: "Активно",   cls: "bg-green-900/50 text-green-400" },
  pending:  { label: "На модерации", cls: "bg-yellow-900/50 text-yellow-400" },
  rejected: { label: "Отклонено", cls: "bg-red-900/50 text-red-400" },
  closed:   { label: "Закрыто",   cls: "bg-gray-700 text-gray-400" },
  archived: { label: "Архив",     cls: "bg-gray-800 text-gray-500" },
};

const STATUS_OPTS = [
  { value: "", label: "Все статусы" },
  { value: "active",   label: "Активные" },
  { value: "pending",  label: "На модерации" },
  { value: "rejected", label: "Отклонённые" },
  { value: "closed",   label: "Закрытые" },
  { value: "archived", label: "Архивные" },
];

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, cls: "bg-gray-700 text-gray-400" };
  return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtPrice(p: number) {
  return p > 0 ? p.toLocaleString("ru-RU") + " ₽" : "Бесплатно";
}

// ─── UI-компоненты ─────────────────────────────────────────────────────────────
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

// ─── Общая таблица объявлений ──────────────────────────────────────────────────
interface AdsTableProps {
  forceStatus?: string; // если задан — скрыть фильтр статуса, зафиксировать
}

function AdsTable({ forceStatus }: AdsTableProps) {
  const [ads, setAds]           = useState<AdRow[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [cfFields, setCfFields] = useState<CfField[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [applying, setApplying] = useState(false);

  const [filter, setFilter] = useState({
    search: "", status: forceStatus || "", user_search: "",
    category_id: "", date_from: "", date_to: "",
    sort_by: "created_at", sort_order: "desc",
    per_page: "25", page: 1,
  });
  const [applied, setApplied] = useState({ ...filter });
  const [cfFilter, setCfFilter] = useState<Record<string, string>>({});

  const fStr = (k: keyof typeof filter) => filter[k] as string;
  const setF = (k: keyof typeof filter, v: string | number) => setFilter((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    adminApi.adsGetCf().then((d) => setCfFields((d.items as CfField[]) || []));
  }, []);

  const load = useCallback(async (f: typeof applied, cf: Record<string, string>) => {
    setLoading(true);
    const params: Record<string, unknown> = {
      page: f.page, per_page: Number(f.per_page),
      sort_by: f.sort_by, sort_order: f.sort_order,
    };
    if (f.search)      params.search = f.search;
    if (forceStatus)   params.status = forceStatus;
    else if (f.status) params.status = f.status;
    if (f.user_search) params.user_search = f.user_search;
    if (f.category_id) params.category_id = Number(f.category_id);
    if (f.date_from)   params.date_from = f.date_from;
    if (f.date_to)     params.date_to = f.date_to;
    const cfActive: Record<string, string> = {};
    Object.entries(cf).forEach(([k, v]) => { if (v) cfActive[k] = v; });
    if (Object.keys(cfActive).length) params.custom_fields = cfActive;

    const d = await adminApi.adsList(params);
    setAds((d.items as AdRow[]) || []);
    setTotal(d.total || 0);
    setLoading(false);
  }, [forceStatus]);

  useEffect(() => { load(applied, cfFilter); }, []);

  const applyFilter = () => {
    const f = { ...filter, page: 1 };
    setApplied(f); load(f, cfFilter);
  };
  const resetFilter = () => {
    const def = {
      search: "", status: forceStatus || "", user_search: "",
      category_id: "", date_from: "", date_to: "",
      sort_by: "created_at", sort_order: "desc", per_page: "25", page: 1,
    };
    setFilter(def); setApplied(def); setCfFilter({}); load(def, {});
  };
  const goPage = (p: number) => {
    const f = { ...applied, page: p }; setApplied(f); load(f, cfFilter);
  };

  const toggleSelect = (id: number) =>
    setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleAll = () =>
    setSelected(selected.length === ads.length ? [] : ads.map((a) => a.id));

  const applyBulk = async () => {
    if (!selected.length || !bulkStatus) return;
    setApplying(true);
    const d = await adminApi.adsSetStatus(selected, bulkStatus);
    setApplying(false);
    if (d.ok) {
      toast.success(`Обновлено ${d.affected} объявлений`);
      setSelected([]); load(applied, cfFilter);
    } else toast.error(d.error || "Ошибка");
  };

  const totalPages = Math.ceil(total / Number(applied.per_page));

  return (
    <div className="flex flex-col gap-4">
      {/* Фильтр */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Фильтры</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs">Поиск по заголовку / описанию</label>
            <Inp value={fStr("search")} onChange={(v) => setF("search", v)} placeholder="Ключевое слово" className="w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs">Автор (логин / email)</label>
            <Inp value={fStr("user_search")} onChange={(v) => setF("user_search", v)} placeholder="Имя или email" className="w-full" />
          </div>
          {!forceStatus && (
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 text-xs">Статус</label>
              <Sel value={fStr("status")} onChange={(v) => setF("status", v)} options={STATUS_OPTS} className="w-full" />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs">Дата публикации</label>
            <div className="flex gap-2">
              <Inp value={fStr("date_from")} onChange={(v) => setF("date_from", v)} type="date" className="flex-1" />
              <Inp value={fStr("date_to")} onChange={(v) => setF("date_to", v)} type="date" className="flex-1" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-xs">Категория (ID)</label>
            <Inp value={fStr("category_id")} onChange={(v) => setF("category_id", v)} type="number" placeholder="ID категории" className="w-full" />
          </div>
        </div>

        {/* Доп. поля */}
        {cfFields.length > 0 && (
          <div className="mt-4 border-t border-gray-800 pt-4">
            <p className="text-gray-500 text-xs mb-3">Фильтр по дополнительным полям</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cfFields.map((cf) => (
                <div key={cf.id} className="flex flex-col gap-1">
                  <label className="text-gray-400 text-xs">
                    {cf.folder_name ? `${cf.folder_name} / ` : ""}{cf.name}
                  </label>
                  <Inp
                    value={cfFilter[String(cf.id)] || ""}
                    onChange={(v) => setCfFilter((p) => ({ ...p, [String(cf.id)]: v }))}
                    placeholder={cf.field_type === "boolean" ? "true / false" : "Значение"}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={applyFilter}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors">
            Применить
          </button>
          <button onClick={resetFilter}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-colors">
            Сбросить
          </button>
        </div>
      </div>

      {/* Сортировка */}
      <div className="flex flex-wrap gap-3 items-center">
        <Sel value={fStr("sort_by")} onChange={(v) => setF("sort_by", v)}
          options={[{ value: "created_at", label: "По дате" }, { value: "title", label: "По названию" },
            { value: "price", label: "По цене" }, { value: "views", label: "По просмотрам" }]} />
        <Sel value={fStr("sort_order")} onChange={(v) => setF("sort_order", v)}
          options={[{ value: "desc", label: "По убыванию" }, { value: "asc", label: "По возрастанию" }]} />
        <Sel value={fStr("per_page")} onChange={(v) => setF("per_page", v)}
          options={[{ value: "10", label: "10" }, { value: "25", label: "25" }, { value: "50", label: "50" }, { value: "100", label: "100" }]} />
        <button onClick={applyFilter}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-colors">
          Применить
        </button>
        <span className="text-gray-500 text-sm ml-auto">Всего: {total}</span>
      </div>

      {/* Таблица */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">Объявления не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="p-3 w-9">
                    <input type="checkbox"
                      checked={selected.length === ads.length && ads.length > 0}
                      onChange={toggleAll} className="rounded accent-indigo-600" />
                  </th>
                  <th className="p-3 text-left text-gray-400 font-medium">Объявление</th>
                  <th className="p-3 text-left text-gray-400 font-medium hidden lg:table-cell">Автор</th>
                  <th className="p-3 text-left text-gray-400 font-medium hidden md:table-cell">Дата</th>
                  <th className="p-3 text-right text-gray-400 font-medium">Цена</th>
                  <th className="p-3 text-center text-gray-400 font-medium hidden sm:table-cell">Просм.</th>
                  <th className="p-3 text-center text-gray-400 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr key={ad.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${selected.includes(ad.id) ? "bg-indigo-900/10" : ""}`}>
                    <td className="p-3">
                      <input type="checkbox" checked={selected.includes(ad.id)}
                        onChange={() => toggleSelect(ad.id)} className="rounded accent-indigo-600" />
                    </td>
                    <td className="p-3">
                      <p className="text-white font-medium line-clamp-1">{ad.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        #{ad.id} · {ad.city}
                        {ad.category && <span className="ml-1 text-gray-600">· {ad.category}</span>}
                      </p>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <p className="text-gray-300 text-sm">{ad.author_name || "—"}</p>
                      <p className="text-gray-500 text-xs">{ad.author_email}</p>
                    </td>
                    <td className="p-3 text-gray-400 text-xs hidden md:table-cell whitespace-nowrap">
                      {fmtDate(ad.created_at)}
                    </td>
                    <td className="p-3 text-right text-gray-300 whitespace-nowrap">{fmtPrice(ad.price)}</td>
                    <td className="p-3 text-center text-gray-500 text-xs hidden sm:table-cell">{ad.views}</td>
                    <td className="p-3 text-center"><StatusBadge status={ad.status} /></td>
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
          <button onClick={() => goPage(Math.max(1, applied.page - 1))} disabled={applied.page === 1}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 text-sm rounded-lg transition-colors">←</button>
          <span className="text-gray-400 text-sm">{applied.page} / {totalPages}</span>
          <button onClick={() => goPage(Math.min(totalPages, applied.page + 1))} disabled={applied.page === totalPages}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 text-sm rounded-lg transition-colors">→</button>
        </div>
      )}

      {/* Групповые действия */}
      {selected.length > 0 && (
        <div className="bg-gray-900 border border-indigo-800/50 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <span className="text-indigo-300 text-sm font-medium">Выбрано: {selected.length}</span>
          <Sel value={bulkStatus} onChange={setBulkStatus}
            options={[
              { value: "", label: "Изменить статус на..." },
              { value: "active",   label: "Активно" },
              { value: "pending",  label: "На модерацию" },
              { value: "rejected", label: "Отклонить" },
              { value: "closed",   label: "Закрыть" },
              { value: "archived", label: "В архив" },
            ]} />
          <button onClick={applyBulk} disabled={applying || !bulkStatus}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
            {applying ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
            Применить
          </button>
          <button onClick={() => setSelected([])} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">Снять выбор</button>
        </div>
      )}
    </div>
  );
}

// ─── Таб: На модерации ─────────────────────────────────────────────────────────
function ModerationTab() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 bg-yellow-900/20 border border-yellow-800/40 rounded-xl px-4 py-3">
        <span className="text-yellow-400 text-lg">⚠️</span>
        <p className="text-yellow-300 text-sm">
          Здесь отображаются объявления, ожидающие проверки модератором.
          Одобрите или отклоните каждое — используйте чекбоксы и групповые действия.
        </p>
      </div>
      <AdsTable forceStatus="pending" />
    </div>
  );
}

// ─── Главный компонент ─────────────────────────────────────────────────────────
const TABS = [
  { id: "all",  label: "Все объявления" },
  { id: "moderation", label: "На модерации" },
];

export default function AdminAds() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Объявления</h1>
        <p className="text-gray-400 text-sm mt-1">Управление объявлениями, фильтрация и модерация</p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}>
            {tab.id === "moderation" ? "⚠️ " : ""}{tab.label}
          </button>
        ))}
      </div>

      {activeTab === "all" && <AdsTable />}
      {activeTab === "moderation" && <ModerationTab />}
    </div>
  );
}
