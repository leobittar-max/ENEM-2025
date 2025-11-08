import { Occurrence } from "@/hooks/use-enem-2025";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DuringTabProps {
  examTimeRemaining: string;
  examElapsedLabel: string;
  examRunning: boolean;
  stats: { present: number; absent: number };
  occurrences: Occurrence[];
  onAddOccurrence: (data: {
    type: string;
    description: string;
    critical: boolean;
  }) => void;
  onStartExamManually: () => void;
  saoPauloTime: string;
}

export const DuringTab = ({
  examTimeRemaining,
  examElapsedLabel,
  examRunning,
  stats,
  occurrences,
  onAddOccurrence,
  onStartExamManually,
  saoPauloTime,
}: DuringTabProps) => {
  const [form, setForm] = useState({
    type: "",
    description: "",
    critical: false,
  });

  const handleSubmit = () => {
    onAddOccurrence(form);
    setForm({ type: "", description: "", critical: false });
  };

  const total = stats.present + stats.absent || 1;
  const presencePercent =
    stats.present > 0
      ? Math.min(100, Math.round((stats.present / total) * 100))
      : 0;

  const isIdle =
    examTimeRemaining === "--:--:--" || examTimeRemaining === "00:00:00";

  return (
    <div className="space-y-4">
      {/* HERO TIMER - estilo app premium */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/4 via-background to-primary/5 shadow-lg px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary/80">
              Prova em andamento
            </span>
            <span className="text-[0.98rem] font-semibold text-foreground">
              Tempo restante para o encerramento
            </span>
          </div>
          <span className="text-3xl md:text-4xl">🕒</span>
        </div>

        {/* Countdown grande */}
        <div className="flex items-baseline gap-2">
          <div
            className={cn(
              "font-mono font-semibold leading-none",
              "text-4xl xs:text-5xl md:text-6xl",
              examRunning
                ? "text-primary drop-shadow-[0_4px_14px_rgba(41,98,255,0.35)]"
                : "text-muted-foreground",
            )}
          >
            {examTimeRemaining}
          </div>
          <div className="flex flex-col gap-0.5 text-[0.7rem] text-muted-foreground">
            <span>
              Decorridos:{" "}
              <span className="font-semibold text-foreground">
                {examElapsedLabel}
              </span>
            </span>
            <span>
              Brasília agora:{" "}
              <span className="font-semibold text-primary">
                {saoPauloTime}
              </span>
            </span>
          </div>
        </div>

        {/* Barra de progresso da prova */}
        <div className="mt-1 space-y-1.5">
          <div className="flex items-center justify-between text-[0.68rem] text-muted-foreground">
            <span>Presença da equipe</span>
            <span className="font-semibold text-emerald-600">
              {stats.present} presentes · {presencePercent}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                presencePercent >= 80
                  ? "bg-emerald-500"
                  : presencePercent >= 40
                  ? "bg-amber-400"
                  : "bg-red-400",
              )}
              style={{ width: `${presencePercent}%` }}
            />
          </div>
        </div>

        {/* Ação de controle */}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {!examRunning && (
            <Button
              size="sm"
              className="rounded-full px-4 py-2 text-[0.78rem] font-semibold bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              onClick={onStartExamManually}
            >
              ▶ Iniciar contagem manualmente
            </Button>
          )}
          {examRunning && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[0.7rem] px-3 py-1 font-semibold">
              ● Contagem ativa · alertas automáticos habilitados
            </span>
          )}
          {isIdle && (
            <span className="text-[0.68rem] text-muted-foreground">
              A contagem inicia automaticamente no horário oficial ou pode ser iniciada manualmente.
            </span>
          )}
        </div>

        {/* Glow decorativo */}
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-24 w-24 rounded-full bg-primary/8 blur-2xl" />
      </div>

      {/* Aviso rápido */}
      <div className="card-elevated flex items-start gap-2 bg-muted/40 border-muted">
        <span className="mt-0.5">📢</span>
        <p className="text-[0.72rem] text-muted-foreground">
          Registre ocorrências em tempo real; o sistema usa o relógio de Brasília e a contagem
          da prova para sugerir ações no momento certo.
        </p>
      </div>

      {/* Form rápido de ocorrência */}
      <div className="card-elevated space-y-2">
        <div className="text-[0.78rem] font-semibold flex items-center gap-2">
          ➕ Registrar ocorrência
        </div>
        <div className="space-y-1">
          <Label className="text-[0.7rem]">Tipo de Ocorrência</Label>
          <Input
            placeholder="Ex: atraso de malote, ausência de fiscal, falha de energia..."
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({ ...f, type: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[0.7rem]">Descrição</Label>
          <Textarea
            placeholder="Descreva rapidamente o que ocorreu e as ações tomadas..."
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="min-h-[72px] text-[0.78rem]"
          />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="occCritical"
            checked={form.critical}
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, critical: Boolean(checked) }))
            }
          />
          <Label
            htmlFor="occCritical"
            className="text-[0.7rem] text-destructive font-semibold"
          >
            Marcar como ocorrência crítica
          </Label>
        </div>
        <Button
          size="sm"
          className="mt-1 w-full touch-target text-[0.78rem] font-semibold"
          onClick={handleSubmit}
          aria-label="Salvar ocorrência registrada"
        >
          Salvar ocorrência
        </Button>
      </div>

      {/* Lista de ocorrências */}
      <OccurrenceList occurrences={occurrences} />
    </div>
  );
};

const OccurrenceList = ({ occurrences }: { occurrences: Occurrence[] }) => {
  if (!occurrences.length) {
    return (
      <div className="card-elevated text-center text-[0.7rem] text-muted-foreground">
        Nenhuma ocorrência registrada até o momento.
      </div>
    );
  }
  const sorted = [...occurrences].sort((a, b) => b.id - a.id);
  return (
    <div className="card-elevated space-y-1.5">
      <div className="text-[0.78rem] font-semibold">
        Ocorrências registradas ({occurrences.length})
      </div>
      {sorted.map((occ) => (
        <div
          key={occ.id}
          className={cn(
            "rounded-2xl border px-3 py-2 text-[0.68rem] space-y-0.5",
            occ.critical
              ? "border-destructive/70 bg-destructive/5"
              : "border-border bg-background",
          )}
        >
          <div className="flex justify-between gap-2">
            <span className="font-semibold truncate">
              {occ.critical ? "🚨 " : ""}
              {occ.type}
            </span>
            <span className="text-[0.6rem] text-muted-foreground">
              ⏰ {occ.timestamp}
            </span>
          </div>
          <div className="text-[0.68rem] text-muted-foreground line-clamp-3">
            {occ.description}
          </div>
          {occ.critical && (
            <div className="text-[0.6rem] text-destructive font-semibold">
              Crítica - acione protocolo.
            </div>
          )}
        </div>
      ))}
    </div>
  );
};