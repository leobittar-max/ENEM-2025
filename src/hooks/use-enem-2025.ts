import { useEffect, useMemo, useState } from "react";
import { showSuccess, showError } from "@/utils/toast";
import { generateFullPdfReport } from "@/utils/report-pdf";

export type EnemNotificationType =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "next_step"
  | "reminder";

export interface CoordinatorData {
  name: string;
  city: string;
  state: string;
  location: string;
  classrooms: number;
  participants: number;
  examDay: 1 | 2;
  simulationMode: boolean;
}

export type LogCategory =
  | "preparation"
  | "operational"
  | "incidents"
  | "closing";

export type LogStatus = "completed" | "failed" | "warning";

export interface LogEntry {
  id: number;
  name: string;
  category: LogCategory;
  status: LogStatus;
  timestamp: string;
}

export interface ChecklistInfoSource {
  manual: string;
  pagina: number;
}

export interface ChecklistInfoPopup {
  titulo: string;
  corpo: string;
  fonte: ChecklistInfoSource;
}

export interface ChecklistItem {
  id: string;
  text: string;
  phase: "preparation" | "morning" | "during" | "closing" | "post";
  role: string;
  suggestedTime?: string | null;
  info?: ChecklistInfoPopup;
  critical?: boolean;
}

export interface Occurrence {
  id: number;
  type: string;
  description: string;
  critical: boolean;
  timestamp: string;
}

type TabId = "preparation" | "morning" | "during" | "closing" | "report";

interface DailyState {
  preparation: string[];
  morning: string[];
  closing: string[];
  occurrences: Occurrence[];
  stats: {
    present: number;
    absent: number;
  };
  notes: Record<string, string>;
  log: LogEntry[];
}

interface EnemState {
  day1: DailyState;
  day2: DailyState;
  coordinator: CoordinatorData | null;
}

const STORAGE_KEY = "enem2025_state_v2";
const STORAGE_THEME_KEY = "enem2025_theme_v1";
const STORAGE_TAB_KEY = "enem2025_tab_v1";

/**
 * Checklist completo do Coordenador baseado no anexo oficial.
 * Campos do anexo mapeados para:
 * - fase -> phase
 * - titulo -> text
 * - papel -> role
 * - hora_sugerida -> suggestedTime
 * - info_popup -> info
 */
