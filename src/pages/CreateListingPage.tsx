import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { ADS_URL } from "./index/types";

// ─── Типы ───────────────────────────────────────────────────────────────────

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  parent_id: number | null;
  ads_count: number;
}

interface AdminField {
  id: number;
  name: string;
  description: string | null;
  placeholder: string | null;
  field_type: "text" | "textarea" | "select" | "boolean" | "datetime";
  options: string | null;
  is_optional: boolean;
  default_value: string | null;
  sort_order: number;
}

interface UserCustomField {
  id: string;
  name: string;
  value: string;
}

interface PhotoItem {
  preview: string;
  mime: string;
  data: string;
}

type Step = 1 | 2 | 3 | 4;

const CITIES = [
  "Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск", "Казань",
  "Нижний Новгород", "Краснодар", "Самара", "Уфа", "Ростов-на-Дону",
  "Омск", "Красноярск", "Воронеж", "Пермь", "Волгоград",
];

const CONDITIONS = ["Новое", "Хорошее", "Б/у", "Требует ремонта"];

const ADS_BACKEND_URL = ADS_URL;

// ─── Компонент шагов ────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: "Категория" },
    { n: 2, label: "Фото и описание" },
    { n: 3, label: "Параметры" },
    { n: 4, label: "Публикация" },
  ];
  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > s.n
                  ? "bg-green-500 text-white"
                  : step === s.n
                  ? "bg-[hsl(var(--accent))] text-white"
                  : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
              }`}
            >
              {step > s.n ? <Icon name="Check" size={14} /> : s.n}
            </div>
            <span
              className={`text-[10px] mt-1 font-medium text-center leading-tight ${
                step === s.n
                  ? "text-[hsl(var(--accent))]"
                  : "text-[hsl(var(--muted-foreground))]"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 flex-1 mb-4 mx-1 transition-all ${
                step > s.n ? "bg-green-500" : "bg-[hsl(var(--muted))]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Шаг 1: Выбор категории ──────────────────────────────────────────────────

function Step1Category({
  categories,
  loading,
  selected,
  onSelect,
}: {
  categories: Category[];
  loading: boolean;
  selected: Category | null;
  onSelect: (c: Category) => void;
}) {
  const [search, setSearch] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);

  const roots = categories.filter((c) => !c.parent_id);
  const currentParent = categories.find((c) => c.id === parentId) || null;
  const children = parentId
    ? categories.filter((c) => c.parent_id === parentId)
    : [];

  const searchResults = search.trim()
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const displayList = search.trim()
    ? searchResults
    : parentId
    ? children
    : roots;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold mb-1">Выберите категорию</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Это поможет покупателям найти ваш товар
        </p>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Icon
          name="Search"
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
        />
        <input
          placeholder="Поиск категории..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setParentId(null);
          }}
          className="w-full pl-9 pr-4 py-2.5 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0"
        />
      </div>

      {/* Хлебные крошки */}
      {parentId && !search && (
        <button
          onClick={() => setParentId(null)}
          className="flex items-center gap-1.5 text-sm text-[hsl(var(--accent))] font-medium"
        >
          <Icon name="ChevronLeft" size={16} />
          {currentParent?.name}
        </button>
      )}

      {/* Список категорий */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-14 bg-[hsl(var(--muted))] rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {displayList.map((c) => {
            const hasChildren = categories.some((ch) => ch.parent_id === c.id);
            const isSelected = selected?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  if (hasChildren && !search) {
                    setParentId(c.id);
                  } else {
                    onSelect(c);
                  }
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-[hsl(var(--accent))] bg-orange-50 text-[hsl(var(--accent))]"
                    : "border-border bg-white hover:border-[hsl(var(--accent))] hover:bg-orange-50/50"
                }`}
              >
                {c.icon && (
                  <span className="text-xl shrink-0">{c.icon}</span>
                )}
                <span className="text-sm font-medium leading-tight flex-1">
                  {c.name}
                </span>
                {hasChildren && !search && (
                  <Icon
                    name="ChevronRight"
                    size={14}
                    className="shrink-0 text-[hsl(var(--muted-foreground))]"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {displayList.length === 0 && !loading && (
        <div className="text-center py-8 text-[hsl(var(--muted-foreground))] text-sm">
          Категория не найдена
        </div>
      )}
    </div>
  );
}

// ─── Шаг 2: Фото + название + описание ────────────────────────────────────

function Step2Media({
  photos,
  title,
  desc,
  onPhotosChange,
  onTitleChange,
  onDescChange,
}: {
  photos: PhotoItem[];
  title: string;
  desc: string;
  onPhotosChange: (p: PhotoItem[]) => void;
  onTitleChange: (v: string) => void;
  onDescChange: (v: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dragOverRef = useRef<number | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 10 - photos.length;
    Array.from(files)
      .slice(0, remaining)
      .forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const base64 = dataUrl.split(",")[1];
          onPhotosChange([
            ...photos,
            { preview: dataUrl, mime: file.type, data: base64 },
          ]);
        };
        reader.readAsDataURL(file);
      });
  };

  const removePhoto = (idx: number) =>
    onPhotosChange(photos.filter((_, i) => i !== idx));

  const movePhoto = (from: number, to: number) => {
    const arr = [...photos];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    onPhotosChange(arr);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold mb-1">Фото и описание</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Хорошие фото — залог быстрой продажи
        </p>
      </div>

      {/* Загрузка фото */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Фотографии</span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {photos.length}/10
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {photos.map((p, i) => (
            <div
              key={i}
              className="relative aspect-square rounded-xl overflow-hidden group"
              draggable
              onDragStart={() => (dragOverRef.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragOverRef.current !== null && dragOverRef.current !== i)
                  movePhoto(dragOverRef.current, i);
                dragOverRef.current = null;
              }}
            >
              <img
                src={p.preview}
                alt=""
                className="w-full h-full object-cover"
              />
              {i === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-[hsl(var(--accent))] text-white text-[10px] font-medium text-center py-0.5">
                  Главное
                </div>
              )}
              <button
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Icon name="X" size={10} className="text-white" />
              </button>
            </div>
          ))}

          {photos.length < 10 && (
            <button
              onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-[hsl(var(--accent))] flex flex-col items-center justify-center gap-1 transition-colors"
            >
              <Icon
                name="Plus"
                size={20}
                className="text-[hsl(var(--muted-foreground))]"
              />
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                Добавить
              </span>
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
        <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-2">
          Перетащите для изменения порядка. Первое фото — главное.
        </p>
      </div>

      {/* Название */}
      <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-4">
        <h3 className="font-semibold text-sm">Основная информация</h3>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">
            Название *
          </label>
          <input
            placeholder="Например: iPhone 15 Pro 256GB"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            maxLength={200}
            className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0"
          />
          <div className="text-right text-[11px] text-[hsl(var(--muted-foreground))] mt-1">
            {title.length}/200
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">
            Описание
          </label>
          <textarea
            rows={5}
            placeholder="Подробно опишите товар: состояние, комплектация, причина продажи..."
            value={desc}
            onChange={(e) => onDescChange(e.target.value)}
            className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0 resize-none"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Шаг 3: Параметры ───────────────────────────────────────────────────────

function Step3Params({
  price,
  city,
  condition,
  adminFields,
  adminFieldValues,
  userCustomFields,
  onPriceChange,
  onCityChange,
  onConditionChange,
  onAdminFieldChange,
  onAddUserField,
  onRemoveUserField,
  onUserFieldChange,
}: {
  price: string;
  city: string;
  condition: string;
  adminFields: AdminField[];
  adminFieldValues: Record<number, string>;
  userCustomFields: UserCustomField[];
  onPriceChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onConditionChange: (v: string) => void;
  onAdminFieldChange: (id: number, value: string) => void;
  onAddUserField: () => void;
  onRemoveUserField: (id: string) => void;
  onUserFieldChange: (id: string, key: "name" | "value", val: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold mb-1">Параметры</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Укажите цену, город и дополнительные характеристики
        </p>
      </div>

      {/* Цена и состояние */}
      <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-4">
        <h3 className="font-semibold text-sm">Цена и состояние</h3>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">
            Цена, ₽ *
          </label>
          <div className="relative">
            <input
              type="number"
              placeholder="0"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              className="w-full pl-4 pr-10 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">
              ₽
            </span>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">
            Состояние
          </label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                onClick={() => onConditionChange(c)}
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

      {/* Город */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <h3 className="font-semibold text-sm mb-3">Местоположение</h3>
        <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">
          Город *
        </label>
        <select
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0"
        >
          <option value="">Выберите город</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Поля из админки */}
      {adminFields.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-4">
          <div>
            <h3 className="font-semibold text-sm">Характеристики</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Рекомендованные поля для данной категории
            </p>
          </div>
          {adminFields.map((f) => (
            <div key={f.id}>
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5 block">
                {f.name}
                {!f.is_optional && (
                  <span className="text-[hsl(var(--accent))] ml-0.5">*</span>
                )}
                {f.is_optional && (
                  <span className="text-[hsl(var(--muted-foreground))] ml-1 font-normal">
                    (необязательно)
                  </span>
                )}
              </label>

              {f.field_type === "textarea" ? (
                <textarea
                  rows={3}
                  placeholder={f.placeholder || ""}
                  value={adminFieldValues[f.id] || ""}
                  onChange={(e) => onAdminFieldChange(f.id, e.target.value)}
                  className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0 resize-none"
                />
              ) : f.field_type === "select" && f.options ? (
                <select
                  value={adminFieldValues[f.id] || ""}
                  onChange={(e) => onAdminFieldChange(f.id, e.target.value)}
                  className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0"
                >
                  <option value="">Выберите...</option>
                  {f.options.split("\n").map((o) => (
                    <option key={o} value={o.trim()}>
                      {o.trim()}
                    </option>
                  ))}
                </select>
              ) : f.field_type === "boolean" ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onAdminFieldChange(f.id, adminFieldValues[f.id] === "true" ? "" : "true")}
                    className={`w-10 h-6 rounded-full transition-all ${
                      adminFieldValues[f.id] === "true"
                        ? "bg-[hsl(var(--accent))]"
                        : "bg-[hsl(var(--muted))]"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow transition-all mx-1 ${
                        adminFieldValues[f.id] === "true"
                          ? "translate-x-4"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {adminFieldValues[f.id] === "true" ? "Да" : "Нет"}
                  </span>
                </div>
              ) : (
                <input
                  type={f.field_type === "datetime" ? "date" : "text"}
                  placeholder={f.placeholder || ""}
                  value={adminFieldValues[f.id] || ""}
                  onChange={(e) => onAdminFieldChange(f.id, e.target.value)}
                  className="w-full px-4 py-3 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0"
                />
              )}

              {f.description && (
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">
                  {f.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Пользовательские поля */}
      <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-3">
        <div>
          <h3 className="font-semibold text-sm">Дополнительные характеристики</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Добавьте любые поля, которые важны для вашего товара
          </p>
        </div>

        {userCustomFields.map((field) => (
          <div key={field.id} className="flex gap-2 items-start">
            <div className="flex-1 flex flex-col gap-2">
              <input
                placeholder="Название поля (например: Производитель)"
                value={field.name}
                onChange={(e) =>
                  onUserFieldChange(field.id, "name", e.target.value)
                }
                maxLength={100}
                className="w-full px-3 py-2.5 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0"
              />
              <input
                placeholder="Значение"
                value={field.value}
                onChange={(e) =>
                  onUserFieldChange(field.id, "value", e.target.value)
                }
                maxLength={500}
                className="w-full px-3 py-2.5 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0"
              />
            </div>
            <button
              onClick={() => onRemoveUserField(field.id)}
              className="mt-1 p-2 rounded-xl hover:bg-red-50 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors"
            >
              <Icon name="Trash2" size={16} />
            </button>
          </div>
        ))}

        <button
          onClick={onAddUserField}
          className="flex items-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-border hover:border-[hsl(var(--accent))] text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))] transition-all"
        >
          <Icon name="Plus" size={16} />
          Добавить своё поле
        </button>
      </div>
    </div>
  );
}

// ─── Шаг 4: Предпросмотр ────────────────────────────────────────────────────

function Step4Preview({
  category,
  photos,
  title,
  desc,
  price,
  city,
  condition,
  adminFields,
  adminFieldValues,
  userCustomFields,
  loading,
  onPublish,
}: {
  category: Category | null;
  photos: PhotoItem[];
  title: string;
  desc: string;
  price: string;
  city: string;
  condition: string;
  adminFields: AdminField[];
  adminFieldValues: Record<number, string>;
  userCustomFields: UserCustomField[];
  loading: boolean;
  onPublish: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold mb-1">Предпросмотр</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Проверьте объявление перед публикацией
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {/* Фото */}
        {photos.length > 0 ? (
          <div className="relative aspect-video bg-[hsl(var(--muted))]">
            <img
              src={photos[0].preview}
              alt=""
              className="w-full h-full object-cover"
            />
            {photos.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                +{photos.length - 1} фото
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-video bg-[hsl(var(--muted))] flex items-center justify-center">
            <Icon
              name="Image"
              size={40}
              className="text-[hsl(var(--muted-foreground))]"
            />
          </div>
        )}

        <div className="p-5 flex flex-col gap-3">
          {/* Категория */}
          {category && (
            <div className="flex items-center gap-1.5">
              {category.icon && <span>{category.icon}</span>}
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {category.name}
              </span>
            </div>
          )}

          {/* Заголовок и цена */}
          <div>
            <h3 className="font-bold text-lg leading-tight">
              {title || "Название не указано"}
            </h3>
            <p className="text-2xl font-bold text-[hsl(var(--accent))] mt-1">
              {price ? `${Number(price).toLocaleString()} ₽` : "Цена не указана"}
            </p>
          </div>

          {/* Мета */}
          <div className="flex flex-wrap gap-3 text-sm text-[hsl(var(--muted-foreground))]">
            {city && (
              <span className="flex items-center gap-1">
                <Icon name="MapPin" size={14} />
                {city}
              </span>
            )}
            {condition && (
              <span className="flex items-center gap-1">
                <Icon name="Tag" size={14} />
                {condition}
              </span>
            )}
          </div>

          {/* Описание */}
          {desc && (
            <p className="text-sm text-[hsl(var(--foreground))] leading-relaxed border-t border-border pt-3">
              {desc}
            </p>
          )}

          {/* Характеристики */}
          {(adminFields.some((f) => adminFieldValues[f.id]) ||
            userCustomFields.some((f) => f.name && f.value)) && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-2 uppercase tracking-wide">
                Характеристики
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {adminFields
                  .filter((f) => adminFieldValues[f.id])
                  .map((f) => (
                    <div key={f.id} className="flex flex-col">
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                        {f.name}
                      </span>
                      <span className="text-sm font-medium">
                        {adminFieldValues[f.id] === "true"
                          ? "Да"
                          : adminFieldValues[f.id] === "false"
                          ? "Нет"
                          : adminFieldValues[f.id]}
                      </span>
                    </div>
                  ))}
                {userCustomFields
                  .filter((f) => f.name && f.value)
                  .map((f) => (
                    <div key={f.id} className="flex flex-col">
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                        {f.name}
                      </span>
                      <span className="text-sm font-medium">{f.value}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Кнопка публикации */}
      <button
        onClick={onPublish}
        disabled={loading}
        className="w-full py-4 rounded-2xl bg-[hsl(var(--accent))] text-white font-bold text-base disabled:opacity-60 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Icon name="Loader2" size={18} className="animate-spin" />
            Публикуем...
          </>
        ) : (
          <>
            <Icon name="Send" size={18} />
            Опубликовать объявление
          </>
        )}
      </button>

      <p className="text-xs text-center text-[hsl(var(--muted-foreground))]">
        После публикации объявление отправится на проверку
      </p>
    </div>
  );
}

// ─── Главный компонент ──────────────────────────────────────────────────────

export default function CreateListingPage() {
  const navigate = useNavigate();

  // Шаг
  const [step, setStep] = useState<Step>(1);

  // Шаг 1
  const [categories, setCategories] = useState<Category[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Шаг 2
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  // Шаг 3
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [condition, setCondition] = useState("Хорошее");
  const [adminFields, setAdminFields] = useState<AdminField[]>([]);
  const [adminFieldValues, setAdminFieldValues] = useState<Record<number, string>>({});
  const [userCustomFields, setUserCustomFields] = useState<UserCustomField[]>([]);

  // Публикация
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sid = () => localStorage.getItem("session_id") || "";

  // Загружаем категории
  useEffect(() => {
    fetch(ADS_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "categories" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setCategories(d.categories);
      })
      .catch(() => {})
      .finally(() => setCatsLoading(false));
  }, []);

  // Загружаем поля когда выбрана категория
  useEffect(() => {
    if (!selectedCategory) {
      setAdminFields([]);
      setAdminFieldValues({});
      return;
    }
    fetch(ADS_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "category_fields",
        category_id: selectedCategory.id,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setAdminFields(d.fields || []);
      })
      .catch(() => {});
  }, [selectedCategory]);

  // Навигация по шагам
  const canGoNext = () => {
    if (step === 1) return !!selectedCategory;
    if (step === 2) return title.trim().length > 0;
    if (step === 3) return price.trim() !== "" && city.trim() !== "";
    return true;
  };

  const goNext = () => {
    if (!canGoNext()) {
      const msgs: Record<number, string> = {
        1: "Выберите категорию",
        2: "Заполните название",
        3: "Укажите цену и город",
      };
      setError(msgs[step] || "");
      return;
    }
    setError("");
    setStep((s) => Math.min(4, s + 1) as Step);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setError("");
    if (step === 1) {
      navigate(-1);
    } else {
      setStep((s) => Math.max(1, s - 1) as Step);
      window.scrollTo(0, 0);
    }
  };

  // Управление пользовательскими полями
  const addUserField = () => {
    setUserCustomFields((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), name: "", value: "" },
    ]);
  };

  const removeUserField = (id: string) =>
    setUserCustomFields((prev) => prev.filter((f) => f.id !== id));

  const changeUserField = (id: string, key: "name" | "value", val: string) =>
    setUserCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: val } : f))
    );

  // Публикация
  const publish = async () => {
    setError("");
    setLoading(true);
    const s = sid();

    if (!s) {
      setError("Необходима авторизация");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(ADS_BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": s },
        body: JSON.stringify({
          action: "create",
          title,
          description: desc,
          price: Number(price),
          category: selectedCategory?.name || "",
          category_id: selectedCategory?.id || null,
          city,
          condition,
          photos: photos.map((p) => ({ mime: p.mime, data: p.data })),
          admin_field_values: adminFields.reduce((acc, f) => {
            if (adminFieldValues[f.id] !== undefined) {
              acc[f.id] = adminFieldValues[f.id];
            }
            return acc;
          }, {} as Record<number, string>),
          user_custom_fields: userCustomFields
            .filter((f) => f.name.trim())
            .map((f, i) => ({ name: f.name.trim(), value: f.value.trim(), sort_order: i })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Ошибка публикации");
        return;
      }

      toast.success("Объявление опубликовано и отправлено на проверку!");
      navigate(`/ad/${data.id}`);
    } catch {
      setError("Нет соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Шапка */}
      <div className="sticky top-0 z-20 bg-white border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-2 rounded-xl hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <Icon name="ArrowLeft" size={20} />
          </button>
          <h1 className="font-bold text-lg flex-1">Новое объявление</h1>
          {step < 4 && (
            <button
              onClick={goNext}
              disabled={!canGoNext()}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Далее
            </button>
          )}
        </div>

        {/* Индикатор шагов */}
        <div className="max-w-2xl mx-auto px-6 pb-3">
          <StepIndicator step={step} />
        </div>
      </div>

      {/* Контент */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
            <Icon name="AlertCircle" size={16} />
            {error}
          </div>
        )}

        {step === 1 && (
          <Step1Category
            categories={categories}
            loading={catsLoading}
            selected={selectedCategory}
            onSelect={(c) => setSelectedCategory(c)}
          />
        )}

        {step === 2 && (
          <Step2Media
            photos={photos}
            title={title}
            desc={desc}
            onPhotosChange={setPhotos}
            onTitleChange={setTitle}
            onDescChange={setDesc}
          />
        )}

        {step === 3 && (
          <Step3Params
            price={price}
            city={city}
            condition={condition}
            adminFields={adminFields}
            adminFieldValues={adminFieldValues}
            userCustomFields={userCustomFields}
            onPriceChange={setPrice}
            onCityChange={setCity}
            onConditionChange={setCondition}
            onAdminFieldChange={(id, val) =>
              setAdminFieldValues((prev) => ({ ...prev, [id]: val }))
            }
            onAddUserField={addUserField}
            onRemoveUserField={removeUserField}
            onUserFieldChange={changeUserField}
          />
        )}

        {step === 4 && (
          <Step4Preview
            category={selectedCategory}
            photos={photos}
            title={title}
            desc={desc}
            price={price}
            city={city}
            condition={condition}
            adminFields={adminFields}
            adminFieldValues={adminFieldValues}
            userCustomFields={userCustomFields}
            loading={loading}
            onPublish={publish}
          />
        )}

        {/* Кнопки навигации снизу */}
        {step < 4 && (
          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <button
                onClick={goBack}
                className="flex-1 py-3.5 rounded-2xl border border-border text-sm font-semibold hover:bg-[hsl(var(--muted))] transition-colors"
              >
                Назад
              </button>
            )}
            <button
              onClick={goNext}
              disabled={!canGoNext()}
              className="flex-1 py-3.5 rounded-2xl bg-[hsl(var(--accent))] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {step === 3 ? "Предпросмотр" : "Далее"}
              <Icon name="ChevronRight" size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
