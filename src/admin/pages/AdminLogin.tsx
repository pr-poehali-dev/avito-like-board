import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../AdminAuthContext";
import Icon from "@/components/ui/icon";

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const err = await login(email, password);
    setLoading(false);
    if (err) setError(err);
    else navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[hsl(var(--primary))] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Icon name="Lock" size={22} className="text-white" />
          </div>
          <h1 className="text-[hsl(var(--foreground))] text-2xl font-bold">Панель управления</h1>
          <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">Войдите в административный аккаунт</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-border shadow-sm flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground))]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[hsl(var(--muted))] border border-border text-[hsl(var(--foreground))] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground))]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[hsl(var(--primary))] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl transition-opacity mt-1"
          >
            {loading ? "Вхожу..." : "Войти"}
          </button>
        </form>

        <div className="text-center mt-4">
          <a href="/" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-sm transition-colors flex items-center gap-1.5 justify-center">
            <Icon name="ArrowLeft" size={14} />
            Вернуться на сайт
          </a>
        </div>
      </div>
    </div>
  );
}
