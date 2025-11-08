import { CoordinatorData, Occurrence } from "@/hooks/use-enem-2025";
import { APP_VERSION } from "@/version";
import { cn } from "@/lib/utils";

interface SidebarProps {
  coordinator: CoordinatorData;
  occurrences: Occurrence[];
  currentTime: string;
  currentStage: string;
  onCloseMobile?: () => void;
  onOpenHistory: () => void;
  onBackToPanel?: () => void;
  onExit: () => void;
  showBackToPanel?: boolean;
  onOpenSupervision: () => void;
  nextExamCountdownLabel?: string;
  nextExamCountdownValue?: string;
}

export const Sidebar = ({
  coordinator,
  occurrences,
  currentTime,
  currentStage,
  onCloseMobile,
  onOpenHistory,
  onBackToPanel,
  onExit,
  showBackToPanel,
  onOpenSupervision,
  nextExamCountdownLabel,
  nextExamCountdownValue,
}: SidebarProps) => {
  const countdownLabel =
    nextExamCountdownLabel || "Próximo dia de provas";
  const countdownValue =
    nextExamCountdownValue || "--:--:--";

  const totalOccurrences = occurrences.length;

  return (
    <aside
      className={cn(
        "flex h-full flex-col gap-4 border-r border-border bg-sidebar px-4 py-4 shadow-sm md:h-screen",
        // Mais largo no mobile; confortável em tablets e desktop
        "w-[82vw] max-w-sm md:w-80",
      )}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">
            <span className="text-lg">🎓</span>
            <span>ENEM 2025</span>
          </div>
          <p className="text-[0.8rem] text-sidebar-foreground/80">
            Painel do Coordenador de Local
          </p>
          <p className="text-[0.65rem] text-sidebar-foreground/40">
            v{APP_VERSION}
          </p>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-sidebar-border/70 bg-white/80 text-[0.8rem] text-sidebar-foreground/70 shadow-sm hover:bg-gray-100 md:hidden"
            aria-label="Fechar painel lateral"
          >
            ✕
          </button>
        )}
      </div>

      {/* Local de aplicação */}
      <section className="space-y-1">
        <SectionLabel>Local de aplicação</SectionLabel>
        <div className="rounded-2xl bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)] border border-sidebar-border/80 px-3.5 py-3">
          <div className="text-[0.9rem] font-semibold text-sidebar-foreground">
            {coordinator.location || "-"}
          </div>
          <div className="mt-0.5 text-[0.78rem] text-sidebar-foreground/70">
            {coordinator.city} - {coordinator.state}
          </div>
        </div>
      </section>

      {/* Coordenador */}
      <section className="space-y-1">
        <SectionLabel>Coordenador(a)</SectionLabel>
        <div className="rounded-2xl bg-white border border-sidebar-border/80 px-3.5 py-3 shadow-[0_3px_10px_rgba(15,23,42,0.04)]">
          <div className="text-[0.9rem] font-semibold text-sidebar-foreground">
            {coordinator.name || "-"}
          </div>
          <div className="mt-0.5 text-[0.75rem] text-sidebar-foreground/65 leading-snug">
            Responsável pelo fluxo operacional do local.
          </div>
        </div>
      </section>

      {/* Status em tempo real */}
      <section className="space-y-1">
        <SectionLabel>Status em tempo real</SectionLabel>
        <div className="rounded-2xl bg-white/95 border border-sidebar-border/80 px-3.5 py-3 space-y-1.5 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.75rem] text-sidebar-foreground/70">
              Horário Brasília
            </span>
            <span className="font-mono text-[0.82rem] font-semibold text-sidebar-foreground">
              {currentTime}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.75rem] text-sidebar-foreground/70">
              Etapa atual
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[0.7rem] font-semibold text-emerald-600">
              {currentStage}
            </span>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-sidebar-border/40 space-y-0.5">
            <span className="text-[0.7rem] text-sidebar-foreground/70">
              Countdown para o próximo dia de provas
            </span>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[0.68rem] text-sidebar-foreground/65 line-clamp-1">
                {countdownLabel}
              </span>
              <span className="font-mono text-[0.82rem] font-semibold text-primary">
                {countdownValue}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Resumo rápido */}
      <section className="space-y-1">
        <SectionLabel>Resumo rápido</SectionLabel>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <MiniStat label="Salas" value={coordinator.classrooms} />
          <MiniStat label="Participantes" value={coordinator.participants} />
          <MiniStat label="Ocorrências" value={totalOccurrences} />
        </div>
      </section>

      {/* Modo simulação */}
      {coordinator.simulationMode && (
        <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-yellow-400/60 bg-yellow-50 px-2.5 py-1 text-[0.7rem] text-yellow-800 shadow-[0_2px_8px_rgba(250,204,21,0.25)]">
          🎮 Modo simulação ativo
        </div>
      )}

      {/* Ações principais */}
      <section className="mt-2 space-y-1.5">
        <SidebarButton
          onClick={onOpenHistory}
          variant="soft"
          icon="📋"
          label="Ver Histórico Completo"
          description="Linha do tempo com todos os registros do dia."
        />
        <SidebarButton
          onClick={onOpenSupervision}
          variant="primary-soft"
          icon="🕵️"
          label="Supervisionar"
          description="Presenças da equipe e progresso por sala."
        />
        {showBackToPanel && onBackToPanel && (
          <SidebarButton
            onClick={onBackToPanel}
            variant="success-soft"
            icon="⬅"
            label="Voltar ao Painel"
            description="Retornar à visão principal do coordenador."
          />
        )}
      </section>

      {/* Rodapé / sair */}
      <div className="mt-auto space-y-2 pt-2">
        <button
          type="button"
          onClick={onExit}
          className="w-full rounded-2xl border border-red-300/90 bg-red-50 px-3.5 py-2.5 text-left text-[0.8rem] font-semibold text-red-700 hover:bg-red-100 hover:border-red-400 transition-colors flex items-center gap-2 shadow-[0_3px_10px_rgba(248,113,113,0.18)]"
        >
          <span>⏏ Sair do Painel</span>
        </button>
        <p className="text-[0.65rem] text-sidebar-foreground/55 leading-relaxed">
          Use este painel como guia operacional. Em caso de dúvida, prevalecem
          sempre os comunicados e manuais oficiais do INEP.
        </p>
      </div>
    </aside>
  );
};

