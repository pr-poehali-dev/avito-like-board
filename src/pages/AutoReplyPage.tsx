import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import SiteHeader from "@/components/SiteHeader";
import AuthModal from "./index/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { CHAT_URL, ADS_URL, DbCategory } from "./index/types";

// ─── Типы ────────────────────────────────────────────────────────────────────
type ConditionType = "keyword" | "time_range" | "weekday" | "always";
interface Condition {
  type: ConditionType;
  operator?: "contains_any" | "contains_all";
  value?: string[];
  start?: string;
  end?: string;
  days?: number[];
}
interface Rule {
  id?: number;
  name: string;
  is_active: boolean;
  conditions: Condition[];
  conditions_operator: "AND" | "OR";
  reply_text: string;
  delay_seconds: number;
  once_per_dialog: boolean;
  skip_if_user_replied: boolean;
  last_triggered_at?: string | null;
}
interface Log {
  id: number;
  rule_name: string | null;
  dialog_id: number;
  incoming: string;
  reply: string;
  triggered_at: string;
}

const DAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const VARS = [
  { v: "{buyer_name}", label: "Имя покупателя" },
  { v: "{seller_name}", label: "Имя продавца" },
  { v: "{ad_title}", label: "Название объявления" },
  { v: "{ad_price}", label: "Цена" },
  { v: "{site_name}", label: "Название сайта" },
];

const emptyRule = (): Rule => ({
  name: "", is_active: true, conditions: [], conditions_operator: "AND",
  reply_text: "", delay_seconds: 0, once_per_dialog: true, skip_if_user_replied: true,
});

const emptyCondition = (): Condition => ({ type: "keyword", operator: "contains_any", value: [] });

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${checked ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--muted-foreground))]/30"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function ConditionRow({ cond, onChange, onRemove }: {
  cond: Condition;
  onChange: (c: Condition) => void;
  onRemove: () => void;
}) {
  const [rawKeywords, setRawKeywords] = useState((cond.value || []).join(", "));

  const handleKeywordsBlur = () => {
    const parsed = rawKeywords.split(",").map(s => s.trim()).filter(Boolean);
    onChange({ ...cond, value: parsed });
    setRawKeywords(parsed.join(", "));
  };

  return (
    <div className="flex items-start gap-2 p-3 bg-[hsl(var(--muted))] rounded-xl">
      <select
        value={cond.type}
        onChange={e => onChange({ type: e.target.value as ConditionType, operator: "contains_any", value: [], days: [], start: "00:00", end: "23:59" })}
        className="px-3 py-1.5 text-sm bg-white border border-border rounded-lg outline-none shrink-0"
      >
        <option value="keyword">Ключевые слова</option>
        <option value="time_range">Время суток</option>
        <option value="weekday">День недели</option>
        <option value="always">Всегда</option>
      </select>

      <div className="flex-1 min-w-0">
        {cond.type === "keyword" && (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={cond.operator || "contains_any"}
              onChange={e => onChange({ ...cond, operator: e.target.value as "contains_any" | "contains_all" })}
              className="px-2 py-1.5 text-sm bg-white border border-border rounded-lg outline-none"
            >
              <option value="contains_any">содержит любое из</option>
              <option value="contains_all">содержит все</option>
            </select>
            <input
              value={rawKeywords}
              onChange={e => setRawKeywords(e.target.value)}
              onBlur={handleKeywordsBlur}
              placeholder="цена, доставка, скидка"
              className="flex-1 min-w-[150px] px-3 py-1.5 text-sm bg-white border border-border rounded-lg outline-none"
            />
          </div>
        )}
        {cond.type === "time_range" && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">с</span>
            <input type="time" value={cond.start || "00:00"} onChange={e => onChange({ ...cond, start: e.target.value })}
              className="px-2 py-1.5 text-sm bg-white border border-border rounded-lg outline-none" />
            <span className="text-sm text-[hsl(var(--muted-foreground))]">по</span>
            <input type="time" value={cond.end || "23:59"} onChange={e => onChange({ ...cond, end: e.target.value })}
              className="px-2 py-1.5 text-sm bg-white border border-border rounded-lg outline-none" />
          </div>
        )}
        {cond.type === "weekday" && (
          <div className="flex flex-wrap gap-1">
            {DAYS.map((d, i) => (
              <button
                key={i}
                onClick={() => {
                  const days = cond.days || [];
                  onChange({ ...cond, days: days.includes(i) ? days.filter(x => x !== i) : [...days, i] });
                }}
                className={`w-9 h-8 text-xs rounded-lg border transition-all ${(cond.days || []).includes(i) ? "bg-[hsl(var(--accent))] text-white border-[hsl(var(--accent))]" : "bg-white border-border"}`}
              >
                {d}
              </button>
            ))}
          </div>
        )}
        {cond.type === "always" && (
          <span className="text-sm text-[hsl(var(--muted-foreground))] py-1.5 block">Срабатывает на любое сообщение</span>
        )}
      </div>

      <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-100 transition-colors shrink-0">
        <Icon name="X" size={14} className="text-red-400" />
      </button>
    </div>
  );
}

