import { Button } from "@/components/ui/button";
import {
  ChecklistItem,
  Occurrence,
  CoordinatorData,
} from "@/hooks/use-enem-2025";

interface ReportTabProps {
  coordinator: CoordinatorData;
  preparation: string[];
  morning: string[];
  closing: string[];
  occurrences: Occurrence[];
  preparationItems: ChecklistItem[];
  morningItems: ChecklistItem[];
  closingItems: ChecklistItem[];
  onDownloadPdf: () => void;
  onReset: () => void;
}

export const ReportTab = ({
  coordinator,
  preparation,
  morning,
  closing,
  occurrences,
  preparationItems,
  morningItems,
  closingItems,
  onDownloadPdf,
  onReset,
}: ReportTabProps) => {
  const critical = occurrences.filter((o) => o.critical).length;

  const prepPercent = Math.round(
    (preparation.length / preparationItems.length) * 100 || 0,
  );
  const morningPercent = Math.round(
    (morning.length / morningItems.length) * 100 || 0,
  );
  const closingPercent = Math.round(
    (closing.length / closingItems.length) * 100 || 0,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm">📋 Resumo Executivo</h3>
        <div className="grid gap-2 text-xs md:grid-cols-3">
          <div>
            <div className="text-muted-foreground">Coordenador(a)</div>
            <div className="font-medium">{coordinator.name}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Local</div>
            <div className="font-medium">{coordinator.location}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Cidade/Estado</div>
            <div className="font-medium">
              {coordinator.city} - {coordinator.state}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Dia do Exame</div>
            <div className="font-medium">{coordinator.examDay}º dia</div>
          </div>
          <div>
            <div className="text-muted-foreground">Salas</div>
            <div className="font-medium">{coordinator.classrooms}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Participantes</div>
            <div className="font-medium">{coordinator.participants}</div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">📊 Progresso por Etapa</h3>
        <ProgressLine
          label="Preparação Prévia"
          value={preparation.length}
          total={preparationItems.length}
          percent={prepPercent}
        />
        <ProgressLine
          label="Dia do Exame - Manhã"
          value={morning.length}
          total={morningItems.length}
          percent={morningPercent}
        />
        <ProgressLine
          label="Encerramento"
          value={closing.length}
          total={closingItems.length}
          percent={closingPercent}
        />
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm">📝 Ocorrências</h3>
        <div className="grid gap-2 text-center text-xs md:grid-cols-3">
          <div className="p-2 rounded-md bg-muted/40">
            <div className="text-xl font-semibold">
              {occurrences.length}
            </div>
            <div className="text-muted-foreground uppercase tracking-wide text-[9px]">
              Total
            </div>
          </div>
          <div className="p-2 rounded-md bg-red-50 text-red-700">
            <div className="text-xl font-semibold">{critical}</div>
            <div className="uppercase tracking-wide text-[9px]">
              Críticas
            </div>
          </div>
          <div className="p-2 rounded-md bg-emerald-50 text-emerald-700">
            <div className="text-xl font-semibold">
              {occurrences.length - critical}
            </div>
            <div className="uppercase tracking-wide text-[9px]">
              Normais
            </div>
          </div>
        </div>
        {occurrences.length > 0 && (
          <div className="mt-2 space-y-1 max-h-52 overflow-y-auto text-[10px]">
            {occurrences.map((o) => (
              <div
                key={o.id}
                className={`rounded-md border px-2 py-1 ${
                  o.critical
                    ? "border-red-500/60 bg-red-50"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex justify-between gap-2">
                  <div className="font-semibold">
                    {o.critical ? "🚨 " : ""}
                    {o.type}
                  </div>
                  <div className="text-[8px] text-muted-foreground">
                    {o.timestamp}
                  </div>
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {o.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" onClick={onDownloadPdf}>
          📑 Exportar Relatório PDF Completo
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={onReset}
        >
          🔄 Reiniciar Sistema
        </Button>
      </div>
    </div>
  );
};

const ProgressLine = ({
  label,
  value,
  total,
  percent,
}: {
  label: string;
  value: number;
  total: number;
  percent: number;
}) => (
  <div className="space-y-1 text-xs">
    <div className="flex justify-between">
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">
        {value}/{total} ({isNaN(percent) ? 0 : percent}%)
      </span>
    </div>
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full bg-emerald-500 transition-all"
        style={{ width: `${isNaN(percent) ? 0 : percent}%` }}
      />
    </div>
  </div>
);