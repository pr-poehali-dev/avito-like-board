import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";

const ADS_URL = "https://functions.poehali.dev/26941b84-1198-4969-8e13-07523f9f04d0";

const CATEGORIES = [
  { id: "realty", label: "Недвижимость" },
  { id: "auto", label: "Авто" },
  { id: "electronics", label: "Электроника" },
  { id: "clothes", label: "Одежда" },
  { id: "furniture", label: "Мебель" },
  { id: "services", label: "Услуги" },
  { id: "animals", label: "Животные" },
  { id: "hobbies", label: "Хобби" },
];

const CITIES = ["Москва", "СПб", "Казань", "Екатеринбург", "Новосибирск", "Самара"];

interface PhotoItem {
  preview: string;
  mime: string;
  data: string;
}

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
  const fileRef = useRef<HTMLInputElement>(null);

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
        setPhotos((prev) => [
          ...prev,
          { preview: dataUrl, mime: file.type, data: base64 },
        ]);
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
    const sid = localStorage.getItem("session_id");
    try {
      const res = await fetch(ADS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sid || "" },
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
      } else {
        onSuccess();
      }
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

        {/* Фото */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Фотографии</h2>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">{photos.length}/10</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {photos.map((p, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-border">
                <img src={p.preview} alt="" className="w-full h-full object-cover" />
                {idx === 0 && (
                  <span className="absolute bottom-1 left-1 bg-[hsl(var(--accent))] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    Главное
                  </span>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  {idx > 0 && (
                    <button
                      onClick={() => movePhoto(idx, idx - 1)}
                      className="w-6 h-6 bg-white rounded-full flex items-center justify-center"
                    >
                      <Icon name="ChevronLeft" size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => removePhoto(idx)}
                    className="w-6 h-6 bg-white rounded-full flex items-center justify-center"
                  >
                    <Icon name="X" size={12} className="text-red-500" />
                  </button>
                  {idx < photos.length - 1 && (
                    <button
                      onClick={() => movePhoto(idx, idx + 1)}
                      className="w-6 h-6 bg-white rounded-full flex items-center justify-center"
                    >
                      <Icon name="ChevronRight" size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {photos.length < 10 && (
              <button
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-[hsl(var(--border))] hover:border-[hsl(var(--accent))] hover:bg-orange-50 transition-colors flex flex-col items-center justify-center gap-1 text-[hsl(var(--muted-foreground))]"
              >
                <Icon name="Plus" size={20} />
                <span className="text-[10px] font-medium">Добавить</span>
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-3">
            До 10 фото. Первое фото — главное в объявлении. Перетащите для изменения порядка.
          </p>
        </div>

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
              {["Новый", "Отличное", "Хорошее", "Удовлетворительное"].map((c) => (
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
