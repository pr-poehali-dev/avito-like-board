import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AdDetail from "./AdDetail";
import SiteHeader from "@/components/SiteHeader";
import AuthModal from "./index/AuthModal";
import FavoriteModal from "@/components/FavoriteModal";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { ADS_URL, DbCategory } from "./index/types";


export default function AdPage() {
  const { adId } = useParams<{ adId: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { user, openAuth } = auth;

  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [adTitle, setAdTitle] = useState<string>("");
  const [adCategory, setAdCategory] = useState<string>("");
  const [adCategorySlug, setAdCategorySlug] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    favSet, favFolders, addToFolderAdId, setAddToFolderAdId,
    adFolderIds, newFolderName, setNewFolderName,
    loadFavSet, openFavoriteModal, toggleAdInFolder, createFolder,
  } = useFavorites(user, openAuth);

  useEffect(() => {
    fetch(ADS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "categories" }),
    }).then(r => r.json()).then(d => { if (d.ok) setDbCategories(d.categories); }).catch(() => {});
  }, []);

  useEffect(() => { loadFavSet(); }, [user]);

  if (!adId) return null;

  const numericId = Number(adId);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <SiteHeader
        dbCategories={dbCategories}
        user={user}
        searchQuery={searchQuery}
        onSearchChange={(v) => { setSearchQuery(v); navigate(`/?q=${encodeURIComponent(v)}`); }}
        onLogoClick={() => navigate("/")}
        onNewAd={() => navigate("/listing/new")}
        onLogin={() => openAuth("login")}
        onRegister={() => openAuth("register")}
        onLogout={auth.logout}
        onNavProfile={() => user && navigate(`/user/${user.id}`)}
        onNavMyAds={() => navigate("/?section=my-ads")}
        onNavFavorites={() => navigate("/?section=favorites")}
        onNavMessages={() => navigate("/chat")}
      />

      {/* Хлебные крошки */}
      <div className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
          <Link to="/" className="hover:text-[hsl(var(--foreground))] transition-colors">Главная</Link>
          <span>/</span>
          {adCategory && adCategorySlug && (
            <>
              <Link to={`/${adCategorySlug}`} className="hover:text-[hsl(var(--foreground))] transition-colors">{adCategory}</Link>
              <span>/</span>
            </>
          )}
          {adCategory && !adCategorySlug && (
            <>
              <span>{adCategory}</span>
              <span>/</span>
            </>
          )}
          <span className="text-[hsl(var(--foreground))] truncate max-w-[200px]">{adTitle || "Объявление"}</span>
        </div>
      </div>

      <AdDetail
        adId={numericId}
        onBack={() => navigate(-1)}
        onAddToFolder={(id) => openFavoriteModal(id)}
        isFavorited={favSet.has(numericId)}
        currentUserId={user?.id ?? null}
        onAdLoaded={(title, category, categorySlug) => { setAdTitle(title); setAdCategory(category); setAdCategorySlug(categorySlug || ""); }}
      />

      <AuthModal
        authModal={auth.authModal} setAuthModal={auth.setAuthModal}
        authMode={auth.authMode} setAuthMode={auth.setAuthMode}
        authStep={auth.authStep} setAuthStep={auth.setAuthStep}
        authName={auth.authName} setAuthName={auth.setAuthName}
        authEmail={auth.authEmail} setAuthEmail={auth.setAuthEmail}
        authPassword={auth.authPassword} setAuthPassword={auth.setAuthPassword}
        authCode={auth.authCode} setAuthCode={auth.setAuthCode}
        authError={auth.authError} setAuthError={auth.setAuthError}
        authLoading={auth.authLoading}
        resendTimer={auth.resendTimer}
        submitAuth={auth.submitAuth}
        sendCode={auth.sendCode}
      />

      {addToFolderAdId !== null && (
        <FavoriteModal
          adId={addToFolderAdId}
          favFolders={favFolders}
          adFolderIds={adFolderIds}
          newFolderName={newFolderName}
          setNewFolderName={setNewFolderName}
          onToggleFolder={toggleAdInFolder}
          onCreateFolder={createFolder}
          onClose={() => setAddToFolderAdId(null)}
        />
      )}
    </div>
  );
}