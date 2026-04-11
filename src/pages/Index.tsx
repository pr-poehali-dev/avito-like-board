import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import CreateAd from "@/pages/CreateAd";
import EditAd from "@/pages/EditAd";
import AdDetail from "@/pages/AdDetail";
import { toast } from "sonner";

const AUTH_URL = "https://functions.poehali.dev/8b2cd80b-f20b-45b5-8696-018d10b4eb52";
const ADS_URL = "https://functions.poehali.dev/26941b84-1198-4969-8e13-07523f9f04d0";
const FAV_URL = "https://functions.poehali.dev/47db8eb7-30bf-4234-9cbb-10b2e57a491c";

interface User {
  id: number;
  name: string;
  email: string;
}

interface Ad {
  id: number;
  title: string;
  price: number;
  category: string;
  city: string;
  condition: string;
  date: string;
  author?: string;
  status?: string;
  views?: number;
  photos?: string[];
  image?: string;
}

type Section = "home" | "categories" | "my-ads" | "profile" | "messages" | "favorites" | "contacts";

interface FavFolder {
  id: number;
  name: string;
  date: string;
  count: number;
}

const CATEGORIES = [
  { id: "realty", label: "Недвижимость", icon: "Home", count: 1240 },
  { id: "auto", label: "Авто", icon: "Car", count: 856 },
  { id: "electronics", label: "Электроника", icon: "Smartphone", count: 2341 },
  { id: "clothes", label: "Одежда", icon: "Shirt", count: 1780 },
  { id: "furniture", label: "Мебель", icon: "Armchair", count: 634 },
  { id: "services", label: "Услуги", icon: "Wrench", count: 423 },
  { id: "animals", label: "Животные", icon: "PawPrint", count: 312 },
  { id: "hobbies", label: "Хобби", icon: "Music", count: 198 },
];

const MOCK_ADS = [
  { id: 1, title: "iPhone 15 Pro 256GB", price: 89900, city: "Москва", category: "electronics", date: "Сегодня", image: "📱", condition: "Новый" },
  { id: 2, title: "Квартира 2к, Арбат", price: 120000, city: "Москва", category: "realty", date: "Вчера", image: "🏠", condition: "Отличное" },
  { id: 3, title: "Toyota Camry 2021", price: 2450000, city: "СПб", category: "auto", date: "2 дня назад", image: "🚗", condition: "Хорошее" },
  { id: 4, title: "MacBook Pro M3", price: 159000, city: "Казань", category: "electronics", date: "Сегодня", image: "💻", condition: "Новый" },
  { id: 5, title: "Диван угловой IKEA", price: 32000, city: "Новосибирск", category: "furniture", date: "3 дня назад", image: "🛋️", condition: "Хорошее" },
  { id: 6, title: "Велосипед горный Trek", price: 45000, city: "Екатеринбург", category: "hobbies", date: "Вчера", image: "🚴", condition: "Отличное" },
  { id: 7, title: "Репетитор по математике", price: 2500, city: "Москва", category: "services", date: "Сегодня", image: "📚", condition: "Услуга" },
  { id: 8, title: "Пуховик зимний M", price: 8500, city: "Самара", category: "clothes", date: "4 дня назад", image: "🧥", condition: "Хорошее" },
];

const CITIES = ["Все города", "Москва", "СПб", "Казань", "Екатеринбург", "Новосибирск", "Самара"];

const MY_ADS = [
  { id: 1, title: "iPhone 13 128GB", price: 55000, status: "active", views: 234, date: "10 апр" },
  { id: 2, title: "Ноутбук Lenovo", price: 38000, status: "archived", views: 89, date: "5 апр" },
  { id: 3, title: "Велосипед детский", price: 6500, status: "active", views: 45, date: "2 апр" },
];

const MESSAGES = [
  { id: 1, name: "Алексей К.", text: "Здравствуйте! Ещё продаёте?", time: "12:34", unread: 2, avatar: "А" },
  { id: 2, name: "Мария П.", text: "Спасибо, уже купила", time: "Вчера", unread: 0, avatar: "М" },
  { id: 3, name: "Дмитрий Р.", text: "Можно снизить цену?", time: "Пн", unread: 1, avatar: "Д" },
];

function formatPrice(price: number) {
  return price.toLocaleString("ru-RU") + " ₽";
}

