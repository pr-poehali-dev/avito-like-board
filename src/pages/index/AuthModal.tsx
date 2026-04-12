import Icon from "@/components/ui/icon";

interface AuthModalProps {
  authModal: boolean;
  setAuthModal: (v: boolean) => void;
  authMode: "login" | "register";
  setAuthMode: (v: "login" | "register") => void;
  authStep: "form" | "code";
  setAuthStep: (v: "form" | "code") => void;
  authName: string;
  setAuthName: (v: string) => void;
  authEmail: string;
  setAuthEmail: (v: string) => void;
  authPassword: string;
  setAuthPassword: (v: string) => void;
  authCode: string;
  setAuthCode: (v: string) => void;
  authError: string;
  setAuthError: (v: string) => void;
  authLoading: boolean;
  resendTimer: number;
  submitAuth: () => void;
  sendCode: () => void;
}

export default function AuthModal({
  authModal, setAuthModal,
  authMode, setAuthMode,
  authStep, setAuthStep,
  authName, setAuthName,
  authEmail, setAuthEmail,
  authPassword, setAuthPassword,
  authCode, setAuthCode,
  authError, setAuthError,
  authLoading, resendTimer,
  submitAuth, sendCode,
}: AuthModalProps) {
  if (!authModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAuthModal(false)} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
        {/* Close */}
        <button onClick={() => setAuthModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
          <Icon name="X" size={16} className="text-[hsl(var(--muted-foreground))]" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-[hsl(var(--accent))] rounded-lg flex items-center justify-center">
            <Icon name="Tag" size={16} className="text-white" />
          </div>
          <span className="font-semibold text-base">Объявления</span>
        </div>

        {/* Tabs — показываем только на шаге формы */}
        {authStep === "form" && (
          <div className="flex gap-1 bg-[hsl(var(--muted))] p-1 rounded-xl mb-6">
            <button
              onClick={() => { setAuthMode("login"); setAuthError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${authMode === "login" ? "bg-white shadow-sm text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}
            >
              Войти
            </button>
            <button
              onClick={() => { setAuthMode("register"); setAuthError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${authMode === "register" ? "bg-white shadow-sm text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}
            >
              Регистрация
            </button>
          </div>
        )}

        {/* ШАГ 1: форма входа / регистрации */}
        {authStep === "form" && (
          <div className="flex flex-col gap-3">
            {authMode === "register" && (
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">Ваше имя</label>
                <input
                  placeholder="Алексей"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">Пароль</label>
              <input
                type="password"
                placeholder={authMode === "register" ? "Минимум 6 символов" : "Ваш пароль"}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (authMode === "login" ? submitAuth() : sendCode())}
                className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all"
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2.5 rounded-xl text-sm">
                <Icon name="AlertCircle" size={15} />
                {authError}
              </div>
            )}

            <button
              onClick={authMode === "login" ? submitAuth : sendCode}
              disabled={authLoading}
              className="w-full bg-[hsl(var(--accent))] text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity mt-1 disabled:opacity-60"
            >
              {authLoading ? "Загрузка..." : authMode === "login" ? "Войти" : "Получить код →"}
            </button>

            <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
              {authMode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
              <button
                onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}
                className="text-[hsl(var(--accent))] font-medium hover:underline"
              >
                {authMode === "login" ? "Зарегистрироваться" : "Войти"}
              </button>
            </p>
          </div>
        )}

        {/* ШАГ 2: ввод кода из письма */}
        {authStep === "code" && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="text-center">
              <div className="w-14 h-14 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="Mail" size={24} className="text-[hsl(var(--accent))]" />
              </div>
              <p className="font-semibold text-[hsl(var(--foreground))]">Проверьте почту</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                Мы отправили 6-значный код на<br />
                <span className="font-medium text-[hsl(var(--foreground))]">{authEmail}</span>
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block text-center">Код подтверждения</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="______"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && submitAuth()}
                className="w-full px-4 py-4 bg-[hsl(var(--muted))] rounded-xl text-xl text-center font-bold tracking-[0.5em] border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all"
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2.5 rounded-xl text-sm">
                <Icon name="AlertCircle" size={15} />
                {authError}
              </div>
            )}

            <button
              onClick={submitAuth}
              disabled={authLoading || authCode.length !== 6}
              className="w-full bg-[hsl(var(--accent))] text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {authLoading ? "Проверяем..." : "Подтвердить"}
            </button>

            <div className="text-center text-sm text-[hsl(var(--muted-foreground))]">
              {resendTimer > 0 ? (
                <span>Отправить повторно через {resendTimer} с</span>
              ) : (
                <button
                  onClick={() => { setAuthError(""); sendCode(); }}
                  className="text-[hsl(var(--accent))] font-medium hover:underline"
                >
                  Отправить повторно
                </button>
              )}
            </div>

            <button
              onClick={() => { setAuthStep("form"); setAuthError(""); setAuthCode(""); }}
              className="text-center text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              ← Изменить данные
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
