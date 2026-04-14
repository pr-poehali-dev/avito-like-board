import Icon from "@/components/ui/icon";
import { Ad, FavFolder, DbCategory, User, FALLBACK_CATEGORIES, CITIES, MESSAGES, formatPrice } from "./types";

// ─── HomeSection ──────────────────────────────────────────────────────────────
interface HomeSectionProps {
  dbCategories: DbCategory[];
  filteredAds: Ad[];
  favorites: number[];
  carouselIndex: Record<number, number>;
  setCarouselIndex: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectedCity: string;
  setSelectedCity: (v: string) => void;
  priceFrom: string;
  setPriceFrom: (v: string) => void;
  priceTo: string;
  setPriceTo: (v: string) => void;
  condition: string;
  setCondition: (v: string) => void;
  filtersOpen: boolean;
  setFiltersOpen: (v: boolean) => void;
  apiAds: Ad[];
  setViewAdId: (v: number) => void;
  openAddToFolder: (id: number) => void;
  openNewAd: () => void;
  setSection: (v: string) => void;
  adsLoading: boolean;
  adsTotal?: number;
  adsPerPage?: number;
  hasMore?: boolean;
  adsLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export function HomeSection({
  dbCategories, filteredAds, favorites, carouselIndex, setCarouselIndex,
  selectedCategory, setSelectedCategory, selectedCity, setSelectedCity,
  priceFrom, setPriceFrom, priceTo, setPriceTo, condition, setCondition,
  filtersOpen, setFiltersOpen, apiAds, setViewAdId, openAddToFolder, openNewAd, setSection, adsLoading,
  adsTotal = 0, adsPerPage = 0, hasMore = false, adsLoadingMore = false, onLoadMore,
}: HomeSectionProps) {
  return (
    <div className="animate-slide-up">
      {/* Hero blocks */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div
          className="col-span-2 row-span-2 relative rounded-2xl overflow-hidden min-h-[180px] flex flex-col justify-end p-6 cursor-pointer group"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(235 70% 65%) 100%)" }}
          onClick={() => {}}
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative z-10">
            <p className="text-white/80 text-sm font-medium mb-1">Доска объявлений</p>
            <h2 className="text-white text-2xl md:text-3xl font-bold leading-tight mb-2">Найдётся всё,<br />что нужно</h2>
            <p className="text-white/80 text-sm">Тысячи объявлений от реальных людей рядом с вами</p>
          </div>
          <div className="absolute right-4 bottom-4 text-6xl opacity-20 group-hover:opacity-30 transition-opacity select-none">🛍️</div>
        </div>

        <div className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow" style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }} onClick={() => { setSelectedCategory("services"); setSection("categories"); }}>
          <span className="text-2xl">🔧</span>
          <div><p className="text-white font-bold text-sm leading-tight">Услуги</p><p className="text-white/70 text-xs mt-0.5">Мастера и специалисты рядом</p></div>
        </div>
        <div className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }} onClick={openNewAd}>
          <span className="text-2xl">💸</span>
          <div><p className="text-white font-bold text-sm leading-tight">Продай ненужное</p><p className="text-white/70 text-xs mt-0.5">Разместить объявление за 2 мин</p></div>
        </div>
        <div className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow" style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" }} onClick={() => { setSelectedCategory("realty"); setSection("categories"); }}>
          <span className="text-2xl">🏢</span>
          <div><p className="text-white font-bold text-sm leading-tight">Квартиры</p><p className="text-white/70 text-xs mt-0.5">Аренда и продажа жилья</p></div>
        </div>
        <div className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow" style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }} onClick={() => { setSelectedCategory("electronics"); setSection("categories"); }}>
          <span className="text-2xl">📱</span>
          <div><p className="text-white font-bold text-sm leading-tight">Электроника</p><p className="text-white/70 text-xs mt-0.5">Телефоны, ноутбуки, ТВ</p></div>
        </div>
        <div className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow" style={{ background: "linear-gradient(135deg, #64748b 0%, #475569 100%)" }} onClick={() => { setSelectedCategory("auto"); setSection("categories"); }}>
          <span className="text-2xl">🚗</span>
          <div><p className="text-white font-bold text-sm leading-tight">Запчасти и авто</p><p className="text-white/70 text-xs mt-0.5">Авто и всё для ремонта</p></div>
        </div>
        <div className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow" style={{ background: "linear-gradient(135deg, #f472b6 0%, #ec4899 100%)" }} onClick={() => { setSelectedCategory("animals"); setSection("categories"); }}>
          <span className="text-2xl">🐾</span>
          <div><p className="text-white font-bold text-sm leading-tight">Животные</p><p className="text-white/70 text-xs mt-0.5">Питомцы и аксессуары</p></div>
        </div>
        <div className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow" style={{ background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)" }} onClick={() => { setSelectedCategory("furniture"); setSection("categories"); }}>
          <span className="text-2xl">🛋️</span>
          <div><p className="text-white font-bold text-sm leading-tight">Мебель</p><p className="text-white/70 text-xs mt-0.5">Для дома и офиса</p></div>
        </div>
        <div className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow" style={{ background: "linear-gradient(135deg, #fb7185 0%, #e11d48 100%)" }} onClick={() => { setSelectedCategory("clothes"); setSection("categories"); }}>
          <span className="text-2xl">👗</span>
          <div><p className="text-white font-bold text-sm leading-tight">Одежда</p><p className="text-white/70 text-xs mt-0.5">Стиль по выгодной цене</p></div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border p-4 mb-8 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 text-sm bg-[hsl(var(--muted))] rounded-lg border-0 outline-none flex-1 min-w-[140px] text-[hsl(var(--foreground))]">
            <option value="all">Все категории</option>
            {(dbCategories.length > 0 ? dbCategories.map((c) => ({ id: String(c.id), label: c.name })) : FALLBACK_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))).map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="px-3 py-2 text-sm bg-[hsl(var(--muted))] rounded-lg border-0 outline-none flex-1 min-w-[120px] text-[hsl(var(--foreground))]">
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setFiltersOpen(!filtersOpen)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${filtersOpen ? "border-[hsl(var(--accent))] text-[hsl(var(--accent))] bg-orange-50" : "border-border text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--accent))]"}`}>
            <Icon name="SlidersHorizontal" size={14} />
            Фильтры
          </button>
        </div>
        {filtersOpen && (
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-3 animate-fade-in">
            <span className="text-sm text-[hsl(var(--muted-foreground))] shrink-0">Цена:</span>
            <input type="number" placeholder="от" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} className="w-24 px-3 py-2 text-sm bg-[hsl(var(--muted))] rounded-lg border-0 outline-none" />
            <span className="text-sm text-[hsl(var(--muted-foreground))]">—</span>
            <input type="number" placeholder="до" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} className="w-24 px-3 py-2 text-sm bg-[hsl(var(--muted))] rounded-lg border-0 outline-none" />
            <span className="text-sm text-[hsl(var(--muted-foreground))]">₽</span>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="px-3 py-2 text-sm bg-[hsl(var(--muted))] rounded-lg border-0 outline-none text-[hsl(var(--foreground))]">
              <option value="all">Любое состояние</option>
              <option value="новый">Новый</option>
              <option value="отличное">Отличное</option>
              <option value="хорошее">Хорошее</option>
            </select>
            <button onClick={() => { setPriceFrom(""); setPriceTo(""); setCondition("all"); setSelectedCategory("all"); setSelectedCity("Все города"); }} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] underline transition-colors">Сбросить</button>
          </div>
        )}
      </div>

      {/* Основной контент + правая панель */}
      <div className="flex gap-6 items-start">
        {/* Список объявлений */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Показано <span className="font-semibold text-[hsl(var(--foreground))]">{filteredAds.length}</span> из <span className="font-semibold text-[hsl(var(--foreground))]">{adsTotal || filteredAds.length}</span> объявлений
            </p>
          </div>
          {adsLoading ? (
            <div className="text-center py-20 text-[hsl(var(--muted-foreground))]"><div className="text-5xl mb-4">⏳</div><p>Загрузка...</p></div>
          ) : filteredAds.length === 0 ? (
            <div className="text-center py-20 text-[hsl(var(--muted-foreground))]"><div className="text-5xl mb-4">🔍</div><p className="font-medium">Объявления не найдены</p><p className="text-sm mt-1">Попробуйте изменить параметры поиска</p></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredAds.map((ad) => {
                const photos = (ad.photos && ad.photos.length > 0) ? ad.photos.slice(0, 5) : [];
                const idx = carouselIndex[ad.id] ?? 0;
                return (
                  <div key={ad.id} className="bg-white rounded-xl border border-border overflow-hidden hover-lift cursor-pointer group" onClick={() => setViewAdId(ad.id)}>
                    <div className="aspect-[4/3] bg-[hsl(var(--muted))] relative overflow-hidden">
                      {photos.length > 0 ? (
                        <>
                          <img src={photos[idx]} alt={ad.title} className="w-full h-full object-cover transition-opacity duration-200" />
                          {photos.length > 1 && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setCarouselIndex((p) => ({ ...p, [ad.id]: (idx - 1 + photos.length) % photos.length })); }} className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="ChevronLeft" size={13} className="text-white" /></button>
                              <button onClick={(e) => { e.stopPropagation(); setCarouselIndex((p) => ({ ...p, [ad.id]: (idx + 1) % photos.length })); }} className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="ChevronRight" size={13} className="text-white" /></button>
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                {photos.map((_, i) => (<button key={i} onClick={(e) => { e.stopPropagation(); setCarouselIndex((p) => ({ ...p, [ad.id]: i })); }} className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/50"}`} />))}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">{ad.image || "📦"}</div>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); openAddToFolder(ad.id); }} className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-110 ${favorites.includes(ad.id) ? "bg-[hsl(var(--accent))]" : "bg-white"}`}>
                        <Icon name="Heart" size={13} className={favorites.includes(ad.id) ? "text-white" : "text-[hsl(var(--accent))]"} />
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-[hsl(var(--foreground))] text-sm leading-tight mb-1 line-clamp-2">{ad.title}</p>
                      <p className="text-[hsl(var(--accent))] font-bold text-base">{formatPrice(ad.price)}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1"><Icon name="MapPin" size={10} />{ad.city}</span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{ad.date}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Кнопка «Показать ещё» */}
          {hasMore && !adsLoading && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={onLoadMore}
                disabled={adsLoadingMore}
                className="px-8 py-2.5 rounded-xl border border-border text-sm font-medium text-[hsl(var(--foreground))] hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))] transition-colors disabled:opacity-60"
              >
                {adsLoadingMore ? "Загрузка..." : `Показать ещё ${adsPerPage ? adsPerPage : ""}`}
              </button>
            </div>
          )}
        </div>

        {/* Правая панель */}
        <aside className="hidden lg:flex flex-col gap-4 w-72 shrink-0">
          <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(235 70% 65%) 100%)" }}>
            <p className="font-bold text-lg leading-tight mb-1">Подай объявление</p>
            <p className="text-white/80 text-sm mb-4">Бесплатно и за 2 минуты</p>
            <button onClick={openNewAd} className="w-full bg-white text-[hsl(var(--primary))] font-bold py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity">Подать объявление</button>
          </div>
          <div className="bg-white rounded-2xl border border-border p-5">
            <p className="font-bold mb-3">Популярные категории</p>
            <div className="flex flex-col gap-1">
              {(dbCategories.length > 0 ? dbCategories.slice(0, 6).map((c) => ({ id: String(c.id), label: c.name, icon: c.icon || "Tag", count: c.ads_count })) : FALLBACK_CATEGORIES.slice(0, 6)).map((cat) => (
                <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); }} className="flex items-center justify-between px-3 py-2 rounded-xl text-sm hover:bg-[hsl(var(--muted))] transition-colors text-left">
                  <span className="flex items-center gap-2"><Icon name={cat.icon as "Home"} size={14} className="text-[hsl(var(--accent))]" />{cat.label}</span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">{cat.count.toLocaleString("ru")}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-border p-5">
            <p className="font-bold mb-2">Советы по безопасности</p>
            <ul className="flex flex-col gap-2 text-sm text-[hsl(var(--muted-foreground))]">
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Встречайтесь в публичных местах</li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Проверяйте товар перед оплатой</li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Не переводите предоплату незнакомцам</li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Сохраняйте переписку</li>
            </ul>
          </div>
          <div className="bg-white rounded-2xl border border-border p-5">
            <p className="font-bold mb-3">Сегодня на платформе</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[hsl(var(--muted))] rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-[hsl(var(--accent))]">{apiAds.length}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">объявлений</p>
              </div>
              <div className="bg-[hsl(var(--muted))] rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-[hsl(var(--accent))]">{dbCategories.length || FALLBACK_CATEGORIES.length}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">категорий</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── CategoriesSection ────────────────────────────────────────────────────────
