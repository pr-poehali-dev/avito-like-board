import { useRef } from "react";
import Icon from "@/components/ui/icon";
import { PhotoItem } from "./types";

interface PhotoUploaderProps {
  photos: PhotoItem[];
  onAdd: (files: FileList | null) => void;
  onRemove: (idx: number) => void;
  onMove: (from: number, to: number) => void;
}

export default function PhotoUploader({ photos, onAdd, onRemove, onMove }: PhotoUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
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
                <button onClick={() => onMove(idx, idx - 1)} className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <Icon name="ChevronLeft" size={12} />
                </button>
              )}
              <button onClick={() => onRemove(idx)} className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                <Icon name="X" size={12} className="text-red-500" />
              </button>
              {idx < photos.length - 1 && (
                <button onClick={() => onMove(idx, idx + 1)} className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
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
        onChange={(e) => onAdd(e.target.files)}
      />
      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-3">До 10 фото. Первое фото — главное.</p>
    </div>
  );
}
