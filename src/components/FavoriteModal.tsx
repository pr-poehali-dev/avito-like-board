import Icon from "@/components/ui/icon";

interface FavFolder {
  id: number;
  name: string;
  count: number;
}

interface FavoriteModalProps {
  adId: number;
  favFolders: FavFolder[];
  adFolderIds: number[];
  newFolderName: string;
  setNewFolderName: (v: string) => void;
  onToggleFolder: (folderId: number, adId: number) => void;
  onCreateFolder: () => void;
  onClose: () => void;
}

export default function FavoriteModal({
  adId, favFolders, adFolderIds, newFolderName, setNewFolderName,
  onToggleFolder, onCreateFolder, onClose,
}: FavoriteModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
          <Icon name="X" size={16} />
        </button>
        <h3 className="font-bold text-lg mb-1">Сохранить в избранное</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Выберите папки или добавьте без папки</p>

        {/* Без папки */}
        <button
          onClick={() => { onToggleFolder(-1, adId); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left mb-2 ${adFolderIds.includes(-1) ? "border-[hsl(var(--accent))] bg-orange-50 text-[hsl(var(--accent))]" : "border-border hover:border-[hsl(var(--accent))] hover:bg-orange-50/50"}`}
        >
          <Icon name={adFolderIds.includes(-1) ? "HeartFilled" : "Heart"} size={16} fallback={adFolderIds.includes(-1) ? "Heart" : "Heart"} className={adFolderIds.includes(-1) ? "text-[hsl(var(--accent))] fill-[hsl(var(--accent))]" : ""} />
          <span className="flex-1">Без папки</span>
          {adFolderIds.includes(-1) && <Icon name="Check" size={14} />}
        </button>

        {/* Папки */}
        {favFolders.length > 0 && (
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mb-3">
            {favFolders.map((f) => (
              <button
                key={f.id}
                onClick={() => onToggleFolder(f.id, adId)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${adFolderIds.includes(f.id) ? "border-[hsl(var(--accent))] bg-orange-50 text-[hsl(var(--accent))]" : "border-border hover:border-[hsl(var(--accent))] hover:bg-orange-50/50"}`}
              >
                <Icon name="Folder" size={16} />
                <span className="flex-1 truncate">{f.name}</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{f.count}</span>
                {adFolderIds.includes(f.id) && <Icon name="Check" size={14} />}
              </button>
            ))}
          </div>
        )}

        {/* Создать папку */}
        <div className="flex gap-2 mb-3">
          <input
            placeholder="Новая папка..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onCreateFolder()}
            className="flex-1 px-3 py-2.5 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0"
          />
          <button
            onClick={onCreateFolder}
            disabled={!newFolderName.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Icon name="Plus" size={16} />
          </button>
        </div>

        <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity">
          Готово
        </button>
      </div>
    </div>
  );
}
