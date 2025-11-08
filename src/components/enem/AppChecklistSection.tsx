import { InfoDialog } from "@/components/enem/InfoDialog";
import { cn } from "@/lib/utils";

interface AppChecklistItem {
  id: string;
  title: string;
  phase: "preparation" | "during" | "closing";
  time?: string | null;
  infoTitle?: string;
  infoBody?: string;
  infoSource?: string;
}

const appChecklistItems: AppChecklistItem[] = [
  // Preparação: registro básico no app
  {
    id: "app-prep-01",
    phase: "preparation",
    title: "Registrar chegada da equipe e do certificador no aplicativo oficial",
    time: "08:00–09:30",
    infoTitle: "Início e validação da equipe",
    infoBody:
      "Use o aplicativo oficial para registrar horário de chegada do Coordenador, do Certificador do Inep e da equipe de aplicação. Valide código/CPF do certificador e sinalize ausentes.",
    infoSource: "Manual do Coordenador ENEM 2025, p. 15–20.",
  },
  {
    id: "app-prep-02",
    phase: "preparation",
    title:
      "Confirmar no app a conferência dos materiais administrativos e de aplicação",
    time: "08:15–08:45",
    infoTitle: "Materiais sob controle",
    infoBody:
      "Registre no aplicativo que crachás, manuais, envelopes, detectores de metal, tablets e demais itens foram recebidos e conferidos, acionando suporte em caso de divergência.",
    infoSource: "Manual do Coordenador ENEM 2025, p. 12.",
  },
  {
    id: "app-prep-03",
    phase: "preparation",
    title:
      "Registrar vistoria do prédio e das salas no aplicativo",
    time: "09:00",
    infoTitle: "Infraestrutura validada",
    infoBody:
      "No app, confirme vistoria de salas, banheiros, acessibilidade, iluminação, ventilação e segurança. Em caso de problemas, abra ocorrência imediatamente.",
    infoSource: "Manual do Coordenador ENEM 2025, p. 13.",
  },
  {
    id: "app-prep-04",
    phase: "preparation",
    title: "Confirmar capacitação da equipe pelo aplicativo",
    time: "09:30–11:00",
    infoTitle: "Capacitação registrada",
    infoBody:
      "Registre início e término da capacitação no aplicativo, com presença de chefes de sala, aplicadores e fiscais. Indique ausências e substituições.",
    infoSource: "Manual do Coordenador ENEM 2025, p. 20.",
  },

  // Durante a prova
  {
    id: "app-day-01",
    phase: "during",
    title:
      "Registrar chegada dos colaboradores e liberar salas no app",
    time: "09:00–09:30",
    infoTitle: "Presença da equipe",
    infoBody:
      "Use o app para registrar quem está presente. A liberação de salas deve considerar esta conferência digital.",
    infoSource: "Manual do Coordenador ENEM 2025, p. 18.",
  },
  {
    id: "app-day-02",
    phase: "during",
    title:
      "Registrar recebimento, abertura e distribuição de malotes",
    time: "10:00–11:30",
    infoTitle: "Controle de malotes",
    infoBody:
      "Cada etapa (recebimento, abertura, distribuição às salas) deve ser registrada no aplicativo, com validação do coordenador e certificador.",
    infoSource: "Manual do Coordenador ENEM 2025, p. 16.",
  },
  {
    id: "app-day-03",
    phase: "during",
    title:
      "Registrar abertura oficial dos portões no aplicativo",
    time: "12:00",
    infoTitle: "Abertura sincronizada",
    infoBody:
      "Confirme no app o horário oficial de abertura dos portões, mantendo alinhamento com o horário de Brasília.",
    infoSource: "Manual do Coordenador ENEM 2025, p. 15.",
  },
  {
    id: "app-day-04",
    phase: "during",
    title:
      "Confirmar fechamento dos portões e início das provas no app",
    time: "13:00–13:30",
    infoTitle: "Controle de acesso",
    infoBody:
      "Registre no aplicativo o fechamento dos portões, a abertura dos envelopes nas salas e o início das provas.",
    infoSource: "Manual do Coordenador ENEM 2025, p. 28.",
  },
  {
    id: "app-day-05",
    phase: "during",
    title:
      "Monitorar e registrar ocorrências e ausências em tempo real",
    time: "13:30–término",
    infoTitle: "Gestão digital de ocorrências",
    infoBody:
      "Utilize exclusivamente o app para registrar incidentes (documentos, barulho, desistências, ocorrências médicas, energia elétrica) e ausências relevantes.",
    infoSource: "Manual do Coordenador ENEM 2025, p. 49.",
  },

  // Encerramento
  {
    id: "app-end-01",
    phase: "closing",
    title:
      "Confirmar no app o término das provas em todas as salas",
    time: "Término oficial",
    infoTitle: "Encerramento oficial",
    infoBody:
      "Registre no aplicativo o encerramento da prova em cada sala, incluindo tempos adicionais (60 ou 120 minutos) quando aplicável.",
    infoSource: "Manual do Coordenador ENEM 2025, p. 54.",
  },
  {
    id: "app-end-02",
    phase: "closing",
    title:
      "Registrar devolução e lacre dos malotes",
    time: "Pós-prova",
    infoTitle: "Lacração registrada",
    infoBody:
      "Confirme no app o recolhimento e lacre de todos os malotes, com conferência pelo assistente e certificador.",
    infoSource: "Manual do Coordenador ENEM 2025, p. 63.",
  },
  {
    id: "app-end-03",
    phase: "closing",
    title:
      "Gerar relatório final do local pelo aplicativo oficial",
    time: "Ao final do expediente",
    infoTitle: "Relatório consolidado",
    infoBody:
      "Use o app para gerar o relatório final com quantitativos, ausências, ocorrências e confirmação de fechamento do local.",
    infoSource: "Manual do Coordenador ENEM 2025, p. 64.",
  },
];

