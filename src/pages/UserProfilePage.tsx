import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import SiteHeader from "@/components/SiteHeader";
import AuthModal from "./index/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { ADS_URL, CHAT_URL, PROFILE_URL, DbCategory, formatPrice } from "./index/types";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  id: number;
  name: string;
  avatar_url: string | null;
  cover_url: string | null;
  city: string | null;
  about: string | null;
  created_at: string | null;
  ads_count: number;
  avg_rating: number | null;
  reviews_count: number;
  is_owner: boolean;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  vk_url?: string | null;
  tg_username?: string | null;
  show_phone?: boolean;
  show_email?: boolean;
  is_public?: boolean;
  last_seen_at?: string | null;
}

interface AdItem {
  id: number;
  title: string;
  price: number;
  photos: string[];
  status: string;
  created_at: string | null;
  views_count: number;
}

interface Review {
  id: number;
  rating: number;
  text: string | null;
  created_at: string | null;
  author: { id: number; name: string; avatar_url: string | null };
}

type Tab = "ads" | "about" | "reviews" | "contacts" | "settings";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sid = () => localStorage.getItem("session_id") || localStorage.getItem("admin_token") || "";

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Icon key={s} name="Star" size={size}
          className={s <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"} />
      ))}
    </span>
  );
}

function Avatar({ profile, size = "lg" }: { profile: Profile; size?: "sm" | "lg" }) {
  const sz = size === "lg" ? "w-24 h-24 text-3xl" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} rounded-full border-4 border-white bg-[hsl(var(--accent))] flex items-center justify-center text-white font-bold shrink-0 overflow-hidden shadow-md`}>
      {profile.avatar_url
        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
        : profile.name[0]?.toUpperCase()}
    </div>
  );
}

function AdCard({ ad, isOwner, onOpen }: { ad: AdItem; isOwner: boolean; onOpen: () => void }) {
  const photo = ad.photos?.[0];
  const statusLabel: Record<string, string> = { active: "Активно", archived: "Снято", moderation: "На модерации", draft: "Черновик" };
  const statusColor: Record<string, string> = { active: "bg-green-100 text-green-700", archived: "bg-gray-100 text-gray-500", moderation: "bg-yellow-100 text-yellow-700", draft: "bg-blue-100 text-blue-700" };

  return (
    <div onClick={onOpen} className="group rounded-xl border border-border bg-white overflow-hidden hover:shadow-md transition-all cursor-pointer">
      <div className="aspect-[4/3] bg-[hsl(var(--muted))] overflow-hidden relative">
        {photo
          ? <img src={photo} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><Icon name="Image" size={28} className="text-[hsl(var(--muted-foreground))]" /></div>}
        {isOwner && (
          <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor[ad.status] || statusColor.draft}`}>
            {statusLabel[ad.status] || ad.status}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-sm line-clamp-2 leading-snug">{ad.title}</p>
        <p className="text-[hsl(var(--accent))] font-semibold text-sm mt-1.5">{formatPrice(ad.price)}</p>
        {isOwner && (
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1 flex items-center gap-1">
            <Icon name="Eye" size={10} />{ad.views_count} просмотров
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Ads ─────────────────────────────────────────────────────────────────
function AdsTab({ profile }: { profile: Profile }) {
  const navigate = useNavigate();
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");

  useEffect(() => {
    setLoading(true);
    fetch(PROFILE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "get_ads", user_id: profile.id, status: profile.is_owner ? statusFilter : "active" }),
    }).then(r => r.json()).then(d => { if (d.ok) setAds(d.ads); }).finally(() => setLoading(false));
  }, [profile.id, statusFilter]);

  const filters = [
    { id: "active", label: "Активные" },
    { id: "moderation", label: "На модерации" },
    { id: "archived", label: "Завершённые" },
    { id: "draft", label: "Черновики" },
    { id: "all", label: "Все" },
  ];

  return (
    <div>
      {profile.is_owner && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {filters.map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === f.id ? "bg-[hsl(var(--accent))] text-white" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-orange-100"}`}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="rounded-xl bg-[hsl(var(--muted))] animate-pulse h-52" />)}
        </div>
      ) : ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[hsl(var(--muted-foreground))]">
          <Icon name="PackageSearch" size={44} />
          <p className="font-medium">Нет объявлений</p>
          {profile.is_owner && <p className="text-sm">Подайте первое объявление</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {ads.map(ad => (
            <AdCard key={ad.id} ad={ad} isOwner={!!profile.is_owner} onOpen={() => navigate(`/ad/${ad.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: About ───────────────────────────────────────────────────────────────
function AboutTab({ profile }: { profile: Profile }) {
  const fields = [
    { label: "Имя", value: profile.name, icon: "User" },
    { label: "Город", value: profile.city, icon: "MapPin" },
    { label: "На сайте с", value: profile.created_at, icon: "Calendar" },
    { label: "Объявлений", value: String(profile.ads_count), icon: "Tag" },
    { label: "Сайт", value: profile.website, icon: "Globe", link: profile.website },
    { label: "ВКонтакте", value: profile.vk_url ? profile.vk_url.replace(/^https?:\/\/(vk\.com\/)?/, "") : null, icon: "ExternalLink", link: profile.vk_url },
    { label: "Telegram", value: profile.tg_username ? "@" + profile.tg_username : null, icon: "Send", link: profile.tg_username ? `https://t.me/${profile.tg_username}` : null },
  ];

  return (
    <div className="space-y-6">
      {profile.about && (
        <div className="bg-[hsl(var(--muted))] rounded-xl p-5">
          <p className="text-sm font-semibold mb-2 text-[hsl(var(--muted-foreground))] uppercase tracking-wide">О себе</p>
          <p className="text-sm leading-relaxed">{profile.about}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.filter(f => f.value).map(f => (
          <div key={f.label} className="flex items-center gap-3 p-4 bg-white border border-border rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
              <Icon name={f.icon as "User"} size={16} className="text-[hsl(var(--accent))]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium uppercase tracking-wide">{f.label}</p>
              {f.link
                ? <a href={f.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[hsl(var(--accent))] hover:underline truncate block">{f.value}</a>
                : <p className="text-sm font-medium truncate">{f.value}</p>}
            </div>
          </div>
        ))}
      </div>

      {!profile.about && fields.filter(f => f.value).length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[hsl(var(--muted-foreground))]">
          <Icon name="UserX" size={44} />
          <p className="font-medium">Профиль не заполнен</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Reviews ─────────────────────────────────────────────────────────────
function ReviewsTab({ profile }: { profile: Profile }) {
  const { user, openAuth } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [dist, setDist] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [myRating, setMyRating] = useState(5);
  const [myText, setMyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = () => {
    setLoading(true);
    fetch(PROFILE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_reviews", user_id: profile.id }),
    }).then(r => r.json()).then(d => {
      if (d.ok) { setReviews(d.reviews); setDist(d.distribution || {}); }
    }).finally(() => setLoading(false));
  };

  useEffect(loadReviews, [profile.id]);

  const submitReview = async () => {
    if (!user) { openAuth("login"); return; }
    setSubmitting(true);
    const d = await fetch(PROFILE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "add_review", target_id: profile.id, rating: myRating, text: myText }),
    }).then(r => r.json());
    if (d.ok) { toast.success("Отзыв оставлен"); setShowForm(false); setMyText(""); loadReviews(); }
    else toast.error(d.error || "Ошибка");
    setSubmitting(false);
  };

  const totalReviews = reviews.length;
  const avgRating = totalReviews ? reviews.reduce((s, r) => s + r.rating, 0) / totalReviews : 0;

  return (
    <div className="space-y-6">
      {/* Сводка рейтинга */}
      {totalReviews > 0 && (
        <div className="flex gap-6 items-center p-6 bg-white border border-border rounded-xl">
          <div className="text-center shrink-0">
            <p className="text-5xl font-bold text-[hsl(var(--foreground))]">{avgRating.toFixed(1)}</p>
            <Stars rating={avgRating} size={16} />
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{totalReviews} отзывов</p>
          </div>
          <div className="flex-1 space-y-1.5 min-w-0">
            {[5, 4, 3, 2, 1].map(s => {
              const cnt = dist[s] || 0;
              const pct = totalReviews ? (cnt / totalReviews) * 100 : 0;
              return (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-xs w-2 shrink-0 text-[hsl(var(--muted-foreground))]">{s}</span>
                  <Icon name="Star" size={11} className="text-yellow-400 fill-yellow-400 shrink-0" />
                  <div className="flex-1 h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs w-4 text-[hsl(var(--muted-foreground))]">{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Кнопка написать отзыв */}
      {!profile.is_owner && (
        <div>
          {showForm ? (
            <div className="p-5 bg-white border border-border rounded-xl space-y-4">
              <p className="font-semibold text-sm">Ваша оценка</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setMyRating(s)}>
                    <Icon name="Star" size={28} className={s <= myRating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"} />
                  </button>
                ))}
              </div>
              <textarea
                value={myText}
                onChange={e => setMyText(e.target.value)}
                placeholder="Расскажите о своём опыте (необязательно)"
                rows={3}
                className="w-full px-4 py-2.5 text-sm bg-[hsl(var(--muted))] rounded-xl outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] resize-none"
              />
              <div className="flex gap-2">
                <button onClick={submitReview} disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[hsl(var(--accent))] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                  {submitting ? "Сохраняю..." : "Опубликовать"}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-5 py-2 rounded-xl border border-border text-sm hover:bg-[hsl(var(--muted))]">
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => { if (!user) { openAuth("login"); return; } setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[hsl(var(--accent))] text-[hsl(var(--accent))] text-sm font-semibold hover:bg-orange-50 transition-colors">
              <Icon name="Star" size={15} />
              Оставить отзыв
            </button>
          )}
        </div>
      )}

      {/* Список отзывов */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-[hsl(var(--muted))] animate-pulse" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[hsl(var(--muted-foreground))]">
          <Icon name="MessageSquare" size={44} />
          <p className="font-medium">Пока нет отзывов</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="p-5 bg-white border border-border rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
                  {r.author.avatar_url
                    ? <img src={r.author.avatar_url} alt="" className="w-full h-full object-cover" />
                    : r.author.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{r.author.name}</p>
                    <Stars rating={r.rating} size={13} />
                    {r.created_at && (
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                        {new Date(r.created_at).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    )}
                  </div>
                  {r.text && <p className="text-sm mt-2 leading-relaxed text-[hsl(var(--foreground))]">{r.text}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Contacts ────────────────────────────────────────────────────────────
function ContactsTab({ profile, onWriteMessage }: { profile: Profile; onWriteMessage: () => void }) {
  const contacts = [
    profile.phone && { icon: "Phone", label: "Телефон", value: profile.phone, href: `tel:${profile.phone}` },
    profile.email && { icon: "Mail", label: "Email", value: profile.email, href: `mailto:${profile.email}` },
    profile.website && { icon: "Globe", label: "Сайт", value: profile.website, href: profile.website },
    profile.tg_username && { icon: "Send", label: "Telegram", value: "@" + profile.tg_username, href: `https://t.me/${profile.tg_username}` },
    profile.vk_url && { icon: "ExternalLink", label: "ВКонтакте", value: profile.vk_url, href: profile.vk_url },
  ].filter(Boolean) as { icon: string; label: string; value: string; href: string }[];

  return (
    <div className="space-y-4">
      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[hsl(var(--muted-foreground))]">
          <Icon name="ContactRound" size={44} />
          <p className="font-medium">Контакты не указаны</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {contacts.map(c => (
            <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white border border-border rounded-xl hover:border-[hsl(var(--accent))] hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <Icon name={c.icon as "Phone"} size={18} className="text-[hsl(var(--accent))]" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium uppercase tracking-wide">{c.label}</p>
                <p className="text-sm font-medium truncate group-hover:text-[hsl(var(--accent))] transition-colors">{c.value}</p>
              </div>
            </a>
          ))}
        </div>
      )}

      {!profile.is_owner && (
        <button onClick={onWriteMessage}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[hsl(var(--accent))] text-white text-sm font-semibold hover:opacity-90 transition-opacity w-full justify-center mt-2">
          <Icon name="MessageCircle" size={16} />
          Написать сообщение
        </button>
      )}
    </div>
  );
}

// ─── Tab: Settings ────────────────────────────────────────────────────────────
function SettingsTab({ profile, onUpdate }: { profile: Profile; onUpdate: (p: Partial<Profile>) => void }) {
  const [form, setForm] = useState({
    name: profile.name || "",
    city: profile.city || "",
    about: profile.about || "",
    phone: profile.phone || "",
    website: profile.website || "",
    vk_url: profile.vk_url || "",
    tg_username: profile.tg_username || "",
    show_phone: profile.show_phone || false,
    show_email: profile.show_email || false,
  });
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    setSaving(true);
    const d = await fetch(PROFILE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "update_profile", ...form }),
    }).then(r => r.json());
    if (d.ok) { toast.success("Профиль сохранён"); onUpdate(d.user); }
    else toast.error(d.error || "Ошибка сохранения");
    setSaving(false);
  };

  const uploadPhoto = async (file: File, type: "avatar" | "cover") => {
    setUploading(type);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const b64 = (e.target?.result as string) || "";
      if (type === "avatar") setAvatarPreview(b64);
      else setCoverPreview(b64);
      const d = await fetch(PROFILE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
        body: JSON.stringify({ action: "upload_photo", photo_type: type, data: b64 }),
      }).then(r => r.json());
      if (d.ok) { toast.success("Фото обновлено"); onUpdate({ [type === "avatar" ? "avatar_url" : "cover_url"]: d.url }); }
      else toast.error(d.error || "Ошибка загрузки");
      setUploading(null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 max-w-xl">
      {/* Обложка */}
      <div>
        <p className="text-sm font-semibold mb-3 text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Обложка профиля</p>
        <div className="relative h-32 rounded-xl overflow-hidden bg-gradient-to-r from-[hsl(var(--accent))] to-orange-400 cursor-pointer group" onClick={() => coverRef.current?.click()}>
          {(coverPreview || profile.cover_url) && (
            <img src={coverPreview || profile.cover_url!} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading === "cover" ? <Icon name="Loader" size={22} className="text-white animate-spin" /> : <Icon name="Camera" size={22} className="text-white" />}
          </div>
        </div>
        <input ref={coverRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f, "cover"); }} />
      </div>

      {/* Аватар */}
      <div>
        <p className="text-sm font-semibold mb-3 text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Аватар</p>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-[hsl(var(--accent))] flex items-center justify-center text-white text-2xl font-bold cursor-pointer group shrink-0"
            onClick={() => avatarRef.current?.click()}>
            {(avatarPreview || profile.avatar_url)
              ? <img src={avatarPreview || profile.avatar_url!} alt="" className="w-full h-full object-cover" />
              : profile.name[0]?.toUpperCase()}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              {uploading === "avatar" ? <Icon name="Loader" size={18} className="text-white animate-spin" /> : <Icon name="Camera" size={18} className="text-white" />}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Нажмите на аватар для загрузки</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">JPG, PNG до 5 МБ</p>
          </div>
        </div>
        <input ref={avatarRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f, "avatar"); }} />
      </div>

      {/* Основные поля */}
      <div>
        <p className="text-sm font-semibold mb-3 text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Основная информация</p>
        <div className="space-y-3">
          {[
            { key: "name", label: "Имя", placeholder: "Ваше имя" },
            { key: "city", label: "Город", placeholder: "Москва" },
            { key: "phone", label: "Телефон", placeholder: "+7 (999) 000-00-00" },
            { key: "website", label: "Сайт", placeholder: "https://example.com" },
            { key: "vk_url", label: "ВКонтакте", placeholder: "https://vk.com/username" },
            { key: "tg_username", label: "Telegram (без @)", placeholder: "username" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-[hsl(var(--muted-foreground))] font-medium mb-1 block">{f.label}</label>
              <input
                value={form[f.key as keyof typeof form] as string}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-4 py-2.5 text-sm bg-[hsl(var(--muted))] rounded-xl outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))] font-medium mb-1 block">О себе</label>
            <textarea
              value={form.about}
              onChange={e => setForm(p => ({ ...p, about: e.target.value }))}
              placeholder="Расскажите о себе..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-2.5 text-sm bg-[hsl(var(--muted))] rounded-xl outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] resize-none transition-all"
            />
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">{form.about.length}/500</p>
          </div>
        </div>
      </div>

      {/* Приватность */}
      <div>
        <p className="text-sm font-semibold mb-3 text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Приватность</p>
        <div className="space-y-3">
          {[
            { key: "show_phone", label: "Показывать телефон всем", icon: "Phone" },
            { key: "show_email", label: "Показывать email всем", icon: "Mail" },
          ].map(f => (
            <label key={f.key} className="flex items-center gap-3 p-4 bg-white border border-border rounded-xl cursor-pointer hover:border-[hsl(var(--accent))] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                <Icon name={f.icon as "Phone"} size={16} className="text-[hsl(var(--accent))]" />
              </div>
              <span className="flex-1 text-sm font-medium">{f.label}</span>
              <div className={`relative w-11 h-6 rounded-full transition-colors ${form[f.key as keyof typeof form] ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--muted))]"}`}
                onClick={() => setForm(p => ({ ...p, [f.key]: !p[f.key as keyof typeof form] }))}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form[f.key as keyof typeof form] ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </label>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="w-full py-3 rounded-xl bg-[hsl(var(--accent))] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
        {saving ? "Сохраняю..." : "Сохранить изменения"}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { user, openAuth } = auth;

  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("ads");

  const isOwner = !!(user && profile && user.id === profile.id);

  useEffect(() => {
    fetch(ADS_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "categories" }),
    }).then(r => r.json()).then(d => { if (d.ok) setDbCategories(d.categories); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(PROFILE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "get_profile", user_id: userId }),
    }).then(r => r.json())
      .then(d => { if (d.ok) setProfile(d.profile); })
      .finally(() => setLoading(false));
  }, [userId]);

  const startChat = async () => {
    if (!user) { openAuth("login"); return; }
    if (!profile) return;
    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "start_chat", user_id: profile.id }),
    }).then(r => r.json());
    if (res.ok) navigate(`/chat?id=${res.chat_id}`);
  };

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "ads", label: "Объявления", icon: "Tag" },
    { id: "about", label: "О себе", icon: "User" },
    { id: "reviews", label: "Отзывы", icon: "Star" },
    { id: "contacts", label: "Контакты", icon: "Phone" },
    ...(isOwner ? [{ id: "settings" as Tab, label: "Настройки", icon: "Settings" }] : []),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <SiteHeader dbCategories={dbCategories} user={user} onLogoClick={() => navigate("/")} onNewAd={() => navigate("/")} onLogin={() => openAuth("login")} onRegister={() => openAuth("register")} onLogout={auth.logout} />
        <div className="max-w-5xl mx-auto px-4 py-12 space-y-4">
          <div className="h-40 bg-[hsl(var(--muted))] animate-pulse rounded-2xl" />
          <div className="h-8 w-48 bg-[hsl(var(--muted))] animate-pulse rounded-lg" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-52 bg-[hsl(var(--muted))] animate-pulse rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <SiteHeader dbCategories={dbCategories} user={user} onLogoClick={() => navigate("/")} onNewAd={() => navigate("/")} onLogin={() => openAuth("login")} onRegister={() => openAuth("register")} onLogout={auth.logout} />
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-[hsl(var(--muted-foreground))]">
          <Icon name="UserX" size={48} />
          <p className="font-semibold text-lg">Пользователь не найден</p>
          <button onClick={() => navigate("/")} className="text-sm text-[hsl(var(--accent))] hover:underline">На главную</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <SiteHeader dbCategories={dbCategories} user={user} onLogoClick={() => navigate("/")} onNewAd={() => navigate("/")} onLogin={() => openAuth("login")} onRegister={() => openAuth("register")} onLogout={auth.logout} />

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Шапка профиля — стиль NobleUI ───────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden mb-6">
          {/* Обложка — большая */}
          <div className="h-52 md:h-64 bg-gradient-to-br from-[hsl(var(--primary))] to-blue-400 relative overflow-hidden">
            {profile.cover_url && <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />}
          </div>

          {/* Нижняя панель: аватар + имя + кнопка */}
          <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-border">
            <div className="flex items-center gap-4 -mt-14">
              {/* Аватар поверх обложки */}
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white bg-[hsl(var(--primary))] flex items-center justify-center text-white text-2xl font-bold shrink-0 overflow-hidden shadow-md">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : profile.name[0]?.toUpperCase()}
              </div>
              <div className="mt-4 md:mt-6">
                <h1 className="text-xl font-bold leading-tight">{profile.name}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  {profile.city && <span className="flex items-center gap-1"><Icon name="MapPin" size={13} />{profile.city}</span>}
                  {profile.avg_rating && (
                    <span className="flex items-center gap-1.5">
                      <Stars rating={profile.avg_rating} size={12} />
                      <span className="text-xs">{profile.avg_rating}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Кнопка действия */}
            {isOwner ? (
              <button onClick={() => setActiveTab("settings")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--primary))] text-white text-sm font-semibold hover:opacity-90 transition-opacity shrink-0">
                <Icon name="Pencil" size={15} />
                Редактировать профиль
              </button>
            ) : (
              <button onClick={startChat}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--primary))] text-white text-sm font-semibold hover:opacity-90 transition-opacity shrink-0">
                <Icon name="MessageCircle" size={15} />
                Написать сообщение
              </button>
            )}
          </div>

          {/* Горизонтальные табы — прямо под шапкой, как в NobleUI */}
          <nav className="flex overflow-x-auto px-4 py-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}>
                <Icon name={tab.icon as "Tag"} size={15} />
                {tab.label}
                {tab.id === "reviews" && profile.reviews_count > 0 && (
                  <span className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                    {profile.reviews_count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Контент таба ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* Контент таба */}
          <div className="flex-1 min-w-0">
            {activeTab === "ads" && <AdsTab profile={profile} />}
            {activeTab === "about" && <AboutTab profile={profile} />}
            {activeTab === "reviews" && <ReviewsTab profile={profile} />}
            {activeTab === "contacts" && <ContactsTab profile={profile} onWriteMessage={startChat} />}
            {activeTab === "settings" && isOwner && (
              <SettingsTab profile={profile} onUpdate={updates => setProfile(p => p ? { ...p, ...updates } : p)} />
            )}
          </div>
        </div>
      </main>

      <AuthModal authModal={auth.authModal} setAuthModal={auth.setAuthModal} authMode={auth.authMode} setAuthMode={auth.setAuthMode} authStep={auth.authStep} setAuthStep={auth.setAuthStep} authName={auth.authName} setAuthName={auth.setAuthName} authEmail={auth.authEmail} setAuthEmail={auth.setAuthEmail} authPassword={auth.authPassword} setAuthPassword={auth.setAuthPassword} authCode={auth.authCode} setAuthCode={auth.setAuthCode} authError={auth.authError} setAuthError={auth.setAuthError} authLoading={auth.authLoading} resendTimer={auth.resendTimer} submitAuth={auth.submitAuth} sendCode={auth.sendCode} />
    </div>
  );
}