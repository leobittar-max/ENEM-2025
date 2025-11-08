import { Occurrence } from "@/hooks/use-enem-2025";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AppChecklistSection } from "@/components/enem/AppChecklistSection";

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

const OCCURRENCE_OPTIONS = [
  {
    group: "Atrasos / Presença",
    items: [
      "Chefe de sala em atraso",
      "Aplicador/fiscal em atraso",
      "Colaborador ausente (substituição)",
      "Candidato em atraso (tentativa de entrada após fechamento)",
    ],
  },
  {
    group: "Materiais / Malotes",
    items: [
      "Malote com lacre danificado",
      "Malote com numeração divergente",
      "Quantidade de provas insuficiente",
      "Falta de envelopes porta-objetos",
      "Erro em listas de presença/atas",
    ],
  },
  {
    group: "Documento / Identificação",
    items: [
      "Documento de identificação inválido",
      "Documento digital não aceito",
      "Nome social / divergência cadastral",
    ],
  },
  {
    group: "Conduta / Disciplina",
    items: [
      "Uso de celular ou eletrônico durante a prova",
      "Conversas suspeitas / tentativa de cola",
      "Descumprimento de orientações em sala",
      "Candidato se recusou a guardar objeto proibido",
    ],
  },
  {
    group: "Segurança / Saúde",
    items: [
      "Ocorrência médica com candidato",
      "Ocorrência médica com colaborador",
      "Evacuação de sala ou prédio",
      "Briga, ameaça ou situação de risco",
    ],
  },
  {
    group: "Infraestrutura",
    items: [
      "Queda de energia",
      "Ruído externo intenso",
      "Problema em banheiro/bebedouro",
      "Sala sem condições adequadas",
    ],
  },
  {
    group: "Fluxo da prova",
    items: [
      "Problema na abertura de portões",
      "Problema na abertura dos malotes",
      "Atraso na leitura de avisos obrigatórios",
      "Erro no horário de encerramento em alguma sala",
    ],
  },
];

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
  const [selectedType, setSelectedType] = useState<string>("");
  const [customType, setCustomType] = useState<string>("");

  const handleSubmit = () => {
    const finalType =
      selectedType === "custom"
        ? customType.trim()
        : selectedType || form.type.trim();

    if (!finalType) {
      // Mantém comportamento simples: exige um tipo antes de salvar
      return;
    }

    onAddOccurrence({
      type: finalType,
      description: form.description.trim(),
      critical: form.critical,
    });

    // Reset amigável
    setForm({ type: "", description: "", critical: false });
    setSelectedType("");
    setCustomType("");
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
      {/* HERO TIMER */}
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

      {/* Form de ocorrência melhorado */}
      <div className="card-elevated space-y-2">
        <div className="text-[0.78rem] font-semibold flex items-center gap-2">
          ➕ Registrar ocorrência
        </div>

        {/* Tipo com dropdown amplo */}
        <div className="space-y-1">
          <Label className="text-[0.7rem]">
            Tipo de Ocorrência (selecione ou escreva)
          </Label>
          <Select
            value={selectedType}
            onValueChange={(value) => {
              setSelectedType(value);
              if (value !== "custom") {
                setCustomType("");
              }
            }}
          >
            <SelectTrigger className="h-10 text-[0.78rem]">
              <SelectValue placeholder="Selecione um tipo de ocorrência" />
            </SelectTrigger>
            <SelectContent className="max-h-72 text-[0.75rem]">
              {OCCURRENCE_OPTIONS.map((group) => (
                <div key={group.group}>
                  <div className="px-2 pt-1 pb-0.5 text-[0.62rem] font-semibold uppercase text-muted-foreground">
                    {group.group}
                  </div>
                  {group.items.map((item) => (
                    <SelectItem
                      key={item}
                      value={item}
                      className="text-[0.75rem] py-1.5"
                    >
                      {item}
                    </SelectItem>
                  ))}
                </div>
              ))}
              <div className="mt-1 border-t border-border/40" />
              <SelectItem
                value="custom"
                className="text-[0.75rem] py-1.5 font-semibold text-primary"
              >
                ✏️ Outro (digitar manualmente)
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Campo para tipo manual quando selecionado */}
          {selectedType === "custom" && (
            <Input
              placeholder="Digite o tipo de ocorrência (ex: Situação específica deste local)"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              className="mt-1 h-10 text-[0.78rem]"
            />
          )}

          {/* Fallback: se ninguém escolher no select, permite digitar tipo direto */}
          {selectedType === "" && (
            <Input
              placeholder="Ou digite rapidamente o tipo (opcional, se não for usar a lista acima)"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value }))
              }
              className="mt-1 h-9 text-[0.72rem]"
            />
          )}
        </div>

        {/* Descrição */}
        <div className="space-y-1">
          <Label className="text-[0.7rem]">Descrição detalhada</Label>
          <Textarea
            placeholder="Descreva o que ocorreu, local/sala envolvida, horário e providências adotadas..."
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="min-h-[80px] text-[0.78rem]"
          />
        </div>

        {/* Crítica */}
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

      {/* Checklist do app oficial do ENEM */}
      <AppChecklistSection phase="during" />

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