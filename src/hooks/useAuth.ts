import { useState, useEffect } from "react";
import { AUTH_URL, User } from "@/pages/index/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authModal, setAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authStep, setAuthStep] = useState<"form" | "code">("form");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    const sid = localStorage.getItem("session_id") || localStorage.getItem("admin_token");
    if (!sid) return;
    fetch(AUTH_URL, { headers: { "X-Session-Id": sid } })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setUser(d.user); })
      .catch(() => {});
  }, []);

  const openAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthStep("form");
    setAuthError("");
    setAuthName("");
    setAuthEmail("");
    setAuthPassword("");
    setAuthCode("");
    setResendTimer(0);
    setAuthModal(true);
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const sendCode = async () => {
    setAuthError("");
    if (!authEmail || !authEmail.includes("@")) { setAuthError("Укажите корректный email"); return; }
    if (!authName.trim()) { setAuthError("Укажите имя"); return; }
    if (authPassword.length < 6) { setAuthError("Пароль минимум 6 символов"); return; }
    setAuthLoading(true);
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_code", email: authEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAuthError(data.error || "Ошибка отправки");
      } else {
        setAuthStep("code");
        startResendTimer();
      }
    } catch {
      setAuthError("Нет соединения");
    } finally {
      setAuthLoading(false);
    }
  };

  const submitAuth = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const body: Record<string, string> = { action: authMode, email: authEmail, password: authPassword };
      if (authMode === "register") { body.name = authName; body.code = authCode; }
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAuthError(data.error || "Ошибка");
      } else {
        localStorage.setItem("session_id", data.session_id);
        setUser(data.user);
        setAuthModal(false);
      }
    } catch {
      setAuthError("Нет соединения");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    const sid = localStorage.getItem("session_id");
    if (sid) {
      await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sid },
        body: JSON.stringify({ action: "logout" }),
      });
      localStorage.removeItem("session_id");
    }
    setUser(null);
  };

  return {
    user, setUser,
    authModal, setAuthModal,
    authMode, setAuthMode,
    authStep, setAuthStep,
    authName, setAuthName,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    authCode, setAuthCode,
    authError, setAuthError,
    authLoading,
    resendTimer,
    openAuth, sendCode, submitAuth, logout,
  };
}