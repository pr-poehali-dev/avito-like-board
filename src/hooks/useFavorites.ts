import { useState, useCallback } from "react";
import { toast } from "sonner";
import { FAV_URL } from "@/pages/index/types";

const sid = () => localStorage.getItem("session_id") || "";

export interface FavFolder {
  id: number;
  name: string;
  count: number;
}

export function useFavorites(user: { id: number } | null, openAuth: (mode: "login" | "register") => void) {
  const [favSet, setFavSet] = useState<Set<number>>(new Set());
  const [favFolders, setFavFolders] = useState<FavFolder[]>([]);
  const [addToFolderAdId, setAddToFolderAdId] = useState<number | null>(null);
  const [adFolderIds, setAdFolderIds] = useState<number[]>([]);
  const [newFolderName, setNewFolderName] = useState("");

  // Загрузить все избранные объявления пользователя (для подсветки сердечек)
  const loadFavSet = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(FAV_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
        body: JSON.stringify({ action: "list_favorited" }),
      });
      const d = await res.json();
      if (d.ok) setFavSet(new Set<number>(d.ad_ids));
    } catch { /* игнорируем */ }
  }, [user]);

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

  const openFavoriteModal = async (adId: number) => {
    if (!user) { openAuth("login"); return; }
    setAddToFolderAdId(adId);
    await Promise.all([loadFolders(), (async () => {
      const res = await fetch(FAV_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
        body: JSON.stringify({ action: "my_ad_folders", ad_id: adId, folder_type: "favorites" }),
      });
      const d = await res.json();
      if (d.ok) {
        setAdFolderIds(d.folder_ids);
        // Если объявление уже есть в любой папке — показываем сердечко заполненным
        if (d.folder_ids.length > 0) {
          setFavSet(prev => { const s = new Set(prev); s.add(adId); return s; });
        }
      }
    })()]);
  };

  const toggleAdInFolder = async (folderId: number, adId: number) => {
    // folderId = -1 означает "без папки" — используем системную папку __no_folder__
    if (folderId === -1) {
      const isIn = adFolderIds.includes(-1);
      const action = isIn ? "remove" : "add";

      // Оптимистично обновляем UI
      const newIds = isIn ? adFolderIds.filter(id => id !== -1) : [...adFolderIds, -1];
      setAdFolderIds(newIds);
      setFavSet(prev => {
        const s = new Set(prev);
        // Считаем сердечко заполненным если есть хоть одна папка включая другие
        const hasOtherFolders = newIds.some(id => id !== -1);
        if (newIds.includes(-1) || hasOtherFolders) { s.add(adId); } else { s.delete(adId); }
        return s;
      });

      try {
        await fetch(FAV_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
          body: JSON.stringify({ action, ad_id: adId }),
        });
        if (isIn) { toast("Убрано из избранного"); } else { toast.success("Добавлено в избранное"); }
      } catch {
        // Откат при ошибке
        setAdFolderIds(adFolderIds);
        setFavSet(prev => {
          const s = new Set(prev);
          if (isIn) { s.add(adId); } else { s.delete(adId); }
          return s;
        });
        toast.error("Ошибка. Попробуйте ещё раз");
      }
      return;
    }

    const inFolder = adFolderIds.includes(folderId);
    const folderName = favFolders.find((f) => f.id === folderId)?.name || "папку";

    const newIds = inFolder ? adFolderIds.filter((id) => id !== folderId) : [...adFolderIds, folderId];
    setAdFolderIds(newIds);
    const nowInAny = newIds.length > 0;
    setFavSet(prev => {
      const s = new Set(prev);
      if (nowInAny) { s.add(adId); } else { s.delete(adId); }
      return s;
    });

    try {
      await fetch(FAV_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
        body: JSON.stringify({ action: inFolder ? "remove_item" : "add_item", folder_id: folderId, ad_id: adId }),
      });
      await loadFolders();
      if (inFolder) {
        toast("Убрано из папки", { description: folderName });
      } else {
        toast.success("Добавлено в папку", { description: folderName });
      }
    } catch {
      // Откат
      setAdFolderIds(adFolderIds);
      toast.error("Ошибка. Попробуйте ещё раз");
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await fetch(FAV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "create_folder", name: newFolderName.trim(), folder_type: "favorites" }),
    });
    setNewFolderName("");
    await loadFolders();
    if (addToFolderAdId !== null) {
      const res = await fetch(FAV_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
        body: JSON.stringify({ action: "my_ad_folders", ad_id: addToFolderAdId, folder_type: "favorites" }),
      });
      const d = await res.json();
      if (d.ok) setAdFolderIds(d.folder_ids);
    }
  };

  return {
    favSet,
    favFolders,
    addToFolderAdId,
    setAddToFolderAdId,
    adFolderIds,
    newFolderName,
    setNewFolderName,
    loadFavSet,
    openFavoriteModal,
    toggleAdInFolder,
    createFolder,
  };
}