interface CategoriesSectionProps {
  dbCategories: DbCategory[];
  setSelectedCategory: (v: string) => void;
  setSection: (v: string) => void;
}

export function CategoriesSection({ dbCategories, setSelectedCategory, setSection }: CategoriesSectionProps) {
  return (
    <div className="animate-slide-up">
      <h2 className="text-2xl font-bold mb-2">Категории</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-8">Выберите раздел для поиска</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(dbCategories.length > 0
          ? dbCategories.map((c) => ({ id: String(c.id), label: c.name, icon: c.icon || "Tag", count: c.ads_count }))
          : FALLBACK_CATEGORIES
        ).map((cat, i) => (
          <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); setSection("home"); }} className="bg-white rounded-2xl border border-border p-6 flex flex-col items-center gap-3 hover-lift text-center group" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="w-12 h-12 bg-[hsl(var(--muted))] rounded-xl flex items-center justify-center group-hover:bg-[hsl(var(--accent))] transition-colors">
              <Icon name={cat.icon as "Home"} size={22} className="text-[hsl(var(--foreground))] group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-semibold text-sm text-[hsl(var(--foreground))]">{cat.label}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{cat.count.toLocaleString()} объявлений</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── MyAdsSection ─────────────────────────────────────────────────────────────
interface MyAdsSectionProps {
  user: User | null;
  myAdsApi: Ad[];
  myAdsFolders: FavFolder[];
  myAdsFilterFolder: number | null;
  setMyAdsFilterFolder: (v: number | null) => void;
  myAdsFolderMap: Record<number, number[]>;
  myAdsCreatingFolder: boolean;
  setMyAdsCreatingFolder: (v: boolean) => void;
  myAdsNewFolderName: string;
  setMyAdsNewFolderName: (v: string) => void;
  myAdsPickerAdId: number | null;
  setMyAdsPickerAdId: (v: number | null) => void;
  openNewAd: () => void;
  openAuth: (mode: "login" | "register") => void;
  setEditAdId: (v: number) => void;
  setViewAdId: (v: number) => void;
  toggleAdStatus: (id: number, status: string) => void;
  createMyAdsFolder: () => void;
  deleteMyAdsFolder: (id: number) => void;
  toggleAdInMyAdsFolder: (folderId: number, adId: number) => void;
  loadMyAdsFolders: () => void;
}