function RuleForm({ rule, onSave, onCancel, onTest, saving }: {
  rule: Rule; onSave: (r: Rule) => void; onCancel: () => void;
  onTest: (r: Rule) => void; saving: boolean;
}) {
  const [form, setForm] = useState<Rule>(rule);
  const [tab, setTab] = useState<"general" | "conditions" | "action" | "options">("general");
  const f = (patch: Partial<Rule>) => setForm(p => ({ ...p, ...patch }));
  const insertVar = (v: string) => f({ reply_text: form.reply_text + v });

  const tabCls = (t: typeof tab) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab === t ? "border-[hsl(var(--accent))] text-[hsl(var(--accent))]" : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"}`;

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-5 pb-0">
        <h3 className="font-bold text-lg">{form.id ? "Редактировать правило" : "Новое правило"}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Активно</span>
          <Toggle checked={form.is_active} onChange={v => f({ is_active: v })} />
        </div>
      </div>

      <div className="flex border-b border-border px-6 mt-4">
        {(["general", "conditions", "action", "options"] as const).map((id) => (
          <button key={id} onClick={() => setTab(id)} className={tabCls(id)}>
            {id === "general" ? "Основные" : id === "conditions" ? "Условия" : id === "action" ? "Ответ" : "Настройки"}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-4">
        {tab === "general" && (
          <div>
            <label className="block text-sm font-medium mb-1.5">Название <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={e => f({ name: e.target.value })}
              placeholder='Например: "Ответ про цену"'
              className="w-full px-4 py-2.5 text-sm bg-[hsl(var(--muted))] rounded-xl outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]" />
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">Только для вас — покупатели не видят</p>
          </div>
        )}

        {tab === "conditions" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Правило сработает когда выполнены:</p>
              <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                {(["AND", "OR"] as const).map(op => (
                  <button key={op} onClick={() => f({ conditions_operator: op })}
                    className={`px-3 py-1.5 transition-colors ${form.conditions_operator === op ? "bg-[hsl(var(--accent))] text-white" : "bg-white text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"}`}>
                    {op === "AND" ? "Все условия" : "Любое условие"}
                  </button>
                ))}
              </div>
            </div>
            {form.conditions.map((cond, i) => (
              <ConditionRow key={i} cond={cond}
                onChange={c => f({ conditions: form.conditions.map((x, j) => j === i ? c : x) })}
                onRemove={() => f({ conditions: form.conditions.filter((_, j) => j !== i) })} />
            ))}
            <button onClick={() => f({ conditions: [...form.conditions, emptyCondition()] })}
              className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))] transition-colors flex items-center justify-center gap-2">
              <Icon name="Plus" size={14} />Добавить условие
            </button>
            {form.conditions.length === 0 && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">Без условий — сработает на любое сообщение</p>
            )}
          </div>
        )}

        {tab === "action" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Текст ответа <span className="text-red-400">*</span></label>
              <textarea value={form.reply_text} onChange={e => f({ reply_text: e.target.value })} rows={5}
                placeholder="Введите текст автоматического ответа..."
                className="w-full px-4 py-3 text-sm bg-[hsl(var(--muted))] rounded-xl outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] resize-none" />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Вставить переменную:</p>
              <div className="flex flex-wrap gap-2">
                {VARS.map(v => (
                  <button key={v.v} onClick={() => insertVar(v.v)} title={v.label}
                    className="px-3 py-1.5 text-xs bg-orange-50 border border-orange-200 text-[hsl(var(--accent))] rounded-lg hover:bg-orange-100 transition-colors font-mono">
                    {v.v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Задержка (сек)</label>
              <input type="number" min={0} max={300} value={form.delay_seconds}
                onChange={e => f({ delay_seconds: Math.max(0, Number(e.target.value)) })}
                className="w-24 px-4 py-2.5 text-sm bg-[hsl(var(--muted))] rounded-xl outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]" />
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">0 — ответ сразу</p>
            </div>
          </div>
        )}

        {tab === "options" && (
          <div className="space-y-1">
            {[
              { key: "once_per_dialog" as const, label: "Один раз за диалог", desc: "Правило сработает только один раз в каждом чате" },
              { key: "skip_if_user_replied" as const, label: "Не отвечать если уже ответил", desc: "Пропустить, если вы уже писали вручную в этом чате" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-start justify-between gap-4 py-4 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{desc}</p>
                </div>
                <Toggle checked={form[key] as boolean} onChange={v => f({ [key]: v })} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 px-6 pb-5">
        <button onClick={() => onSave(form)} disabled={saving || !form.name.trim() || !form.reply_text.trim()}
          className="flex-1 py-2.5 bg-[hsl(var(--accent))] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50">
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
        <button onClick={() => onTest(form)}
          className="px-4 py-2.5 border border-border text-sm font-medium rounded-xl hover:bg-[hsl(var(--muted))] flex items-center gap-1.5">
          <Icon name="FlaskConical" size={14} />Тест
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 border border-border text-sm font-medium rounded-xl hover:bg-[hsl(var(--muted))]">
          Отмена
        </button>
      </div>
    </div>
  );
}

function RuleTester({ rule, onClose, sid }: { rule: Rule; onClose: () => void; sid: () => string }) {
  const [message, setMessage] = useState("");
  const [testTime, setTestTime] = useState(new Date().toTimeString().slice(0, 5));
  const [testDay, setTestDay] = useState(new Date().getDay());
  const [result, setResult] = useState<{ triggered: boolean; condition_results: { desc: string; passed: boolean }[]; reply_preview: string | null } | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!message.trim()) return;
    setLoading(true);
    const d = await fetch(CHAT_URL, {
      method: "POST", headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "uar_rule_test", message, conditions: rule.conditions, conditions_operator: rule.conditions_operator, reply_text: rule.reply_text, test_time: testTime, test_weekday: testDay }),
    }).then(r => r.json()).catch(() => ({ ok: false }));
    setLoading(false);
    if (d.ok) setResult(d);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Icon name="FlaskConical" size={18} className="text-[hsl(var(--accent))]" />
            Тестировать правило
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))]"><Icon name="X" size={16} /></button>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Тестовое сообщение</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
              placeholder="Введите сообщение покупателя..."
              className="w-full px-4 py-2.5 text-sm bg-[hsl(var(--muted))] rounded-xl outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] resize-none" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">Время</label>
              <input type="time" value={testTime} onChange={e => setTestTime(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[hsl(var(--muted))] rounded-xl outline-none" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">День недели</label>
              <select value={testDay} onChange={e => setTestDay(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-[hsl(var(--muted))] rounded-xl outline-none">
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>

        <button onClick={run} disabled={loading || !message.trim()}
          className="w-full py-2.5 bg-[hsl(var(--accent))] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-60">
          {loading ? "Проверка..." : "Проверить"}
        </button>

        {result && (
          <div className="mt-4 space-y-3">
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm ${result.triggered ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              <Icon name={result.triggered ? "CheckCircle" : "XCircle"} size={16} />
              {result.triggered ? "Правило сработает!" : "Правило не сработает"}
            </div>
            {result.condition_results.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Условия:</p>
                {result.condition_results.map((cr, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${cr.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                    <Icon name={cr.passed ? "Check" : "X"} size={12} />{cr.desc}
                  </div>
                ))}
              </div>
            )}
            {result.reply_preview && (
              <div className="bg-[hsl(var(--muted))] rounded-xl p-4">
                <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2">Ответ который будет отправлен:</p>
                <p className="text-sm whitespace-pre-wrap">{result.reply_preview}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AutoReplyPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { user, openAuth } = auth;
  const sid = () => localStorage.getItem("session_id") || "";

  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [view, setView] = useState<"list" | "logs">("list");
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [testingRule, setTestingRule] = useState<Rule | null>(null);
  const [saving, setSaving] = useState(false);

  const chatPost = (body: object) => fetch(CHAT_URL, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
    body: JSON.stringify(body),
  }).then(r => r.json());

  useEffect(() => {
    fetch(ADS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "categories" }) })
      .then(r => r.json()).then(d => { if (d.ok) setDbCategories(d.categories); }).catch(() => {});
  }, []);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [s, r] = await Promise.all([chatPost({ action: "uar_settings_get" }), chatPost({ action: "uar_rules_list" })]);
    if (s.ok) setGlobalEnabled(s.enabled);
    if (r.ok) setRules(r.rules.filter((x: Rule & { name: string }) => !x.name.startsWith("__removed__")));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => { if (view === "logs") chatPost({ action: "uar_logs" }).then(d => { if (d.ok) setLogs(d.logs); }); }, [view]);

  const saveGlobal = async (val: boolean) => { setGlobalEnabled(val); await chatPost({ action: "uar_settings_save", enabled: val }); };

  const saveRule = async (rule: Rule) => {
    setSaving(true);
    const d = await chatPost({ action: "uar_rule_save", ...rule });
    setSaving(false);
    if (d.ok) { toast.success(rule.id ? "Правило обновлено" : "Правило создано"); setEditingRule(null); load(); }
    else toast.error("Ошибка сохранения");
  };

  const condSummary = (conds: Condition[], op: string) => {
    if (!conds.length) return "Срабатывает на любое сообщение";
    return conds.map(c => {
      if (c.type === "keyword") return `слова: ${(c.value || []).join(", ")}`;
      if (c.type === "time_range") return `${c.start}–${c.end}`;
      if (c.type === "weekday") return (c.days || []).map(d => DAYS[d]).join(", ");
      return "всегда";
    }).join(op === "OR" ? " ИЛИ " : " И ");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <SiteHeader dbCategories={dbCategories} user={null} onLogoClick={() => navigate("/")} onNewAd={() => navigate("/")} onLogin={() => openAuth("login")} onRegister={() => openAuth("register")} />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Icon name="Bot" size={48} className="text-[hsl(var(--muted-foreground))]" />
          <p className="font-medium">Войдите, чтобы настроить автоответчик</p>
          <button onClick={() => openAuth("login")} className="px-6 py-2.5 bg-[hsl(var(--accent))] text-white rounded-xl font-semibold">Войти</button>
        </div>
        <AuthModal authModal={auth.authModal} setAuthModal={auth.setAuthModal} authMode={auth.authMode} setAuthMode={auth.setAuthMode} authStep={auth.authStep} setAuthStep={auth.setAuthStep} authName={auth.authName} setAuthName={auth.setAuthName} authEmail={auth.authEmail} setAuthEmail={auth.setAuthEmail} authPassword={auth.authPassword} setAuthPassword={auth.setAuthPassword} authCode={auth.authCode} setAuthCode={auth.setAuthCode} authError={auth.authError} setAuthError={auth.setAuthError} authLoading={auth.authLoading} resendTimer={auth.resendTimer} submitAuth={auth.submitAuth} sendCode={auth.sendCode} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <SiteHeader dbCategories={dbCategories} user={user} onLogoClick={() => navigate("/")} onNewAd={() => navigate("/")} onLogin={() => openAuth("login")} onRegister={() => openAuth("register")} onLogout={auth.logout} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/chat")} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))]">
            <Icon name="ArrowLeft" size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Автоответы</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Настройте автоматические ответы покупателям</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">Загрузка...</div>
        ) : editingRule ? (
          <RuleForm rule={editingRule} onSave={saveRule} onCancel={() => setEditingRule(null)} onTest={r => setTestingRule(r)} saving={saving} />
        ) : (
          <div className="space-y-5">
            {/* Глобальный переключатель */}
            <div className="bg-white rounded-2xl border border-border p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${globalEnabled ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--muted))]"}`}>
                  <Icon name="Bot" size={20} className={globalEnabled ? "text-white" : "text-[hsl(var(--muted-foreground))]"} />
                </div>
                <div>
                  <p className="font-semibold">Включить автоответы</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {globalEnabled ? `Активно · ${rules.filter(r => r.is_active).length} правил включено` : "Выключено — ни одно правило не работает"}
                  </p>
                </div>
              </div>
              <Toggle checked={globalEnabled} onChange={saveGlobal} />
            </div>

            {/* Табы */}
            <div className="flex border-b border-border">
              {([["list", "Правила"], ["logs", "Журнал"]] as const).map(([id, label]) => (
                <button key={id} onClick={() => setView(id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${view === id ? "border-[hsl(var(--accent))] text-[hsl(var(--accent))]" : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"}`}>
                  {label}
                  {id === "list" && rules.length > 0 && <span className="min-w-[18px] h-[18px] bg-[hsl(var(--muted))] rounded-full text-[10px] flex items-center justify-center px-1">{rules.length}</span>}
                </button>
              ))}
            </div>

            {view === "list" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Правила проверяются по порядку — срабатывает первое</p>
                  <button onClick={() => setEditingRule(emptyRule())}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--accent))] text-white text-sm font-semibold rounded-xl hover:opacity-90">
                    <Icon name="Plus" size={14} />Создать правило
                  </button>
                </div>

                {rules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4 bg-white rounded-2xl border border-border">
                    <Icon name="MessageSquareDashed" size={48} className="text-[hsl(var(--muted-foreground))]" />
                    <div className="text-center">
                      <p className="font-medium">Нет правил</p>
                      <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Создайте первое правило</p>
                    </div>
                    <button onClick={() => setEditingRule(emptyRule())} className="px-5 py-2.5 bg-[hsl(var(--accent))] text-white text-sm font-semibold rounded-xl hover:opacity-90">
                      Создать правило
                    </button>
                  </div>
                ) : rules.map(rule => (
                  <div key={rule.id} className={`bg-white rounded-2xl border border-border p-5 transition-opacity ${!rule.is_active ? "opacity-60" : ""}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">{rule.name}</h3>
                          {rule.last_triggered_at && (
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                              · сработало {new Date(rule.last_triggered_at).toLocaleDateString("ru")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">{condSummary(rule.conditions, rule.conditions_operator)}</p>
                        <p className="text-sm bg-[hsl(var(--muted))] px-3 py-2 rounded-lg line-clamp-2">{rule.reply_text}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {rule.once_per_dialog && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">1 раз/диалог</span>}
                          {rule.skip_if_user_replied && <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">Пропустить если ответил</span>}
                          {rule.delay_seconds > 0 && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Задержка {rule.delay_seconds}с</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Toggle checked={rule.is_active} onChange={() => chatPost({ action: "uar_rule_toggle", id: rule.id }).then(() => load())} />
                        <div className="flex gap-1">
                          {[
                            { icon: "FlaskConical", title: "Тест", fn: () => setTestingRule(rule) },
                            { icon: "Pencil", title: "Редактировать", fn: () => setEditingRule(rule) },
                            { icon: "Copy", title: "Копировать", fn: () => chatPost({ action: "uar_rule_copy", id: rule.id }).then(d => { if (d.ok) { toast.success("Скопировано"); load(); } }) },
                            { icon: "Trash2", title: "Удалить", fn: () => chatPost({ action: "uar_rule_remove", id: rule.id }).then(() => { toast.success("Удалено"); load(); }), red: true },
                          ].map(btn => (
                            <button key={btn.icon} onClick={btn.fn} title={btn.title}
                              className={`p-1.5 rounded-lg transition-colors ${btn.red ? "hover:bg-red-50" : "hover:bg-[hsl(var(--muted))]"}`}>
                              <Icon name={btn.icon as "Pencil"} size={14} className={btn.red ? "text-red-400" : "text-[hsl(var(--muted-foreground))]"} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
                  <Icon name="Info" size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-600 space-y-1">
                    <p><b>Ключевые слова</b> — ищем слово в тексте (без учёта регистра)</p>
                    <p><b>Время суток</b> — срабатывает в указанный промежуток (поддерживает перенос через полночь)</p>
                    <p><b>День недели</b> — только в выбранные дни</p>
                    <p><b>Переменные:</b> {"{buyer_name}"}, {"{ad_title}"}, {"{ad_price}"} — подставляются автоматически</p>
                  </div>
                </div>
              </div>
            )}

            {view === "logs" && (
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-[hsl(var(--muted-foreground))]">
                    <Icon name="ClipboardList" size={40} /><p className="text-sm">Автоответы ещё не срабатывали</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {logs.map(log => (
                      <div key={log.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="text-xs font-semibold text-[hsl(var(--accent))] bg-orange-50 px-2 py-0.5 rounded-full">{log.rule_name || "Правило удалено"}</span>
                          <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0">{new Date(log.triggered_at).toLocaleString("ru")}</span>
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Входящее: <span className="text-[hsl(var(--foreground))]">{log.incoming}</span></p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Ответ: <span className="text-[hsl(var(--foreground))]">{log.reply}</span></p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {testingRule && <RuleTester rule={testingRule} onClose={() => setTestingRule(null)} sid={sid} />}

      <AuthModal authModal={auth.authModal} setAuthModal={auth.setAuthModal} authMode={auth.authMode} setAuthMode={auth.setAuthMode} authStep={auth.authStep} setAuthStep={auth.setAuthStep} authName={auth.authName} setAuthName={auth.setAuthName} authEmail={auth.authEmail} setAuthEmail={auth.setAuthEmail} authPassword={auth.authPassword} setAuthPassword={auth.setAuthPassword} authCode={auth.authCode} setAuthCode={auth.setAuthCode} authError={auth.authError} setAuthError={auth.setAuthError} authLoading={auth.authLoading} resendTimer={auth.resendTimer} submitAuth={auth.submitAuth} sendCode={auth.sendCode} />
    </div>
  );
}