import Icon from "@/components/ui/icon";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-[hsl(var(--muted))] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Icon name="WifiOff" size={36} className="text-[hsl(var(--muted-foreground))]" />
        </div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-3">Сайт временно недоступен</h1>
        <p className="text-[hsl(var(--muted-foreground))] text-sm leading-relaxed">
          Мы проводим технические работы. Пожалуйста, зайдите позже.
        </p>
      </div>
    </div>
  );
}
