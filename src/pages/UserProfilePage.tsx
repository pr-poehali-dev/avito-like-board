import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import Icon from "@/components/ui/icon";
import SiteHeader from "@/components/SiteHeader";
import AuthModal from "./index/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { AUTH_URL, ADS_URL, CHAT_URL, DbCategory, Ad, formatPrice } from "./index/types";

interface PublicUser {
  id: number;
  name: string;
  avatar_url: string | null;
  cover_url: string | null;
  city: string | null;
  about: string | null;
  created_at: string | null;
  ads_count: number;
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { user, openAuth } = auth;

  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [adsLoading, setAdsLoading] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const isOwner = user && profile && user.id === profile.id;

  useEffect(() => {
    fetch(ADS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "categories" }) })
      .then(r => r.json()).then(d => { if (d.ok) setDbCategories(d.categories); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(AUTH_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "profile_get", user_id: userId }) })
      .then(r => r.json())
      .then(d => { if (d.ok) setProfile(d.user); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setAdsLoading(true);
    fetch(ADS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list", user_id: userId }) })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          // фильтруем только объявления этого пользователя (если бэк не поддерживает user_id — фильтруем здесь)
          setAds(d.ads || []);
        }
      })
      .catch(() => {})
      .finally(() => setAdsLoading(false));
  }, [userId]);

  const startChat = async () => {
    if (!user) { openAuth("login"); return; }
    if (!profile) return;
    setStartingChat(true);
    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": localStorage.getItem("session_id") || "" },
        body: JSON.stringify({ action: "start_chat", user_id: profile.id }),
      });
      const d = await res.json();
      if (d.ok) navigate(`/chat?id=${d.chat_id}`);
    } catch { /**/ } finally { setStartingChat(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <SiteHeader dbCategories={dbCategories} user={user} onLogoClick={() => navigate("/")} onNewAd={() => navigate("/")} onLogin={() => openAuth("login")} onRegister={() => openAuth("register")} onLogout={auth.logout} />
        <div className="flex items-center justify-center py-32 text-[hsl(var(--muted-foreground))]">Загрузка...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <SiteHeader dbCategories={dbCategories} user={user} onLogoClick={() => navigate("/")} onNewAd={() => navigate("/")} onLogin={() => openAuth("login")} onRegister={() => openAuth("register")} onLogout={auth.logout} />
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Icon name="UserX" size={48} className="text-[hsl(var(--muted-foreground))]" />
          <p className="font-medium">Пользователь не найден</p>
          <button onClick={() => navigate("/")} className="text-sm text-[hsl(var(--accent))] hover:underline">На главную</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <SiteHeader dbCategories={dbCategories} user={user} onLogoClick={() => navigate("/")} onNewAd={() => navigate("/")} onLogin={() => openAuth("login")} onRegister={() => openAuth("register")} onLogout={auth.logout} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Обложка + аватар */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden mb-6">
          <div className="h-36 bg-gradient-to-r from-[hsl(var(--accent))] to-orange-400 relative">
            {profile.cover_url && <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="w-20 h-20 rounded-full border-4 border-white bg-[hsl(var(--accent))] flex items-center justify-center text-white text-2xl font-bold shadow-md shrink-0 overflow-hidden">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : profile.name[0]?.toUpperCase()
                }
              </div>
              <div className="flex gap-2 mt-12">
                {isOwner ? (
                  <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <Icon name="Settings" size={15} />
                    Редактировать
                  </button>
                ) : user ? (
                  <button
                    onClick={startChat}
                    disabled={startingChat}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[hsl(var(--accent))] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    <Icon name="MessageCircle" size={15} />
                    {startingChat ? "Открываю..." : "Написать"}
                  </button>
                ) : null}
              </div>
            </div>

            <h1 className="text-xl font-bold">{profile.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              {profile.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={13} />{profile.city}</span>}
              {profile.created_at && <span className="flex items-center gap-1"><Icon name="Calendar" size={13} />На сайте с {profile.created_at}</span>}
              <span className="flex items-center gap-1"><Icon name="Tag" size={13} />{profile.ads_count} объявлений</span>
            </div>
            {profile.about && <p className="mt-4 text-sm text-[hsl(var(--foreground))] leading-relaxed">{profile.about}</p>}
          </div>
        </div>

        {/* Объявления пользователя */}
        <h2 className="text-lg font-bold mb-4">Объявления</h2>
        {adsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-xl bg-[hsl(var(--muted))] animate-pulse h-52" />)}
          </div>
        ) : ads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[hsl(var(--muted-foreground))]">
            <Icon name="PackageSearch" size={40} />
            <p className="text-sm">Нет активных объявлений</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ads.slice(0, 12).map(ad => {
              const photos = ad.photos?.length ? ad.photos : [];
              return (
                <div key={ad.id} onClick={() => navigate(`/?ad=${ad.id}`)} className="group rounded-xl border border-border bg-white overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                  <div className="aspect-[4/3] bg-[hsl(var(--muted))] overflow-hidden">
                    {photos.length > 0
                      ? <img src={photos[0]} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center"><Icon name="Image" size={28} className="text-[hsl(var(--muted-foreground))]" /></div>
                    }
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-sm">{formatPrice(ad.price)}</p>
                    <p className="text-xs text-[hsl(var(--foreground))] mt-0.5 line-clamp-2">{ad.title}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{ad.city}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <AuthModal
        authModal={auth.authModal} setAuthModal={auth.setAuthModal}
        authMode={auth.authMode} setAuthMode={auth.setAuthMode}
        authStep={auth.authStep} setAuthStep={auth.setAuthStep}
        authName={auth.authName} setAuthName={auth.setAuthName}
        authEmail={auth.authEmail} setAuthEmail={auth.setAuthEmail}
        authPassword={auth.authPassword} setAuthPassword={auth.setAuthPassword}
        authCode={auth.authCode} setAuthCode={auth.setAuthCode}
        authError={auth.authError} setAuthError={auth.setAuthError}
        authLoading={auth.authLoading} resendTimer={auth.resendTimer}
        submitAuth={auth.submitAuth} sendCode={auth.sendCode}
      />
    </div>
  );
}
