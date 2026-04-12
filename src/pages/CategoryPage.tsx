import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { ADS_URL, Ad, DbCategory, formatPrice } from "./index/types";

export default function CategoryPage() {
  const { slug, subslug } = useParams<{ slug: string; subslug?: string }>();
  const navigate = useNavigate();

  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState<Record<number, number>>({});

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

  useEffect(() => {
    setAdsLoading(true);
    fetch(ADS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list" }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setAds(d.ads); })
      .catch(() => {})
      .finally(() => setAdsLoading(false));
  }, []);

  const activeSlug = subslug || slug;

  const category = dbCategories.find((c) => c.slug === activeSlug);
  const rootCategory = subslug
    ? dbCategories.find((c) => c.slug === slug)
    : category
      ? (category.parent_id ? dbCategories.find((c) => c.id === category.parent_id) : null)
      : null;

  // Все id текущей категории и её потомков
  const getDescendantIds = (id: number): number[] => {
    const children = dbCategories.filter((c) => c.parent_id === id);
    return [id, ...children.flatMap((c) => getDescendantIds(c.id))];
  };

  const categoryIds = category ? getDescendantIds(category.id) : [];

  const filteredAds = category
    ? ads.filter((ad) => {
        const a = ad as Ad & { category_id?: number };
        return categoryIds.some((id) => {
          const cat = dbCategories.find((c) => c.id === id);
          return a.category_id === id || ad.category === cat?.slug || ad.category === cat?.name;
        });
      })
    : [];

  // Подкатегории текущей категории
  const subCategories = category ? dbCategories.filter((c) => c.parent_id === category.id) : [];

  // Хлебные крошки
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
      {/* Шапка */}
      <header className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
            <Icon name="ChevronLeft" size={18} />
            <span className="text-sm">Назад</span>
          </button>
          <div className="w-px h-5 bg-border" />
          {/* Хлебные крошки */}
          <nav className="flex items-center gap-1 text-sm overflow-hidden">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1 shrink-0">
                {i > 0 && <Icon name="ChevronRight" size={13} className="text-[hsl(var(--muted-foreground))]" />}
                {i < breadcrumbs.length - 1 ? (
                  <Link to={crumb.href} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))] transition-colors truncate max-w-[120px]">
                    {crumb.name}
                  </Link>
                ) : (
                  <span className="font-medium text-[hsl(var(--foreground))] truncate max-w-[200px]">{crumb.name}</span>
                )}
              </span>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Заголовок категории */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">{category?.name}</h1>
          {filteredAds.length > 0 && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{filteredAds.length} объявлений</p>
          )}
        </div>

        {/* Подкатегории */}
        {subCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
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
        ) : filteredAds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Icon name="PackageSearch" size={48} className="text-[hsl(var(--muted-foreground))]" />
            <p className="text-[hsl(var(--muted-foreground))]">В этой категории пока нет объявлений</p>
            <button onClick={() => navigate("/")} className="text-sm text-[hsl(var(--accent))] hover:underline">
              Посмотреть все объявления
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredAds.map((ad) => {
              const photos = ad.photos?.length ? ad.photos : ad.image ? [ad.image] : [];
              const idx = carouselIndex[ad.id] || 0;
              return (
                <div
                  key={ad.id}
                  className="group rounded-xl border border-border bg-white overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/?ad=${ad.id}`)}
                >
                  {/* Фото */}
                  <div className="relative aspect-[4/3] bg-[hsl(var(--muted))] overflow-hidden">
                    {photos.length > 0 ? (
                      <img src={photos[idx]} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[hsl(var(--muted-foreground))]">
                        <Icon name="Image" size={32} />
                      </div>
                    )}
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
                  {/* Инфо */}
                  <div className="p-3">
                    <p className="font-bold text-sm text-[hsl(var(--foreground))]">{formatPrice(ad.price)}</p>
                    <p className="text-sm text-[hsl(var(--foreground))] mt-0.5 line-clamp-2 leading-tight">{ad.title}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">{ad.city} · {ad.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