export default function Index() {
  const [section, setSection] = useState<Section>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState("Все города");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [condition, setCondition] = useState("all");
  const [favorites, setFavorites] = useState<number[]>([2, 5]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Ads from API
  const [apiAds, setApiAds] = useState<Ad[]>([]);
  const [myAdsApi, setMyAdsApi] = useState<Ad[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);

  const [showCreateAd, setShowCreateAd] = useState(false);
  const [editAdId, setEditAdId] = useState<number | null>(null);

  // Favorites (type=favorites)
  const [favFolders, setFavFolders] = useState<FavFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [folderAds, setFolderAds] = useState<Ad[]>([]);
  const [folderAdsLoading, setFolderAdsLoading] = useState(false);
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<FavFolder | null>(null);
  const [renameName, setRenameName] = useState("");
  // "add to folder" picker for an ad (favorites)
  const [addToFolderAdId, setAddToFolderAdId] = useState<number | null>(null);
  const [adFolderIds, setAdFolderIds] = useState<number[]>([]);
  // my-ads folders (type=my_ads) — отдельные от избранного
  const [myAdsFolders, setMyAdsFolders] = useState<FavFolder[]>([]);
  const [myAdsFilterFolder, setMyAdsFilterFolder] = useState<number | null>(null);
  const [myAdsFolderMap, setMyAdsFolderMap] = useState<Record<number, number[]>>({});
  const [myAdsNewFolderName, setMyAdsNewFolderName] = useState("");
  const [myAdsCreatingFolder, setMyAdsCreatingFolder] = useState(false);
  // picker «в папку» для my_ads
  const [myAdsPickerAdId, setMyAdsPickerAdId] = useState<number | null>(null);
  // карусель фото в карточках
  const [carouselIndex, setCarouselIndex] = useState<Record<number, number>>({});
  // просмотр объявления
  const [viewAdId, setViewAdId] = useState<number | null>(null);

  // Auth state
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
    const sid = localStorage.getItem("session_id");
    if (!sid) return;
    fetch(AUTH_URL, { headers: { "X-Session-Id": sid } })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setUser(d.user); })
      .catch(() => {});
  }, []);

  // Загрузка объявлений с API
  const loadAds = () => {
    setAdsLoading(true);
    fetch(ADS_URL)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setApiAds(d.ads); })
      .catch(() => {})
      .finally(() => setAdsLoading(false));
  };

  const loadMyAds = () => {
    const sid = localStorage.getItem("session_id");
    if (!sid) return;
    fetch(ADS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid },
      body: JSON.stringify({ action: "my" }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setMyAdsApi(d.ads); })
      .catch(() => {});
  };

  useEffect(() => { loadAds(); }, []);
  useEffect(() => { if (user) loadMyAds(); }, [user]);
  useEffect(() => { if (section === "favorites" && user) loadFolders(); }, [section, user]);
  useEffect(() => {
    if (section === "my-ads" && user) {
      loadMyAdsFolders();
      if (myAdsApi.length > 0) loadMyAdsFolderMap(myAdsApi.map((a) => a.id));
    }
  }, [section, user]);
  useEffect(() => {
    if (myAdsApi.length > 0 && user && section === "my-ads") {
      loadMyAdsFolderMap(myAdsApi.map((a) => a.id));
    }
  }, [myAdsApi]);

  const openNewAd = () => {
    if (!user) { openAuth("login"); return; }
    setShowCreateAd(true);
  };

  const toggleAdStatus = async (id: number, currentStatus: string) => {
    const sid = localStorage.getItem("session_id");
    const action = currentStatus === "active" ? "archive" : "activate";
    await fetch(ADS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid || "" },
      body: JSON.stringify({ action, id }),
    });
    loadMyAds();
    loadAds();
  };

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

  // Шаг 1 регистрации: отправить код
  const sendCode = async () => {
    setAuthError("");
    if (!authEmail || !authEmail.includes("@")) {
      setAuthError("Укажите корректный email");
      return;
    }
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
      await fetch(AUTH_URL, { method: "POST", headers: { "Content-Type": "application/json", "X-Session-Id": sid }, body: JSON.stringify({ action: "logout" }) });
      localStorage.removeItem("session_id");
    }
    setUser(null);
    setSection("home");
  };

  // Объединяем API + MOCK (MOCK показываем только если API пустой)
  const allAds: Ad[] = apiAds.length > 0 ? apiAds : MOCK_ADS;

  const filteredAds = allAds.filter((ad) => {
    const matchQuery = ad.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === "all" || ad.category === selectedCategory;
    const matchCity = selectedCity === "Все города" || ad.city === selectedCity;
    const matchFrom = priceFrom === "" || ad.price >= Number(priceFrom);
    const matchTo = priceTo === "" || ad.price <= Number(priceTo);
    const matchCondition = condition === "all" || ad.condition.toLowerCase().includes(condition);
    return matchQuery && matchCategory && matchCity && matchFrom && matchTo && matchCondition;
  });

  const favoriteAds = allAds.filter((ad) => favorites.includes(ad.id));

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  };

  const sid = () => localStorage.getItem("session_id") || "";

  // --- Папки «Избранное» (folder_type=favorites) ---
  const loadFolders = async () => {
    if (!user) return;
    const res = await fetch(FAV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "folders", folder_type: "favorites" }),
    });
    const d = await res.json();
    if (d.ok) setFavFolders(d.folders);
  };

  const loadFolderAds = async (folderId: number) => {
    setFolderAdsLoading(true);
    const res = await fetch(FAV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "folder_items", folder_id: folderId }),
    });
    const d = await res.json();
    if (d.ok) setFolderAds(d.ads);
    setFolderAdsLoading(false);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await fetch(FAV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "create_folder", name: newFolderName.trim(), folder_type: "favorites" }),
    });
    setNewFolderModal(false);
    setNewFolderName("");
    loadFolders();
  };

  const renameFolder = async () => {
    if (!renamingFolder || !renameName.trim()) return;
    await fetch(FAV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "rename_folder", folder_id: renamingFolder.id, name: renameName.trim() }),
    });
    setRenamingFolder(null);
    loadFolders();
  };

  const deleteFolder = async (folderId: number) => {
    await fetch(FAV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "delete_folder", folder_id: folderId }),
    });
    if (activeFolderId === folderId) setActiveFolderId(null);
    loadFolders();
  };

  const openAddToFolder = async (adId: number) => {
    if (!user) { openAuth("login"); return; }
    setAddToFolderAdId(adId);
    await loadFolders();
    const res = await fetch(FAV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "my_ad_folders", ad_id: adId, folder_type: "favorites" }),
    });
    const d = await res.json();
    if (d.ok) {
      setAdFolderIds(d.folder_ids);
      if (d.folder_ids.length > 0) {
        setFavorites((prev) => prev.includes(adId) ? prev : [...prev, adId]);
      }
    }
  };

  const toggleAdInFolder = async (folderId: number, adId: number) => {
    const inFolder = adFolderIds.includes(folderId);
    const folderName = favFolders.find((f) => f.id === folderId)?.name || "папку";
    await fetch(FAV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: inFolder ? "remove_item" : "add_item", folder_id: folderId, ad_id: adId }),
    });
    const newIds = inFolder
      ? adFolderIds.filter((id) => id !== folderId)
      : [...adFolderIds, folderId];
    setAdFolderIds(newIds);
    // обновляем глобальный список избранных ID
    const nowInAnyFolder = newIds.length > 0;
    setFavorites((prev) =>
      nowInAnyFolder ? (prev.includes(adId) ? prev : [...prev, adId]) : prev.filter((id) => id !== adId)
    );
    loadFolders();
    if (inFolder) {
      toast("Убрано из папки", { description: folderName, icon: "📂" });
    } else {
      toast.success("Добавлено в папку", { description: folderName });
    }
  };

  // --- Папки «Мои объявления» (folder_type=my_ads) ---
  const loadMyAdsFolders = async () => {
    if (!user) return;
    const res = await fetch(FAV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "folders", folder_type: "my_ads" }),
    });
    const d = await res.json();
    if (d.ok) setMyAdsFolders(d.folders);
  };

  const createMyAdsFolder = async () => {
    if (!myAdsNewFolderName.trim()) return;
    await fetch(FAV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "create_folder", name: myAdsNewFolderName.trim(), folder_type: "my_ads" }),
    });
    setMyAdsCreatingFolder(false);
    setMyAdsNewFolderName("");
    loadMyAdsFolders();
  };

  const deleteMyAdsFolder = async (folderId: number) => {
    await fetch(FAV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "delete_folder", folder_id: folderId }),
    });
    if (myAdsFilterFolder === folderId) setMyAdsFilterFolder(null);
    loadMyAdsFolders();
  };

  const loadMyAdsFolderMap = async (adIds: number[]) => {
    if (!user || adIds.length === 0) return;
    const map: Record<number, number[]> = {};
    await Promise.all(adIds.map(async (adId) => {
      const res = await fetch(FAV_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
        body: JSON.stringify({ action: "my_ad_folders", ad_id: adId, folder_type: "my_ads" }),
      });
      const d = await res.json();
      if (d.ok) map[adId] = d.folder_ids;
    }));
    setMyAdsFolderMap(map);
  };

  const toggleAdInMyAdsFolder = async (folderId: number, adId: number) => {
    const inFolder = (myAdsFolderMap[adId] || []).includes(folderId);
    await fetch(FAV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: inFolder ? "remove_item" : "add_item", folder_id: folderId, ad_id: adId }),
    });
    setMyAdsFolderMap((prev) => {
      const cur = prev[adId] || [];
      return { ...prev, [adId]: inFolder ? cur.filter((id) => id !== folderId) : [...cur, folderId] };
    });
    loadMyAdsFolders();
    const folderName = myAdsFolders.find((f) => f.id === folderId)?.name || "папку";
    if (inFolder) {
      toast("Убрано из папки", { description: folderName, icon: "📂" });
    } else {
      toast.success("Добавлено в папку", { description: folderName });
    }
  };

  const navItems: { id: Section; label: string; icon: string }[] = [
    { id: "home", label: "Главная", icon: "Home" },
    { id: "categories", label: "Категории", icon: "LayoutGrid" },
    { id: "my-ads", label: "Мои объявления", icon: "FileText" },
    { id: "messages", label: "Сообщения", icon: "MessageCircle" },
  ];

  if (showCreateAd) {
    return (
      <CreateAd
        onBack={() => setShowCreateAd(false)}
        onSuccess={() => {
          setShowCreateAd(false);
          loadAds();
          loadMyAds();
          setSection("my-ads");
        }}
      />
    );
  }

  if (editAdId !== null) {
    return (
      <EditAd
        adId={editAdId}
        onBack={() => setEditAdId(null)}
        onSuccess={() => {
          setEditAdId(null);
          loadAds();
          loadMyAds();
          setSection("my-ads");
        }}
      />
    );
  }

  if (viewAdId !== null && addToFolderAdId === null) {
    return (
      <AdDetail
        adId={viewAdId}
        onBack={() => setViewAdId(null)}
        onAddToFolder={(id) => openAddToFolder(id)}
        isFavorited={favorites.includes(viewAdId)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] font-golos">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => setSection("home")} className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-[hsl(var(--accent))] rounded-lg flex items-center justify-center">
              <Icon name="Tag" size={16} className="text-white" />
            </div>
            <span className="font-semibold text-[17px] tracking-tight text-[hsl(var(--foreground))]">Объявления</span>
          </button>

          <div className="flex-1 relative hidden md:block">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Поиск объявлений..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-[hsl(var(--muted))] rounded-lg border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all placeholder:text-[hsl(var(--muted-foreground))]"
            />
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  section === item.id
                    ? "bg-[hsl(var(--accent))] text-white"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <Icon name={item.icon} size={15} />
                <span className="hidden lg:inline">{item.label}</span>
                {item.id === "messages" && (
                  <span className="w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
                )}
              </button>
            ))}
          </nav>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden ml-auto p-2 rounded-lg hover:bg-[hsl(var(--muted))]"
          >
            <Icon name={mobileMenuOpen ? "X" : "Menu"} size={20} />
          </button>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              onClick={openNewAd}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[hsl(var(--accent))] text-[hsl(var(--accent))] hover:bg-orange-50 transition-colors"
            >
              <Icon name="Plus" size={15} />
              Подать объявление
            </button>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  <div className="w-7 h-7 bg-[hsl(var(--accent))] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user.name[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium max-w-[100px] truncate">{user.name}</span>
                  <Icon name={userMenuOpen ? "ChevronUp" : "ChevronDown"} size={14} className="text-[hsl(var(--muted-foreground))]" />
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-white rounded-xl shadow-lg border border-border py-1.5 animate-fade-in">
                      <button
                        onClick={() => { setSection("profile"); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors text-left"
                      >
                        <Icon name="User" size={15} className="text-[hsl(var(--muted-foreground))]" />
                        Личный кабинет
                      </button>
                      <button
                        onClick={() => { setSection("favorites"); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors text-left"
                      >
                        <Icon name="Heart" size={15} className="text-[hsl(var(--muted-foreground))]" />
                        Избранное
                      </button>
                      <div className="my-1 border-t border-border" />
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-red-50 text-red-500 transition-colors text-left"
                      >
                        <Icon name="LogOut" size={15} />
                        Выйти
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <button onClick={() => openAuth("login")} className="px-4 py-2 rounded-lg text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">
                  Войти
                </button>
                <button onClick={() => openAuth("register")} className="px-4 py-2 rounded-lg text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">
                  Регистрация
                </button>
              </>
            )}
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-white animate-fade-in">
            <div className="px-4 py-3">
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[hsl(var(--muted))] rounded-lg outline-none"
              />
            </div>
            <div className="px-4 pb-3 flex flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setSection(item.id); setMobileMenuOpen(false); }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                    section === item.id
                      ? "bg-[hsl(var(--accent))] text-white"
                      : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                  }`}
                >
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">

        {/* HOME */}
        {section === "home" && (
          <div className="animate-slide-up">
            {/* Hero blocks */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {/* Большой блок — 2 колонки */}
              <div
                className="col-span-2 row-span-2 relative rounded-2xl overflow-hidden min-h-[180px] flex flex-col justify-end p-6 cursor-pointer group"
                style={{ background: "linear-gradient(135deg, hsl(var(--accent)) 0%, #ff8c42 100%)" }}
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

              {/* Услуги */}
              <div
                className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow"
                style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
                onClick={() => { setSelectedCategory("services"); setSection("categories"); }}
              >
                <span className="text-2xl">🔧</span>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">Услуги</p>
                  <p className="text-white/70 text-xs mt-0.5">Мастера и специалисты рядом</p>
                </div>
              </div>

              {/* Продай ненужное */}
              <div
                className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow"
                style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                onClick={openNewAd}
              >
                <span className="text-2xl">💸</span>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">Продай ненужное</p>
                  <p className="text-white/70 text-xs mt-0.5">Разместить объявление за 2 мин</p>
                </div>
              </div>

              {/* Квартиры */}
              <div
                className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow"
                style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" }}
                onClick={() => { setSelectedCategory("realty"); setSection("categories"); }}
              >
                <span className="text-2xl">🏢</span>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">Квартиры</p>
                  <p className="text-white/70 text-xs mt-0.5">Аренда и продажа жилья</p>
                </div>
              </div>

              {/* Электроника */}
              <div
                className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow"
                style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
                onClick={() => { setSelectedCategory("electronics"); setSection("categories"); }}
              >
                <span className="text-2xl">📱</span>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">Электроника</p>
                  <p className="text-white/70 text-xs mt-0.5">Телефоны, ноутбуки, ТВ</p>
                </div>
              </div>

              {/* Запчасти / Авто */}
              <div
                className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow"
                style={{ background: "linear-gradient(135deg, #64748b 0%, #475569 100%)" }}
                onClick={() => { setSelectedCategory("auto"); setSection("categories"); }}
              >
                <span className="text-2xl">🚗</span>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">Запчасти и авто</p>
                  <p className="text-white/70 text-xs mt-0.5">Авто и всё для ремонта</p>
                </div>
              </div>

              {/* Животные */}
              <div
                className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow"
                style={{ background: "linear-gradient(135deg, #f472b6 0%, #ec4899 100%)" }}
                onClick={() => { setSelectedCategory("animals"); setSection("categories"); }}
              >
                <span className="text-2xl">🐾</span>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">Животные</p>
                  <p className="text-white/70 text-xs mt-0.5">Питомцы и аксессуары</p>
                </div>
              </div>

              {/* Мебель */}
              <div
                className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow"
                style={{ background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)" }}
                onClick={() => { setSelectedCategory("furniture"); setSection("categories"); }}
              >
                <span className="text-2xl">🛋️</span>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">Мебель</p>
                  <p className="text-white/70 text-xs mt-0.5">Для дома и офиса</p>
                </div>
              </div>

              {/* Одежда */}
              <div
                className="relative rounded-2xl overflow-hidden min-h-[84px] flex flex-col justify-between p-4 cursor-pointer group hover:shadow-md transition-shadow"
                style={{ background: "linear-gradient(135deg, #fb7185 0%, #e11d48 100%)" }}
                onClick={() => { setSelectedCategory("clothes"); setSection("categories"); }}
              >
                <span className="text-2xl">👗</span>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">Одежда</p>
                  <p className="text-white/70 text-xs mt-0.5">Стиль по выгодной цене</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-border p-4 mb-8 shadow-sm">
              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 text-sm bg-[hsl(var(--muted))] rounded-lg border-0 outline-none flex-1 min-w-[140px] text-[hsl(var(--foreground))]"
                >
                  <option value="all">Все категории</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>

                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="px-3 py-2 text-sm bg-[hsl(var(--muted))] rounded-lg border-0 outline-none flex-1 min-w-[130px] text-[hsl(var(--foreground))]"
                >
                  {CITIES.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>

                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filtersOpen ? "bg-[hsl(var(--accent))] text-white" : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                  }`}
                >
                  <Icon name="SlidersHorizontal" size={14} />
                  Фильтры
                </button>
              </div>

              {filtersOpen && (
                <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-3 animate-fade-in">
                  <span className="text-sm text-[hsl(var(--muted-foreground))] shrink-0">Цена:</span>
                  <input
                    type="number"
                    placeholder="от"
                    value={priceFrom}
                    onChange={(e) => setPriceFrom(e.target.value)}
                    className="w-24 px-3 py-2 text-sm bg-[hsl(var(--muted))] rounded-lg border-0 outline-none"
                  />
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">—</span>
                  <input
                    type="number"
                    placeholder="до"
                    value={priceTo}
                    onChange={(e) => setPriceTo(e.target.value)}
                    className="w-24 px-3 py-2 text-sm bg-[hsl(var(--muted))] rounded-lg border-0 outline-none"
                  />
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">₽</span>

                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="px-3 py-2 text-sm bg-[hsl(var(--muted))] rounded-lg border-0 outline-none text-[hsl(var(--foreground))]"
                  >
                    <option value="all">Любое состояние</option>
                    <option value="новый">Новый</option>
                    <option value="отличное">Отличное</option>
                    <option value="хорошее">Хорошее</option>
                  </select>

                  <button
                    onClick={() => { setPriceFrom(""); setPriceTo(""); setCondition("all"); setSelectedCategory("all"); setSelectedCity("Все города"); }}
                    className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] underline transition-colors"
                  >
                    Сбросить
                  </button>
                </div>
              )}
            </div>

            {/* Основной контент + правая панель */}
            <div className="flex gap-6 items-start">
              {/* Список объявлений */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Найдено <span className="font-semibold text-[hsl(var(--foreground))]">{filteredAds.length}</span> объявлений
                  </p>
                  <button className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
                    <Icon name="ArrowUpDown" size={13} />
                    По дате
                  </button>
                </div>

                {filteredAds.length === 0 ? (
                  <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">
                    <div className="text-5xl mb-4">🔍</div>
                    <p className="font-medium">Объявления не найдены</p>
                    <p className="text-sm mt-1">Попробуйте изменить параметры поиска</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredAds.map((ad) => {
                      const photos = (ad.photos && ad.photos.length > 0) ? ad.photos.slice(0, 5) : [];
                      const idx = carouselIndex[ad.id] ?? 0;
                      return (
                        <div key={ad.id} className="bg-white rounded-xl border border-border overflow-hidden hover-lift cursor-pointer group" onClick={() => setViewAdId(ad.id)}>
                          {/* Фото-карусель */}
                          <div className="aspect-[4/3] bg-[hsl(var(--muted))] relative overflow-hidden">
                            {photos.length > 0 ? (
                              <>
                                <img
                                  src={photos[idx]}
                                  alt={ad.title}
                                  className="w-full h-full object-cover transition-opacity duration-200"
                                />
                                {photos.length > 1 && (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setCarouselIndex((p) => ({ ...p, [ad.id]: (idx - 1 + photos.length) % photos.length })); }}
                                      className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Icon name="ChevronLeft" size={13} className="text-white" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setCarouselIndex((p) => ({ ...p, [ad.id]: (idx + 1) % photos.length })); }}
                                      className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Icon name="ChevronRight" size={13} className="text-white" />
                                    </button>
                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                      {photos.map((_, i) => (
                                        <button
                                          key={i}
                                          onClick={(e) => { e.stopPropagation(); setCarouselIndex((p) => ({ ...p, [ad.id]: i })); }}
                                          className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/50"}`}
                                        />
                                      ))}
                                    </div>
                                  </>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl">{ad.image || "📦"}</div>
                            )}
                            {/* Кнопка «в избранное» — всегда поверх */}
                            <button
                              onClick={(e) => { e.stopPropagation(); openAddToFolder(ad.id); }}
                              className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-110 ${favorites.includes(ad.id) ? "bg-[hsl(var(--accent))]" : "bg-white"}`}
                            >
                              <Icon name="Heart" size={13} className={favorites.includes(ad.id) ? "text-white" : "text-[hsl(var(--accent))]"} />
                            </button>
                          </div>
                          <div className="p-3">
                            <p className="font-semibold text-[hsl(var(--foreground))] text-sm leading-tight mb-1 line-clamp-2">{ad.title}</p>
                            <p className="text-[hsl(var(--accent))] font-bold text-base">{formatPrice(ad.price)}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                                <Icon name="MapPin" size={10} />
                                {ad.city}
                              </span>
                              <span className="text-xs text-[hsl(var(--muted-foreground))]">{ad.date}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Правая панель */}
              <aside className="hidden lg:flex flex-col gap-4 w-72 shrink-0">
                {/* Бесплатное объявление */}
                <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, hsl(var(--accent)) 0%, #ff8c42 100%)" }}>
                  <p className="font-bold text-lg leading-tight mb-1">Подай объявление</p>
                  <p className="text-white/80 text-sm mb-4">Бесплатно и за 2 минуты</p>
                  <button
                    onClick={openNewAd}
                    className="w-full bg-white text-[hsl(var(--accent))] font-bold py-2.5 rounded-xl text-sm hover:bg-orange-50 transition-colors"
                  >
                    Разместить
                  </button>
                </div>

                {/* Популярные категории */}
                <div className="bg-white rounded-2xl border border-border p-5">
                  <p className="font-bold mb-3">Популярные категории</p>
                  <div className="flex flex-col gap-1">
                    {CATEGORIES.slice(0, 6).map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedCategory(cat.id); }}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-sm hover:bg-[hsl(var(--muted))] transition-colors text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Icon name={cat.icon as "Home"} size={14} className="text-[hsl(var(--accent))]" />
                          {cat.label}
                        </span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{cat.count.toLocaleString("ru")}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Безопасность */}
                <div className="bg-white rounded-2xl border border-border p-5">
                  <p className="font-bold mb-2">Советы по безопасности</p>
                  <ul className="flex flex-col gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Встречайтесь в публичных местах</li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Проверяйте товар перед оплатой</li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Не переводите предоплату незнакомцам</li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Сохраняйте переписку</li>
                  </ul>
                </div>

                {/* Статистика */}
                <div className="bg-white rounded-2xl border border-border p-5">
                  <p className="font-bold mb-3">Сегодня на платформе</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[hsl(var(--muted))] rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-[hsl(var(--accent))]">{apiAds.length}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">объявлений</p>
                    </div>
                    <div className="bg-[hsl(var(--muted))] rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-[hsl(var(--accent))]">8</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">категорий</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}

        {/* CATEGORIES */}
        {section === "categories" && (
          <div className="animate-slide-up">
            <h2 className="text-2xl font-bold mb-2">Категории</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-8">Выберите раздел для поиска</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CATEGORIES.map((cat, i) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setSection("home"); }}
                  className="bg-white rounded-2xl border border-border p-6 flex flex-col items-center gap-3 hover-lift text-center group"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="w-12 h-12 bg-[hsl(var(--muted))] rounded-xl flex items-center justify-center group-hover:bg-[hsl(var(--accent))] transition-colors">
                    <Icon name={cat.icon} size={22} className="text-[hsl(var(--foreground))] group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[hsl(var(--foreground))]">{cat.label}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{cat.count.toLocaleString()} объявлений</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MY ADS */}
        {section === "my-ads" && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Мои объявления</h2>
                <p className="text-[hsl(var(--muted-foreground))] mt-1">Управляйте своими публикациями</p>
              </div>
              <button onClick={openNewAd} className="flex items-center gap-2 bg-[hsl(var(--accent))] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                <Icon name="Plus" size={15} />
                Подать объявление
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
                  <button
                    onClick={() => setMyAdsFilterFolder(null)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                      myAdsFilterFolder === null
                        ? "border-[hsl(var(--accent))] bg-orange-50 text-[hsl(var(--accent))]"
                        : "border-border hover:border-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    Все
                  </button>
                  {myAdsFolders.map((f) => (
                    <div key={f.id} className="relative group/folder flex items-center">
                      <button
                        onClick={() => setMyAdsFilterFolder(f.id)}
                        className={`flex items-center gap-1.5 pl-3 pr-7 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                          myAdsFilterFolder === f.id
                            ? "border-[hsl(var(--accent))] bg-orange-50 text-[hsl(var(--accent))]"
                            : "border-border hover:border-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]"
                        }`}
                      >
                        <Icon name="Folder" size={13} />
                        {f.name}
                        <span className="text-xs opacity-70">{f.count}</span>
                      </button>
                      <button
                        onClick={() => deleteMyAdsFolder(f.id)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center opacity-0 group-hover/folder:opacity-100 transition-opacity"
                      >
                        <Icon name="X" size={9} />
                      </button>
                    </div>
                  ))}
                  {myAdsCreatingFolder ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={myAdsNewFolderName}
                        onChange={(e) => setMyAdsNewFolderName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") createMyAdsFolder(); if (e.key === "Escape") setMyAdsCreatingFolder(false); }}
                        placeholder="Название"
                        className="px-3 py-1.5 rounded-xl text-sm border border-[hsl(var(--accent))] outline-none w-32"
                      />
                      <button onClick={createMyAdsFolder} className="p-1.5 rounded-lg bg-[hsl(var(--accent))] text-white hover:opacity-90">
                        <Icon name="Check" size={13} />
                      </button>
                      <button onClick={() => setMyAdsCreatingFolder(false)} className="p-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))]">
                        <Icon name="X" size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setMyAdsNewFolderName(""); setMyAdsCreatingFolder(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium border border-dashed border-border hover:border-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))] transition-all"
                    >
                      <Icon name="FolderPlus" size={13} />
                      Папка
                    </button>
                  )}
                </div>

                {(() => {
                  const filtered = myAdsFilterFolder === null
                    ? myAdsApi
                    : myAdsApi.filter((ad) => (myAdsFolderMap[ad.id] || []).includes(myAdsFilterFolder));

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
                        <div className="text-5xl mb-4">{myAdsFilterFolder ? "📂" : "📋"}</div>
                        <p className="font-medium">
                          {myAdsFilterFolder
                            ? `В папке «${myAdsFolders.find((f) => f.id === myAdsFilterFolder)?.name}» нет объявлений`
                            : "У вас пока нет объявлений"}
                        </p>
                        {!myAdsFilterFolder && (
                          <button onClick={openNewAd} className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">
                            Подать первое объявление
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-3">
                      {filtered.map((ad) => {
                        const adFolders = (myAdsFolderMap[ad.id] || [])
                          .map((fid) => myAdsFolders.find((f) => f.id === fid))
                          .filter(Boolean) as FavFolder[];
                        return (
                          <div key={ad.id} className="bg-white rounded-xl border border-border p-4 flex items-center gap-4">
                            <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-2xl">
                              {ad.photos && ad.photos.length > 0
                                ? <img src={ad.photos[0]} alt={ad.title} className="w-full h-full object-cover" />
                                : "📦"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{ad.title}</p>
                              <p className="text-[hsl(var(--accent))] font-bold mt-0.5">{formatPrice(ad.price)}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ad.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                  {ad.status === "active" ? "Активно" : "В архиве"}
                                </span>
                                <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                                  <Icon name="Eye" size={11} />
                                  {ad.views ?? 0}
                                </span>
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">{ad.date}</span>
                                {adFolders.map((f) => (
                                  <span key={f.id} className="flex items-center gap-1 text-xs bg-orange-50 text-[hsl(var(--accent))] px-2 py-0.5 rounded-full">
                                    <Icon name="Folder" size={10} />
                                    {f.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => setEditAdId(ad.id)}
                                className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                                title="Редактировать"
                              >
                                <Icon name="Pencil" size={15} className="text-[hsl(var(--muted-foreground))]" />
                              </button>
                              <button
                                onClick={() => { loadMyAdsFolders(); setMyAdsPickerAdId(ad.id); }}
                                className="p-2 rounded-lg hover:bg-orange-50 transition-colors"
                                title="Добавить в папку"
                              >
                                <Icon name="FolderPlus" size={15} className="text-[hsl(var(--accent))]" />
                              </button>
                              <button
                                onClick={() => toggleAdStatus(ad.id, ad.status || "active")}
                                className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                                title={ad.status === "active" ? "В архив" : "Активировать"}
                              >
                                <Icon name={ad.status === "active" ? "Archive" : "RefreshCw"} size={15} className="text-[hsl(var(--muted-foreground))]" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}

            {/* Picker: добавить объявление в папку my_ads */}
            {myAdsPickerAdId !== null && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMyAdsPickerAdId(null)} />
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
                  <button onClick={() => setMyAdsPickerAdId(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[hsl(var(--muted))]">
                    <Icon name="X" size={16} />
                  </button>
                  <h3 className="font-bold text-lg mb-1">Добавить в папку</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Папки «Мои объявления»</p>
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto mb-3">
                    {myAdsFolders.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => toggleAdInMyAdsFolder(f.id, myAdsPickerAdId)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${
                          (myAdsFolderMap[myAdsPickerAdId] || []).includes(f.id)
                            ? "border-[hsl(var(--accent))] bg-orange-50 text-[hsl(var(--accent))]"
                            : "border-border hover:border-[hsl(var(--accent))]"
                        }`}
                      >
                        <Icon name={(myAdsFolderMap[myAdsPickerAdId] || []).includes(f.id) ? "CheckSquare" : "Square"} size={16} />
                        <span className="flex-1 truncate">{f.name}</span>
                        <span className="text-xs opacity-60">{f.count}</span>
                      </button>
                    ))}
                    {myAdsFolders.length === 0 && (
                      <p className="text-sm text-center text-[hsl(var(--muted-foreground))] py-4">Нет папок — создайте первую</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      placeholder="Новая папка..."
                      value={myAdsNewFolderName}
                      onChange={(e) => setMyAdsNewFolderName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createMyAdsFolder()}
                      className="flex-1 px-3 py-2.5 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0"
                    />
                    <button onClick={createMyAdsFolder} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">
                      Создать
                    </button>
                  </div>
                  <button onClick={() => setMyAdsPickerAdId(null)} className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">
                    Готово
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MESSAGES */}
        {section === "messages" && (
          <div className="animate-slide-up max-w-2xl">
            <h2 className="text-2xl font-bold mb-2">Сообщения</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-8">Переписка с покупателями и продавцами</p>
            <div className="flex flex-col gap-2">
              {MESSAGES.map((msg) => (
                <button key={msg.id} className="bg-white rounded-xl border border-border p-4 flex items-center gap-4 hover:border-[hsl(var(--accent))] transition-colors text-left">
                  <div className="w-12 h-12 bg-[hsl(var(--accent))] rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {msg.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm">{msg.name}</p>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">{msg.time}</span>
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] truncate">{msg.text}</p>
                  </div>
                  {msg.unread > 0 && (
                    <span className="w-5 h-5 bg-[hsl(var(--accent))] text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                      {msg.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FAVORITES */}
        {section === "favorites" && (
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
              /* ── Просмотр папки ── */
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => { setActiveFolderId(null); setFolderAds([]); }} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
                    <Icon name="ArrowLeft" size={18} />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold">{favFolders.find((f) => f.id === activeFolderId)?.name}</h2>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{folderAds.length} объявлений</p>
                  </div>
                </div>
                {folderAdsLoading ? (
                  <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">Загрузка...</div>
                ) : folderAds.length === 0 ? (
                  <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
                    <div className="text-5xl mb-3">📂</div>
                    <p className="font-medium">Папка пуста</p>
                    <p className="text-sm mt-1">Добавляйте объявления через кнопку ♥ в карточке</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {folderAds.map((ad) => (
                      <div
                        key={ad.id}
                        className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                        onClick={() => setViewAdId(ad.id)}
                      >
                        {/* Фото */}
                        <div className="aspect-[16/9] bg-[hsl(var(--muted))] relative overflow-hidden">
                          {(ad.photos && ad.photos.length > 0)
                            ? <img src={ad.photos[0]} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            : <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>}
                          {/* Кнопка сердечко */}
                          <button
                            onClick={(e) => { e.stopPropagation(); openAddToFolder(ad.id); }}
                            className="absolute top-2.5 right-2.5 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow transition-transform hover:scale-110"
                          >
                            <Icon name="Heart" size={14} className="text-red-500 fill-red-500" />
                          </button>
                          {ad.photos && ad.photos.length > 1 && (
                            <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                              +{ad.photos.length - 1}
                            </span>
                          )}
                        </div>
                        {/* Контент */}
                        <div className="p-4">
                          <p className="font-semibold text-[hsl(var(--foreground))] text-sm leading-snug mb-2 line-clamp-2">{ad.title}</p>
                          <p className="text-[hsl(var(--accent))] font-bold text-lg leading-none mb-3">{formatPrice(ad.price)}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                              <Icon name="MapPin" size={10} />
                              {ad.city}
                            </span>
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">{ad.date}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* ── Список папок ── */
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-2xl font-bold">Избранное</h2>
                    <p className="text-[hsl(var(--muted-foreground))] mt-0.5 text-sm">{favFolders.length} папок</p>
                  </div>
                </div>

                {/* Фильтр-полоса с папками + кнопка создания */}
                <div className="flex gap-2 flex-wrap mb-6 items-center">
                  {favFolders.map((folder) => (
                    <div key={folder.id} className="relative group/chip flex items-center">
                      <button
                        onClick={() => { setActiveFolderId(folder.id); loadFolderAds(folder.id); }}
                        className="flex items-center gap-1.5 pl-3 pr-7 py-1.5 rounded-xl text-sm font-medium border border-border hover:border-[hsl(var(--accent))] text-[hsl(var(--foreground))] transition-all"
                      >
                        <Icon name="Folder" size={13} className="text-[hsl(var(--accent))]" />
                        {folder.name}
                        <span className="text-xs opacity-60">{folder.count}</span>
                      </button>
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover/chip:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setRenamingFolder(folder); setRenameName(folder.name); }}
                          className="w-4 h-4 rounded-full bg-gray-100 hover:bg-orange-100 hover:text-[hsl(var(--accent))] flex items-center justify-center"
                          title="Переименовать"
                        >
                          <Icon name="Pencil" size={8} />
                        </button>
                        <button
                          onClick={() => deleteFolder(folder.id)}
                          className="w-4 h-4 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center"
                          title="Удалить"
                        >
                          <Icon name="X" size={8} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {newFolderModal ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setNewFolderModal(false); }}
                        placeholder="Название"
                        className="px-3 py-1.5 rounded-xl text-sm border border-[hsl(var(--accent))] outline-none w-32"
                      />
                      <button onClick={createFolder} className="p-1.5 rounded-lg bg-[hsl(var(--accent))] text-white hover:opacity-90">
                        <Icon name="Check" size={13} />
                      </button>
                      <button onClick={() => setNewFolderModal(false)} className="p-1.5 rounded-lg border border-border hover:bg-[hsl(var(--muted))]">
                        <Icon name="X" size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setNewFolderName(""); setNewFolderModal(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium border border-dashed border-border hover:border-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))] transition-all"
                    >
                      <Icon name="FolderPlus" size={13} />
                      Папка
                    </button>
                  )}
                </div>

                {favFolders.length === 0 && !newFolderModal && (
                  <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">
                    <div className="text-5xl mb-4">📁</div>
                    <p className="font-medium">Нет папок</p>
                    <p className="text-sm mt-1">Нажмите «Папка», чтобы создать первую</p>
                  </div>
                )}
              </>
            )}

            {/* Модал: переименование */}
            {renamingFolder && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRenamingFolder(null)} />
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
                  <h3 className="font-bold text-lg mb-4">Переименовать папку</h3>
                  <input
                    autoFocus
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && renameFolder()}
                    className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0 mb-4"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setRenamingFolder(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-[hsl(var(--muted))] transition-colors">Отмена</button>
                    <button onClick={renameFolder} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">Сохранить</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROFILE */}
        {section === "profile" && (
          <div className="animate-slide-up max-w-lg">
            <h2 className="text-2xl font-bold mb-8">Личный кабинет</h2>
            {!user && (
              <div className="bg-white rounded-2xl border border-border p-8 text-center mb-4">
                <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="User" size={28} className="text-[hsl(var(--muted-foreground))]" />
                </div>
                <p className="font-semibold mb-1">Вы не авторизованы</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Войдите, чтобы управлять профилем</p>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => openAuth("login")} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-[hsl(var(--muted))] transition-colors">Войти</button>
                  <button onClick={() => openAuth("register")} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">Регистрация</button>
                </div>
              </div>
            )}
            {user && (
              <>
                <div className="bg-white rounded-2xl border border-border p-6 mb-4">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-[hsl(var(--accent))] rounded-full flex items-center justify-center text-white text-2xl font-bold">{user.name[0].toUpperCase()}</div>
                    <div>
                      <p className="font-bold text-lg">{user.name}</p>
                      <p className="text-[hsl(var(--muted-foreground))] text-sm">{user.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pb-6 border-b border-border">
                    {[{ label: "Объявлений", value: "3" }, { label: "Продаж", value: "12" }, { label: "Отзывов", value: "8" }].map((s) => (
                      <div key={s.label} className="text-center">
                        <p className="text-2xl font-bold">{s.value}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-col gap-1">
                    {[
                      { icon: "UserCog", label: "Редактировать профиль" },
                      { icon: "Bell", label: "Уведомления" },
                      { icon: "Shield", label: "Безопасность" },
                      { icon: "CreditCard", label: "Способы оплаты" },
                    ].map((item) => (
                      <button key={item.label} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors text-left">
                        <div className="flex items-center gap-3">
                          <Icon name={item.icon} size={18} className="text-[hsl(var(--muted-foreground))]" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <Icon name="ChevronRight" size={16} className="text-[hsl(var(--muted-foreground))]" />
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={logout} className="w-full py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors border border-red-100">
                  Выйти из аккаунта
                </button>
              </>
            )}
          </div>
        )}

        {/* CONTACTS */}
        {section === "contacts" && (
          <div className="animate-slide-up max-w-xl">
            <h2 className="text-2xl font-bold mb-2">Контакты</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-8">Свяжитесь с нами любым удобным способом</p>
            <div className="grid gap-4 mb-8">
              {[
                { icon: "Mail", label: "Email", value: "support@board.ru" },
                { icon: "Phone", label: "Телефон", value: "+7 (800) 555-01-01" },
                { icon: "MapPin", label: "Адрес", value: "Москва, ул. Примерная, 1" },
                { icon: "Clock", label: "Режим работы", value: "Пн–Пт, 9:00–18:00" },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl border border-border p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-[hsl(var(--muted))] rounded-lg flex items-center justify-center shrink-0">
                    <Icon name={item.icon} size={18} className="text-[hsl(var(--accent))]" />
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.label}</p>
                    <p className="font-medium text-sm mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-border p-6">
              <h3 className="font-bold mb-4">Написать нам</h3>
              <div className="flex flex-col gap-3">
                <input placeholder="Ваше имя" className="px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]" />
                <input placeholder="Email" className="px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]" />
                <textarea rows={4} placeholder="Ваше сообщение..." className="px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] resize-none" />
                <button className="bg-[hsl(var(--accent))] text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                  Отправить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Глобальный модал: добавить объявление в папку избранного */}
        {addToFolderAdId !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAddToFolderAdId(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
              <button onClick={() => setAddToFolderAdId(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[hsl(var(--muted))]">
                <Icon name="X" size={16} />
              </button>
              <h3 className="font-bold text-lg mb-1">Сохранить в избранное</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Выберите папки</p>
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto mb-3">
                {favFolders.length === 0 && (
                  <p className="text-sm text-center text-[hsl(var(--muted-foreground))] py-3">Нет папок — создайте первую ниже</p>
                )}
                {favFolders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => toggleAdInFolder(f.id, addToFolderAdId)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${
                      adFolderIds.includes(f.id)
                        ? "border-[hsl(var(--accent))] bg-orange-50 text-[hsl(var(--accent))]"
                        : "border-border hover:border-[hsl(var(--accent))]"
                    }`}
                  >
                    <Icon name={adFolderIds.includes(f.id) ? "CheckSquare" : "Square"} size={16} />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{f.count}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  placeholder="Новая папка..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createFolder()}
                  className="flex-1 px-3 py-2.5 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0"
                />
                <button onClick={createFolder} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">
                  +
                </button>
              </div>
              <button
                onClick={() => setAddToFolderAdId(null)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity"
              >
                Готово
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border px-2 py-2 flex justify-around z-50">
        {navItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors relative ${
              section === item.id ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--muted-foreground))]"
            }`}
          >
            <Icon name={item.icon} size={20} />
            <span className="text-[10px] font-medium">{item.label.split(" ")[0]}</span>
            {item.id === "messages" && (
              <span className="absolute top-0 right-2 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">3</span>
            )}
          </button>
        ))}
      </nav>

      {/* Auth Modal */}
      {authModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAuthModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
            {/* Close */}
            <button onClick={() => setAuthModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
              <Icon name="X" size={16} className="text-[hsl(var(--muted-foreground))]" />
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-[hsl(var(--accent))] rounded-lg flex items-center justify-center">
                <Icon name="Tag" size={16} className="text-white" />
              </div>
              <span className="font-semibold text-base">Объявления</span>
            </div>

            {/* Tabs — показываем только на шаге формы */}
            {authStep === "form" && (
              <div className="flex gap-1 bg-[hsl(var(--muted))] p-1 rounded-xl mb-6">
                <button
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${authMode === "login" ? "bg-white shadow-sm text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}
                >
                  Войти
                </button>
                <button
                  onClick={() => { setAuthMode("register"); setAuthError(""); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${authMode === "register" ? "bg-white shadow-sm text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}
                >
                  Регистрация
                </button>
              </div>
            )}

            {/* ШАГ 1: форма входа / регистрации */}
            {authStep === "form" && (
              <div className="flex flex-col gap-3">
                {authMode === "register" && (
                  <div>
                    <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">Ваше имя</label>
                    <input
                      placeholder="Алексей"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">Email</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">Пароль</label>
                  <input
                    type="password"
                    placeholder={authMode === "register" ? "Минимум 6 символов" : "Ваш пароль"}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (authMode === "login" ? submitAuth() : sendCode())}
                    className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all"
                  />
                </div>

                {authError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2.5 rounded-xl text-sm">
                    <Icon name="AlertCircle" size={15} />
                    {authError}
                  </div>
                )}

                <button
                  onClick={authMode === "login" ? submitAuth : sendCode}
                  disabled={authLoading}
                  className="w-full bg-[hsl(var(--accent))] text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity mt-1 disabled:opacity-60"
                >
                  {authLoading ? "Загрузка..." : authMode === "login" ? "Войти" : "Получить код →"}
                </button>

                <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
                  {authMode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
                  <button
                    onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}
                    className="text-[hsl(var(--accent))] font-medium hover:underline"
                  >
                    {authMode === "login" ? "Зарегистрироваться" : "Войти"}
                  </button>
                </p>
              </div>
            )}

            {/* ШАГ 2: ввод кода из письма */}
            {authStep === "code" && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="text-center">
                  <div className="w-14 h-14 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icon name="Mail" size={24} className="text-[hsl(var(--accent))]" />
                  </div>
                  <p className="font-semibold text-[hsl(var(--foreground))]">Проверьте почту</p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    Мы отправили 6-значный код на<br />
                    <span className="font-medium text-[hsl(var(--foreground))]">{authEmail}</span>
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block text-center">Код подтверждения</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="______"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && submitAuth()}
                    className="w-full px-4 py-4 bg-[hsl(var(--muted))] rounded-xl text-xl text-center font-bold tracking-[0.5em] border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all"
                  />
                </div>

                {authError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2.5 rounded-xl text-sm">
                    <Icon name="AlertCircle" size={15} />
                    {authError}
                  </div>
                )}

                <button
                  onClick={submitAuth}
                  disabled={authLoading || authCode.length !== 6}
                  className="w-full bg-[hsl(var(--accent))] text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {authLoading ? "Проверяем..." : "Подтвердить"}
                </button>

                <div className="text-center text-sm text-[hsl(var(--muted-foreground))]">
                  {resendTimer > 0 ? (
                    <span>Отправить повторно через {resendTimer} с</span>
                  ) : (
                    <button
                      onClick={() => { setAuthError(""); sendCode(); }}
                      className="text-[hsl(var(--accent))] font-medium hover:underline"
                    >
                      Отправить повторно
                    </button>
                  )}
                </div>

                <button
                  onClick={() => { setAuthStep("form"); setAuthError(""); setAuthCode(""); }}
                  className="text-center text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  ← Изменить данные
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}