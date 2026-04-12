import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import CreateAd from "@/pages/CreateAd";
import EditAd from "@/pages/EditAd";
import AdDetail from "@/pages/AdDetail";
import { toast } from "sonner";

import {
  AUTH_URL, ADS_URL, FAV_URL,
  User, Ad, Section, FavFolder, DbCategory,
} from "./index/types";
import AuthModal from "./index/AuthModal";
import {
  HomeSection, CategoriesSection, MyAdsSection,
  MessagesSection, FavoritesSection, ProfileSection, ContactsSection,
} from "./index/SectionViews";

export default function Index() {
  const navigate = useNavigate();
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

  // Categories from DB
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);

  // Ads from API
  const [apiAds, setApiAds] = useState<Ad[]>([]);
  const [adsPage, setAdsPage] = useState(1);
  const [adsTotal, setAdsTotal] = useState(0);
  const [adsPerPage, setAdsPerPage] = useState(40);
  const [adsLoadingMore, setAdsLoadingMore] = useState(false);
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
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<"ads" | "settings">("ads");
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editAbout, setEditAbout] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    if (!sid) return;
    fetch(AUTH_URL, { headers: { "X-Session-Id": sid } })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setUser(d.user); })
      .catch(() => {});
  }, []);

  // Загрузка категорий из БД
  const loadCategories = () => {
    fetch(ADS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "categories" }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.ok && d.categories.length > 0) setDbCategories(d.categories); })
      .catch(() => {});
  };

  // Загрузка объявлений с API (серверная пагинация + фильтры)
  const loadAds = (page = 1, append = false) => {
    if (page === 1) setAdsLoading(true); else setAdsLoadingMore(true);
    const body: Record<string, unknown> = { action: "list", page };
    if (selectedCategory !== "all") {
      const dbCat = dbCategories.find((c) => String(c.id) === selectedCategory);
      if (dbCat) body.category_id = dbCat.id; else body.category = selectedCategory;
    }
    if (selectedCity !== "Все города") body.city = selectedCity;
    if (priceFrom) body.price_from = priceFrom;
    if (priceTo) body.price_to = priceTo;
    if (condition !== "all") body.condition = condition;
    if (searchQuery) body.search = searchQuery;
    fetch(ADS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setApiAds((prev) => append ? [...prev, ...d.ads] : d.ads);
          setAdsTotal(d.total ?? 0);
          setAdsPerPage(d.per_page ?? 40);
          setAdsPage(page);
        }
      })
      .catch(() => {})
      .finally(() => { setAdsLoading(false); setAdsLoadingMore(false); });
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

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadAds(1, false); }, [selectedCategory, selectedCity, priceFrom, priceTo, condition, searchQuery]);
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

  const sendCode = async () => {
    setAuthError("");
    if (!authEmail || !authEmail.includes("@")) { setAuthError("Укажите корректный email"); return; }
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

  const uploadPhoto = async (file: File, type: "avatar" | "cover") => {
    const reader = new FileReader();
    return new Promise<string>((resolve, reject) => {
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const res = await fetch(AUTH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session-Id": localStorage.getItem("session_id") || "" },
          body: JSON.stringify({ action: "upload_photo", type, data: dataUrl }),
        });
        const d = await res.json();
        if (d.ok) resolve(d.url);
        else reject(d.error);
      };
      reader.readAsDataURL(file);
    });
  };

  const saveProfile = async () => {
    setEditSaving(true);
    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": localStorage.getItem("session_id") || "" },
      body: JSON.stringify({ action: "update_profile", name: editName, city: editCity, about: editAbout }),
    });
    const d = await res.json();
    if (d.ok) {
      setUser(d.user);
      setEditProfileOpen(false);
      toast.success("Профиль обновлён");
    }
    setEditSaving(false);
  };

  const filteredAds = apiAds;
  const hasMore = apiAds.length < adsTotal;

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  };
  void toggleFavorite; // используется через favorites state

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
    const newIds = inFolder ? adFolderIds.filter((id) => id !== folderId) : [...adFolderIds, folderId];
    setAdFolderIds(newIds);
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

  const [openRootId, setOpenRootId] = useState<number | null>(null);
  const [catPath, setCatPath] = useState<number[]>([]);

  const navItems: { id: Section; label: string; icon: string }[] = [
    { id: "home", label: "Главная", icon: "Home" },
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
                  <div className="relative">
                    <div className="w-7 h-7 bg-[hsl(var(--accent))] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {user.name[0].toUpperCase()}
                    </div>
                  </div>
                  <span className="relative text-sm font-medium max-w-[100px] truncate">
                    {user.name}
                    <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full" />
                  </span>
                  <Icon name={userMenuOpen ? "ChevronUp" : "ChevronDown"} size={14} className="text-[hsl(var(--muted-foreground))]" />
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-white rounded-xl shadow-lg border border-border py-1.5 animate-fade-in">
                      <button onClick={() => { setSection("profile"); setUserMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors text-left">
                        <Icon name="User" size={15} className="text-[hsl(var(--muted-foreground))]" />Личный кабинет
                      </button>
                      <button onClick={() => { setSection("my-ads"); setUserMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors text-left">
                        <Icon name="FileText" size={15} className="text-[hsl(var(--muted-foreground))]" />Мои объявления
                      </button>
                      <button onClick={() => { setSection("favorites"); setUserMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors text-left">
                        <Icon name="Heart" size={15} className="text-[hsl(var(--muted-foreground))]" />Избранное
                      </button>
                      <button onClick={() => { setSection("messages"); setUserMenuOpen(false); }} className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors text-left">
                        <span className="flex items-center gap-2.5"><Icon name="MessageCircle" size={15} className="text-[hsl(var(--muted-foreground))]" />Сообщения</span>
                        <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
                      </button>
                      <div className="my-1 border-t border-border" />
                      <button onClick={() => { logout(); setUserMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-red-50 text-red-500 transition-colors text-left">
                        <Icon name="LogOut" size={15} />Выйти
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <button onClick={() => openAuth("login")} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-[hsl(var(--muted))] transition-colors">Войти</button>
                <button onClick={() => openAuth("register")} className="px-4 py-2 rounded-lg text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">Регистрация</button>
              </>
            )}
          </div>
        </div>

        {/* Полоса категорий */}
        {dbCategories.filter((c) => !c.parent_id).length > 0 && (
          <div className="hidden md:block border-t border-border">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex items-center gap-0">
                {dbCategories.filter((c) => !c.parent_id).map((root) => {
                  const hasChildren = dbCategories.some((c) => c.parent_id === root.id);
                  const isOpen = openRootId === root.id;
                  const currentPathId = catPath.length > 0 ? catPath[catPath.length - 1] : root.id;
                  const currentCat = dbCategories.find((c) => c.id === currentPathId);
                  const visibleItems = dbCategories.filter((c) =>
                    catPath.length === 0 ? c.parent_id === root.id : c.parent_id === currentPathId
                  );

                  // строим URL для «Все в разделе»
                  const allUrl = catPath.length === 0
                    ? `/${root.slug}`
                    : catPath.length === 1
                      ? `/${root.slug}/${currentCat?.slug}`
                      : `/${root.slug}/${currentCat?.slug}`;

                  return (
                    <div key={root.id} className="relative shrink-0">
                      {/* Кнопка корневой категории */}
                      <button
                        onClick={() => {
                          if (isOpen) { setOpenRootId(null); setCatPath([]); }
                          else if (hasChildren) { setOpenRootId(root.id); setCatPath([]); }
                          else { navigate(`/${root.slug}`); }
                        }}
                        className={`flex items-center gap-1 px-3 py-2.5 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                          isOpen ? "border-[hsl(var(--accent))] text-[hsl(var(--accent))]"
                            : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                        }`}
                      >
                        {root.name}
                        {hasChildren && <Icon name={isOpen ? "ChevronUp" : "ChevronDown"} size={12} className="opacity-60" />}
                      </button>

                      {/* Выпадающая панель */}
                      {isOpen && hasChildren && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => { setOpenRootId(null); setCatPath([]); }} />
                          <div className="absolute left-0 top-full z-50 bg-white border border-border border-t-0 shadow-2xl w-64 overflow-hidden">

                            {/* Шапка с навигацией (когда зашли глубже) */}
                            {catPath.length > 0 && (
                              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-[hsl(var(--muted))]">
                                <button
                                  onClick={() => setCatPath((p) => p.slice(0, -1))}
                                  className="p-1 rounded hover:bg-white transition-colors shrink-0"
                                >
                                  <Icon name="ChevronLeft" size={14} className="text-[hsl(var(--foreground))]" />
                                </button>
                                <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] overflow-hidden">
                                  <button onClick={() => setCatPath([])} className="hover:text-[hsl(var(--accent))] shrink-0 truncate">
                                    {root.name}
                                  </button>
                                  {catPath.map((id, i) => {
                                    const c = dbCategories.find((x) => x.id === id);
                                    return (
                                      <span key={id} className="flex items-center gap-1 shrink-0">
                                        <span>/</span>
                                        <button
                                          onClick={() => setCatPath((p) => p.slice(0, i + 1))}
                                          className="hover:text-[hsl(var(--accent))] truncate max-w-[80px]"
                                        >
                                          {c?.name}
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* «Все в разделе» */}
                            <button
                              onClick={() => { navigate(allUrl); setOpenRootId(null); setCatPath([]); }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[hsl(var(--accent))] hover:bg-orange-50 transition-colors text-left"
                            >
                              <Icon name="LayoutGrid" size={13} />
                              Все в «{currentCat?.name ?? root.name}»
                            </button>
                            <div className="border-t border-border" />

                            {/* Список текущего уровня */}
                            <div className="overflow-y-auto max-h-[60vh]">
                              {visibleItems.map((cat) => {
                                const hasSub = dbCategories.some((c) => c.parent_id === cat.id);
                                const catUrl = `/${root.slug}/${cat.slug}`;
                                return (
                                  <button
                                    key={cat.id}
                                    onClick={() => {
                                      if (hasSub) {
                                        setCatPath((p) => [...p, cat.id]);
                                      } else {
                                        navigate(catUrl);
                                        setOpenRootId(null);
                                        setCatPath([]);
                                      }
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--accent))] transition-colors text-left group"
                                  >
                                    <span>{cat.name}</span>
                                    {hasSub
                                      ? <Icon name="ChevronRight" size={13} className="shrink-0 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--accent))]" />
                                      : <Icon name="ArrowRight" size={12} className="shrink-0 opacity-0 group-hover:opacity-40" />
                                    }
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-white animate-fade-in">
            <div className="px-4 py-3">
              <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-3 py-2 text-sm bg-[hsl(var(--muted))] rounded-lg outline-none" />
            </div>
            <div className="px-4 pb-3 flex flex-col gap-1">
              {navItems.map((item) => (
                <button key={item.id} onClick={() => { setSection(item.id); setMobileMenuOpen(false); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${section === item.id ? "bg-[hsl(var(--accent))] text-white" : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"}`}>
                  <Icon name={item.icon} size={16} />{item.label}
                </button>
              ))}
              {/* Категории в мобильном меню */}
              {dbCategories.filter((c) => !c.parent_id).map((cat) => (
                <button key={cat.id} onClick={() => { navigate(`/${cat.slug}`); setMobileMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]">
                  <Icon name="Tag" size={16} />{cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">

        {section === "home" && (
          <HomeSection
            dbCategories={dbCategories}
            filteredAds={filteredAds}
            favorites={favorites}
            carouselIndex={carouselIndex}
            setCarouselIndex={setCarouselIndex}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedCity={selectedCity}
            setSelectedCity={setSelectedCity}
            priceFrom={priceFrom}
            setPriceFrom={setPriceFrom}
            priceTo={priceTo}
            setPriceTo={setPriceTo}
            condition={condition}
            setCondition={setCondition}
            filtersOpen={filtersOpen}
            setFiltersOpen={setFiltersOpen}
            apiAds={apiAds}
            setViewAdId={setViewAdId}
            openAddToFolder={openAddToFolder}
            openNewAd={openNewAd}
            setSection={setSection}
            adsLoading={adsLoading}
            adsTotal={adsTotal}
            hasMore={hasMore}
            adsLoadingMore={adsLoadingMore}
            onLoadMore={() => loadAds(adsPage + 1, true)}
          />
        )}

        {section === "categories" && (
          <CategoriesSection
            dbCategories={dbCategories}
            setSelectedCategory={setSelectedCategory}
            setSection={setSection}
          />
        )}

        {section === "my-ads" && (
          <MyAdsSection
            user={user}
            myAdsApi={myAdsApi}
            myAdsFolders={myAdsFolders}
            myAdsFilterFolder={myAdsFilterFolder}
            setMyAdsFilterFolder={setMyAdsFilterFolder}
            myAdsFolderMap={myAdsFolderMap}
            myAdsCreatingFolder={myAdsCreatingFolder}
            setMyAdsCreatingFolder={setMyAdsCreatingFolder}
            myAdsNewFolderName={myAdsNewFolderName}
            setMyAdsNewFolderName={setMyAdsNewFolderName}
            myAdsPickerAdId={myAdsPickerAdId}
            setMyAdsPickerAdId={setMyAdsPickerAdId}
            openNewAd={openNewAd}
            openAuth={openAuth}
            setEditAdId={(id) => setEditAdId(id)}
            setViewAdId={setViewAdId}
            toggleAdStatus={toggleAdStatus}
            createMyAdsFolder={createMyAdsFolder}
            deleteMyAdsFolder={deleteMyAdsFolder}
            toggleAdInMyAdsFolder={toggleAdInMyAdsFolder}
            loadMyAdsFolders={loadMyAdsFolders}
          />
        )}

        {section === "messages" && <MessagesSection />}

        {section === "favorites" && (
          <FavoritesSection
            user={user}
            favFolders={favFolders}
            activeFolderId={activeFolderId}
            setActiveFolderId={setActiveFolderId}
            folderAds={folderAds}
            setFolderAds={setFolderAds}
            folderAdsLoading={folderAdsLoading}
            newFolderModal={newFolderModal}
            setNewFolderModal={setNewFolderModal}
            newFolderName={newFolderName}
            setNewFolderName={setNewFolderName}
            renamingFolder={renamingFolder}
            setRenamingFolder={setRenamingFolder}
            renameName={renameName}
            setRenameName={setRenameName}
            adFolderIds={adFolderIds}
            addToFolderAdId={addToFolderAdId}
            setAddToFolderAdId={setAddToFolderAdId}
            openAuth={openAuth}
            loadFolderAds={loadFolderAds}
            createFolder={createFolder}
            renameFolder={renameFolder}
            deleteFolder={deleteFolder}
            toggleAdInFolder={toggleAdInFolder}
            setViewAdId={setViewAdId}
            openAddToFolder={openAddToFolder}
            favorites={favorites}
          />
        )}

        {section === "profile" && (
          <ProfileSection
            user={user}
            myAdsApi={myAdsApi}
            coverPhoto={coverPhoto}
            setCoverPhoto={setCoverPhoto}
            profileTab={profileTab}
            setProfileTab={setProfileTab}
            editProfileOpen={editProfileOpen}
            setEditProfileOpen={setEditProfileOpen}
            editName={editName}
            setEditName={setEditName}
            editCity={editCity}
            setEditCity={setEditCity}
            editAbout={editAbout}
            setEditAbout={setEditAbout}
            editSaving={editSaving}
            setUser={setUser}
            openAuth={openAuth}
            openNewAd={openNewAd}
            setViewAdId={setViewAdId}
            setEditAdId={(id) => setEditAdId(id)}
            toggleAdStatus={toggleAdStatus}
            saveProfile={saveProfile}
            uploadPhoto={uploadPhoto}
            logout={logout}
            setSection={setSection}
          />
        )}

        {section === "contacts" && <ContactsSection />}
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