interface AppChecklistSectionProps {
  phase: "preparation" | "during" | "closing";
}

export const AppChecklistSection = ({ phase }: AppChecklistSectionProps) => {
  const items = appChecklistItems.filter((i) => i.phase === phase);
  if (!items.length) return null;

  const titleByPhase: Record<AppChecklistItem["phase"], string> = {
    preparation: "Uso do aplicativo oficial — Preparação",
    during: "Uso do aplicativo oficial — Durante a prova",
    closing: "Uso do aplicativo oficial — Encerramento e relatório",
  };

  return (
    <section className="mt-3 space-y-2">
      <div className="card-elevated flex items-start gap-2 bg-primary/3 border-primary/10">
        <span className="mt-0.5 text-base">📱</span>
        <div className="space-y-0.5">
          <div className="text-[0.85rem] font-semibold">
            {titleByPhase[phase]}
          </div>
          <p className="text-[0.7rem] text-muted-foreground">
            Checklist rápido das ações que a Coordenação deve obrigatoriamente
            registrar no aplicativo oficial do ENEM. Não substitui os demais
            checklists deste painel.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "checklist-item cursor-default select-none bg-card border-border/80 hover:bg-primary/3 hover:border-primary/25 transition-colors",
            )}
          >
            {item.time && (
              <div className="flex flex-col items-center justify-center w-14">
                <div className="text-[0.6rem] font-semibold text-primary truncate">
                  {item.time}
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-1.5">
                <div className="flex-1 min-w-0">
                  <div className="text-[0.75rem] font-semibold leading-snug">
                    {item.title}
                  </div>
                  <div className="text-[0.65rem] text-muted-foreground">
                    Registrar no aplicativo oficial do ENEM
                  </div>
                </div>
                {item.infoTitle && item.infoBody && (
                  <InfoDialog
                    triggerIcon="i"
                    title={item.infoTitle}
                    body={item.infoBody}
                    sourceLabel={item.infoSource}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};