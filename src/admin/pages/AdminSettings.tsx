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
  admin_path: string;
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
  admin_path: "/admin",
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
    const p = form.admin_path.trim();
    if (!p.startsWith("/")) e.admin_path = "Путь должен начинаться с /";
    else if (!/^\/[\w\-/]+$/.test(p)) e.admin_path = "Допустимы только буквы, цифры, - и /";
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
      const newPath = form.admin_path.trim();
      const oldPath = localStorage.getItem("admin_path") || "/admin";
      if (newPath !== oldPath) {
        localStorage.setItem("admin_path", newPath);
        toast("Адрес изменён — перенаправляю...", { duration: 2500 });
        setTimeout(() => { window.location.href = newPath + "/settings"; }, 2700);
      }
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

        {/* Адрес входа в админку */}
        <Field label="Адрес входа в админку" hint="URL-путь панели управления. После изменения будет выполнен автоматический редирект">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm font-mono">{window.location.origin}</span>
              <TextInput
                value={form.admin_path}
                onChange={(v) => set("admin_path", v)}
                placeholder="/admin"
              />
            </div>
            {errors.admin_path && <p className="text-red-400 text-xs">{errors.admin_path}</p>}
            {form.admin_path !== "/admin" && form.admin_path.startsWith("/") && (
              <div className="flex items-start gap-2 bg-indigo-900/20 border border-indigo-700/40 text-indigo-300 text-xs px-3 py-2 rounded-lg">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                После сохранения вход в панель будет доступен по: <strong className="font-mono ml-1">{window.location.origin}{form.admin_path}</strong>
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

// ─── Вкладка Объявления ───────────────────────────────────────────────────────
interface AdsSettings {
  ads_per_page: number; ads_per_page_search: number; max_search_results: number;
  min_search_chars: number; quick_search_limit: number; related_ads_count: number;
  related_same_category_only: boolean; popular_ads_count: number; tag_cloud_limit: number;
  max_pending_ads: number; new_ad_hours: number; updated_ad_hours: number;
  category_separator: string; tag_separator: string; speedbar_separator: string;
  ad_date_format: string; ad_sort_by: string; ad_sort_order: string;
  catalog_sort_by: string; catalog_sort_order: string; indexnow_enabled: boolean;
  indexnow_provider: string; decline_dates: boolean; auto_generate_meta: boolean;
  notify_new_ads: boolean; allow_user_tags: boolean; warn_concurrent_edit: boolean;
  rating_type: string;
}

const ADS_DEFAULTS: AdsSettings = {
  ads_per_page: 10, ads_per_page_search: 10, max_search_results: 0,
  min_search_chars: 4, quick_search_limit: 5, related_ads_count: 5,
  related_same_category_only: true, popular_ads_count: 5, tag_cloud_limit: 20,
  max_pending_ads: 0, new_ad_hours: 24, updated_ad_hours: 24,
  category_separator: "»", tag_separator: "/", speedbar_separator: "»",
  ad_date_format: "j-m-Y, H:i", ad_sort_by: "date", ad_sort_order: "desc",
  catalog_sort_by: "date", catalog_sort_order: "desc", indexnow_enabled: false,
  indexnow_provider: "indexnow", decline_dates: false, auto_generate_meta: false,
  notify_new_ads: false, allow_user_tags: true, warn_concurrent_edit: true,
  rating_type: "stars",
};

const SORT_BY_OPTIONS = [
  { value: "date", label: "По дате публикации" },
  { value: "edit_date", label: "По дате редактирования" },
  { value: "rating", label: "По рейтингу" },
  { value: "views", label: "По просмотрам" },
  { value: "title", label: "По алфавиту" },
];

const SORT_ORDER_OPTIONS = [
  { value: "desc", label: "По убыванию" },
  { value: "asc", label: "По возрастанию" },
];

const DATE_FORMATS = [
  { value: "j-m-Y, H:i", label: "j-m-Y, H:i  →  5-01-2026, 14:30" },
  { value: "d.m.Y H:i", label: "d.m.Y H:i  →  05.01.2026 14:30" },
  { value: "Y-m-d H:i", label: "Y-m-d H:i  →  2026-01-05 14:30" },
  { value: "d/m/Y", label: "d/m/Y  →  05/01/2026" },
  { value: "F j, Y", label: "F j, Y  →  January 5, 2026" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 pt-5 pb-2">
      <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">{children}</p>
    </div>
  );
}

function SelectField({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function AdsSettingsTab() {
  const [form, setForm] = useState<AdsSettings>(ADS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AdsSettings, string>>>({});

  useEffect(() => {
    adminApi.settingsGet("ads").then((d) => {
      if (!d.error) setForm({ ...ADS_DEFAULTS, ...(d as unknown as AdsSettings) });
      setLoading(false);
    });
  }, []);

  const set = <K extends keyof AdsSettings>(key: K, value: AdsSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof AdsSettings, string>> = {};
    const minOne: (keyof AdsSettings)[] = [
      "ads_per_page", "ads_per_page_search", "min_search_chars",
      "quick_search_limit", "popular_ads_count", "tag_cloud_limit",
    ];
    minOne.forEach((k) => { if ((form[k] as number) < 1) e[k] = "Минимум 1"; });
    const minZero: (keyof AdsSettings)[] = [
      "max_search_results", "related_ads_count", "max_pending_ads",
      "new_ad_hours", "updated_ad_hours",
    ];
    minZero.forEach((k) => { if ((form[k] as number) < 0) e[k] = "Минимум 0"; });
    if (!form.ad_date_format.trim()) e.ad_date_format = "Не может быть пустым";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const d = await adminApi.settingsSave(form as unknown as Record<string, unknown>);
    setSaving(false);
    if (d.ok) toast.success("Настройки объявлений сохранены");
    else if (d.errors) { setErrors(d.errors as Partial<Record<keyof AdsSettings, string>>); toast.error("Исправьте ошибки"); }
    else toast.error((d.error as string) || "Ошибка сохранения");
  };

  const SaveButton = () => (
    <div className="flex justify-end mt-6">
      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
        {saving
          ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Сохраняю...</>
          : <>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
            Сохранить настройки
          </>}
      </button>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">

      {/* ── Отображение ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
        <SectionTitle>Отображение</SectionTitle>
        <Field label="Объявлений на страницу" hint="Основной список">
          <div><NumberInput value={form.ads_per_page} onChange={(v) => set("ads_per_page", v)} min={1} />
          {errors.ads_per_page && <p className="text-red-400 text-xs mt-1">{errors.ads_per_page}</p>}</div>
        </Field>
        <Field label="Похожих объявлений" hint="Блок «Похожие» на странице объявления">
          <div><NumberInput value={form.related_ads_count} onChange={(v) => set("related_ads_count", v)} min={0} />
          {errors.related_ads_count && <p className="text-red-400 text-xs mt-1">{errors.related_ads_count}</p>}</div>
        </Field>
        <Field label="Только та же категория" hint="Искать похожие только в той же категории">
          <Toggle checked={form.related_same_category_only} onChange={(v) => set("related_same_category_only", v)} />
        </Field>
        <Field label="Популярных объявлений" hint="Блок популярных на главной">
          <div><NumberInput value={form.popular_ads_count} onChange={(v) => set("popular_ads_count", v)} min={1} />
          {errors.popular_ads_count && <p className="text-red-400 text-xs mt-1">{errors.popular_ads_count}</p>}</div>
        </Field>
        <Field label="Тегов в облаке" hint="Максимум ключевых слов в облаке тегов">
          <div><NumberInput value={form.tag_cloud_limit} onChange={(v) => set("tag_cloud_limit", v)} min={1} />
          {errors.tag_cloud_limit && <p className="text-red-400 text-xs mt-1">{errors.tag_cloud_limit}</p>}</div>
        </Field>
        <Field label="«Новое» — часов" hint="Сколько часов объявление считается новым">
          <div><NumberInput value={form.new_ad_hours} onChange={(v) => set("new_ad_hours", v)} min={0} />
          {errors.new_ad_hours && <p className="text-red-400 text-xs mt-1">{errors.new_ad_hours}</p>}</div>
        </Field>
        <Field label="«Обновлено» — часов" hint="Сколько часов объявление считается обновлённым">
          <div><NumberInput value={form.updated_ad_hours} onChange={(v) => set("updated_ad_hours", v)} min={0} />
          {errors.updated_ad_hours && <p className="text-red-400 text-xs mt-1">{errors.updated_ad_hours}</p>}</div>
        </Field>
        <Field label="Формат даты" hint="Формат PHP date для отображения даты объявления">
          <div className="flex flex-col gap-2">
            <SelectField value={form.ad_date_format} onChange={(v) => set("ad_date_format", v)} options={DATE_FORMATS} />
            <TextInput value={form.ad_date_format} onChange={(v) => set("ad_date_format", v)} placeholder="j-m-Y, H:i" />
            {errors.ad_date_format && <p className="text-red-400 text-xs">{errors.ad_date_format}</p>}
          </div>
        </Field>
        <Field label="Разделитель категорий" hint="Символ между уровнями категорий">
          <TextInput value={form.category_separator} onChange={(v) => set("category_separator", v)} placeholder="»" />
        </Field>
        <Field label="Разделитель тегов">
          <TextInput value={form.tag_separator} onChange={(v) => set("tag_separator", v)} placeholder="/" />
        </Field>
        <Field label="Разделитель speedbar">
          <TextInput value={form.speedbar_separator} onChange={(v) => set("speedbar_separator", v)} placeholder="»" />
        </Field>
        <Field label="Тип рейтинга">
          <SelectField value={form.rating_type} onChange={(v) => set("rating_type", v)}
            options={[{ value: "stars", label: "Пятизвёздочный рейтинг" }, { value: "likes", label: "Лайки / Дизлайки" }]} />
        </Field>
      </div>

      {/* ── Поиск ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
        <SectionTitle>Поиск</SectionTitle>
        <Field label="Объявлений на странице поиска">
          <div><NumberInput value={form.ads_per_page_search} onChange={(v) => set("ads_per_page_search", v)} min={1} />
          {errors.ads_per_page_search && <p className="text-red-400 text-xs mt-1">{errors.ads_per_page_search}</p>}</div>
        </Field>
        <Field label="Макс. результатов поиска" hint="0 — без ограничений">
          <div><NumberInput value={form.max_search_results} onChange={(v) => set("max_search_results", v)} min={0} />
          {errors.max_search_results && <p className="text-red-400 text-xs mt-1">{errors.max_search_results}</p>}</div>
        </Field>
        <Field label="Мин. символов для поиска">
          <div><NumberInput value={form.min_search_chars} onChange={(v) => set("min_search_chars", v)} min={1} />
          {errors.min_search_chars && <p className="text-red-400 text-xs mt-1">{errors.min_search_chars}</p>}</div>
        </Field>
        <Field label="Результатов в быстром поиске">
          <div><NumberInput value={form.quick_search_limit} onChange={(v) => set("quick_search_limit", v)} min={1} />
          {errors.quick_search_limit && <p className="text-red-400 text-xs mt-1">{errors.quick_search_limit}</p>}</div>
        </Field>
      </div>

      {/* ── Сортировка ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
        <SectionTitle>Сортировка</SectionTitle>
        <Field label="Сортировка объявлений">
          <div className="grid grid-cols-2 gap-2">
            <SelectField value={form.ad_sort_by} onChange={(v) => set("ad_sort_by", v)} options={SORT_BY_OPTIONS} />
            <SelectField value={form.ad_sort_order} onChange={(v) => set("ad_sort_order", v)} options={SORT_ORDER_OPTIONS} />
          </div>
        </Field>
        <Field label="Сортировка в каталоге">
          <div className="grid grid-cols-2 gap-2">
            <SelectField value={form.catalog_sort_by} onChange={(v) => set("catalog_sort_by", v)} options={SORT_BY_OPTIONS} />
            <SelectField value={form.catalog_sort_order} onChange={(v) => set("catalog_sort_order", v)} options={SORT_ORDER_OPTIONS} />
          </div>
        </Field>
      </div>

      {/* ── Модерация ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
        <SectionTitle>Модерация и ограничения</SectionTitle>
        <Field label="Макс. объявлений на модерации" hint="0 — без ограничений">
          <div><NumberInput value={form.max_pending_ads} onChange={(v) => set("max_pending_ads", v)} min={0} />
          {errors.max_pending_ads && <p className="text-red-400 text-xs mt-1">{errors.max_pending_ads}</p>}</div>
        </Field>
        <Field label="Разрешить теги от пользователей" hint="Добавление ключевых слов в облако при публикации">
          <Toggle checked={form.allow_user_tags} onChange={(v) => set("allow_user_tags", v)} />
        </Field>
        <Field label="Уведомление о параллельном редактировании">
          <Toggle checked={form.warn_concurrent_edit} onChange={(v) => set("warn_concurrent_edit", v)} />
        </Field>
      </div>

      {/* ── Прочее ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
        <SectionTitle>Прочее</SectionTitle>
        <Field label="Склонять даты" hint="Склонение дат при выводе тегом {date}">
          <Toggle checked={form.decline_dates} onChange={(v) => set("decline_dates", v)} />
        </Field>
        <Field label="Авто-генерация метатегов" hint="Автоматически формировать description и keywords для объявлений">
          <Toggle checked={form.auto_generate_meta} onChange={(v) => set("auto_generate_meta", v)} />
        </Field>
        <Field label="E-Mail при новых объявлениях" hint="Отправлять уведомление администратору">
          <Toggle checked={form.notify_new_ads} onChange={(v) => set("notify_new_ads", v)} />
        </Field>
      </div>

      {/* ── IndexNow ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
        <SectionTitle>IndexNow</SectionTitle>
        <Field label="Включить IndexNow" hint="Автоматически уведомлять поисковые системы о новых объявлениях">
          <Toggle checked={form.indexnow_enabled} onChange={(v) => set("indexnow_enabled", v)} />
        </Field>
        {form.indexnow_enabled && (
          <Field label="Провайдер">
            <SelectField value={form.indexnow_provider} onChange={(v) => set("indexnow_provider", v)}
              options={[
                { value: "indexnow", label: "IndexNow" },
                { value: "yandex", label: "Yandex" },
                { value: "bing", label: "Bing" },
                { value: "naver", label: "Naver" },
                { value: "seznam", label: "Seznam" },
              ]} />
          </Field>
        )}
        {form.indexnow_enabled && (
          <div className="px-6 py-4">
            <div className="bg-indigo-900/20 border border-indigo-700/40 rounded-xl p-4 text-sm">
              <p className="text-indigo-300 font-semibold mb-2">Необходима настройка файла</p>
              <p className="text-gray-400 text-xs mb-3">Создайте файл в корне сайта:</p>
              <div className="flex flex-col gap-1.5">
                <div className="bg-gray-900 rounded-lg px-3 py-2 font-mono text-xs text-emerald-400">
                  Имя файла: ff7c909509a52d37fae7ec184e1bf4ab.txt
                </div>
                <div className="bg-gray-900 rounded-lg px-3 py-2 font-mono text-xs text-emerald-400">
                  Содержимое: ff7c909509a52d37fae7ec184e1bf4ab
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <SaveButton />
    </div>
  );
}

// ─── Вкладка Оптимизация ─────────────────────────────────────────────────────
interface OptSettings {
  caching_enabled: boolean;
  cache_type: string;
  cache_server: string;
  redis_username: string;
  redis_password: string;
  cache_forced_clear_interval: number;
  cache_pages_count: number;
  cache_full_ad_days: number;
  track_last_viewed: boolean;
  view_count_min_time: number;
  cache_view_counter: boolean;
  count_ads_in_categories: boolean;
  tag_cloud_enabled: boolean;
}

const OPT_DEFAULTS: OptSettings = {
  caching_enabled: true, cache_type: "file", cache_server: "",
  redis_username: "", redis_password: "", cache_forced_clear_interval: 0,
  cache_pages_count: 10, cache_full_ad_days: 30, track_last_viewed: true,
  view_count_min_time: 5, cache_view_counter: true,
  count_ads_in_categories: true, tag_cloud_enabled: true,
};

function OptSaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-end mt-6">
      <button onClick={onClick} disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
        {saving
          ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Сохраняю...</>
          : <>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              Сохранить настройки
            </>}
      </button>
    </div>
  );
}

function OptimizationSettingsTab() {
  const [form, setForm] = useState<OptSettings>(OPT_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof OptSettings, string>>>({});
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    adminApi.settingsGet("optimization").then((d) => {
      if (!d.error) setForm({ ...OPT_DEFAULTS, ...(d as unknown as OptSettings) });
      setLoading(false);
    });
  }, []);

  const set = <K extends keyof OptSettings>(key: K, value: OptSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof OptSettings, string>> = {};
    if (form.cache_forced_clear_interval < 0) e.cache_forced_clear_interval = "Минимум 0";
    if (form.cache_pages_count < 0) e.cache_pages_count = "Минимум 0";
    if (form.cache_full_ad_days < 0) e.cache_full_ad_days = "Минимум 0";
    if (form.view_count_min_time < 1) e.view_count_min_time = "Минимум 1";
    if (form.cache_type !== "file" && form.cache_server && !form.cache_server.includes(":")) {
      e.cache_server = "Формат: хост:порт (например localhost:11211)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const d = await adminApi.settingsSave(form as unknown as Record<string, unknown>);
    setSaving(false);
    if (d.ok) toast.success("Настройки оптимизации сохранены");
    else if (d.errors) { setErrors(d.errors as Partial<Record<keyof OptSettings, string>>); toast.error("Исправьте ошибки"); }
    else toast.error((d.error as string) || "Ошибка сохранения");
  };

  const cacheDisabled = !form.caching_enabled;
  const notFile = form.cache_type !== "file";
  const isRedis = form.cache_type === "redis";

  const disabledCls = "opacity-40 pointer-events-none select-none";

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">

      {/* ── Кеширование ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
        <SectionTitle>Кеширование</SectionTitle>

        <Field label="Включить кеширование" hint="Глобальное включение/выключение всех механизмов кеша">
          <Toggle checked={form.caching_enabled} onChange={(v) => set("caching_enabled", v)} />
        </Field>

        <div className={cacheDisabled ? disabledCls : ""}>
          <Field label="Тип кеширования">
            <SelectField
              value={form.cache_type}
              onChange={(v) => set("cache_type", v)}
              options={[
                { value: "file", label: "Файловый кеш" },
                { value: "memcache", label: "Memcache" },
                { value: "redis", label: "Redis" },
              ]}
            />
          </Field>

          <div className={!notFile ? disabledCls : ""}>
            <Field label="Сервер кеша" hint="Формат: хост:порт (например localhost:11211)">
              <div>
                <TextInput
                  value={form.cache_server}
                  onChange={(v) => set("cache_server", v)}
                  placeholder="localhost:11211"
                />
                {errors.cache_server && <p className="text-red-400 text-xs mt-1">{errors.cache_server}</p>}
              </div>
            </Field>
          </div>

          <div className={!isRedis ? disabledCls : ""}>
            <Field label="Пользователь Redis" hint="Опционально">
              <TextInput value={form.redis_username} onChange={(v) => set("redis_username", v)} placeholder="username" />
            </Field>
            <Field label="Пароль Redis">
              <div className="flex gap-2 items-center">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.redis_password}
                  onChange={(e) => set("redis_password", e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
                />
                <button type="button" onClick={() => setShowPass((s) => !s)}
                  className="px-3 py-2.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white rounded-xl text-xs transition-colors">
                  {showPass ? "Скрыть" : "Показать"}
                </button>
              </div>
            </Field>
          </div>

          <Field label="Принудительная очистка (мин)" hint="0 — автоматически при изменении данных">
            <div>
              <NumberInput value={form.cache_forced_clear_interval} onChange={(v) => set("cache_forced_clear_interval", v)} min={0} />
              {errors.cache_forced_clear_interval && <p className="text-red-400 text-xs mt-1">{errors.cache_forced_clear_interval}</p>}
            </div>
          </Field>

          <Field label="Кешировать страниц (кратких)" hint="Кешируются первые N страниц навигации">
            <div>
              <NumberInput value={form.cache_pages_count} onChange={(v) => set("cache_pages_count", v)} min={0} />
              {errors.cache_pages_count && <p className="text-red-400 text-xs mt-1">{errors.cache_pages_count}</p>}
            </div>
          </Field>

          <Field label="Кешировать полное объявление (дней)" hint="Сколько дней кешировать страницу объявления после публикации">
            <div>
              <NumberInput value={form.cache_full_ad_days} onChange={(v) => set("cache_full_ad_days", v)} min={0} />
              {errors.cache_full_ad_days && <p className="text-red-400 text-xs mt-1">{errors.cache_full_ad_days}</p>}
            </div>
          </Field>

          <Field label="Кешировать счётчик просмотров" hint="Просмотры обновляются пакетно раз в 2 часа">
            <Toggle checked={form.cache_view_counter} onChange={(v) => set("cache_view_counter", v)} />
          </Field>
        </div>
      </div>

      {/* ── Учёт просмотров ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
        <SectionTitle>Учёт просмотров</SectionTitle>

        <Field label="Вести учёт последних просмотров" hint="Сохранять историю просмотренных объявлений">
          <Toggle checked={form.track_last_viewed} onChange={(v) => set("track_last_viewed", v)} />
        </Field>

        <Field label="Мин. время на странице (сек)" hint="Через сколько секунд засчитывается просмотр объявления">
          <div>
            <NumberInput value={form.view_count_min_time} onChange={(v) => set("view_count_min_time", v)} min={1} />
            {errors.view_count_min_time && <p className="text-red-400 text-xs mt-1">{errors.view_count_min_time}</p>}
          </div>
        </Field>
      </div>

      {/* ── Подсчёт данных ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
        <SectionTitle>Подсчёт данных</SectionTitle>

        <Field label="Подсчёт объявлений в категориях" hint="Добавляет один запрос к БД, увеличивает расход памяти">
          <Toggle checked={form.count_ads_in_categories} onChange={(v) => set("count_ads_in_categories", v)} />
        </Field>

        <Field label="Модуль «Облако тегов»" hint="Если отключено, облако тегов не работает">
          <Toggle checked={form.tag_cloud_enabled} onChange={(v) => set("tag_cloud_enabled", v)} />
        </Field>
      </div>

      <OptSaveButton saving={saving} onClick={handleSave} />
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
      {activeTab === "ads" && <AdsSettingsTab />}
      {activeTab === "db" && <OptimizationSettingsTab />}
      {activeTab !== "general" && activeTab !== "security" && activeTab !== "ads" && activeTab !== "db" && (
        <StubTab label={TABS.find((t) => t.id === activeTab)?.label || ""} />
      )}
    </div>
  );
}