const checklistItemsBase: ChecklistItem[] = [
  // Preparação Prévia
  {
    id: "prep-01",
    phase: "preparation",
    text: "Receber e conferir caixas de materiais administrativos",
    role: "Coordenador",
    info: {
      titulo: "Conferência completa do kit administrativo",
      corpo:
        "Confira se as caixas trazem todos os impressos e reservas (listas de presença, atas, cartões-resposta/folha de redação, folhas de rascunho), crachás, envelopes de sala e envelopes porta-objetos. Registre o recebimento no sistema da Instituição Aplicadora e separe por sala conforme o Relatório de Participantes e Salas. Se faltar algo, contate imediatamente a Aplicadora.",
      fonte: { manual: "Coordenador", pagina: 12 },
    },
    critical: true,
  },
  {
    id: "prep-02",
    phase: "preparation",
    text: "Separar e reservar envelopes porta-objetos (salas e equipe)",
    role: "Coordenador",
    info: {
      titulo: "Envelope porta-objetos por sala e por colaborador",
      corpo:
        "Separe envelopes porta-objetos na quantidade exata por sala, conforme o Relatório de Participantes e Salas, e reserve uma cota para toda a equipe de aplicação. Isso evita falta no momento de identificação e vistoria eletrônica.",
      fonte: { manual: "Coordenador", pagina: 12 },
    },
  },
  {
    id: "prep-03",
    phase: "preparation",
    text: "Checar detectores de metais e alicate de lacre",
    role: "Coordenador",
    info: {
      titulo: "Segurança e abertura de malotes",
      corpo:
        "Confirme o funcionamento dos detectores (bateria/carga, modo sonoro) e a disponibilidade do alicate para corte do lacre de aço dos malotes. Registre a quantidade recebida no sistema.",
      fonte: { manual: "Coordenador", pagina: 12 },
    },
    critical: true,
  },
  {
    id: "prep-04",
    phase: "preparation",
    text: "Testar app interno no celular do coordenador e do assistente",
    role: "Coordenador",
    info: {
      titulo: "Verificação do aplicativo",
      corpo:
        "Instale/atualize o app indicado pela Aplicadora e valide o login e as telas críticas (relatórios, checklist, registro de ocorrências). Falhas devem ser reportadas ainda na semana prévia.",
      fonte: { manual: "Coordenador", pagina: 12 },
    },
  },
  {
    id: "prep-05",
    phase: "preparation",
    text: "Vistoriar prédio e salas (iluminação, ventilação, água, energia)",
    role: "Coordenador",
    info: {
      titulo: "Vistoria geral do local",
      corpo:
        "Inspecione luz, ventilação/climatização, abastecimento de água, banheiros, bebedouros e tomadas. Prefira salas longe dos banheiros para reduzir ruído; se usá-las, que seja como Sala Extra.",
      fonte: { manual: "Coordenador", pagina: 13 },
    },
    critical: true,
  },
  {
    id: "prep-06",
    phase: "preparation",
    text: "Garantir acessibilidade, salas especiais e sala de acompanhante",
    role: "Coordenador",
    info: {
      titulo: "Acessibilidade mapeada e mobiliário adequado",
      corpo:
        "Verifique mesas e cadeiras acessíveis, tomadas para videoprova/leitor de tela, identificação das salas de fácil acesso e a sala do acompanhante de lactante. Ajuste antes do dia da prova.",
      fonte: { manual: "Coordenador", pagina: 13 },
    },
    critical: true,
  },
  {
    id: "prep-07",
    phase: "preparation",
    text: "Definir Sala de Coordenação e guarda segura dos malotes",
    role: "Coordenador",
    info: {
      titulo: "Coordenação próxima às salas e malotes sob guarda",
      corpo:
        "Escolha a Sala de Coordenação próxima às salas de prova e garanta local trancado para malotes (preferencialmente sem janelas). Sem essa sala, designe vigilância dedicada.",
      fonte: { manual: "Coordenador", pagina: 13 },
    },
    critical: true,
  },
  {
    id: "prep-08",
    phase: "preparation",
    text: "Planejar capacitação e comunicar dress code da equipe",
    role: "Coordenador",
    info: {
      titulo: "Capacitação obrigatória e orientações de vestimenta",
      corpo:
        "Agende a capacitação e reforce: camisa branca (intérprete de Libras de preto), calça jeans/preta, documento com foto, caneta preta transparente e relógio analógico.",
      fonte: { manual: "Coordenador", pagina: 14 },
    },
  },
  {
    id: "prep-09",
    phase: "preparation",
    text: "Verificar documentação da equipe (termos e lista de presença)",
    role: "Coordenador",
    info: {
      titulo: "Regularidade documental da equipe",
      corpo:
        "Confirme que todos assinaram os termos obrigatórios e que a lista de presença/credenciamento está correta. Sem documentação regular, o colaborador deve ser substituído.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
    critical: true,
  },
  {
    id: "prep-10",
    phase: "preparation",
    text: "Checar fechaduras/chaves e integridade da sala-cofre dos malotes",
    role: "Coordenador",
    info: {
      titulo: "Proteção física dos malotes",
      corpo:
        "Teste as fechaduras e confira quem tem a guarda das chaves. A sala de malotes deve ser trancada e, preferencialmente, sem janelas.",
      fonte: { manual: "Coordenador", pagina: 13 },
    },
    critical: true,
  },
  {
    id: "prep-11",
    phase: "preparation",
    text: "Inspecionar dispositivos de segurança e combate a incêndio",
    role: "Coordenador",
    info: {
      titulo: "Segurança predial e preventiva",
      corpo:
        "Verifique a sinalização de emergência, extintores acessíveis, rotas de fuga e iluminação de segurança. Oriente a equipe sobre pontos de encontro.",
      fonte: { manual: "Coordenador", pagina: 14 },
    },
  },
  {
    id: "prep-12",
    phase: "preparation",
    text: "Restringir acesso de terceiros e circulação no prédio",
    role: "Coordenador",
    info: {
      titulo: "Perímetro controlado",
      corpo:
        "Garanta que apenas equipe, certificador e candidatos acessem as áreas autorizadas. Sinalize proibições e defina pontos de controle de entrada.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
  },
  {
    id: "prep-13",
    phase: "preparation",
    text: "Organizar numeração e identificação oficial das salas",
    role: "Coordenador",
    info: {
      titulo: "Sinalização e distribuição por sala",
      corpo:
        "Numere e identifique as salas conforme etiquetas/planilhas oficiais, fixando sinalização visível nos corredores e portas.",
      fonte: { manual: "Coordenador", pagina: 13 },
    },
  },
  {
    id: "prep-14",
    phase: "preparation",
    text: "Definir plano de contingência (energia, incidentes, comunicação)",
    role: "Coordenador",
    info: {
      titulo: "Procedimentos para imprevistos",
      corpo:
        "Combine rotas de ação para falta de energia, ruídos externos, incidentes médicos e substituições urgentes. Atribua responsáveis e use fiscal volante como principal canal de acionamento.",
      fonte: { manual: "Coordenador", pagina: 14 },
    },
  },
  {
    id: "prep-15",
    phase: "preparation",
    text: "Testar relógios analógicos e cronômetros das salas",
    role: "Coordenador",
    info: {
      titulo: "Sincronização de tempo",
      corpo:
        "Garanta que todas as salas tenham marcador de tempo funcional e sincronizado ao horário de Brasília. Disponibilize relógio reserva se necessário.",
      fonte: { manual: "Chefe de Sala", pagina: 2 },
    },
  },
  {
    id: "prep-16",
    phase: "preparation",
    text: "Planejar comunicação via fiscal volante e assistente",
    role: "Coordenador",
    info: {
      titulo: "Canal rápido de apoio às salas",
      corpo:
        "Estabeleça o fiscal volante como ponte entre Coordenação e salas para documentos, ocorrências e deslocamentos ao banheiro. Defina sinais e rotas.",
      fonte: { manual: "Coordenador", pagina: 20 },
    },
  },

  // Manhã / Portões / Malotes
  {
    id: "manha-01",
    phase: "morning",
    text: "Chegada do coordenador e assistente (08:00)",
    role: "Coordenador",
    suggestedTime: "08:00",
    info: {
      titulo: "Início formal das atividades no local",
      corpo:
        "Coordenador e assistente chegam às 8h, recebem supervisor/certificador (se houver) e organizam a distribuição de materiais. Registre código/CPF e horários do certificador no relatório.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
  },
  {
    id: "manha-02",
    phase: "morning",
    text: "Chegada da equipe (09:00 no 1º dia; 09:30 no 2º)",
    role: "Coordenador",
    suggestedTime: "09:00/09:30",
    info: {
      titulo: "Ponto de encontro e presença",
      corpo:
        "Confirme presença, substitua ausentes e direcione chefes de sala e fiscais. Entregue envelopes de sala com recibo e faça minicapacitação.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
  },
  {
    id: "manha-03",
    phase: "morning",
    text: "Distribuir materiais às salas (envelopes, reservas, crachás)",
    role: "Coordenador",
    suggestedTime: "09:30",
    info: {
      titulo: "Kits completos por sala",
      corpo:
        "Cada sala recebe envelope com lista, ata, avaliações (se houver), envelopes porta-objetos e materiais reserva. Chefes de Sala confirmam recebimento.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
  },
  {
    id: "portoes-01",
    phase: "morning",
    text: "ABRIR portões (12:00) e FECHAR (13:00)",
    role: "Coordenador",
    suggestedTime: "12:00 / 13:00",
    info: {
      titulo: "Controle de acesso no horário de Brasília",
      corpo:
        "Abra os portões às 12h e feche às 13h, conforme horário de Brasília. Após o fechamento, inicie a abertura dos malotes e distribuição às salas.",
      fonte: { manual: "Coordenador", pagina: 11 },
    },
    critical: true,
  },
  {
    id: "portoes-02",
    phase: "morning",
    text: "Abrir malotes (após 13:00) e distribuir envelopes/provas",
    role: "Coordenador",
    suggestedTime: "13:00+",
    info: {
      titulo: "Integridade e distribuição nominal",
      corpo:
        "Abertura dos malotes somente após 13h, com integridade verificada e registro. Distribua provas às salas com controle nominal.",
      fonte: { manual: "Coordenador", pagina: 42 },
    },
    critical: true,
  },

  // Durante a Prova
  {
    id: "exec-01",
    phase: "during",
    text: "Supervisionar: Início das provas (13:30) e avisos obrigatórios",
    role: "Coordenador",
    suggestedTime: "13:30",
    info: {
      titulo: "Supervisão — Ritual de abertura em sala",
      corpo:
        "Garanta que as salas iniciem às 13h30, com leitura dos avisos obrigatórios e marcador de tempo visível, apoiando via fiscal volante.",
      fonte: { manual: "Chefe de Sala", pagina: 2 },
    },
  },
  {
    id: "exec-02",
    phase: "during",
    text: "Supervisionar: Identificação e conferência de documentos",
    role: "Coordenador",
    info: {
      titulo: "Supervisão — Documentos aceitos e procedimentos",
      corpo:
        "Verifique se Chefes de Sala conferem nome, documento com foto e orientam sobre envelope porta-objetos e detector de metais.",
      fonte: { manual: "Chefe de Sala", pagina: 2 },
    },
  },
  {
    id: "exec-03",
    phase: "during",
    text: "Supervisionar: Envelope porta-objetos — guarda de itens e vistorias",
    role: "Coordenador",
    info: {
      titulo: "Supervisão — Itens obrigatórios no envelope",
      corpo:
        "Acompanhe o correto uso do envelope porta-objetos, celular desligado e vistoria eletrônica adequada.",
      fonte: { manual: "Chefe de Sala", pagina: 4 },
    },
  },
  {
    id: "exec-04",
    phase: "during",
    text: "Supervisionar: Controle de horários e saídas",
    role: "Coordenador",
    info: {
      titulo: "Supervisão — Marcos de tempo e saídas",
      corpo:
        "Assegure cumprimento dos marcos: saída sem caderno após 2h, com caderno nos horários oficiais e término correto.",
      fonte: { manual: "Coordenador", pagina: 11 },
    },
  },
  {
    id: "exec-05",
    phase: "during",
    text: "Sala Extra e participantes fora do cadastro (gestão e reporte)",
    role: "Coordenador",
    suggestedTime: "14:20",
    info: {
      titulo: "Direcionamento e reporte",
      corpo:
        "Gerencie Sala Extra quando necessário e informe ausentes/irregularidades à Aplicadora nos horários previstos.",
      fonte: { manual: "Coordenador", pagina: 37 },
    },
  },
  {
    id: "exec-06",
    phase: "during",
    text: "Supervisionar: Procedimentos de segurança e detector de metais",
    role: "Coordenador",
    suggestedTime: "13:45",
    info: {
      titulo: "Supervisão — Fluxo de vistoria e reforços",
      corpo:
        "Supervisione vistoria eletrônica, inspeção de lanches/medicamentos e registre anomalias.",
      fonte: { manual: "Chefe de Sala", pagina: 4 },
    },
  },
  {
    id: "exec-07",
    phase: "during",
    text: "Distribuição dos envelopes com recibo assinado pelo Chefe de Sala",
    role: "Coordenador",
    suggestedTime: "13:05",
    info: {
      titulo: "Controle formal de entrega",
      corpo:
        "Entregue envelopes às salas com assinatura do Chefe de Sala, garantindo rastreabilidade.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
  },
  {
    id: "exec-08",
    phase: "during",
    text: "Preencher e assinar o Termo de Abertura dos Malotes",
    role: "Coordenador",
    suggestedTime: "13:00–13:20",
    info: {
      titulo: "Registro de integridade dos malotes",
      corpo:
        "Registre abertura, número de lacres e assinaturas. Não prossiga sem o termo.",
      fonte: { manual: "Coordenador", pagina: 42 },
    },
    critical: true,
  },
  {
    id: "exec-09",
    phase: "during",
    text: "Acompanhar fiscais volantes e assistentes nas demandas das salas",
    role: "Coordenador",
    info: {
      titulo: "Fluxo de apoio contínuo",
      corpo:
        "Monitore deslocamentos, autorize atendimentos e mantenha canal ágil para entregas e substituições.",
      fonte: { manual: "Coordenador", pagina: 20 },
    },
  },
  {
    id: "exec-10",
    phase: "during",
    text: "Monitorar salas com atendimento especializado",
    role: "Coordenador",
    info: {
      titulo: "Garantia de condições específicas",
      corpo:
        "Verifique tempo adicional, salas de lactantes, recursos de acessibilidade e procedimentos diferenciados.",
      fonte: { manual: "Coordenador", pagina: 38 },
    },
  },
  {
    id: "exec-11",
    phase: "during",
    text: "Supervisionar: Leituras de avisos obrigatórios no tempo certo",
    role: "Coordenador",
    info: {
      titulo: "Supervisão — Avisos marcados no quadro",
      corpo:
        "Garanta leitura dos marcos do marcador de tempo (2h mín., 60 min restantes, 15 min finais).",
      fonte: { manual: "Chefe de Sala", pagina: 2 },
    },
  },
  {
    id: "exec-12",
    phase: "during",
    text: "Registrar/validar ocorrências em ata/sistema (em tempo real)",
    role: "Coordenador",
    info: {
      titulo: "Rastreabilidade e transparência",
      corpo:
        "Registre ocorrências (documentos, saúde, energia, barulho, etc.) em tempo real e valide com as salas.",
      fonte: { manual: "Coordenador", pagina: 57 },
    },
  },
  {
    id: "exec-13",
    phase: "during",
    text: "Autorizar/acompanhar idas ao banheiro via fiscal volante",
    role: "Coordenador",
    info: {
      titulo: "Controle de deslocamentos",
      corpo:
        "Defina fluxo de fiscais volantes para acompanhar idas ao banheiro, registrando quando aplicável.",
      fonte: { manual: "Chefe de Sala", pagina: 3 },
    },
  },
  {
    id: "exec-14",
    phase: "during",
    text: "Comunicar avisos gerais (alto-falante) quando necessário",
    role: "Coordenador",
    info: {
      titulo: "Comando central do exame",
      corpo:
        "Use comunicação centralizada para avisos importantes, evitando ruídos excessivos.",
      fonte: { manual: "Coordenador", pagina: 11 },
    },
  },

  // Encerramento
  {
    id: "enc-01",
    phase: "closing",
    text: "Recolher materiais e conferir assinaturas/listas",
    role: "Coordenador",
    info: {
      titulo: "Fechamento administrativo das salas",
      corpo:
        "Recolha cartões-resposta, folhas de redação, atas, listas e confirme contagens de presentes/ausentes.",
      fonte: { manual: "Coordenador", pagina: 57 },
    },
    critical: true,
  },
  {
    id: "enc-02",
    phase: "closing",
    text: "Fechamento e lacre dos malotes",
    role: "Coordenador",
    info: {
      titulo: "Integridade do lacre e conferência de volumes",
      corpo:
        "Organize documentos, confira números de lacres, registre horários e lacre os malotes para devolução.",
      fonte: { manual: "Coordenador", pagina: 63 },
    },
    critical: true,
  },
  {
    id: "enc-03",
    phase: "closing",
    text: "Verificar fisicamente os lacres antes da devolução",
    role: "Coordenador",
    info: {
      titulo: "Conferência final de segurança",
      corpo:
        "Confirme lacres íntegros e numeração registrada. Divergências devem ser registradas.",
      fonte: { manual: "Coordenador", pagina: 63 },
    },
  },
  {
    id: "enc-04",
    phase: "closing",
    text: "Preencher e assinar o Termo de Encerramento da Aplicação",
    role: "Coordenador",
    info: {
      titulo: "Fechamento formal do dia",
      corpo:
        "Registre horários, volumes, ocorrências resumidas e assinaturas dos responsáveis.",
      fonte: { manual: "Coordenador", pagina: 60 },
    },
    critical: true,
  },
  {
    id: "enc-05",
    phase: "closing",
    text: "Conferir assinaturas dos chefes de sala nas atas e listas",
    role: "Coordenador",
    info: {
      titulo: "Documentação completa",
      corpo:
        "Garanta que atas, listas e relatórios estejam assinados antes do lacre.",
      fonte: { manual: "Coordenador", pagina: 57 },
    },
  },
  {
    id: "enc-06",
    phase: "closing",
    text: "Conferir devolução de detectores de metais e equipamentos",
    role: "Coordenador",
    info: {
      titulo: "Controle de bens",
      corpo:
        "Confira quantidade e estado dos equipamentos e registre a devolução.",
      fonte: { manual: "Coordenador", pagina: 60 },
    },
  },
  {
    id: "enc-07",
    phase: "closing",
    text: "Conferir lista de volumes e emitir recibo de entrega",
    role: "Coordenador",
    info: {
      titulo: "Rastreio da remessa",
      corpo:
        "Relacione volumes, confira lista, gere recibo e colha assinatura do responsável pelo recebimento.",
      fonte: { manual: "Coordenador", pagina: 63 },
    },
  },
  {
    id: "enc-08",
    phase: "closing",
    text: "Registrar ocorrências operacionais (energia, barulho, logística)",
    role: "Coordenador",
    info: {
      titulo: "Lições para o próximo dia",
      corpo:
        "Descreva problemas e soluções aplicadas para orientar a equipe no dia seguinte.",
      fonte: { manual: "Coordenador", pagina: 60 },
    },
  },
  {
    id: "enc-09",
    phase: "closing",
    text: "Feedback imediato com chefes de sala (debriefing)",
    role: "Coordenador",
    info: {
      titulo: "Alinhamento final",
      corpo:
        "Reúna chefes de sala para revisar incidentes e alinhar melhorias.",
      fonte: { manual: "Coordenador", pagina: 61 },
    },
  },
  {
    id: "enc-10",
    phase: "closing",
    text: "Verificar fechamento das salas e condições do prédio",
    role: "Coordenador",
    info: {
      titulo: "Encerramento do local",
      corpo:
        "Confirme que salas estão vazias, limpas, trancadas, luzes apagadas e acesso restrito.",
      fonte: { manual: "Coordenador", pagina: 64 },
    },
  },

  // Pós-aplicação
  {
    id: "pos-01",
    phase: "post",
    text: "Entrega à Instituição Aplicadora e relatório final",
    role: "Coordenador",
    info: {
      titulo: "Devolução formal e fechamento",
      corpo:
        "Entregue malotes e equipamentos, finalize relatórios/ocorrências no app e valide pendências com chefes de sala.",
      fonte: { manual: "Coordenador", pagina: 60 },
    },
  },
];

const preparationItems = checklistItemsBase.filter(
  (i) => i.phase === "preparation",
);
const morningItems = checklistItemsBase.filter((i) => i.phase === "morning");
const duringItems = checklistItemsBase.filter((i) => i.phase === "during");
const closingItems = checklistItemsBase.filter((i) => i.phase === "closing");

function formatNow() {
  return new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function parseTimeToToday(time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function createEmptyDailyState(): DailyState {
  return {
    preparation: [],
    morning: [],
    closing: [],
    occurrences: [],
    stats: { present: 0, absent: 0 },
    notes: {},
    log: [],
  };
}

function safeLoadState(): EnemState {
  if (typeof window === "undefined") {
    return {
      day1: createEmptyDailyState(),
      day2: createEmptyDailyState(),
      coordinator: null,
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        day1: createEmptyDailyState(),
        day2: createEmptyDailyState(),
        coordinator: null,
      };
    }
    const parsed = JSON.parse(raw) as EnemState;
    return {
      day1: parsed.day1 ?? createEmptyDailyState(),
      day2: parsed.day2 ?? createEmptyDailyState(),
      coordinator: parsed.coordinator ?? null,
    };
  } catch {
    return {
      day1: createEmptyDailyState(),
      day2: createEmptyDailyState(),
      coordinator: null,
    };
  }
}

function safeLoadTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_THEME_KEY);
  return stored === "dark" ? "dark" : "light";
}

function safeLoadTab(): TabId {
  if (typeof window === "undefined") return "preparation";
  const stored = window.localStorage.getItem(STORAGE_TAB_KEY) as TabId | null;
  return stored || "preparation";
}

function getSaoPauloDate(now: Date) {
  const iso = now.toLocaleString("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });
  const [y, m, d] = iso.split(",")[0].split("-");
  return {
    year: Number(y),
    month: Number(m),
    day: Number(d),
  };
}

function buildCurrentStage(now: Date): string {
  const { year, month, day } = getSaoPauloDate(now);
  const hourStr = now.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hour12: false,
  });
  const h = Number(hourStr);

  if (year < 2025) return "Preparação";
  if (year > 2025) return "Evento encerrado";

  const isDay1 = day === 9 && month === 11;
  const isDay2 = day === 16 && month === 11;

  if (!isDay1 && !isDay2) {
    if (month < 11 || (month === 11 && day < 9)) return "Preparação";
    if (month === 11 && day > 9 && day < 16) return "Preparação";
    if (month > 11 || (month === 11 && day > 16)) return "Evento encerrado";
  }

  if (isDay1 || isDay2) {
    if (h < 8) return "Preparação";
    if (h >= 8 && h < 13) return "Manhã do Exame";
    if (h >= 13 && h < 19) return "Durante a Aplicação";
    return "Encerramento";
  }

  return "Preparação";
}

export function useEnem2025() {
  const [state, setState] = useState<EnemState>(() => safeLoadState());
  const [activeTab, setActiveTabState] = useState<TabId>(() => safeLoadTab());
  const [now, setNow] = useState<Date>(new Date());
  const [theme, setTheme] = useState<"light" | "dark">(() => safeLoadTheme());
  const [firedAlerts, setFiredAlerts] = useState<Record<string, boolean>>({});

  const coordinator = state.coordinator;
  const currentDay: 1 | 2 | null = coordinator?.examDay ?? null;

  const getDailyState = (): DailyState => {
    if (currentDay === 2) return state.day2;
    return state.day1;
  };

  const setDailyState = (updater: (prev: DailyState) => DailyState) => {
    setState((prev) => {
      if (currentDay === 2) {
        return { ...prev, day2: updater(prev.day2) };
      }
      return { ...prev, day1: updater(prev.day1) };
    });
  };

  const daily = getDailyState();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      window.localStorage.setItem(STORAGE_THEME_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function setActiveTab(tab: TabId) {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_TAB_KEY, tab);
    }
  }

  const currentTimes = useMemo(() => {
    if (!coordinator) return null;
    return coordinator.examDay === 1
      ? {
          gatesOpen: "12:00",
          gatesClose: "13:00",
          examStart: "13:30",
          examEndRegular: "19:00",
        }
      : {
          gatesOpen: "12:00",
          gatesClose: "13:00",
          examStart: "13:30",
          examEndRegular: "18:30",
        };
  }, [coordinator]);

  const currentStage = useMemo(() => buildCurrentStage(now), [now]);

  const examTimeRemaining = useMemo(() => {
    if (!currentTimes) return "--:--:--";
    const end = parseTimeToToday(currentTimes.examEndRegular);
    if (now >= end || now.getHours() < 13) return "--:--:--";
    const diff = end.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0",
    )}:${String(s).padStart(2, "0")}`;
  }, [now, currentTimes]);

  useEffect(() => {
    if (!coordinator || !currentTimes) return;

    const alertsConfig = [
      {
        id: "gatesOpen",
        time: currentTimes.gatesOpen,
        minutesBefore: 10,
        message: "Lembrete: abertura dos portões em 10 minutos.",
      },
      {
        id: "gatesClose",
        time: currentTimes.gatesClose,
        minutesBefore: 10,
        message: "Lembrete: fechamento dos portões em 10 minutos.",
      },
      {
        id: "examStart",
        time: currentTimes.examStart,
        minutesBefore: 5,
        message: "Lembrete: início das provas em 5 minutos.",
      },
      {
        id: "examEnd",
        time: currentTimes.examEndRegular,
        minutesBefore: 15,
        message: "Lembrete: término previsto das provas em 15 minutos.",
      },
    ] as const;

    alertsConfig.forEach((cfg) => {
      const key = `${cfg.id}_DIA${coordinator.examDay}`;
      if (firedAlerts[key]) return;

      const target = parseTimeToToday(cfg.time);
      const diffMinutes = (target.getTime() - now.getTime()) / 60000;

      if (
        diffMinutes <= cfg.minutesBefore &&
        diffMinutes > cfg.minutesBefore - 1.2
      ) {
        setFiredAlerts((prev) => ({ ...prev, [key]: true }));
        showSuccess(cfg.message);
      }
    });
  }, [now, currentTimes, coordinator, firedAlerts]);

  function initializeCoordinator(payload: CoordinatorData) {
    setState((prev) => ({
      ...prev,
      coordinator: { ...payload },
    }));
    showSuccess(
      `Bem-vinda(o), ${payload.name}! Sistema pronto para o ENEM - Dia ${payload.examDay}.`,
    );
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
    showSuccess(`Tema ${theme === "light" ? "escuro" : "claro"} ativado.`);
  }

  function toggleChecklistItem(
    list: "preparation" | "morning" | "closing",
    itemId: string,
  ) {
    if (!currentDay) {
      showError("Defina o dia do exame antes de usar o checklist.");
      return;
    }

    const source =
      list === "preparation"
        ? preparationItems
        : list === "morning"
        ? morningItems
        : closingItems;

    const item = source.find((i) => i.id === itemId);
    if (!item) return;

    setDailyState((prev) => {
      const current = prev[list];
      const isChecked = current.includes(itemId);
      const nextList = isChecked
        ? current.filter((id) => id !== itemId)
        : [...current, itemId];

      if (!isChecked) {
        const category: LogCategory =
          list === "preparation"
            ? "preparation"
            : list === "morning"
            ? "operational"
            : "closing";

        const entry: LogEntry = {
          id: Date.now(),
          name: `[Checklist] ${item.text}`,
          category,
          status: "completed",
          timestamp: new Date().toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        };

        return {
          ...prev,
          [list]: nextList,
          log: [entry, ...prev.log],
        };
      }

      return {
        ...prev,
        [list]: nextList,
      };
    });
  }

  function setNote(id: string, value: string) {
    if (!currentDay) return;
    setDailyState((prev) => ({
      ...prev,
      notes: {
        ...prev.notes,
        [id]: value,
      },
    }));
  }

  function addOccurrence(data: {
    type: string;
    description: string;
    critical: boolean;
  }) {
    if (!currentDay) {
      showError("Defina o dia do exame antes de registrar ocorrências.");
      return;
    }
    if (!data.type || !data.description) {
      showError("Preencha tipo e descrição da ocorrência.");
      return;
    }

    const timestamp = formatNow();

    setDailyState((prev) => {
      const occ: Occurrence = {
        id: Date.now(),
        type: data.type,
        description: data.description,
        critical: data.critical,
        timestamp,
      };

      const logEntry: LogEntry = {
        id: Date.now() + 1,
        name: `[Ocorrência] ${occ.type}`,
        category: "incidents",
        status: occ.critical ? "warning" : "completed",
        timestamp,
      };

      return {
        ...prev,
        occurrences: [...prev.occurrences, occ],
        log: [logEntry, ...prev.log],
      };
    });

    if (data.critical) {
      showError(`Ocorrência crítica registrada: ${data.type}`);
    } else {
      showSuccess("Ocorrência registrada.");
    }
  }

  function resetAll() {
    setState({
      day1: createEmptyDailyState(),
      day2: createEmptyDailyState(),
      coordinator: null,
    });
    setFiredAlerts({});
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(STORAGE_TAB_KEY);
    }
    showSuccess("Sistema reiniciado para ambos os dias.");
  }

  async function downloadPdfReport() {
    if (!coordinator || !currentDay) {
      showError(
        "Defina o coordenador e selecione o dia do exame antes de gerar o relatório.",
      );
      return;
    }

    const dayLabel = `${currentDay}º dia`;

    await generateFullPdfReport({
      coordinator,
      dayLabel,
      preparationCompletedIds: daily.preparation,
      morningCompletedIds: daily.morning,
      closingCompletedIds: daily.closing,
      preparationItems,
      morningItems,
      closingItems,
      occurrences: daily.occurrences,
      log: daily.log,
    });

    showSuccess(
      `Relatório PDF completo do Dia ${currentDay} gerado com sucesso.`,
    );
  }

  return {
    state: {
      coordinator,
      preparation: daily.preparation,
      morning: daily.morning,
      closing: daily.closing,
      occurrences: daily.occurrences,
      stats: daily.stats,
      notes: daily.notes,
      log: daily.log,
    },
    now,
    theme,
    activeTab,
    setActiveTab,
    currentStage,
    currentTimes,
    examTimeRemaining,
    preparationItems,
    morningItems,
    duringItems,
    closingItems,
    initializeCoordinator,
    toggleTheme,
    toggleChecklistItem,
    setNote,
    addOccurrence,
    resetAll,
    downloadPdfReport,
  };
}