const SectionLabel = ({ children }: { children: string }) => (
  <div className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">
    {children}
  </div>
);

const MiniStat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl bg-white border border-sidebar-border/80 px-2 py-1.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] flex flex-col items-center justify-center gap-0.5">
    <div className="text-[0.95rem] font-semibold text-sidebar-foreground">
      {value}
    </div>
    <div className="text-[0.65rem] text-sidebar-foreground/65">
      {label}
    </div>
  </div>
);

interface SidebarButtonProps {
  onClick: () => void;
  icon: string;
  label: string;
  description?: string;
  variant?: "soft" | "primary-soft" | "success-soft";
}

const SidebarButton = ({
  onClick,
  icon,
  label,
  description,
  variant = "soft",
}: SidebarButtonProps) => {
  const base =
    "w-full rounded-2xl px-3.5 py-2.25 text-left flex flex-col gap-0.25 border transition-colors shadow-[0_2px_8px_rgba(15,23,42,0.04)]";
  const variants: Record<string, string> = {
    soft:
      "bg-white border-sidebar-border/80 hover:bg-gray-50 text-sidebar-foreground",
    "primary-soft":
      "bg-primary/5 border-primary/35 text-primary hover:bg-primary/9",
    "success-soft":
      "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(base, variants[variant])}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-base leading-none">{icon}</span>
        <span className="text-[0.82rem] font-semibold leading-tight">
          {label}
        </span>
      </div>
      {description && (
        <span className="mt-0.5 text-[0.68rem] text-sidebar-foreground/60 leading-snug">
          {description}
        </span>
      )}
    </button>
  );
};