import { ChecklistItem, Occurrence } from "@/hooks/use-enem-2025";
import { cn } from "@/lib/utils";
import { InfoDialog } from "@/components/enem/InfoDialog";

interface ClosingTabProps {
  items: ChecklistItem[];
  completed: string[];
  onToggle: (id: string) => void;
  stats: { present: number; absent: number };
  occurrences: Occurrence[];
}

export const ClosingTab = ({
  items,
  completed,
  onToggle,
  stats,
  occurrences,
}: ClosingTabProps) => {
  return (
    <div className="space-y-3">
      <div className="card-elevated flex items-start gap-2">
        <span className="mt-0.5 text-base">🔒</span>
        <div className="space-y-0.5">
          <div className="text-[0.9rem] font-semibold">
            Encerramento do dia
          </div>
          <p className="text-[0.75rem] text-muted-foreground">
            Marque cada etapa de fechamento; a ordem segue o fluxo recomendado, sem reordenar itens concluídos.
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
                item.critical && !isChecked && "border-amber-400/80",
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
                      {item.role || "Coordenador"} · Encerramento
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

      <div className="grid grid-cols-2 gap-2">
        <SummaryCard label="Presentes" value={stats.present} />
        <SummaryCard label="Ausentes" value={stats.absent} />
      </div>
      <div className="card-elevated flex items-center justify-between text-[0.75rem]">
        <span>Ocorrências registradas</span>
        <span className="font-semibold text-primary">
          {occurrences.length}
        </span>
      </div>
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => (
  <div className="card-elevated flex flex-col items-start gap-1">
    <div className="text-[0.75rem] text-muted-foreground">
      {label}
    </div>
    <div className="text-lg font-semibold leading-none">
      {value}
    </div>
  </div>
);