export function MyAdsSection({
  user, myAdsApi, myAdsFolders, myAdsFilterFolder, setMyAdsFilterFolder,
  myAdsFolderMap, myAdsCreatingFolder, setMyAdsCreatingFolder,
  myAdsNewFolderName, setMyAdsNewFolderName, myAdsPickerAdId, setMyAdsPickerAdId,
  openNewAd, openAuth, setEditAdId, setViewAdId, toggleAdStatus,
  createMyAdsFolder, deleteMyAdsFolder, toggleAdInMyAdsFolder, loadMyAdsFolders,
}: MyAdsSectionProps) {
  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Мои объявления</h2>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">Управляйте своими публикациями</p>
        </div>
        <button onClick={openNewAd} className="flex items-center gap-2 bg-[hsl(var(--accent))] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={15} />Подать объявление
        </button>
      </div>

      {!user && (
        <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
          <div className="text-5xl mb-4">🔐</div>
          <p className="font-medium">Войдите, чтобы управлять объявлениями</p>
          <div className="flex gap-2 justify-center mt-4">
            <button onClick={() => openAuth("login")} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">Войти</button>
          </div>
        </div>
      )}

      {user && (
        <>
          {/* Фильтр по папкам */}
          <div className="flex gap-2 flex-wrap mb-5 items-center">
            <button onClick={() => setMyAdsFilterFolder(null)} className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${myAdsFilterFolder === null ? "border-[hsl(var(--accent))] bg-orange-50 text-[hsl(var(--accent))]" : "border-border hover:border-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]"}`}>Все</button>
            {myAdsFolders.map((f) => (
              <div key={f.id} className="relative group/folder flex items-center">
                <button onClick={() => setMyAdsFilterFolder(f.id)} className={`flex items-center gap-1.5 pl-3 pr-7 py-1.5 rounded-xl text-sm font-medium border transition-all ${myAdsFilterFolder === f.id ? "border-[hsl(var(--accent))] bg-orange-50 text-[hsl(var(--accent))]" : "border-border hover:border-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]"}`}>
                  <Icon name="Folder" size={13} />{f.name}<span className="text-xs opacity-70">{f.count}</span>
                </button>
                <button onClick={() => deleteMyAdsFolder(f.id)} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center opacity-0 group-hover/folder:opacity-100 transition-opacity"><Icon name="X" size={9} /></button>
              </div>
            ))}
            {myAdsCreatingFolder ? (
              <div className="flex items-center gap-1.5">
                <input autoFocus value={myAdsNewFolderName} onChange={(e) => setMyAdsNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createMyAdsFolder(); if (e.key === "Escape") setMyAdsCreatingFolder(false); }} placeholder="Название" className="px-3 py-1.5 rounded-xl text-sm border border-[hsl(var(--accent))] outline-none w-32" />
                <button onClick={createMyAdsFolder} className="p-1.5 rounded-lg bg-[hsl(var(--accent))] text-white hover:opacity-90"><Icon name="Check" size={13} /></button>
                <button onClick={() => setMyAdsCreatingFolder(false)} className="p-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))]"><Icon name="X" size={13} /></button>
              </div>
            ) : (
              <button onClick={() => { setMyAdsNewFolderName(""); setMyAdsCreatingFolder(true); }} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium border border-dashed border-border hover:border-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))] transition-all"><Icon name="FolderPlus" size={13} />Папка</button>
            )}
          </div>

          {(() => {
            const filtered = myAdsFilterFolder === null ? myAdsApi : myAdsApi.filter((ad) => (myAdsFolderMap[ad.id] || []).includes(myAdsFilterFolder));
            if (filtered.length === 0) {
              return (
                <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
                  <div className="text-5xl mb-4">{myAdsFilterFolder ? "📂" : "📋"}</div>
                  <p className="font-medium">{myAdsFilterFolder ? `В папке «${myAdsFolders.find((f) => f.id === myAdsFilterFolder)?.name}» нет объявлений` : "У вас пока нет объявлений"}</p>
                  {!myAdsFilterFolder && (<button onClick={openNewAd} className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">Подать первое объявление</button>)}
                </div>
              );
            }
            return (
              <div className="flex flex-col gap-3">
                {filtered.map((ad) => {
                  const adFolders = (myAdsFolderMap[ad.id] || []).map((fid) => myAdsFolders.find((f) => f.id === fid)).filter(Boolean) as FavFolder[];
                  return (
                    <div key={ad.id} className="bg-white rounded-xl border border-border p-4 flex items-center gap-4">
                      <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-2xl">
                        {ad.photos && ad.photos.length > 0 ? <img src={ad.photos[0]} alt={ad.title} className="w-full h-full object-cover" /> : "📦"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{ad.title}</p>
                        <p className="text-[hsl(var(--accent))] font-bold mt-0.5">{formatPrice(ad.price)}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ad.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{ad.status === "active" ? "Активно" : "В архиве"}</span>
                          <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1"><Icon name="Eye" size={11} />{ad.views ?? 0}</span>
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">{ad.date}</span>
                          {adFolders.map((f) => (<span key={f.id} className="flex items-center gap-1 text-xs bg-orange-50 text-[hsl(var(--accent))] px-2 py-0.5 rounded-full"><Icon name="Folder" size={10} />{f.name}</span>))}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setEditAdId(ad.id)} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors" title="Редактировать"><Icon name="Pencil" size={15} className="text-[hsl(var(--muted-foreground))]" /></button>
                        <button onClick={() => { loadMyAdsFolders(); setMyAdsPickerAdId(ad.id); }} className="p-2 rounded-lg hover:bg-orange-50 transition-colors" title="Добавить в папку"><Icon name="FolderPlus" size={15} className="text-[hsl(var(--accent))]" /></button>
                        <button onClick={() => toggleAdStatus(ad.id, ad.status || "active")} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors" title={ad.status === "active" ? "В архив" : "Активировать"}><Icon name={ad.status === "active" ? "Archive" : "RefreshCw"} size={15} className="text-[hsl(var(--muted-foreground))]" /></button>
                        <button onClick={() => setViewAdId(ad.id)} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors" title="Смотреть"><Icon name="Eye" size={15} className="text-[hsl(var(--muted-foreground))]" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Picker: добавить объявление в папку my_ads */}
          {myAdsPickerAdId !== null && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMyAdsPickerAdId(null)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
                <button onClick={() => setMyAdsPickerAdId(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[hsl(var(--muted))]"><Icon name="X" size={16} /></button>
                <h3 className="font-bold text-lg mb-1">Добавить в папку</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Папки «Мои объявления»</p>
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto mb-3">
                  {myAdsFolders.map((f) => (
                    <button key={f.id} onClick={() => toggleAdInMyAdsFolder(f.id, myAdsPickerAdId)} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${(myAdsFolderMap[myAdsPickerAdId] || []).includes(f.id) ? "border-[hsl(var(--accent))] bg-orange-50 text-[hsl(var(--accent))]" : "border-border hover:border-[hsl(var(--accent))]"}`}>
                      <Icon name={(myAdsFolderMap[myAdsPickerAdId] || []).includes(f.id) ? "CheckSquare" : "Square"} size={16} />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-xs opacity-60">{f.count}</span>
                    </button>
                  ))}
                  {myAdsFolders.length === 0 && (<p className="text-sm text-center text-[hsl(var(--muted-foreground))] py-4">Нет папок — создайте первую</p>)}
                </div>
                <div className="flex gap-2">
                  <input placeholder="Новая папка..." value={myAdsNewFolderName} onChange={(e) => setMyAdsNewFolderName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createMyAdsFolder()} className="flex-1 px-3 py-2.5 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0" />
                  <button onClick={createMyAdsFolder} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">Создать</button>
                </div>
                <button onClick={() => setMyAdsPickerAdId(null)} className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">Готово</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── MessagesSection ──────────────────────────────────────────────────────────
