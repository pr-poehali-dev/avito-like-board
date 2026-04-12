import { useState, useEffect, useCallback } from "react";
import { adminApi } from "../api";
import { toast } from "sonner";

// ─── Статичный список часовых поясов ────────────────────────────────────────
const TIMEZONES = [
  "UTC",
  "Europe/Moscow",
  "Europe/Kaliningrad",
  "Europe/Samara",
  "Asia/Yekaterinburg",
  "Asia/Omsk",
  "Asia/Krasnoyarsk",
  "Asia/Irkutsk",
  "Asia/Yakutsk",
  "Asia/Vladivostok",
  "Asia/Magadan",
  "Asia/Kamchatka",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Kiev",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

// ─── Вкладки ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "general", label: "Общие" },
  { id: "security", label: "Безопасность" },
  { id: "ads", label: "Объявления" },
  { id: "db", label: "Оптимизация БД" },
  { id: "files", label: "Файлы" },
  { id: "email", label: "E-Mail" },
  { id: "users", label: "Пользователи" },
  { id: "images", label: "Изображения" },
];

// ─── Типы ─────────────────────────────────────────────────────────────────────
interface GeneralSettings {
  site_name: string;
  site_url: string;
  force_https: boolean;
  redirect_www: boolean;
  meta_description: string;
  meta_keywords: string;
  site_short_name: string;
  timezone: string;
  use_custom_404: boolean;
  site_offline: boolean;
}

const DEFAULTS: GeneralSettings = {
  site_name: "",
  site_url: "http://yoursite.com/",
  force_https: false,
  redirect_www: false,
  meta_description: "",
  meta_keywords: "",
  site_short_name: "",
  timezone: "UTC",
  use_custom_404: false,
  site_offline: false,
};

