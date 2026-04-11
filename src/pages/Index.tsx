import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import CreateAd from "@/pages/CreateAd";

const AUTH_URL = "https://functions.poehali.dev/8b2cd80b-f20b-45b5-8696-018d10b4eb52";
const ADS_URL = "https://functions.poehali.dev/26941b84-1198-4969-8e13-07523f9f04d0";

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
}

type Section = "home" | "categories" | "my-ads" | "profile" | "messages" | "favorites" | "contacts";

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

  // Ads from API
  const [apiAds, setApiAds] = useState<Ad[]>([]);
  const [myAdsApi, setMyAdsApi] = useState<Ad[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);

  const [showCreateAd, setShowCreateAd] = useState(false);

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

  const navItems: { id: Section; label: string; icon: string }[] = [
    { id: "home", label: "Главная", icon: "Home" },
    { id: "categories", label: "Категории", icon: "LayoutGrid" },
    { id: "my-ads", label: "Мои объявления", icon: "FileText" },
    { id: "messages", label: "Сообщения", icon: "MessageCircle" },
    { id: "favorites", label: "Избранное", icon: "Heart" },
    { id: "contacts", label: "Контакты", icon: "Phone" },
    { id: "profile", label: "Кабинет", icon: "User" },
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
              <button
                onClick={() => setSection("profile")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <div className="w-7 h-7 bg-[hsl(var(--accent))] rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user.name[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium max-w-[100px] truncate">{user.name}</span>
              </button>
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
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Найдите всё, что нужно</h1>
              <p className="text-[hsl(var(--muted-foreground))]">Тысячи объявлений от реальных людей рядом с вами</p>
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAds.map((ad) => (
                  <div key={ad.id} className="bg-white rounded-xl border border-border overflow-hidden hover-lift cursor-pointer">
                    <div className="aspect-[4/3] bg-[hsl(var(--muted))] flex items-center justify-center text-4xl relative">
                      {ad.image}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(ad.id); }}
                        className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-110"
                      >
                        <Icon
                          name="Heart"
                          size={14}
                          className={favorites.includes(ad.id) ? "text-red-500 fill-red-500" : "text-[hsl(var(--muted-foreground))]"}
                        />
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
                ))}
              </div>
            )}
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
            <div className="flex items-center justify-between mb-8">
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
            {user && myAdsApi.length === 0 && (
              <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
                <div className="text-5xl mb-4">📋</div>
                <p className="font-medium">У вас пока нет объявлений</p>
                <button onClick={openNewAd} className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">
                  Подать первое объявление
                </button>
              </div>
            )}
            {user && myAdsApi.length > 0 && (
              <div className="flex flex-col gap-3">
                {myAdsApi.map((ad) => (
                  <div key={ad.id} className="bg-white rounded-xl border border-border p-4 flex items-center gap-4">
                    <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-lg flex items-center justify-center text-2xl shrink-0">📦</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{ad.title}</p>
                      <p className="text-[hsl(var(--accent))] font-bold mt-0.5">{formatPrice(ad.price)}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ad.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {ad.status === "active" ? "Активно" : "В архиве"}
                        </span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                          <Icon name="Eye" size={11} />
                          {ad.views ?? 0} просмотров
                        </span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{ad.date}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => toggleAdStatus(ad.id, ad.status || "active")}
                        className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
                        title={ad.status === "active" ? "В архив" : "Активировать"}
                      >
                        <Icon name={ad.status === "active" ? "Archive" : "RefreshCw"} size={15} className="text-[hsl(var(--muted-foreground))]" />
                      </button>
                    </div>
                  </div>
                ))}
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
            <h2 className="text-2xl font-bold mb-2">Избранное</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-8">{favoriteAds.length} сохранённых объявлений</p>
            {favoriteAds.length === 0 ? (
              <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">
                <div className="text-5xl mb-4">🤍</div>
                <p className="font-medium">Пока ничего нет</p>
                <p className="text-sm mt-1">Нажмите на сердечко, чтобы сохранить объявление</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {favoriteAds.map((ad) => (
                  <div key={ad.id} className="bg-white rounded-xl border border-border overflow-hidden hover-lift cursor-pointer">
                    <div className="aspect-[4/3] bg-[hsl(var(--muted))] flex items-center justify-center text-4xl relative">
                      {ad.image}
                      <button
                        onClick={() => toggleFavorite(ad.id)}
                        className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm"
                      >
                        <Icon name="Heart" size={14} className="text-red-500 fill-red-500" />
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm leading-tight mb-1 line-clamp-2">{ad.title}</p>
                      <p className="text-[hsl(var(--accent))] font-bold">{formatPrice(ad.price)}</p>
                      <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 mt-2">
                        <Icon name="MapPin" size={10} />
                        {ad.city}
                      </span>
                    </div>
                  </div>
                ))}
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