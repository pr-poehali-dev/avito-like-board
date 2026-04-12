import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { DbCategory, User } from "@/pages/index/types";

interface SiteHeaderProps {
  dbCategories: DbCategory[];
  user: User | null;
  searchQuery?: string;
  onSearchChange?: (v: string) => void;
  onLogoClick?: () => void;
  onNewAd?: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
  onLogout?: () => void;
  onNavProfile?: () => void;
  onNavMyAds?: () => void;
  onNavFavorites?: () => void;
  onNavMessages?: () => void;
  activeSection?: string;
  onNavSection?: (s: string) => void;
}

const NAV_ITEMS = [
  { id: "home", label: "Главная", icon: "Home" },
];

export default function SiteHeader({
  dbCategories, user,
  searchQuery = "", onSearchChange,
  onLogoClick, onNewAd,
  onLogin, onRegister, onLogout,
  onNavProfile, onNavMyAds, onNavFavorites, onNavMessages,
  activeSection, onNavSection,
}: SiteHeaderProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openRootId, setOpenRootId] = useState<number | null>(null);
  const [catPath, setCatPath] = useState<number[]>([]);

  const handleLogoClick = () => {
    if (onLogoClick) onLogoClick(); else navigate("/");
  };

  const handleNav = (id: string) => {
    if (onNavSection) { onNavSection(id); return; }
    if (id === "profile" && onNavProfile) onNavProfile();
    else if (id === "my-ads" && onNavMyAds) onNavMyAds();
    else if (id === "favorites" && onNavFavorites) onNavFavorites();
    else if (id === "messages" && onNavMessages) onNavMessages();
    else navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      {/* Основная строка */}
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Лого */}
        <button onClick={handleLogoClick} className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-[hsl(var(--accent))] rounded-lg flex items-center justify-center">
            <Icon name="Tag" size={16} className="text-white" />
          </div>
          <span className="font-semibold text-[17px] tracking-tight text-[hsl(var(--foreground))]">Объявления</span>
        </button>

        {/* Поиск */}
        <div className="flex-1 relative hidden md:block">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Поиск объявлений..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-[hsl(var(--muted))] rounded-lg border-0 outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all placeholder:text-[hsl(var(--muted-foreground))]"
          />
        </div>

        {/* Навигация */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeSection === item.id
                  ? "bg-[hsl(var(--accent))] text-white"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              <Icon name={item.icon as "Home"} size={15} />
              <span className="hidden lg:inline">{item.label}</span>
              {item.id === "messages" && (
                <span className="w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
              )}
            </button>
          ))}
        </nav>

        {/* Мобильный бургер */}
        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="md:hidden ml-auto p-2 rounded-lg hover:bg-[hsl(var(--muted))]"
        >
          <Icon name={mobileMenuOpen ? "X" : "Menu"} size={20} />
        </button>

        {/* Правая часть — кнопки */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            onClick={onNewAd}
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
                    <button onClick={() => { handleNav("profile"); setUserMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors text-left">
                      <Icon name="User" size={15} className="text-[hsl(var(--muted-foreground))]" />Личный кабинет
                    </button>
                    <button onClick={() => { handleNav("my-ads"); setUserMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors text-left">
                      <Icon name="FileText" size={15} className="text-[hsl(var(--muted-foreground))]" />Мои объявления
                    </button>
                    <button onClick={() => { handleNav("favorites"); setUserMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors text-left">
                      <Icon name="Heart" size={15} className="text-[hsl(var(--muted-foreground))]" />Избранное
                    </button>
                    <button onClick={() => { handleNav("messages"); setUserMenuOpen(false); }} className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors text-left">
                      <span className="flex items-center gap-2.5"><Icon name="MessageCircle" size={15} className="text-[hsl(var(--muted-foreground))]" />Сообщения</span>
                      <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
                    </button>
                    <div className="my-1 border-t border-border" />
                    <button onClick={() => { onLogout?.(); setUserMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-red-50 text-red-500 transition-colors text-left">
                      <Icon name="LogOut" size={15} />Выйти
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <button onClick={onLogin} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-[hsl(var(--muted))] transition-colors">Войти</button>
              <button onClick={onRegister} className="px-4 py-2 rounded-lg text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">Регистрация</button>
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
                const allUrl = catPath.length === 0 ? `/${root.slug}` : `/${root.slug}/${currentCat?.slug}`;

                return (
                  <div key={root.id} className="relative shrink-0">
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

                    {isOpen && hasChildren && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => { setOpenRootId(null); setCatPath([]); }} />
                        <div className="absolute left-0 top-full z-50 bg-white border border-border border-t-0 shadow-2xl w-64 overflow-hidden">
                          {catPath.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-[hsl(var(--muted))]">
                              <button onClick={() => setCatPath((p) => p.slice(0, -1))} className="p-1 rounded hover:bg-white transition-colors shrink-0">
                                <Icon name="ChevronLeft" size={14} className="text-[hsl(var(--foreground))]" />
                              </button>
                              <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] overflow-hidden">
                                <button onClick={() => setCatPath([])} className="hover:text-[hsl(var(--accent))] shrink-0 truncate">{root.name}</button>
                                {catPath.map((id, i) => {
                                  const c = dbCategories.find((x) => x.id === id);
                                  return (
                                    <span key={id} className="flex items-center gap-1 shrink-0">
                                      <span>/</span>
                                      <button onClick={() => setCatPath((p) => p.slice(0, i + 1))} className="hover:text-[hsl(var(--accent))] truncate max-w-[80px]">{c?.name}</button>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => { navigate(allUrl); setOpenRootId(null); setCatPath([]); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[hsl(var(--accent))] hover:bg-orange-50 transition-colors text-left"
                          >
                            <Icon name="LayoutGrid" size={13} />
                            Все в «{currentCat?.name ?? root.name}»
                          </button>
                          <div className="border-t border-border" />
                          <div className="overflow-y-auto max-h-[60vh]">
                            {visibleItems.map((cat) => {
                              const hasSub = dbCategories.some((c) => c.parent_id === cat.id);
                              return (
                                <button
                                  key={cat.id}
                                  onClick={() => {
                                    if (hasSub) { setCatPath((p) => [...p, cat.id]); }
                                    else { navigate(`/${root.slug}/${cat.slug}`); setOpenRootId(null); setCatPath([]); }
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

      {/* Мобильное меню */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-white animate-fade-in">
          <div className="px-4 py-3">
            <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => onSearchChange?.(e.target.value)} className="w-full px-3 py-2 text-sm bg-[hsl(var(--muted))] rounded-lg outline-none" />
          </div>
          <div className="px-4 pb-3 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <button key={item.id} onClick={() => { handleNav(item.id); setMobileMenuOpen(false); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${activeSection === item.id ? "bg-[hsl(var(--accent))] text-white" : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"}`}>
                <Icon name={item.icon as "Home"} size={16} />{item.label}
              </button>
            ))}
            {dbCategories.filter((c) => !c.parent_id).map((cat) => (
              <button key={cat.id} onClick={() => { navigate(`/${cat.slug}`); setMobileMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]">
                <Icon name="Tag" size={16} />{cat.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}