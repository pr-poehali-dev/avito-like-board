import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

const ADS_URL = "https://functions.poehali.dev/26941b84-1198-4969-8e13-07523f9f04d0";
const CHAT_URL = "https://functions.poehali.dev/4961a627-e58a-4b80-bafb-720c53fa39f8";

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
  phone: string | null;
}

interface AdDetailProps {
  adId: number;
  onBack: () => void;
  onAddToFolder: (adId: number) => void;
  isFavorited?: boolean;
  currentUserId?: number | null;
}

function formatPrice(price: number) {
  return price.toLocaleString("ru-RU") + " ₽";
}

export default function AdDetail({ adId, onBack, onAddToFolder, isFavorited = false, currentUserId }: AdDetailProps) {
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
        if (d.ok) setAd(d.ad);
        else setError(d.error || "Объявление не найдено");
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
        // Передаём данные объявления через URL-параметры
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
      if (d.ok) {
        setPhone(d.ad.phone);
        setPhoneVisible(true);
      }
    } catch {
      toast.error("Не удалось загрузить номер");
    } finally {
      setPhoneLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="text-[hsl(var(--muted-foreground))]">Загрузка...</div>
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">😕</div>
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

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
          <Icon name="ArrowLeft" size={20} />
        </button>
        <span className="text-sm text-[hsl(var(--muted-foreground))] flex-1 truncate">{CATEGORY_LABELS[ad.category] || ad.category}</span>
        <button
          onClick={() => onAddToFolder(ad.id)}
          className="p-2 rounded-lg hover:bg-orange-50 transition-colors"
          title={isFavorited ? "В избранном" : "Добавить в избранное"}
        >
          <Icon name="Heart" size={20} className={isFavorited ? "text-red-500 fill-red-500" : "text-[hsl(var(--accent))]"} />
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Заголовок + кнопка избранного */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-xl md:text-2xl font-bold leading-tight flex-1">{ad.title}</h1>
          <button
            onClick={() => onAddToFolder(ad.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all shrink-0 text-sm font-medium ${isFavorited ? "border-red-300 bg-red-50 text-red-500" : "border-border hover:border-[hsl(var(--accent))] hover:bg-orange-50"}`}
          >
            <Icon name="Heart" size={15} className={isFavorited ? "text-red-500 fill-red-500" : "text-[hsl(var(--accent))]"} />
            {isFavorited ? "В избранном" : "В избранное"}
          </button>
        </div>

        {/* Мета: дата + категория */}
        <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-[hsl(var(--muted-foreground))]">
          <span className="flex items-center gap-1">
            <Icon name="Clock" size={13} />
            {ad.created_at}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="Tag" size={13} />
            {CATEGORY_LABELS[ad.category] || ad.category}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="MapPin" size={13} />
            {ad.city}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="Eye" size={13} />
            {ad.views} просмотров
          </span>
        </div>

        {/* Основной блок: карусель + правая панель */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Карусель */}
          <div className="flex-1 min-w-0">
            <div className="relative bg-[hsl(var(--muted))] rounded-2xl overflow-hidden aspect-[4/3] group">
              {photos.length > 0 ? (
                <>
                  <img
                    src={photos[photoIdx]}
                    alt={ad.title}
                    className="w-full h-full object-cover"
                  />
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={prev}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Icon name="ChevronLeft" size={18} className="text-white" />
                      </button>
                      <button
                        onClick={next}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Icon name="ChevronRight" size={18} className="text-white" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {photos.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setPhotoIdx(i)}
                            className={`rounded-full transition-all ${i === photoIdx ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/50 hover:bg-white/80"}`}
                          />
                        ))}
                      </div>
                      <div className="absolute top-3 right-3 bg-black/40 text-white text-xs font-medium px-2 py-1 rounded-lg">
                        {photoIdx + 1} / {photos.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">📦</div>
              )}
            </div>

            {/* Превью фото */}
            {photos.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {photos.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === photoIdx ? "border-[hsl(var(--accent))]" : "border-transparent opacity-60 hover:opacity-100"}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Правая панель: цена + контакт */}
          <div className="lg:w-80 shrink-0 flex flex-col gap-4">
            {/* Цена */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <p className="text-3xl font-bold text-[hsl(var(--accent))] mb-1">{formatPrice(ad.price)}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ad.condition === "Новый" ? "bg-green-100 text-green-700" : "bg-orange-50 text-[hsl(var(--accent))]"}`}>
                  {ad.condition}
                </span>
              </div>
            </div>

            {/* Продавец */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3 font-medium uppercase tracking-wide">Продавец</p>
              <button
                onClick={() => navigate(`/user/${ad.author_id}`)}
                className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity text-left w-full"
              >
                <div className="w-11 h-11 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {ad.author_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{ad.author_name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Посмотреть профиль →</p>
                </div>
              </button>

              {/* Телефон */}
              {phoneVisible && phone ? (
                <a
                  href={`tel:${phone}`}
                  className="w-full flex items-center justify-center gap-2 bg-[hsl(var(--accent))] text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <Icon name="Phone" size={16} />
                  {phone}
                </a>
              ) : (
                <button
                  onClick={showPhone}
                  disabled={phoneLoading}
                  className="w-full flex items-center justify-center gap-2 bg-[hsl(var(--accent))] text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  <Icon name="Phone" size={16} />
                  {phoneLoading ? "Загрузка..." : "Показать телефон"}
                </button>
              )}

              {/* Кнопка «Написать» — только не владельцу и только залогиненным */}
              {ad.author_id !== currentUserId && (
                currentUserId ? (
                  <button
                    onClick={startChat}
                    disabled={startingChat}
                    className="w-full flex items-center justify-center gap-2 mt-2 border border-[hsl(var(--accent))] text-[hsl(var(--accent))] py-3 rounded-xl text-sm font-semibold hover:bg-orange-50 transition-colors disabled:opacity-60"
                  >
                    <Icon name="MessageCircle" size={16} />
                    {startingChat ? "Открываю чат..." : "Написать продавцу"}
                  </button>
                ) : (
                  <button
                    onClick={() => toast.info("Войдите, чтобы написать продавцу")}
                    className="w-full flex items-center justify-center gap-2 mt-2 border border-border py-3 rounded-xl text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <Icon name="MessageCircle" size={16} />
                    Написать продавцу
                  </button>
                )
              )}
            </div>

            {/* Д��бавить в избранное */}
            <button
              onClick={() => onAddToFolder(ad.id)}
              className={`w-full flex items-center justify-center gap-2 border py-3 rounded-2xl text-sm font-semibold transition-all ${isFavorited ? "border-red-300 bg-red-50 text-red-500" : "border-border bg-white hover:border-[hsl(var(--accent))] hover:bg-orange-50"}`}
            >
              <Icon name="Heart" size={16} className={isFavorited ? "text-red-500 fill-red-500" : "text-[hsl(var(--accent))]"} />
              {isFavorited ? "В избранном" : "Добавить в избранное"}
            </button>
          </div>
        </div>

        {/* Описание */}
        {ad.description && (
          <div className="bg-white rounded-2xl border border-border p-6 mb-4">
            <h2 className="font-bold text-lg mb-3">Описание</h2>
            <p className="text-[hsl(var(--foreground))] text-sm leading-relaxed whitespace-pre-wrap">{ad.description}</p>
          </div>
        )}

        {/* Параметры */}
        <div className="bg-white rounded-2xl border border-border p-6 mb-8">
          <h2 className="font-bold text-lg mb-4">Параметры</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Категория", value: CATEGORY_LABELS[ad.category] || ad.category },
              { label: "Состояние", value: ad.condition },
              { label: "Город", value: ad.city },
              { label: "Дата публикации", value: ad.created_at },
              { label: "Просмотры", value: String(ad.views) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2.5 border-b border-[hsl(var(--muted))] last:border-0">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">{label}</span>
                <span className="text-sm font-medium text-[hsl(var(--foreground))]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}