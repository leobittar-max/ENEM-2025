import { ChecklistItem } from "@/hooks/use-enem-2025";
import { cn } from "@/lib/utils";
import { InfoDialog } from "@/components/enem/InfoDialog";

interface PreparationTabProps {
  items: ChecklistItem[];
  completed: string[];
  onToggle: (id: string) => void;
}

export const PreparationTab = ({
  items,
  completed,
  onToggle,
}: PreparationTabProps) => {
  return (
    <div className="space-y-3">
      <div className="card-elevated flex items-start gap-2">
        <span className="mt-0.5 text-base">ℹ️</span>
        <div className="space-y-0.5">
          <div className="text-[0.9rem] font-semibold">
            Preparação prévia do local
          </div>
          <p className="text-[0.75rem] text-muted-foreground">
            Marque os itens conforme for concluindo; a ordem permanece fixa para facilitar a conferência.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const isChecked = completed.includes(item.id);
          return (
            <div
              key={item.id}
              onClick={() => onToggle(item.id)}
              className={cn(
                "checklist-item cursor-pointer select-none transition-colors transition-shadow duration-200",
                isChecked
                  ? "bg-gray-100/95 border-gray-300 text-gray-600 shadow-none checklist-marked"
                  : "bg-card border-border text-foreground hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm",
              )}
            >
              <input
                type="checkbox"
                className={cn(
                  "h-5 w-5 rounded border border-border cursor-pointer mt-0.5 transition-colors",
                  isChecked && "border-primary bg-primary text-primary-foreground",
                )}
                checked={isChecked}
                readOnly
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="checklist-title">
                      {item.text}
                      {item.critical && (
                        <span className="ml-1 text-[0.7rem] text-destructive">
                          ⚡
                        </span>
                      )}
                    </div>
                    <div className="checklist-subtitle">
                      {item.role || "Coordenador"} · Pré-prova
                    </div>
                  </div>
                  {item.info && (
                    <InfoDialog
                      title={item.info.titulo || item.text}
                      body={item.info.corpo}
                      sourceLabel={`Fonte: Manual do ${item.info.fonte.manual}, p. ${item.info.fonte.pagina}.`}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CriticalSummary items={items} completed={completed} />
    </div>
  );
};

const CriticalSummary = ({
  items,
  completed,
}: {
  items: ChecklistItem[];
  completed: string[];
}) => {
  const critical = items.filter((i) => i.critical);
  const pending = critical.filter((i) => !completed.includes(i.id));

  if (!pending.length) {
    return (
      <div className="card-elevated bg-secondary/10 border-secondary/30 text-[0.75rem]">
        ✅ Todos os itens críticos de preparação foram concluídos.
      </div>
    );
  }

  return (
    <div className="card-elevated border-amber-300/80 bg-amber-50 text-[0.75rem] space-y-1">
      <div className="font-semibold text-amber-800">
        ⚠️ Itens críticos pendentes ({pending.length}):
      </div>
      <ul className="space-y-0.5 list-disc pl-4 text-amber-900">
        {pending.map((i) => (
          <li key={i.id}>{i.text}</li>
        ))}
      </ul>
    </div>
  );
};