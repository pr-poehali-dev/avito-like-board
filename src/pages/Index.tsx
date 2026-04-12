import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
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
  const [mobileMenuOpen] = useState(false);
  const [userMenuOpen] = useState(false);

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

  // Auth
  const {
    user, setUser,
    authModal, setAuthModal,
    authMode, setAuthMode,
    authStep, setAuthStep,
    authName, setAuthName,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    authCode, setAuthCode,
    authError, setAuthError,
    authLoading, resendTimer,
    openAuth, sendCode, submitAuth,
    logout: logoutBase,
  } = useAuth();

  const logout = async () => {
    await logoutBase();
    setSection("home");
  };

  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [profileTab, setProfileTab] = useState<"ads" | "settings">("ads");
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editAbout, setEditAbout] = useState("");
  const [editSaving, setEditSaving] = useState(false);

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

  void mobileMenuOpen;
  void userMenuOpen;

  const navItems = [
    { id: "home" as Section, label: "Главная", icon: "Home" },
    { id: "my-ads" as Section, label: "Мои объявления", icon: "FileText" },
    { id: "favorites" as Section, label: "Избранное", icon: "Heart" },
    { id: "messages" as Section, label: "Сообщения", icon: "MessageCircle" },
    { id: "contacts" as Section, label: "Контакты", icon: "Phone" },
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
        currentUserId={user?.id ?? null}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] font-golos">
      <SiteHeader
        dbCategories={dbCategories}
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogoClick={() => setSection("home")}
        onNewAd={openNewAd}
        onLogin={() => openAuth("login")}
        onRegister={() => openAuth("register")}
        onLogout={logout}
        activeSection={section}
        onNavSection={(s) => setSection(s as typeof section)}
      />

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
            adsPerPage={adsPerPage}
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