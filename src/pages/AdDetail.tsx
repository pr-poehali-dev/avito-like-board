import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { ADS_URL, CHAT_URL } from "./index/types";

const CATEGORY_LABELS: Record<string, string> = {
  realty: "Недвижимость",
  auto: "Авто",
  electronics: "Электроника",
  clothes: "Одежда",
  furniture: "Мебель",
  services: "Услуги",
  animals: "Животные",
  hobbies: "Хобби",
};

interface AdDetailData {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  city: string;
  condition: string;
  status: string;
  views: number;
  created_at: string;
  photos: string[];
  author_id: number;
  author_name: string;
  author_avatar?: string | null;
  author_ads_count?: number;
  author_reg_date?: string | null;
  phone: string | null;
}

interface AdDetailProps {
  adId: number;
  onBack: () => void;
  onAddToFolder: (adId: number) => void;
  isFavorited?: boolean;
  currentUserId?: number | null;
  onAdLoaded?: (title: string, category: string, categorySlug?: string) => void;
}

function formatPrice(price: number) {
  return price.toLocaleString("ru-RU") + " ₽";
}

export default function AdDetail({ adId, onBack, onAddToFolder, isFavorited = false, currentUserId, onAdLoaded }: AdDetailProps) {
  const navigate = useNavigate();
  const [ad, setAd] = useState<AdDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoIdx, setPhotoIdx] = useState(0);
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${ADS_URL}?action=view&id=${adId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setAd(d.ad);
          onAdLoaded?.(d.ad.title, CATEGORY_LABELS[d.ad.category] || d.ad.category, d.ad.category);
        } else setError(d.error || "Объявление не найдено");
      })
      .catch(() => setError("Нет соединения"))
      .finally(() => setLoading(false));
  }, [adId]);

  const startChat = async () => {
    if (!currentUserId) { toast.error("Войдите, чтобы написать продавцу"); return; }
    if (!ad) return;
    setStartingChat(true);
    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": localStorage.getItem("session_id") || "" },
        body: JSON.stringify({ action: "start_chat", user_id: ad.author_id }),
      });
      const d = await res.json();
      if (d.ok) {
        const params = new URLSearchParams({
          id: String(d.chat_id),
          ad_id: String(ad.id),
          ad_title: ad.title,
          ad_price: String(ad.price),
          ad_photo: ad.photos?.[0] || "",
        });
        navigate(`/chat?${params.toString()}`);
      } else toast.error(d.error || "Ошибка");
    } catch { toast.error("Нет соединения"); } finally { setStartingChat(false); }
  };

  const showPhone = async () => {
    if (phoneVisible) return;
    setPhoneLoading(true);
    try {
      const res = await fetch(`${ADS_URL}?action=view&id=${adId}&show_phone=1`);
      const d = await res.json();
      if (d.ok) { setPhone(d.ad.phone); setPhoneVisible(true); }
    } catch {
      toast.error("Не удалось загрузить номер");
    } finally { setPhoneLoading(false); }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-3">
            <div className="h-8 w-2/3 bg-[hsl(var(--muted))] animate-pulse rounded-lg" />
            <div className="aspect-[4/3] bg-[hsl(var(--muted))] animate-pulse rounded-2xl" />
            <div className="flex gap-2">
              {[1,2,3,4].map(i => <div key={i} className="w-16 h-16 bg-[hsl(var(--muted))] animate-pulse rounded-xl" />)}
            </div>
          </div>
          <div className="lg:w-72 space-y-3">
            <div className="h-32 bg-[hsl(var(--muted))] animate-pulse rounded-2xl" />
            <div className="h-40 bg-[hsl(var(--muted))] animate-pulse rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Icon name="PackageSearch" size={52} className="text-[hsl(var(--muted-foreground))]" />
        <p className="font-medium text-[hsl(var(--foreground))]">{error || "Объявление не найдено"}</p>
        <button onClick={onBack} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90">
          Назад
        </button>
      </div>
    );
  }

  const photos = ad.photos.length > 0 ? ad.photos : [];
  const prev = () => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setPhotoIdx((i) => (i + 1) % photos.length);

  const params = [
    { label: "Категория", value: CATEGORY_LABELS[ad.category] || ad.category },
    { label: "Состояние", value: ad.condition },
    { label: "Город", value: ad.city },
    { label: "Дата публикации", value: ad.created_at },
    { label: "Просмотры", value: String(ad.views) },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      {/* Заголовок */}
      <div className="mb-1">
        <h1 className="text-xl md:text-2xl font-bold leading-tight">{ad.title}</h1>
      </div>

      {/* Мета */}
      <div className="flex flex-wrap items-center gap-3 mb-5 text-xs text-[hsl(var(--muted-foreground))]">
        <span className="flex items-center gap-1"><Icon name="Clock" size={11} />{ad.created_at}</span>
        <span className="flex items-center gap-1"><Icon name="MapPin" size={11} />{ad.city}</span>
        <span className="flex items-center gap-1"><Icon name="Eye" size={11} />{ad.views} просмотров</span>
      </div>

      {/* Основной layout: левая + правая */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── ЛЕВАЯ КОЛОНКА: галерея + инфо ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Галерея */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="relative bg-[hsl(var(--muted))] aspect-[4/3] group">
              {photos.length > 0 ? (
                <>
                  <img src={photos[photoIdx]} alt={ad.title} className="w-full h-full object-cover" />
                  {photos.length > 1 && (
                    <>
                      <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Icon name="ChevronLeft" size={18} className="text-white" />
                      </button>
                      <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Icon name="ChevronRight" size={18} className="text-white" />
                      </button>
                      <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded-lg">
                        {photoIdx + 1} / {photos.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon name="Image" size={52} className="text-[hsl(var(--muted-foreground))]" />
                </div>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {photos.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    className={`shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden border-2 transition-all ${i === photoIdx ? "border-[hsl(var(--accent))] opacity-100" : "border-transparent opacity-55 hover:opacity-90"}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Описание */}
          {ad.description && (
            <div className="bg-white rounded-2xl border border-border p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-3">Описание</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{ad.description}</p>
            </div>
          )}

          {/* Параметры */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-3">Параметры</p>
            <div className="divide-y divide-[hsl(var(--muted))]">
              {params.map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2.5">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">{label}</span>
                  <span className="text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── ПРАВАЯ КОЛОНКА: 3 блока ── */}
        <div className="lg:w-72 shrink-0 flex flex-col gap-3">

          {/* Блок 1: Цена + кнопки */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <p className="text-3xl font-bold mb-1">{formatPrice(ad.price)}</p>
            <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium mt-1 ${ad.condition === "Новый" ? "bg-green-100 text-green-700" : "bg-orange-50 text-[hsl(var(--accent))]"}`}>
              {ad.condition}
            </span>
            <div className="mt-4 flex flex-col gap-2">
              {phoneVisible && phone ? (
                <a href={`tel:${phone}`} className="w-full flex items-center justify-center gap-2 bg-[hsl(var(--accent))] text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                  <Icon name="Phone" size={15} />
                  {phone}
                </a>
              ) : (
                <button onClick={showPhone} disabled={phoneLoading}
                  className="w-full flex items-center justify-center gap-2 bg-[hsl(var(--accent))] text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                  <Icon name="Phone" size={15} />
                  {phoneLoading ? "Загрузка..." : "Показать номер"}
                </button>
              )}
              {ad.author_id !== currentUserId && (
                currentUserId ? (
                  <button onClick={startChat} disabled={startingChat}
                    className="w-full flex items-center justify-center gap-2 border border-[hsl(var(--accent))] text-[hsl(var(--accent))] py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-50 transition-colors disabled:opacity-60">
                    <Icon name="MessageCircle" size={15} />
                    {startingChat ? "Открываю чат..." : "Написать продавцу"}
                  </button>
                ) : (
                  <button onClick={() => toast.info("Войдите, чтобы написать продавцу")}
                    className="w-full flex items-center justify-center gap-2 border border-border py-2.5 rounded-xl text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                    <Icon name="MessageCircle" size={15} />
                    Написать продавцу
                  </button>
                )
              )}
            </div>
          </div>

          {/* Блок 2: Продавец */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-3">Продавец</p>
            <button onClick={() => navigate(`/user/${ad.author_id}`)} className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity mb-3">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-white font-bold text-base shrink-0 overflow-hidden">
                {ad.author_avatar
                  ? <img src={ad.author_avatar} alt="" className="w-full h-full object-cover" />
                  : ad.author_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">{ad.author_name}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Посмотреть профиль →</p>
              </div>
            </button>
            {ad.author_reg_date && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] border-t border-border pt-3 flex items-center gap-1.5">
                <Icon name="Calendar" size={12} />
                Зарегистрирован с {new Date(ad.author_reg_date).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
              </p>
            )}
            {ad.author_ads_count !== undefined && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5 flex items-center gap-1.5">
                <Icon name="Tag" size={12} />
                {ad.author_ads_count} объявлений
              </p>
            )}
          </div>

          {/* Блок 3: Избранное + жалоба — только для не-владельцев */}
          {ad.author_id !== currentUserId && (
            <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-2">
              <button
                onClick={() => onAddToFolder(ad.id)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${isFavorited ? "border-red-300 bg-red-50 text-red-500" : "border-border text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))] hover:bg-orange-50"}`}
              >
                <Icon name="Heart" size={15} className={isFavorited ? "fill-red-500" : ""} />
                {isFavorited ? "В избранном" : "В избранное"}
              </button>
              <button
                onClick={() => toast.info("Жалоба отправлена")}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-border text-[hsl(var(--muted-foreground))] hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <Icon name="Flag" size={15} />
                Пожаловаться
              </button>
            </div>
          )}

        </div>
      </div>

      <div className="pb-8" />
    </div>
  );
}