// ─── UI atoms ─────────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 py-5 border-b border-gray-800 last:border-0">
      <div className="sm:w-64 shrink-0">
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, maxLength, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
    />
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${checked ? "bg-indigo-600" : "bg-gray-700"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

// ─── Вкладка заглушка ─────────────────────────────────────────────────────────
function StubTab({ label }: { label: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center mt-6">
      <div className="text-3xl mb-3">🔧</div>
      <p className="text-gray-400 text-sm">Раздел «{label}» будет реализован в следующей части</p>
    </div>
  );
}

// ─── Вкладка Общие настройки ─────────────────────────────────────────────────
function GeneralSettingsTab() {
  const [form, setForm] = useState<GeneralSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof GeneralSettings, string>>>({});
  const [serverTime, setServerTime] = useState("");
  const [timeLoading, setTimeLoading] = useState(false);

  useEffect(() => {
    adminApi.settingsGet("general").then((d) => {
      if (!d.error) setForm({ ...DEFAULTS, ...(d as GeneralSettings) });
      setLoading(false);
    });
  }, []);

  const fetchServerTime = useCallback((tz: string) => {
    setTimeLoading(true);
    adminApi.serverTime(tz).then((d) => {
      if (d.datetime) setServerTime(d.datetime as string);
      setTimeLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!loading) fetchServerTime(form.timezone);
  }, [form.timezone, loading, fetchServerTime]);

  const set = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof GeneralSettings, string>> = {};
    const url = form.site_url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      e.site_url = "URL должен начинаться с http:// или https://";
    } else if (!url.endsWith("/")) {
      e.site_url = "URL должен заканчиваться на /";
    }
    if (form.meta_description.length > 200) {
      e.meta_description = "Не более 200 символов";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const d = await adminApi.settingsSave(form as unknown as Record<string, unknown>);
    setSaving(false);
    if (d.ok) {
      toast.success("Настройки сохранены");
    } else if (d.errors) {
      setErrors(d.errors as Partial<Record<keyof GeneralSettings, string>>);
      toast.error("Исправьте ошибки в форме");
    } else {
      toast.error((d.error as string) || "Ошибка сохранения");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800 px-6">
        {/* Название сайта */}
        <Field label="Название сайта" hint="Отображается в теге <title> и заголовке страниц">
          <TextInput value={form.site_name} onChange={(v) => set("site_name", v)} placeholder="Моя домашняя страница" maxLength={100} />
        </Field>

        {/* URL сайта */}
        <Field label="URL сайта" hint="Должен начинаться с http:// или https:// и заканчиваться на /">
          <TextInput value={form.site_url} onChange={(v) => set("site_url", v)} placeholder="https://example.com/" type="url" />
          {errors.site_url && <p className="text-red-400 text-xs mt-1.5">{errors.site_url}</p>}
        </Field>

        {/* Краткое название */}
        <Field label="Краткое название" hint="Используется в навигации и breadcrumbs">
          <TextInput value={form.site_short_name} onChange={(v) => set("site_short_name", v)} placeholder="МойСайт" maxLength={50} />
        </Field>

        {/* HTTPS */}
        <Field label="Принудительный HTTPS" hint="Редирект с http:// на https:// для всех страниц">
          <Toggle checked={form.force_https} onChange={(v) => set("force_https", v)} />
        </Field>

        {/* WWW редирект */}
        <Field label="Редирект с WWW" hint="Перенаправлять www.site.ru → site.ru">
          <Toggle checked={form.redirect_www} onChange={(v) => set("redirect_www", v)} />
        </Field>

        {/* Описание */}
        <Field label="Описание сайта (meta)" hint="До 200 символов. Используется поисковыми системами">
          <div>
            <textarea
              value={form.meta_description}
              onChange={(e) => set("meta_description", e.target.value)}
              placeholder="Краткое описание сайта..."
              maxLength={200}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 resize-none"
            />
            <div className="flex justify-between mt-1">
              {errors.meta_description
                ? <p className="text-red-400 text-xs">{errors.meta_description}</p>
                : <span />}
              <span className={`text-xs ${form.meta_description.length > 180 ? "text-amber-400" : "text-gray-500"}`}>
                {form.meta_description.length} / 200
              </span>
            </div>
          </div>
        </Field>

        {/* Ключевые слова */}
        <Field label="Ключевые слова (meta)" hint="Через запятую: слово1, слово2, слово3">
          <TextInput value={form.meta_keywords} onChange={(v) => set("meta_keywords", v)} placeholder="ключевое слово, ещё одно" />
        </Field>

        {/* Часовой пояс */}
        <Field label="Часовой пояс" hint="Используется для отображения дат и времени">
          <div className="flex flex-col gap-2">
            <select
              value={form.timezone}
              onChange={(e) => set("timezone", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              {timeLoading ? "Загружаю..." : serverTime ? `Сейчас: ${serverTime}` : ""}
            </div>
          </div>
        </Field>

        {/* 404 страница */}
        <Field label="Кастомная страница 404" hint="При включении будет использоваться файл /404.html">
          <Toggle checked={form.use_custom_404} onChange={(v) => set("use_custom_404", v)} />
        </Field>

        {/* Офлайн режим */}
        <Field
          label="Режим «Сайт выключен»"
          hint="Показывает страницу /offline.html вместо сайта"
        >
          <div className="flex items-center gap-3">
            <Toggle checked={form.site_offline} onChange={(v) => set("site_offline", v)} />
            {form.site_offline && (
              <span className="text-xs bg-red-900/40 text-red-400 border border-red-800 px-2 py-1 rounded-lg font-medium">
                ⚠ Сайт недоступен для посетителей
              </span>
            )}
          </div>
        </Field>
      </div>

      {/* Кнопка сохранения */}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Сохраняю...
            </>
          ) : (
            <>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Сохранить настройки
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Вкладка Безопасность ────────────────────────────────────────────────────
interface SecuritySettings {
  admin_filename: string;
  display_php_errors: boolean;
  block_iframe: boolean;
  allowed_admin_ips: string;
  max_login_attempts: number;
  login_block_timeout: number;
  admin_inactivity_timeout: number;
  reset_auth_key_on_login: boolean;
  admin_logs_retention_days: number;
}

const SEC_DEFAULTS: SecuritySettings = {
  admin_filename: "admin.php",
  display_php_errors: false,
  block_iframe: false,
  allowed_admin_ips: "",
  max_login_attempts: 5,
  login_block_timeout: 20,
  admin_inactivity_timeout: 30,
  reset_auth_key_on_login: false,
  admin_logs_retention_days: 30,
};

function NumberInput({ value, onChange, min = 0, step = 1 }: {
  value: number; onChange: (v: number) => void; min?: number; step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-40 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  );
}

function SecuritySettingsTab() {
  const [form, setForm] = useState<SecuritySettings>(SEC_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof SecuritySettings, string>>>({});
  const [origFilename, setOrigFilename] = useState("");
  const [ipLoading, setIpLoading] = useState(false);

  useEffect(() => {
    adminApi.settingsGet("security").then((d) => {
      if (!d.error) {
        const loaded = { ...SEC_DEFAULTS, ...(d as unknown as SecuritySettings) };
        setForm(loaded);
        setOrigFilename(loaded.admin_filename);
      }
      setLoading(false);
    });
  }, []);

  const set = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleAddMyIp = async () => {
    setIpLoading(true);
    const d = await adminApi.myIp();
    setIpLoading(false);
    if (d.ip && d.ip !== "unknown") {
      const current = form.allowed_admin_ips.trim();
      const lines = current ? current.split("\n").map((l) => l.trim()) : [];
      if (!lines.includes(d.ip as string)) {
        set("allowed_admin_ips", [...lines, d.ip as string].join("\n"));
      }
    }
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof SecuritySettings, string>> = {};
    const fn = form.admin_filename.trim();
    if (!fn) {
      e.admin_filename = "Имя файла не может быть пустым";
    } else if (!/^[\w\-.]+$/.test(fn)) {
      e.admin_filename = "Допустимы только буквы, цифры, -_.";
    }
    if (form.max_login_attempts < 0) e.max_login_attempts = "Минимум 0";
    if (form.login_block_timeout < 1) e.login_block_timeout = "Минимум 1 минута";
    if (form.admin_inactivity_timeout < 0) e.admin_inactivity_timeout = "Минимум 0";
    if (form.admin_logs_retention_days < 30) e.admin_logs_retention_days = "Минимум 30 дней";

    const rawIps = form.allowed_admin_ips.trim();
    if (rawIps) {
      const ipRe = /^(\d{1,3}|\*)(\.(\d{1,3}|\*)){3}$/;
      for (const line of rawIps.split("\n")) {
        const l = line.trim();
        if (l && !ipRe.test(l)) { e.allowed_admin_ips = `Неверный формат IP: ${l}`; break; }
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const d = await adminApi.settingsSave(form as unknown as Record<string, unknown>);
    setSaving(false);
    if (d.ok) {
      setOrigFilename(form.admin_filename);
      toast.success("Настройки безопасности сохранены");
    } else if (d.errors) {
      setErrors(d.errors as Partial<Record<keyof SecuritySettings, string>>);
      toast.error("Исправьте ошибки в форме");
    } else {
      toast.error((d.error as string) || "Ошибка сохранения");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filenameChanged = form.admin_filename !== origFilename && origFilename !== "";

  return (
    <div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800 px-6">

        {/* Файл админпанели */}
        <Field label="Файл админпанели" hint="Имя файла точки входа в админку (без пути)">
          <div className="flex flex-col gap-2">
            <TextInput
              value={form.admin_filename}
              onChange={(v) => set("admin_filename", v)}
              placeholder="admin.php"
            />
            {errors.admin_filename && <p className="text-red-400 text-xs">{errors.admin_filename}</p>}
            {filenameChanged && (
              <div className="flex items-start gap-2 bg-amber-900/30 border border-amber-700/50 text-amber-300 text-xs px-3 py-2 rounded-lg">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="mt-0.5 shrink-0">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                После изменения имени файла не забудьте переименовать его на сервере вручную
              </div>
            )}
          </div>
        </Field>

        {/* PHP ошибки */}
        <Field label="Вывод PHP ошибок" hint="Показывать ошибки PHP в браузере (только для отладки)">
          <div className="flex items-center gap-3">
            <Toggle checked={form.display_php_errors} onChange={(v) => set("display_php_errors", v)} />
            {form.display_php_errors && (
              <span className="text-xs bg-amber-900/30 text-amber-400 border border-amber-700/50 px-2 py-1 rounded-lg">
                ⚠ Не рекомендуется в production
              </span>
            )}
          </div>
        </Field>

        {/* Блокировка iframe */}
        <Field label="Защита от clickjacking" hint="Отправляет заголовок X-Frame-Options: DENY">
          <Toggle checked={form.block_iframe} onChange={(v) => set("block_iframe", v)} />
        </Field>

        {/* Разрешённые IP */}
        <Field label="Разрешённые IP для входа" hint="По одному IP на строку. Маски: 192.168.*.*. Пусто — без ограничений">
          <div className="flex flex-col gap-2">
            <textarea
              value={form.allowed_admin_ips}
              onChange={(e) => set("allowed_admin_ips", e.target.value)}
              placeholder={"192.168.1.1\n10.0.*.*"}
              rows={5}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 resize-none font-mono"
            />
            {errors.allowed_admin_ips && <p className="text-red-400 text-xs">{errors.allowed_admin_ips}</p>}
            <button
              onClick={handleAddMyIp}
              disabled={ipLoading}
              className="self-start flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              {ipLoading ? "Определяю IP..." : "Добавить мой текущий IP"}
            </button>
          </div>
        </Field>

        {/* Макс. ошибочных входов */}
        <Field label="Макс. попыток входа" hint="После превышения — IP блокируется. 0 — без ограничений">
          <div>
            <NumberInput value={form.max_login_attempts} onChange={(v) => set("max_login_attempts", v)} min={0} />
            {errors.max_login_attempts && <p className="text-red-400 text-xs mt-1">{errors.max_login_attempts}</p>}
          </div>
        </Field>

        {/* Таймаут блокировки */}
        <Field label="Таймаут блокировки (мин)" hint="Время блокировки IP после превышения лимита попыток">
          <div>
            <NumberInput value={form.login_block_timeout} onChange={(v) => set("login_block_timeout", v)} min={1} />
            {errors.login_block_timeout && <p className="text-red-400 text-xs mt-1">{errors.login_block_timeout}</p>}
          </div>
        </Field>

        {/* Таймаут неактивности */}
        <Field label="Таймаут неактивности (мин)" hint="Через сколько минут бездействия сессия админки истекает. 0 — отключено">
          <div>
            <NumberInput value={form.admin_inactivity_timeout} onChange={(v) => set("admin_inactivity_timeout", v)} min={0} />
            {errors.admin_inactivity_timeout && <p className="text-red-400 text-xs mt-1">{errors.admin_inactivity_timeout}</p>}
          </div>
        </Field>

        {/* Сброс ключа при входе */}
        <Field label="Сброс ключа при входе" hint="Запрещает одновременный вход с нескольких устройств">
          <Toggle checked={form.reset_auth_key_on_login} onChange={(v) => set("reset_auth_key_on_login", v)} />
        </Field>

        {/* Хранение логов */}
        <Field label="Хранение логов (дней)" hint="Сколько дней хранить журнал действий. Минимум 30">
          <div>
            <NumberInput value={form.admin_logs_retention_days} onChange={(v) => set("admin_logs_retention_days", v)} min={30} />
            {errors.admin_logs_retention_days && <p className="text-red-400 text-xs mt-1">{errors.admin_logs_retention_days}</p>}
          </div>
        </Field>
      </div>

      {/* Сохранить */}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Сохраняю...</>
          ) : (
            <>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Сохранить настройки
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Главный компонент страницы ───────────────────────────────────────────────
export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Настройки сайта</h1>
        <p className="text-gray-400 text-sm mt-1">Управление конфигурацией и параметрами системы</p>
      </div>

      {/* Табы */}
      <div className="flex gap-1 flex-wrap mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Контент вкладки */}
      {activeTab === "general" && <GeneralSettingsTab />}
      {activeTab === "security" && <SecuritySettingsTab />}
      {activeTab !== "general" && activeTab !== "security" && (
        <StubTab label={TABS.find((t) => t.id === activeTab)?.label || ""} />
      )}
    </div>
  );
}