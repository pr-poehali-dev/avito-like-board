import { useState } from "react";
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
        setFavSet(prev => { const s = new Set(prev); s.add(adId); return s; });
      }
    }
  };

  const toggleAdInFolder = async (folderId: number, adId: number) => {
    // folderId = -1 означает "без папки" — add/remove напрямую
    if (folderId === -1) {
      const isIn = adFolderIds.includes(-1);
      await fetch(FAV_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
        body: JSON.stringify({ action: isIn ? "remove" : "add", ad_id: adId }),
      });
      const newIds = isIn ? adFolderIds.filter(id => id !== -1) : [...adFolderIds, -1];
      setAdFolderIds(newIds);
      setFavSet(prev => {
        const s = new Set(prev);
        if (newIds.length > 0) { s.add(adId); } else { s.delete(adId); }
        return s;
      });
      if (isIn) { toast("Убрано из избранного"); } else { toast.success("Добавлено в избранное"); }
      return;
    }

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
    setFavSet(prev => {
      const s = new Set(prev);
      if (nowInAnyFolder) { s.add(adId); } else { s.delete(adId); }
      return s;
    });
    await loadFolders();
    if (inFolder) {
      toast("Убрано из папки", { description: folderName });
    } else {
      toast.success("Добавлено в папку", { description: folderName });
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

  const initFavSet = (ids: number[]) => {
    setFavSet(new Set(ids));
  };

  return {
    favSet,
    favFolders,
    addToFolderAdId,
    setAddToFolderAdId,
    adFolderIds,
    newFolderName,
    setNewFolderName,
    openFavoriteModal,
    toggleAdInFolder,
    createFolder,
    initFavSet,
  };
}