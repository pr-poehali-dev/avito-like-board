import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import SiteHeader from "@/components/SiteHeader";
import AuthModal from "./index/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { CHAT_URL, ADS_URL, DbCategory } from "./index/types";

interface Rule {
  id?: number;
  question: string;
  answer: string;
  match_type: "exact" | "partial";
  sort_order: number;
  enabled: boolean;
}

const MATCH_LABELS = { exact: "Точное совпадение", partial: "Частичное совпадение" };

const emptyRule = (): Rule => ({ question: "", answer: "", match_type: "partial", sort_order: 0, enabled: true });

export default function AutoReplyPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { user, openAuth } = auth;
  const sid = () => localStorage.getItem("session_id") || "";

  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Настройки
  const [enabled, setEnabled] = useState(false);
  const [greeting, setGreeting] = useState("");

  // Правила
  const [rules, setRules] = useState<Rule[]>([]);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);

  useEffect(() => {
    fetch(ADS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "categories" }) })
      .then(r => r.json()).then(d => { if (d.ok) setDbCategories(d.categories); }).catch(() => {});
  }, []);

  const load = () => {
    if (!user) return;
    setLoading(true);
    fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "auto_reply_get" }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setEnabled(d.settings.enabled);
          setGreeting(d.settings.greeting || "");
          setRules(d.rules);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user]);

  const saveSettings = async () => {
    setSaving(true);
    const d = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "auto_reply_save_settings", enabled, greeting }),
    }).then(r => r.json()).catch(() => ({ ok: false }));
    setSaving(false);
    if (d.ok) toast.success("Настройки сохранены");
    else toast.error("Ошибка сохранения");
  };

  const saveRule = async () => {
    if (!editingRule) return;
    if (!editingRule.question.trim() || !editingRule.answer.trim()) {
      toast.error("Заполните вопрос и ответ");
      return;
    }
    setSaving(true);
    const body: Record<string, unknown> = {
      action: "auto_reply_rule_save",
      question: editingRule.question,
      answer: editingRule.answer,
      match_type: editingRule.match_type,
      sort_order: editingRule.sort_order,
      enabled: editingRule.enabled,
    };
    if (editingId !== "new" && editingId !== null) body.id = editingId;

    const d = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify(body),
    }).then(r => r.json()).catch(() => ({ ok: false }));
    setSaving(false);

    if (d.ok) {
      toast.success(editingId === "new" ? "Правило добавлено" : "Правило обновлено");
      setEditingRule(null);
      setEditingId(null);
      load();
    } else toast.error("Ошибка сохранения");
  };

  const removeRule = async (id: number) => {
    const d = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "auto_reply_rule_delete", id }),
    }).then(r => r.json()).catch(() => ({ ok: false }));
    if (d.ok) { toast.success("Правило удалено"); load(); }
    else toast.error("Ошибка");
  };

  const toggleRule = async (rule: Rule) => {
    await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "auto_reply_rule_save", id: rule.id, question: rule.question, answer: rule.answer, match_type: rule.match_type, sort_order: rule.sort_order, enabled: !rule.enabled }),
    }).then(r => r.json());
    load();
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
        <AuthModal {...auth} authModal={auth.authModal} setAuthModal={auth.setAuthModal} authMode={auth.authMode} setAuthMode={auth.setAuthMode} authStep={auth.authStep} setAuthStep={auth.setAuthStep} authName={auth.authName} setAuthName={auth.setAuthName} authEmail={auth.authEmail} setAuthEmail={auth.setAuthEmail} authPassword={auth.authPassword} setAuthPassword={auth.setAuthPassword} authCode={auth.authCode} setAuthCode={auth.setAuthCode} authError={auth.authError} setAuthError={auth.setAuthError} authLoading={auth.authLoading} resendTimer={auth.resendTimer} submitAuth={auth.submitAuth} sendCode={auth.sendCode} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <SiteHeader dbCategories={dbCategories} user={user} onLogoClick={() => navigate("/")} onNewAd={() => navigate("/")} onLogin={() => openAuth("login")} onRegister={() => openAuth("register")} onLogout={auth.logout} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Заголовок */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/chat")} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
            <Icon name="ArrowLeft" size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold">Автоответчик</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Автоматически отвечает на сообщения покупателей</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">Загрузка...</div>
        ) : (
          <div className="space-y-6">

            {/* Блок включения */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--muted))]"}`}>
                    <Icon name="Bot" size={20} className={enabled ? "text-white" : "text-[hsl(var(--muted-foreground))]"} />
                  </div>
                  <div>
                    <p className="font-semibold">Автоответчик</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{enabled ? "Включён — отвечает на сообщения" : "Выключен"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEnabled(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--muted-foreground))]/30"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              {/* Приветственное сообщение */}
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                  Приветствие при первом сообщении
                  <span className="text-xs font-normal text-[hsl(var(--muted-foreground))] ml-1">(необязательно)</span>
                </label>
                <textarea
                  value={greeting}
                  onChange={e => setGreeting(e.target.value)}
                  placeholder="Здравствуйте! Я отвечу вам в ближайшее время. Чем могу помочь?"
                  rows={3}
                  className="w-full px-4 py-3 text-sm bg-[hsl(var(--muted))] rounded-xl outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] resize-none placeholder:text-[hsl(var(--muted-foreground))]"
                />
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Отправляется автоматически в ответ на первое сообщение покупателя, если нет подходящего правила</p>
              </div>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="mt-4 px-5 py-2.5 bg-[hsl(var(--accent))] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {saving ? "Сохранение..." : "Сохранить настройки"}
              </button>
            </div>

            {/* Правила */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <h2 className="font-semibold">Правила автоответа</h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Проверяются по порядку, срабатывает первое совпадение</p>
                </div>
                <button
                  onClick={() => { setEditingRule(emptyRule()); setEditingId("new"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[hsl(var(--accent))] text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Icon name="Plus" size={14} />
                  Добавить
                </button>
              </div>

              {rules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-[hsl(var(--muted-foreground))]">
                  <Icon name="MessageSquareDashed" size={36} />
                  <p className="text-sm">Нет правил — добавьте первое</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {rules.map((rule, i) => (
                    <div key={rule.id ?? i} className={`px-6 py-4 ${!rule.enabled ? "opacity-50" : ""}`}>
                      <div className="flex items-start gap-3">
                        {/* Номер */}
                        <span className="w-6 h-6 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-xs font-bold text-[hsl(var(--muted-foreground))] shrink-0 mt-0.5">{i + 1}</span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rule.match_type === "exact" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-[hsl(var(--accent))]"}`}>
                              {MATCH_LABELS[rule.match_type]}
                            </span>
                          </div>
                          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                            <span className="text-[hsl(var(--muted-foreground))] font-medium">Вопрос:</span>
                            <span className="text-[hsl(var(--foreground))] font-medium truncate">{rule.question}</span>
                            <span className="text-[hsl(var(--muted-foreground))] font-medium">Ответ:</span>
                            <span className="text-[hsl(var(--foreground))] line-clamp-2">{rule.answer}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => toggleRule(rule)}
                            className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                            title={rule.enabled ? "Выключить" : "Включить"}
                          >
                            <Icon name={rule.enabled ? "ToggleRight" : "ToggleLeft"} size={18} className={rule.enabled ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--muted-foreground))]"} />
                          </button>
                          <button
                            onClick={() => { setEditingRule({ ...rule }); setEditingId(rule.id ?? "new"); }}
                            className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                          >
                            <Icon name="Pencil" size={15} className="text-[hsl(var(--muted-foreground))]" />
                          </button>
                          <button
                            onClick={() => rule.id && removeRule(rule.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Icon name="Trash2" size={15} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Подсказка */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
              <Icon name="Info" size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Как работает автоответчик</p>
                <ul className="space-y-1 text-xs text-blue-600">
                  <li>• Когда покупатель пишет вам — система проверяет правила по порядку</li>
                  <li>• <b>Точное совпадение</b>: сообщение должно совпадать с вопросом полностью</li>
                  <li>• <b>Частичное совпадение</b>: достаточно чтобы вопрос содержался в сообщении</li>
                  <li>• Если правило найдено — отправляется соответствующий ответ</li>
                  <li>• Если правил нет — отправляется приветствие (только на первое сообщение)</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Модал редактирования правила */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setEditingRule(null); setEditingId(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
            <h3 className="text-lg font-bold mb-5">{editingId === "new" ? "Новое правило" : "Редактировать правило"}</h3>

            <div className="space-y-4">
              {/* Тип совпадения */}
              <div>
                <label className="block text-sm font-medium mb-2">Тип совпадения</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["partial", "exact"] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setEditingRule(r => r ? { ...r, match_type: type } : r)}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${editingRule.match_type === type ? "border-[hsl(var(--accent))] bg-orange-50 text-[hsl(var(--accent))]" : "border-border hover:border-[hsl(var(--accent))]"}`}
                    >
                      {MATCH_LABELS[type]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">
                  {editingRule.match_type === "exact"
                    ? "Сообщение должно полностью совпадать с вопросом (без учёта регистра)"
                    : "Вопрос должен содержаться в тексте сообщения покупателя"}
                </p>
              </div>

              {/* Вопрос */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Вопрос <span className="text-red-400">*</span>
                </label>
                <input
                  value={editingRule.question}
                  onChange={e => setEditingRule(r => r ? { ...r, question: e.target.value } : r)}
                  placeholder={editingRule.match_type === "exact" ? "цена" : "доставка"}
                  className="w-full px-4 py-2.5 text-sm bg-[hsl(var(--muted))] rounded-xl outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
                />
              </div>

              {/* Ответ */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Ответ <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={editingRule.answer}
                  onChange={e => setEditingRule(r => r ? { ...r, answer: e.target.value } : r)}
                  placeholder="Напишите текст автоматического ответа..."
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm bg-[hsl(var(--muted))] rounded-xl outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] resize-none"
                />
              </div>

              {/* Порядок */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Порядок (чем меньше — тем выше приоритет)</label>
                <input
                  type="number"
                  value={editingRule.sort_order}
                  onChange={e => setEditingRule(r => r ? { ...r, sort_order: Number(e.target.value) } : r)}
                  min={0}
                  className="w-24 px-4 py-2.5 text-sm bg-[hsl(var(--muted))] rounded-xl outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveRule}
                disabled={saving}
                className="flex-1 py-2.5 bg-[hsl(var(--accent))] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
              <button
                onClick={() => { setEditingRule(null); setEditingId(null); }}
                className="px-5 py-2.5 border border-border text-sm font-medium rounded-xl hover:bg-[hsl(var(--muted))] transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal authModal={auth.authModal} setAuthModal={auth.setAuthModal} authMode={auth.authMode} setAuthMode={auth.setAuthMode} authStep={auth.authStep} setAuthStep={auth.setAuthStep} authName={auth.authName} setAuthName={auth.setAuthName} authEmail={auth.authEmail} setAuthEmail={auth.setAuthEmail} authPassword={auth.authPassword} setAuthPassword={auth.setAuthPassword} authCode={auth.authCode} setAuthCode={auth.setAuthCode} authError={auth.authError} setAuthError={auth.setAuthError} authLoading={auth.authLoading} resendTimer={auth.resendTimer} submitAuth={auth.submitAuth} sendCode={auth.sendCode} />
    </div>
  );
}