export function MessagesSection() {
  return (
    <div className="animate-slide-up max-w-2xl">
      <h2 className="text-2xl font-bold mb-2">Сообщения</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-8">Переписка с покупателями и продавцами</p>
      <div className="flex flex-col gap-2">
        {MESSAGES.map((msg) => (
          <button key={msg.id} className="bg-white rounded-xl border border-border p-4 flex items-center gap-4 hover:border-[hsl(var(--accent))] transition-colors text-left">
            <div className="w-12 h-12 bg-[hsl(var(--accent))] rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">{msg.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-sm">{msg.name}</p>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{msg.time}</span>
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))] truncate">{msg.text}</p>
            </div>
            {msg.unread > 0 && (<span className="w-5 h-5 bg-[hsl(var(--accent))] text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">{msg.unread}</span>)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── FavoritesSection ─────────────────────────────────────────────────────────
interface FavoritesSectionProps {
  user: User | null;
  favFolders: FavFolder[];
  activeFolderId: number | null;
  setActiveFolderId: (v: number | null) => void;
  folderAds: Ad[];
  setFolderAds: (v: Ad[]) => void;
  folderAdsLoading: boolean;
  newFolderModal: boolean;
  setNewFolderModal: (v: boolean) => void;
  newFolderName: string;
  setNewFolderName: (v: string) => void;
  renamingFolder: FavFolder | null;
  setRenamingFolder: (v: FavFolder | null) => void;
  renameName: string;
  setRenameName: (v: string) => void;
  adFolderIds: number[];
  addToFolderAdId: number | null;
  setAddToFolderAdId: (v: number | null) => void;
  openAuth: (mode: "login" | "register") => void;
  loadFolderAds: (id: number) => void;
  createFolder: () => void;
  renameFolder: () => void;
  deleteFolder: (id: number) => void;
  toggleAdInFolder: (folderId: number, adId: number) => void;
  setViewAdId: (v: number) => void;
  openAddToFolder: (id: number) => void;
  favorites: number[];
}

export function FavoritesSection({
  user, favFolders, activeFolderId, setActiveFolderId, folderAds, setFolderAds,
  folderAdsLoading, newFolderModal, setNewFolderModal, newFolderName, setNewFolderName,
  renamingFolder, setRenamingFolder, renameName, setRenameName,
  adFolderIds, addToFolderAdId, setAddToFolderAdId,
  openAuth, loadFolderAds, createFolder, renameFolder, deleteFolder,
  toggleAdInFolder, setViewAdId, openAddToFolder, favorites,
}: FavoritesSectionProps) {
  return (
    <div className="animate-slide-up">
      {!user ? (
        <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">
          <div className="text-5xl mb-4">🤍</div>
          <p className="font-medium">Войдите, чтобы сохранять объявления</p>
          <div className="flex gap-2 justify-center mt-4">
            <button onClick={() => openAuth("login")} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">Войти</button>
          </div>
        </div>
      ) : activeFolderId !== null ? (
        <>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setActiveFolderId(null); setFolderAds([]); }} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"><Icon name="ArrowLeft" size={18} /></button>
            <div>
              <h2 className="text-xl font-bold">{favFolders.find((f) => f.id === activeFolderId)?.name}</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{folderAds.length} объявлений</p>
            </div>
          </div>
          {folderAdsLoading ? (
            <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">Загрузка...</div>
          ) : folderAds.length === 0 ? (
            <div className="text-center py-16 text-[hsl(var(--muted-foreground))]"><div className="text-5xl mb-3">📂</div><p className="font-medium">Папка пуста</p><p className="text-sm mt-1">Добавляйте объявления через кнопку ♥ в карточке</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {folderAds.map((ad) => (
                <div key={ad.id} className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group" onClick={() => setViewAdId(ad.id)}>
                  <div className="aspect-[16/9] bg-[hsl(var(--muted))] relative overflow-hidden">
                    {(ad.photos && ad.photos.length > 0) ? <img src={ad.photos[0]} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>}
                    <button onClick={(e) => { e.stopPropagation(); openAddToFolder(ad.id); }} className="absolute top-2.5 right-2.5 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow transition-transform hover:scale-110"><Icon name="Heart" size={14} className="text-red-500 fill-red-500" /></button>
                    {ad.photos && ad.photos.length > 1 && (<span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">+{ad.photos.length - 1}</span>)}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-[hsl(var(--foreground))] text-sm leading-snug mb-2 line-clamp-2">{ad.title}</p>
                    <p className="text-[hsl(var(--accent))] font-bold text-lg leading-none mb-3">{formatPrice(ad.price)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1"><Icon name="MapPin" size={10} />{ad.city}</span>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">{ad.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-5">
            <div><h2 className="text-2xl font-bold">Избранное</h2><p className="text-[hsl(var(--muted-foreground))] mt-0.5 text-sm">{favFolders.length} папок</p></div>
          </div>
          <div className="flex gap-2 flex-wrap mb-6 items-center">
            {favFolders.map((folder) => (
              <div key={folder.id} className="relative group/chip flex items-center">
                <button onClick={() => { setActiveFolderId(folder.id); loadFolderAds(folder.id); }} className="flex items-center gap-1.5 pl-3 pr-7 py-1.5 rounded-xl text-sm font-medium border border-border hover:border-[hsl(var(--accent))] text-[hsl(var(--foreground))] transition-all">
                  <Icon name="Folder" size={13} className="text-[hsl(var(--accent))]" />{folder.name}<span className="text-xs opacity-60">{folder.count}</span>
                </button>
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover/chip:opacity-100 transition-opacity">
                  <button onClick={() => { setRenamingFolder(folder); setRenameName(folder.name); }} className="w-4 h-4 rounded-full bg-gray-100 hover:bg-orange-100 hover:text-[hsl(var(--accent))] flex items-center justify-center" title="Переименовать"><Icon name="Pencil" size={8} /></button>
                  <button onClick={() => deleteFolder(folder.id)} className="w-4 h-4 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center" title="Удалить"><Icon name="X" size={8} /></button>
                </div>
              </div>
            ))}
            {newFolderModal ? (
              <div className="flex items-center gap-1.5">
                <input autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setNewFolderModal(false); }} placeholder="Название" className="px-3 py-1.5 rounded-xl text-sm border border-[hsl(var(--accent))] outline-none w-32" />
                <button onClick={createFolder} className="p-1.5 rounded-lg bg-[hsl(var(--accent))] text-white hover:opacity-90"><Icon name="Check" size={13} /></button>
                <button onClick={() => setNewFolderModal(false)} className="p-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))]"><Icon name="X" size={13} /></button>
              </div>
            ) : (
              <button onClick={() => { setNewFolderName(""); setNewFolderModal(true); }} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium border border-dashed border-border hover:border-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))] transition-all"><Icon name="FolderPlus" size={13} />Папка</button>
            )}
          </div>
          {favFolders.length === 0 && !newFolderModal && (<div className="text-center py-20 text-[hsl(var(--muted-foreground))]"><div className="text-5xl mb-4">📁</div><p className="font-medium">Нет папок</p><p className="text-sm mt-1">Нажмите «Папка», чтобы создать первую</p></div>)}
        </>
      )}

      {/* Модал: переименование */}
      {renamingFolder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRenamingFolder(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
            <h3 className="font-bold text-lg mb-4">Переименовать папку</h3>
            <input autoFocus value={renameName} onChange={(e) => setRenameName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && renameFolder()} className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm mb-4 border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]" />
            <div className="flex gap-2">
              <button onClick={() => setRenamingFolder(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium">Отмена</button>
              <button onClick={renameFolder} className="flex-1 py-2.5 rounded-xl bg-[hsl(var(--accent))] text-white text-sm font-semibold hover:opacity-90">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* Глобальный модал: добавить объявление в папку избранного */}
      {addToFolderAdId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAddToFolderAdId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
            <button onClick={() => setAddToFolderAdId(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[hsl(var(--muted))]"><Icon name="X" size={16} /></button>
            <h3 className="font-bold text-lg mb-1">Сохранить в избранное</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Выберите папки</p>
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto mb-3">
              {favFolders.length === 0 && (<p className="text-sm text-center text-[hsl(var(--muted-foreground))] py-3">Нет папок — создайте первую ниже</p>)}
              {favFolders.map((f) => (
                <button key={f.id} onClick={() => toggleAdInFolder(f.id, addToFolderAdId)} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${adFolderIds.includes(f.id) ? "border-[hsl(var(--accent))] bg-orange-50 text-[hsl(var(--accent))]" : "border-border hover:border-[hsl(var(--accent))]"}`}>
                  <Icon name={adFolderIds.includes(f.id) ? "CheckSquare" : "Square"} size={16} />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">{f.count}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <input placeholder="Новая папка..." value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createFolder()} className="flex-1 px-3 py-2.5 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0" />
              <button onClick={createFolder} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">+</button>
            </div>
            <button onClick={() => setAddToFolderAdId(null)} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">Готово</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ProfileSection ───────────────────────────────────────────────────────────
interface ProfileSectionProps {
  user: User | null;
  myAdsApi: Ad[];
  coverPhoto: string | null;
  setCoverPhoto: (v: string | null) => void;
  profileTab: "ads" | "settings";
  setProfileTab: (v: "ads" | "settings") => void;
  editProfileOpen: boolean;
  setEditProfileOpen: (v: boolean) => void;
  editName: string;
  setEditName: (v: string) => void;
  editCity: string;
  setEditCity: (v: string) => void;
  editAbout: string;
  setEditAbout: (v: string) => void;
  editSaving: boolean;
  setUser: (v: User | ((prev: User | null) => User | null)) => void;
  openAuth: (mode: "login" | "register") => void;
  openNewAd: () => void;
  setViewAdId: (v: number) => void;
  setEditAdId: (v: number) => void;
  toggleAdStatus: (id: number, status: string) => void;
  saveProfile: () => void;
  uploadPhoto: (file: File, type: "avatar" | "cover") => Promise<string>;
  logout: () => void;
  setSection: (v: string) => void;
}

export function ProfileSection({
  user, myAdsApi, coverPhoto, setCoverPhoto, profileTab, setProfileTab,
  editProfileOpen, setEditProfileOpen, editName, setEditName, editCity, setEditCity,
  editAbout, setEditAbout, editSaving, setUser,
  openAuth, openNewAd, setViewAdId, setEditAdId, toggleAdStatus, saveProfile, uploadPhoto, logout, setSection,
}: ProfileSectionProps) {
  return (
    <div className="animate-slide-up -mx-4 -mt-8">
      {!user && (
        <div className="max-w-md mx-auto mt-16 px-4">
          <div className="bg-white rounded-2xl border border-border p-8 text-center">
            <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center mx-auto mb-4"><Icon name="User" size={28} className="text-[hsl(var(--muted-foreground))]" /></div>
            <p className="font-semibold mb-1">Вы не авторизованы</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Войдите, чтобы управлять профилем</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => openAuth("login")} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-[hsl(var(--muted))] transition-colors">Войти</button>
              <button onClick={() => openAuth("register")} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">Регистрация</button>
            </div>
          </div>
        </div>
      )}
      {user && (
        <>
          {/* Обложка — стиль NobleUI */}
          <div className="relative w-full h-52 md:h-64 bg-gradient-to-br from-[hsl(var(--primary))] to-blue-400">
            {(user.cover_url || coverPhoto) && (<img src={user.cover_url || coverPhoto || ""} alt="обложка" className="w-full h-full object-cover" />)}
            <label className="absolute top-3 right-3 cursor-pointer z-10">
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-black/60 transition-colors"><Icon name="Camera" size={13} />Обложка</div>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setCoverPhoto(URL.createObjectURL(f)); const url = await uploadPhoto(f, "cover"); setUser((prev) => prev ? { ...prev, cover_url: url } : prev); }} />
            </label>
          </div>

          {/* Панель: аватар + имя + кнопки — как в NobleUI */}
          <div className="bg-white px-6 pb-4 pt-0 flex flex-wrap items-end justify-between gap-4 border-b border-border">
            <div className="flex items-end gap-4">
              <label className="cursor-pointer group/av shrink-0">
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white bg-[hsl(var(--primary))] flex items-center justify-center text-white text-2xl font-bold shadow-md overflow-hidden -mt-12 md:-mt-14">
                  {user.avatar_url ? <img src={user.avatar_url} alt="аватар" className="w-full h-full object-cover" /> : user.name[0].toUpperCase()}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/av:opacity-100 transition-opacity flex items-center justify-center"><Icon name="Camera" size={18} className="text-white" /></div>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadPhoto(f, "avatar"); setUser((prev) => prev ? { ...prev, avatar_url: url } : prev); }} />
              </label>
              <div className="pb-2">
                <h2 className="font-bold text-lg leading-tight">{user.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Онлайн</span>
                  {user.city && <><span className="text-[hsl(var(--muted-foreground))]">·</span><span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-0.5"><Icon name="MapPin" size={11} />{user.city}</span></>}
                </div>
              </div>
            </div>
            <button
              onClick={() => setEditProfileOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--primary))] text-white text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
            >
              <Icon name="Pencil" size={15} />
              Редактировать профиль
            </button>
          </div>

          {/* Горизонтальные табы — стиль NobleUI */}
          <div className="flex bg-white border-b border-border px-4 overflow-x-auto">
            {([["ads", "Объявления", "Tag"], ["settings", "Настройки", "Settings"]] as const).map(([tab, label, icon]) => (
              <button key={tab} onClick={() => setProfileTab(tab as "ads" | "settings")}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  profileTab === tab
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}>
                <Icon name={icon} size={15} />{label}
              </button>
            ))}
          </div>

          {/* Контент профиля */}
          <div className="flex gap-6 px-4 pt-6 pb-24 md:pb-8 max-w-6xl mx-auto">
            <aside className="w-64 shrink-0 hidden md:flex flex-col gap-3">
              <div className="bg-white rounded-2xl border border-border p-4">
                <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-3 px-1">Аккаунт</p>
                <button onClick={() => { setEditName(user.name); setEditCity(user.city || ""); setEditAbout(user.about || ""); setEditProfileOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors text-left"><Icon name="UserCog" size={17} className="text-[hsl(var(--muted-foreground))]" /><span className="text-sm font-medium">Редактировать профиль</span></button>
                {[{ icon: "Bell", label: "Уведомления" }, { icon: "Shield", label: "Безопасность" }].map((item) => (
                  <button key={item.label} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors text-left"><Icon name={item.icon} size={17} className="text-[hsl(var(--muted-foreground))]" /><span className="text-sm font-medium">{item.label}</span></button>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-border p-4">
                <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2 px-1">Контакты</p>
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]"><Icon name="Mail" size={15} /><span className="truncate">{user.email}</span></div>
                {user.city && (<div className="flex items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]"><Icon name="MapPin" size={15} /><span>{user.city}</span></div>)}
              </div>
              <button onClick={logout} className="w-full py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors border border-red-100 flex items-center justify-center gap-2"><Icon name="LogOut" size={15} />Выйти</button>
            </aside>

            <div className="flex-1 min-w-0">
              {profileTab === "ads" && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Мои объявления</h3>
                    <button onClick={openNewAd} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(var(--accent))] text-white text-sm font-semibold hover:opacity-90 transition-opacity"><Icon name="Plus" size={15} />Добавить</button>
                  </div>
                  {myAdsApi.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-border p-12 text-center text-[hsl(var(--muted-foreground))]">
                      <div className="text-5xl mb-4">📋</div><p className="font-medium mb-1">Нет объявлений</p><p className="text-sm mb-4">Разместите первое объявление прямо сейчас</p>
                      <button onClick={openNewAd} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">Подать объявление</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {myAdsApi.map((ad) => (
                        <div key={ad.id} className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group" onClick={() => setViewAdId(ad.id)}>
                          <div className="aspect-[16/9] bg-[hsl(var(--muted))] relative overflow-hidden">
                            {ad.photos && ad.photos.length > 0 ? <img src={ad.photos[0]} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>}
                            <span className={`absolute top-2.5 left-2.5 text-xs px-2 py-0.5 rounded-full font-medium ${ad.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{ad.status === "active" ? "Активно" : "В архиве"}</span>
                          </div>
                          <div className="p-4">
                            <p className="font-semibold text-sm leading-snug mb-1 line-clamp-2">{ad.title}</p>
                            <p className="text-[hsl(var(--accent))] font-bold text-base mb-2">{formatPrice(ad.price)}</p>
                            <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
                              <span className="flex items-center gap-1"><Icon name="Eye" size={11} />{ad.views ?? 0} просмотров</span>
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => setEditAdId(ad.id)} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors" title="Редактировать"><Icon name="Pencil" size={13} className="text-[hsl(var(--muted-foreground))]" /></button>
                                <button onClick={() => toggleAdStatus(ad.id, ad.status || "active")} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors" title={ad.status === "active" ? "В архив" : "Активировать"}><Icon name={ad.status === "active" ? "Archive" : "RefreshCw"} size={13} className="text-[hsl(var(--muted-foreground))]" /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {profileTab === "settings" && (
                <div className="bg-white rounded-2xl border border-border p-6">
                  <h3 className="font-bold text-lg mb-6">Настройки профиля</h3>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => { setEditName(user.name); setEditCity(user.city || ""); setEditAbout(user.about || ""); setEditProfileOpen(true); }} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors text-left">
                      <div className="flex items-center gap-3"><Icon name="User" size={18} className="text-[hsl(var(--muted-foreground))]" /><span className="text-sm font-medium">Личные данные</span></div>
                      <Icon name="ChevronRight" size={16} className="text-[hsl(var(--muted-foreground))]" />
                    </button>
                    {[{ icon: "Bell", label: "Уведомления" }, { icon: "Shield", label: "Безопасность" }, { icon: "Lock", label: "Конфиденциальность" }].map((item) => (
                      <button key={item.label} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors text-left">
                        <div className="flex items-center gap-3"><Icon name={item.icon} size={18} className="text-[hsl(var(--muted-foreground))]" /><span className="text-sm font-medium">{item.label}</span></div>
                        <Icon name="ChevronRight" size={16} className="text-[hsl(var(--muted-foreground))]" />
                      </button>
                    ))}
                    <div className="mt-4 pt-4 border-t border-border">
                      <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 transition-colors text-left w-full"><Icon name="LogOut" size={18} /><span className="text-sm font-medium">Выйти из аккаунта</span></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Модал редактирования профиля */}
          {editProfileOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h3 className="font-bold text-lg">Редактировать профиль</h3>
                  <button onClick={() => setEditProfileOpen(false)} className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"><Icon name="X" size={18} /></button>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  <div><label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block">Имя</label><input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Ваше имя" className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]" /></div>
                  <div><label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block">Город</label><input value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="Ваш город" className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]" /></div>
                  <div><label className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-1.5 block">О себе</label><textarea value={editAbout} onChange={(e) => setEditAbout(e.target.value)} placeholder="Расскажите о себе..." rows={3} className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] resize-none" /></div>
                </div>
                <div className="flex gap-3 px-6 pb-6">
                  <button onClick={() => setEditProfileOpen(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-[hsl(var(--muted))] transition-colors">Отмена</button>
                  <button onClick={saveProfile} disabled={editSaving || !editName.trim()} className="flex-1 py-2.5 rounded-xl bg-[hsl(var(--accent))] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">{editSaving ? "Сохраняю..." : "Сохранить"}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── ContactsSection ──────────────────────────────────────────────────────────
export function ContactsSection() {
  return (
    <div className="animate-slide-up max-w-xl">
      <h2 className="text-2xl font-bold mb-2">Контакты</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-8">Свяжитесь с нами любым удобным способом</p>
      <div className="grid gap-4 mb-8">
        {[{ icon: "Mail", label: "Email", value: "support@board.ru" }, { icon: "Phone", label: "Телефон", value: "+7 (800) 555-01-01" }, { icon: "MapPin", label: "Адрес", value: "Москва, ул. Примерная, 1" }, { icon: "Clock", label: "Режим работы", value: "Пн–Пт, 9:00–18:00" }].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-border p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-[hsl(var(--muted))] rounded-lg flex items-center justify-center shrink-0"><Icon name={item.icon} size={18} className="text-[hsl(var(--accent))]" /></div>
            <div><p className="text-xs text-[hsl(var(--muted-foreground))]">{item.label}</p><p className="font-medium text-sm mt-0.5">{item.value}</p></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-border p-6">
        <h3 className="font-bold mb-4">Написать нам</h3>
        <div className="flex flex-col gap-3">
          <input placeholder="Ваше имя" className="px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]" />
          <input placeholder="Email" className="px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]" />
          <textarea rows={4} placeholder="Ваше сообщение..." className="px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] resize-none" />
          <button className="bg-[hsl(var(--accent))] text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">Отправить</button>
        </div>
      </div>
    </div>
  );
}