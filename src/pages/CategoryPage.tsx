import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import SiteHeader from "@/components/SiteHeader";
import AuthModal from "./index/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { ADS_URL, FAV_URL, Ad, DbCategory, formatPrice } from "./index/types";

export default function CategoryPage() {
  const { slug, subslug } = useParams<{ slug: string; subslug?: string }>();
  const navigate = useNavigate();

  const {
    user,
    authModal, setAuthModal,
    authMode, setAuthMode,
    authStep, setAuthStep,
    authName, setAuthName,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    authCode, setAuthCode,
    authError, setAuthError,
    authLoading, resendTimer,
    openAuth, sendCode, submitAuth, logout,
  } = useAuth();

  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [adsLoadingMore, setAdsLoadingMore] = useState(false);
  const [adsTotal, setAdsTotal] = useState(0);
  const [adsPerPage, setAdsPerPage] = useState(0);
  const [adsPage, setAdsPage] = useState(1);
  const [carouselIndex, setCarouselIndex] = useState<Record<number, number>>({});
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  const toggleFavorite = async (e: React.MouseEvent, adId: number) => {
    e.stopPropagation();
    if (!user) { openAuth("login"); return; }
    const isFav = favorites.has(adId);
    setFavorites(prev => {
      const s = new Set(prev);
      if (isFav) { s.delete(adId); } else { s.add(adId); }
      return s;
    });
    fetch(FAV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": localStorage.getItem("session_id") || "" },
      body: JSON.stringify({ action: isFav ? "remove" : "add", ad_id: adId }),
    }).catch(() => {
      setFavorites(prev => {
        const s = new Set(prev);
        if (isFav) { s.add(adId); } else { s.delete(adId); }
        return s;
      });
    });
  };

  useEffect(() => {
    fetch(ADS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "categories" }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.ok && d.categories.length > 0) setDbCategories(d.categories); })
      .catch(() => {});
  }, []);

  const activeSlug = subslug || slug;
  const category = dbCategories.find((c) => c.slug === activeSlug);

  const loadAds = useCallback((page = 1, append = false) => {
    if (!category) return;
    if (page === 1) setAdsLoading(true); else setAdsLoadingMore(true);
    fetch(ADS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", page, category_id: category.id }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setAds((prev) => append ? [...prev, ...d.ads] : d.ads);
          setAdsTotal(d.total ?? 0);
          setAdsPerPage(d.per_page ?? 0);
          setAdsPage(page);
        }
      })
      .catch(() => {})
      .finally(() => { setAdsLoading(false); setAdsLoadingMore(false); });
  }, [category?.id]);

  useEffect(() => {
    if (category) { setAds([]); loadAds(1, false); }
  }, [category?.id]);

  const rootCategory = subslug
    ? dbCategories.find((c) => c.slug === slug)
    : category?.parent_id ? dbCategories.find((c) => c.id === category.parent_id) : null;

  const subCategories = category ? dbCategories.filter((c) => c.parent_id === category.id) : [];
  const hasMore = ads.length < adsTotal;

  const breadcrumbs: { name: string; href: string }[] = [{ name: "Главная", href: "/" }];
  if (rootCategory) breadcrumbs.push({ name: rootCategory.name, href: `/${rootCategory.slug}` });
  if (category) breadcrumbs.push({ name: category.name, href: subslug ? `/${slug}/${subslug}` : `/${slug}` });

  if (dbCategories.length > 0 && !category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Icon name="SearchX" size={48} className="text-[hsl(var(--muted-foreground))]" />
        <p className="text-lg font-medium">Категория не найдена</p>
        <button onClick={() => navigate("/")} className="text-[hsl(var(--accent))] hover:underline text-sm">
          Вернуться на главную
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <SiteHeader
        dbCategories={dbCategories}
        user={user}
        onLogoClick={() => navigate("/")}
        onNewAd={() => { if (!user) openAuth("login"); else navigate("/"); }}
        onLogin={() => openAuth("login")}
        onRegister={() => openAuth("register")}
        onLogout={logout}
        onNavSection={(s) => navigate(s === "home" ? "/" : "/")}
        onNavProfile={() => navigate("/")}
        onNavMyAds={() => navigate("/")}
        onNavFavorites={() => navigate("/")}
        onNavMessages={() => navigate("/")}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Хлебные крошки */}
        <nav className="flex items-center gap-1 text-sm mb-4">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1 shrink-0">
              {i > 0 && <Icon name="ChevronRight" size={13} className="text-[hsl(var(--muted-foreground))]" />}
              {i < breadcrumbs.length - 1 ? (
                <Link to={crumb.href} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))] transition-colors truncate max-w-[160px]">
                  {crumb.name}
                </Link>
              ) : (
                <span className="font-medium text-[hsl(var(--foreground))] truncate max-w-[200px]">{crumb.name}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── ЛЕВАЯ ЧАСТЬ: список объявлений ── */}
          <div className="flex-1 min-w-0">
            {/* Заголовок */}
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">{category?.name}</h1>
              {adsTotal > 0 && (
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                  Показано <span className="font-semibold text-[hsl(var(--foreground))]">{ads.length}</span> из <span className="font-semibold text-[hsl(var(--foreground))]">{adsTotal}</span> объявлений
                </p>
              )}
            </div>

            {/* Подкатегории */}
            {subCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {subCategories.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => navigate(`/${slug}/${sub.slug}`)}
                    className="px-3 py-1.5 text-sm rounded-full border border-border bg-white hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))] transition-colors"
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}

            {/* Объявления */}
        {adsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-[hsl(var(--muted))] animate-pulse h-56" />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Icon name="PackageSearch" size={48} className="text-[hsl(var(--muted-foreground))]" />
            <p className="text-[hsl(var(--muted-foreground))]">В этой категории пока нет объявлений</p>
            <button onClick={() => navigate("/")} className="text-sm text-[hsl(var(--accent))] hover:underline">
              Посмотреть все объявления
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ads.map((ad) => {
                const photos = ad.photos?.length ? ad.photos : ad.image ? [ad.image] : [];
                const idx = carouselIndex[ad.id] || 0;
                return (
                  <div
                    key={ad.id}
                    className="group rounded-xl border border-border bg-white overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/ad/${ad.id}`)}
                  >
                    <div className="relative aspect-[4/3] bg-[hsl(var(--muted))] overflow-hidden">
                      {photos.length > 0 ? (
                        <img src={photos[idx]} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[hsl(var(--muted-foreground))]">
                          <Icon name="Image" size={32} />
                        </div>
                      )}
                      <button
                        onClick={(e) => toggleFavorite(e, ad.id)}
                        className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-all hover:scale-110 ${favorites.has(ad.id) ? "text-red-500" : "text-[hsl(var(--muted-foreground))]"}`}
                      >
                        <Icon name="Heart" size={13} className={favorites.has(ad.id) ? "fill-red-500" : ""} />
                      </button>
                      {photos.length > 1 && (
                        <div className="absolute bottom-2 right-2 flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setCarouselIndex((p) => ({ ...p, [ad.id]: (idx - 1 + photos.length) % photos.length })); }}
                            className="w-5 h-5 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70"
                          >
                            <Icon name="ChevronLeft" size={11} className="text-white" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setCarouselIndex((p) => ({ ...p, [ad.id]: (idx + 1) % photos.length })); }}
                            className="w-5 h-5 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70"
                          >
                            <Icon name="ChevronRight" size={11} className="text-white" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-sm text-[hsl(var(--foreground))]">{formatPrice(ad.price)}</p>
                      <p className="text-sm text-[hsl(var(--foreground))] mt-0.5 line-clamp-2 leading-tight">{ad.title}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">{ad.city} · {ad.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Кнопка «Показать ещё» */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => loadAds(adsPage + 1, true)}
                  disabled={adsLoadingMore}
                  className="px-10 py-2.5 rounded-xl border border-border text-sm font-medium text-[hsl(var(--foreground))] hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))] transition-colors disabled:opacity-60"
                >
                  {adsLoadingMore ? "Загрузка..." : `Показать ещё ${adsPerPage ? adsPerPage : ""}`}
                </button>
              </div>
            )}
          </>
        )}
          </div>

          {/* ── ПРАВЫЙ САЙДБАР: категории ── */}
          <div className="lg:w-64 shrink-0 flex flex-col gap-3">

            {/* Все категории */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] px-4 py-3 border-b border-border">Все категории</p>
              <div className="divide-y divide-[hsl(var(--muted))]">
                {dbCategories.filter((c) => !c.parent_id).map((root) => {
                  const isActive = root.slug === slug;
                  const children = dbCategories.filter((c) => c.parent_id === root.id);
                  return (
                    <div key={root.id}>
                      <button
                        onClick={() => navigate(`/${root.slug}`)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${isActive ? "bg-orange-50 text-[hsl(var(--accent))] font-semibold" : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"}`}
                      >
                        <span>{root.name}</span>
                        {root.ads_count > 0 && <span className="text-xs text-[hsl(var(--muted-foreground))]">{root.ads_count}</span>}
                      </button>
                      {isActive && children.length > 0 && (
                        <div className="bg-[hsl(var(--muted))]/40">
                          {children.map((child) => (
                            <button
                              key={child.id}
                              onClick={() => navigate(`/${slug}/${child.slug}`)}
                              className={`w-full flex items-center justify-between pl-7 pr-4 py-2 text-sm text-left transition-colors ${child.slug === subslug ? "text-[hsl(var(--accent))] font-medium" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"}`}
                            >
                              <span>{child.name}</span>
                              {child.ads_count > 0 && <span className="text-xs">{child.ads_count}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Подать объявление */}
            <button
              onClick={() => navigate("/listing/new")}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[hsl(var(--accent))] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Icon name="Plus" size={16} />
              Подать объявление
            </button>

          </div>
        </div>
      </main>

      <AuthModal
        authModal={authModal}
        setAuthModal={setAuthModal}
        authMode={authMode}
        setAuthMode={setAuthMode}
        authStep={authStep}
        setAuthStep={setAuthStep}
        authName={authName}
        setAuthName={setAuthName}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authCode={authCode}
        setAuthCode={setAuthCode}
        authError={authError}
        setAuthError={setAuthError}
        authLoading={authLoading}
        resendTimer={resendTimer}
        submitAuth={submitAuth}
        sendCode={sendCode}
      />
    </div>
  );
}