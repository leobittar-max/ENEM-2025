import { ChecklistItem, Occurrence } from "@/hooks/use-enem-2025";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
    <div className="space-y-4">
      <div className="flex gap-2 rounded-lg border border-amber-400/60 bg-amber-50 px-4 py-3 text-xs">
        <span>⚠️</span>
        <div>
          <strong>Encerramento:</strong> confirme lacres, documentos e devoluções.
          Itens concluídos aparecem riscados para indicar finalização.
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const isChecked = completed.includes(item.id);
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 rounded-md border bg-background px-3 py-2.5",
                isChecked && "bg-emerald-50/60 border-emerald-400/80",
                item.critical && "border-l-4 border-l-red-500/80",
              )}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 cursor-pointer"
                checked={isChecked}
                onChange={() => onToggle(item.id)}
              />
              <div className="flex-1">
                <div className="flex items-start gap-1.5">
                  <div
                    className={cn(
                      "text-xs font-medium leading-snug",
                      isChecked && "line-through text-muted-foreground",
                    )}
                  >
                    {item.text}
                    {item.critical && (
                      <span className="ml-1 text-[9px] font-semibold text-red-600">
                        ⚡
                      </span>
                    )}
                  </div>

                  {item.info && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/30 text-[8px] text-muted-foreground hover:bg-muted/40"
                          aria-label="Mais informações sobre esta tarefa"
                        >
                          i
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="top"
                        align="start"
                        className="max-w-xs space-y-1 rounded-md border bg-popover p-3 text-[10px] leading-snug shadow-md"
                      >
                        <div className="font-semibold">
                          {item.info.titulo || item.text}
                        </div>
                        <div className="whitespace-pre-line text-muted-foreground">
                          {item.info.corpo}
                        </div>
                        <div className="pt-1 text-[8px] text-muted-foreground/80">
                          Fonte: Manual do {item.info.fonte.manual}, p.
                          {item.info.fonte.pagina}.
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 text-center md:grid-cols-3">
        <SummaryCard label="Concluíram" value={stats.present} />
        <SummaryCard label="Ausentes" value={stats.absent} />
        <SummaryCard label="Ocorrências" value={occurrences.length} />
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
  <div className="rounded-lg border bg-card p-3">
    <div className="text-2xl font-semibold">{value}</div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
  </div>
);