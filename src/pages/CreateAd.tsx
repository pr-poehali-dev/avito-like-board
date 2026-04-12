import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

import { ADS_URL, FAV_URL, CATEGORIES, CITIES, CONDITIONS, PhotoItem, FavFolder } from "./createAd/types";
import PhotoUploader from "./createAd/PhotoUploader";
import FolderPicker from "./createAd/FolderPicker";

interface CreateAdProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function CreateAd({ onBack, onSuccess }: CreateAdProps) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [condition, setCondition] = useState("Хорошее");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Папки
  const [folders, setFolders] = useState<FavFolder[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const sid = () => localStorage.getItem("session_id") || "";

  useEffect(() => {
    const s = sid();
    if (!s) return;
    fetch(FAV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": s },
      body: JSON.stringify({ action: "folders", folder_type: "my_ads" }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setFolders(d.folders); })
      .catch(() => {});
  }, []);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    const res = await fetch(FAV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sid() },
      body: JSON.stringify({ action: "create_folder", name: newFolderName.trim(), folder_type: "my_ads" }),
    });
    const d = await res.json();
    if (d.ok) {
      const newFolder = { id: d.id, name: newFolderName.trim(), count: 0 };
      setFolders((prev) => [...prev, newFolder]);
      setSelectedFolderIds((prev) => [...prev, d.id]);
      setNewFolderName("");
      setCreatingFolder(false);
      toast.success("Папка создана");
    }
  };

  const toggleFolder = (id: number) => {
    setSelectedFolderIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 10 - photos.length;
    const toProcess = Array.from(files).slice(0, remaining);
    toProcess.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(",")[1];
        setPhotos((prev) => [...prev, { preview: dataUrl, mime: file.type, data: base64 }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const movePhoto = (from: number, to: number) => {
    setPhotos((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  const submit = async () => {
    setError("");
    if (!title.trim()) { setError("Укажите название"); return; }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) { setError("Укажите корректную цену"); return; }
    if (!category) { setError("Выберите категорию"); return; }
    if (!city.trim()) { setError("Укажите город"); return; }

    setLoading(true);
    const s = sid();
    try {
      const res = await fetch(ADS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": s },
        body: JSON.stringify({
          action: "create",
          title,
          description: desc,
          price: Number(price),
          category,
          city,
          condition,
          photos: photos.map((p) => ({ mime: p.mime, data: p.data })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Ошибка публикации");
        return;
      }

      const adId = data.id;

      if (selectedFolderIds.length > 0) {
        await Promise.all(selectedFolderIds.map((fid) =>
          fetch(FAV_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Session-Id": s },
            body: JSON.stringify({ action: "add_item", folder_id: fid, ad_id: adId }),
          })
        ));
      }

      toast.success("Объявление опубликовано!");
      onSuccess();
    } catch {
      setError("Нет соединения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
          <Icon name="ArrowLeft" size={20} />
        </button>
        <h1 className="font-bold text-lg flex-1">Новое объявление</h1>
        <button
          onClick={submit}
          disabled={loading}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {loading ? "Публикуем..." : "Опубликовать"}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">

        <PhotoUploader
          photos={photos}
          onAdd={handleFiles}
          onRemove={removePhoto}
          onMove={movePhoto}
        />

        {/* Основная информация */}
        <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-4">
          <h2 className="font-semibold">Основное</h2>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">Название *</label>
            <input
              placeholder="Например: iPhone 15 Pro 256GB"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all border-0"
            />
            <div className="text-right text-[11px] text-[hsl(var(--muted-foreground))] mt-1">{title.length}/200</div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">Описание</label>
            <textarea
              rows={5}
              placeholder="Подробно опишите товар: состояние, комплектация, причина продажи..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all border-0 resize-none"
            />
          </div>
        </div>

        {/* Категория и параметры */}
        <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-4">
          <h2 className="font-semibold">Параметры</h2>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">Категория *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                    category === c.id
                      ? "border-[hsl(var(--accent))] bg-orange-50 text-[hsl(var(--accent))]"
                      : "border-border bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--accent))]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">Состояние</label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  className={`py-2 px-4 rounded-xl text-sm font-medium border transition-all ${
                    condition === c
                      ? "border-[hsl(var(--accent))] bg-orange-50 text-[hsl(var(--accent))]"
                      : "border-border bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--accent))]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Цена и город */}
        <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-4">
          <h2 className="font-semibold">Цена и местоположение</h2>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">Цена, ₽ *</label>
            <div className="relative">
              <input
                type="number"
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all border-0"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm font-medium">₽</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">Город *</label>
            <input
              placeholder="Введите город"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              list="cities-create"
              className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] transition-all border-0"
            />
            <datalist id="cities-create">
              {CITIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        <FolderPicker
          folders={folders}
          selectedFolderIds={selectedFolderIds}
          newFolderName={newFolderName}
          creatingFolder={creatingFolder}
          onToggle={toggleFolder}
          onNewFolderNameChange={setNewFolderName}
          onCreateFolder={createFolder}
          onStartCreating={() => setCreatingFolder(true)}
          onCancelCreating={() => setCreatingFolder(false)}
        />

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm border border-red-100">
            <Icon name="AlertCircle" size={16} />
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-[hsl(var(--accent))] text-white py-4 rounded-2xl text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {loading ? "Публикуем..." : "Опубликовать объявление"}
        </button>

        <div className="h-6" />
      </div>
    </div>
  );
}
