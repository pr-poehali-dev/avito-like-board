import Icon from "@/components/ui/icon";
import { FavFolder } from "./types";

interface FolderPickerProps {
  folders: FavFolder[];
  selectedFolderIds: number[];
  newFolderName: string;
  creatingFolder: boolean;
  onToggle: (id: number) => void;
  onNewFolderNameChange: (v: string) => void;
  onCreateFolder: () => void;
  onStartCreating: () => void;
  onCancelCreating: () => void;
}

export default function FolderPicker({
  folders, selectedFolderIds, newFolderName, creatingFolder,
  onToggle, onNewFolderNameChange, onCreateFolder, onStartCreating, onCancelCreating,
}: FolderPickerProps) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold">Добавить в папку</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Необязательно. Объявление сразу попадёт в выбранные папки
          </p>
        </div>
      </div>

      {folders.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => onToggle(f.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                selectedFolderIds.includes(f.id)
                  ? "border-[hsl(var(--accent))] bg-orange-50 text-[hsl(var(--accent))]"
                  : "border-border hover:border-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
              }`}
            >
              <Icon name={selectedFolderIds.includes(f.id) ? "CheckSquare" : "Square"} size={14} />
              {f.name}
            </button>
          ))}
        </div>
      )}

      {creatingFolder ? (
        <div className="flex gap-2">
          <input
            autoFocus
            placeholder="Название папки"
            value={newFolderName}
            onChange={(e) => onNewFolderNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCreateFolder();
              if (e.key === "Escape") onCancelCreating();
            }}
            className="flex-1 px-4 py-2.5 bg-[hsl(var(--muted))] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--accent))] border-0"
          />
          <button
            onClick={onCreateFolder}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[hsl(var(--accent))] text-white hover:opacity-90 transition-opacity"
          >
            Создать
          </button>
          <button
            onClick={onCancelCreating}
            className="px-3 py-2.5 rounded-xl text-sm border border-border hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <Icon name="X" size={15} />
          </button>
        </div>
      ) : (
        <button
          onClick={onStartCreating}
          className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--accent))] hover:opacity-80 transition-opacity"
        >
          <Icon name="FolderPlus" size={16} />
          Создать новую папку
        </button>
      )}
    </div>
  );
}
