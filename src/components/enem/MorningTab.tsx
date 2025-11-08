import { ChecklistItem } from "@/hooks/use-enem-2025";
import { cn } from "@/lib/utils";
import { InfoDialog } from "@/components/enem/InfoDialog";

interface MorningTabProps {
  items: ChecklistItem[];
  examDay: 1 | 2;
  completed: string[];
  onToggle: (id: string) => void;
}

export const MorningTab = ({
  items,
  examDay,
  completed,
  onToggle,
}: MorningTabProps) => {
  const diaLabel = examDay === 1 ? "1º dia" : "2º dia";

  return (
    <div className="space-y-3">
      <div className="card-elevated flex items-start gap-2">
        <span className="mt-0.5">🌅</span>
        <div className="space-y-0.5">
          <div className="text-xs font-semibold">
            Manhã do exame · {diaLabel}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Itens concluídos ficam em cinza claro, para evidenciar rapidamente o que ainda precisa ser feito.
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
                "checklist-item transition-colors cursor-pointer select-none",
                isChecked
                  ? "bg-gray-100 border-gray-300 text-gray-500"
                  : "bg-card border-border text-foreground hover:bg-muted/70",
              )}
            >
              <div className="flex flex-col items-center justify-center w-10">
                <div className="text-[9px] font-semibold text-primary truncate">
                  {item.suggestedTime || "--"}
                </div>
              </div>
              <input
                type="checkbox"
                className={cn(
                  "h-5 w-5 rounded border border-border cursor-pointer mt-0.5",
                  isChecked && "border-gray-400",
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
                        <span className="ml-1 text-[9px] text-destructive">
                          ⚡
                        </span>
                      )}
                    </div>
                    <div className="checklist-subtitle">
                      {item.role || "Equipe"} · Janela da manhã
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
    </div>
  );
};