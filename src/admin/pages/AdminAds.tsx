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

interface AdDetail extends AdRow {
  description: string; condition: string; updated_at: string | null;
  photos: string[]; author_full_name: string | null;
  rejection_reason: string | null;
  custom_fields: { field_id: number; name: string; field_type: string; value: string }[];
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

// ─── Модальная карточка объявления ────────────────────────────────────────────
function AdModal({ adId, onClose, onSaved }: {
  adId: number; onClose: () => void; onSaved: () => void;
}) {
  const [ad, setAd] = useState<AdDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Partial<AdDetail>>({});
  const [cfEdit, setCfEdit] = useState<Record<number, string>>({});
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    setLoading(true);
    adminApi.adsGet(adId).then((d) => {
      if (d.id) {
        setAd(d as AdDetail);
        setForm(d as AdDetail);
        const cf: Record<number, string> = {};
        (d.custom_fields as AdDetail["custom_fields"] || []).forEach((f) => { cf[f.field_id] = f.value; });
        setCfEdit(cf);
      } else toast.error(d.error || "Ошибка загрузки");
      setLoading(false);
    });
  }, [adId]);

  const handleSave = async () => {
    setSaving(true);
    const d = await adminApi.adsUpdate({
      id: adId, title: form.title, description: form.description,
      price: form.price, status: form.status, city: form.city,
      category: form.category, condition: form.condition,
      custom_fields: cfEdit,
    });
    setSaving(false);
    if (d.ok) { toast.success("Сохранено"); setEdit(false); onSaved(); adminApi.adsGet(adId).then((d2) => { if (d2.id) setAd(d2 as AdDetail); }); }
    else toast.error(d.error || "Ошибка сохранения");
  };

  const quickStatus = async (newStatus: string, reason?: string) => {
    const d = await adminApi.adsSetStatus([adId], newStatus, reason);
    if (d.ok) {
      const labels: Record<string, string> = { active: "одобрено", rejected: "отклонено", closed: "закрыто", archived: "в архиве" };
      toast.success(`Объявление ${labels[newStatus] || newStatus}`);
      setAd((prev) => prev ? { ...prev, status: newStatus, rejection_reason: newStatus === "rejected" ? (reason || null) : null } : prev);
      setForm((prev) => ({ ...prev, status: newStatus }));
      onSaved();
    } else toast.error(d.error || "Ошибка");
  };

  const handleReject = async () => {
    await quickStatus("rejected", rejectReason.trim() || undefined);
    setRejectDialog(false);
    setRejectReason("");
  };

  const setF = (k: keyof AdDetail, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-2xl h-full bg-gray-950 border-l border-gray-800 overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}>

        {/* Шапка */}
        <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-white font-semibold text-base">
              {loading ? "Загрузка..." : `Объявление #${adId}`}
            </h2>
          </div>
          {!loading && ad && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Кнопки быстрой модерации */}
              {!edit && ad.status === "pending" && (
                <>
                  <button onClick={() => setRejectDialog(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 hover:bg-red-900/70 text-red-400 hover:text-red-300 text-sm font-medium rounded-xl transition-colors border border-red-900/50">
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    Отклонить
                  </button>
                  <button onClick={() => quickStatus("active")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/40 hover:bg-green-900/70 text-green-400 hover:text-green-300 text-sm font-medium rounded-xl transition-colors border border-green-900/50">
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                    Одобрить
                  </button>
                </>
              )}
              {!edit && ad.status === "active" && (
                <button onClick={() => quickStatus("closed")}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-xl transition-colors border border-gray-700">
                  Закрыть
                </button>
              )}
              {!edit && ad.status === "rejected" && (
                <button onClick={() => quickStatus("active")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/40 hover:bg-green-900/70 text-green-400 text-sm font-medium rounded-xl transition-colors border border-green-900/50">
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                  Восстановить
                </button>
              )}
              {/* Редактирование */}
              {edit ? (
                <>
                  <button onClick={() => setEdit(false)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-colors">Отмена</button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                    {saving && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    Сохранить
                  </button>
                </>
              ) : (
                <button onClick={() => setEdit(true)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-xl transition-colors border border-gray-700">
                  ✏️
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ad ? (
          <div className="p-6 flex flex-col gap-6">

            {/* Баннер модерации */}
            {!edit && ad.status === "pending" && (
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⏳</span>
                  <div>
                    <p className="text-yellow-300 font-semibold text-sm">Ожидает модерации</p>
                    <p className="text-yellow-500 text-xs mt-0.5">Проверьте объявление и примите решение</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setRejectDialog(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-900/50 hover:bg-red-900/80 text-red-300 text-sm font-semibold rounded-xl transition-colors border border-red-800/50">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    Отклонить
                  </button>
                  <button onClick={() => quickStatus("active")}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-800/60 hover:bg-green-800/90 text-green-300 text-sm font-semibold rounded-xl transition-colors border border-green-700/50">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                    Одобрить
                  </button>
                </div>
              </div>
            )}

            {/* Статус + даты */}
            <div className="flex flex-wrap gap-3 items-center">
              {edit ? (
                <Sel value={form.status || ""} onChange={(v) => setF("status", v)}
                  options={[
                    { value: "active", label: "Активно" }, { value: "pending", label: "На модерации" },
                    { value: "rejected", label: "Отклонено" }, { value: "closed", label: "Закрыто" },
                    { value: "archived", label: "Архив" },
                  ]} />
              ) : (
                <StatusBadge status={ad.status} />
              )}
              <span className="text-gray-500 text-xs">Опубликовано: {fmtDate(ad.created_at)}</span>
              {ad.updated_at && <span className="text-gray-500 text-xs">Изменено: {fmtDate(ad.updated_at)}</span>}
              <span className="text-gray-500 text-xs ml-auto">👁 {ad.views} просмотров</span>
            </div>

            {/* Фото */}
            {ad.photos && ad.photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {ad.photos.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-28 h-20 object-cover rounded-xl border border-gray-800 shrink-0" />
                ))}
              </div>
            )}

            {/* Заголовок */}
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-500 text-xs uppercase tracking-wider">Заголовок</label>
              {edit
                ? <input value={form.title || ""} onChange={(e) => setF("title", e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold" />
                : <p className="text-white font-semibold text-lg">{ad.title}</p>}
            </div>

            {/* Описание */}
            <div className="flex flex-col gap-1.5">
              <label className="text-gray-500 text-xs uppercase tracking-wider">Описание</label>
              {edit
                ? <textarea value={form.description || ""} onChange={(e) => setF("description", e.target.value)}
                    rows={5} className="bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                : <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{ad.description || "—"}</p>}
            </div>

            {/* Основные поля */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-500 text-xs uppercase tracking-wider">Цена</label>
                {edit
                  ? <input type="number" value={form.price ?? ""} onChange={(e) => setF("price", Number(e.target.value))}
                      className="bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  : <p className="text-white font-semibold text-lg">{fmtPrice(ad.price)}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-500 text-xs uppercase tracking-wider">Город</label>
                {edit
                  ? <input value={form.city || ""} onChange={(e) => setF("city", e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  : <p className="text-gray-300">{ad.city || "—"}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-500 text-xs uppercase tracking-wider">Категория</label>
                {edit
                  ? <input value={form.category || ""} onChange={(e) => setF("category", e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  : <p className="text-gray-300">{ad.category || "—"}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-500 text-xs uppercase tracking-wider">Состояние</label>
                {edit
                  ? <input value={form.condition || ""} onChange={(e) => setF("condition", e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  : <p className="text-gray-300">{ad.condition || "—"}</p>}
              </div>
            </div>

            {/* Дополнительные поля */}
            {ad.custom_fields.length > 0 && (
              <div className="flex flex-col gap-3">
                <label className="text-gray-500 text-xs uppercase tracking-wider">Дополнительные поля</label>
                <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
                  {ad.custom_fields.map((cf) => (
                    <div key={cf.field_id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-gray-400 text-sm w-36 shrink-0">{cf.name}</span>
                      {edit
                        ? cf.field_type === "boolean"
                          ? <select value={cfEdit[cf.field_id] ?? cf.value}
                              onChange={(e) => setCfEdit((p) => ({ ...p, [cf.field_id]: e.target.value }))}
                              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                              <option value="true">Да</option>
                              <option value="false">Нет</option>
                            </select>
                          : <input value={cfEdit[cf.field_id] ?? cf.value}
                              onChange={(e) => setCfEdit((p) => ({ ...p, [cf.field_id]: e.target.value }))}
                              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        : <span className="text-white text-sm">{cf.value || "—"}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Автор */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-600/30 rounded-full flex items-center justify-center text-indigo-300 font-semibold text-sm shrink-0">
                {(ad.author_name || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{ad.author_full_name || ad.author_name || "—"}</p>
                <p className="text-gray-500 text-xs">{ad.author_email}</p>
              </div>
              <span className="text-gray-600 text-xs ml-auto">ID #{ad.author_id}</span>
            </div>

            {/* Причина отклонения */}
            {ad.status === "rejected" && (
              <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4 flex flex-col gap-2">
                <p className="text-red-400 text-xs font-semibold uppercase tracking-wider">Причина отклонения</p>
                <p className="text-red-200 text-sm">
                  {ad.rejection_reason || <span className="text-red-700 italic">Не указана</span>}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-24 text-gray-500">Объявление не найдено</div>
        )}
      </div>

      {/* Диалог отклонения */}
      {rejectDialog && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-l-none"
          onClick={() => setRejectDialog(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-red-900/50 rounded-xl flex items-center justify-center shrink-0">
                <svg width="16" height="16" fill="none" stroke="#f87171" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Отклонить объявление</p>
                <p className="text-gray-500 text-xs">Укажите причину — автор её увидит</p>
              </div>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Например: содержит запрещённый контент, неверная категория, недостаточно информации..."
              rows={4}
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-600 resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setRejectDialog(false); setRejectReason(""); }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-colors">
                Отмена
              </button>
              <button onClick={handleReject}
                className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
  const [openAdId, setOpenAdId] = useState<number | null>(null);

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
                  <tr key={ad.id}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer ${selected.includes(ad.id) ? "bg-indigo-900/10" : ""}`}
                    onClick={() => setOpenAdId(ad.id)}>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.includes(ad.id)}
                        onChange={() => toggleSelect(ad.id)} className="rounded accent-indigo-600" />
                    </td>
                    <td className="p-3">
                      <p className="text-white font-medium line-clamp-1 hover:text-indigo-300 transition-colors">{ad.title}</p>
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

      {openAdId !== null && (
        <AdModal
          adId={openAdId}
          onClose={() => setOpenAdId(null)}
          onSaved={() => load(applied, cfFilter)}
        />
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