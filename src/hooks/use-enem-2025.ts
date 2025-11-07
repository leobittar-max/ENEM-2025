import { useEffect, useMemo, useState } from "react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";

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

export type LogCategory = "preparation" | "operational" | "incidents" | "closing";

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

interface EnemState {
  coordinator: CoordinatorData | null;
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

const STORAGE_KEY = "enem2025_state_v1";
const STORAGE_THEME_KEY = "enem2025_theme_v1";
const STORAGE_TAB_KEY = "enem2025_tab_v1";

// Checklists base (alinhados ao JSON, simplificado aqui)
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
        "Confira se as caixas trazem todos os impressos e reservas, crachás, envelopes de sala e porta-objetos. Registre o recebimento no sistema da Aplicadora.",
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
        "Separe envelopes porta-objetos na quantidade exata por sala e uma cota para a equipe, evitando falta na vistoria eletrônica.",
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
        "Confirme funcionamento dos detectores e disponibilidade do alicate para corte de lacres; registre a quantidade no sistema.",
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
        "Valide login e telas críticas do app indicado; falhas devem ser reportadas ainda na semana prévia.",
      fonte: { manual: "Coordenador", pagina: 12 },
    },
    critical: true,
  },
  {
    id: "prep-05",
    phase: "preparation",
    text: "Vistoriar prédio e salas (iluminação, ventilação, água, energia)",
    role: "Coordenador",
    info: {
      titulo: "Vistoria geral do local",
      corpo:
        "Inspecione salas, banheiros, bebedouros e tomadas; ajuste a alocação conforme necessidade.",
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
        "Verifique mobiliário acessível, salas especiais, recursos de acessibilidade e sala de acompanhante de lactante.",
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
        "Defina sala de coordenação próxima às salas e local seguro, trancado, para guarda dos malotes.",
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
        "Agende capacitação, oriente sobre vestimenta e materiais obrigatórios da equipe.",
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
        "Confirme termos assinados e credenciamento; sem documentação regular, substitua o colaborador.",
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
        "Teste fechaduras, controle de chaves e integridade da sala dos malotes.",
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
        "Verifique extintores, rotas de fuga e sinalização de emergência; oriente a equipe.",
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
        "Controle acesso às áreas internas, sinalizando áreas restritas.",
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
        "Numere e identifique as salas conforme orientações oficiais.",
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
        "Planeje ações para falta de energia, ruídos, incidentes médicos e logística.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
    critical: true,
  },
  {
    id: "prep-15",
    phase: "preparation",
    text: "Testar relógios analógicos e cronômetros das salas",
    role: "Coordenador",
    info: {
      titulo: "Sincronização de tempo",
      corpo:
        "Garanta marcadores de tempo sincronizados ao horário de Brasília.",
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
        "Use fiscal volante como canal entre Coordenação e salas, definindo rotas e sinais.",
      fonte: { manual: "Coordenador", pagina: 20 },
    },
  },
  // Manhã
  {
    id: "manha-01",
    phase: "morning",
    text: "Chegada do coordenador e assistente (08:00)",
    role: "Coordenador",
    suggestedTime: "08:00",
    info: {
      titulo: "Início formal das atividades no local",
      corpo:
        "Coordenador e assistente chegam às 8h, organizam materiais e recebem certificador.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
    critical: true,
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
        "Confirme presença, substitua ausentes e faça minicapacitação com reforço de procedimentos.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
    critical: true,
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
        "Entregue envelopes às salas com recibo e conferência pelos chefes de sala.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
    critical: true,
  },
  {
    id: "portoes-01",
    phase: "morning",
    text: "Abrir portões (12:00) e fechar (13:00)",
    role: "Coordenador",
    suggestedTime: "12:00 / 13:00",
    info: {
      titulo: "Controle de acesso no horário de Brasília",
      corpo:
        "Abra às 12h e feche às 13h, seguindo horário de Brasília, antes da abertura de malotes.",
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
        "Abra malotes após 13h, confira integridade e distribua provas às salas.",
      fonte: { manual: "Coordenador", pagina: 42 },
    },
    critical: true,
  },
  // Durante
  {
    id: "exec-01",
    phase: "during",
    text: "Supervisionar início das provas (13:30) e avisos obrigatórios",
    role: "Coordenador",
    suggestedTime: "13:30",
    info: {
      titulo: "Ritual de abertura em sala",
      corpo:
        "Garanta início às 13h30 com leitura dos avisos e marcador de tempo visível.",
      fonte: { manual: "Chefe de Sala", pagina: 2 },
    },
    critical: true,
  },
  {
    id: "exec-02",
    phase: "during",
    text: "Supervisionar identificação e conferência de documentos",
    role: "Coordenador",
    info: {
      titulo: "Documentos aceitos e procedimentos",
      corpo:
        "Supervisione conferência de documentos, uso de envelopes porta-objetos e detector de metais.",
      fonte: { manual: "Chefe de Sala", pagina: 4 },
    },
  },
  {
    id: "exec-03",
    phase: "during",
    text: "Supervisionar envelopes porta-objetos e vistorias",
    role: "Coordenador",
    info: {
      titulo: "Itens obrigatórios no envelope",
      corpo:
        "Garanta correta guarda de celulares e eletrônicos nos envelopes.",
      fonte: { manual: "Chefe de Sala", pagina: 4 },
    },
    critical: true,
  },
  {
    id: "exec-04",
    phase: "during",
    text: "Supervisionar controle de horários e saídas",
    role: "Coordenador",
    info: {
      titulo: "Marcos de tempo e saídas",
      corpo:
        "Monitore regras de saída sem/com caderno e término normal.",
      fonte: { manual: "Coordenador", pagina: 11 },
    },
  },
  {
    id: "exec-05",
    phase: "during",
    text: "Gerir Sala Extra e participantes fora do cadastro",
    role: "Coordenador",
    suggestedTime: "14:20",
    info: {
      titulo: "Direcionamento e reporte",
      corpo:
        "Gerencie Sala Extra e comunique ausentes e casos especiais à Aplicadora.",
      fonte: { manual: "Coordenador", pagina: 37 },
    },
  },
  {
    id: "exec-06",
    phase: "during",
    text: "Supervisionar procedimentos de segurança e detector de metais",
    role: "Coordenador",
    suggestedTime: "13:45",
    info: {
      titulo: "Fluxo de vistoria",
      corpo:
        "Acompanhe vistorias eletrônicas e procedimentos com lanches/medicamentos.",
      fonte: { manual: "Chefe de Sala", pagina: 5 },
    },
  },
  {
    id: "exec-07",
    phase: "during",
    text: "Distribuir envelopes com recibo assinado pelo Chefe de Sala",
    role: "Coordenador",
    suggestedTime: "13:05",
    info: {
      titulo: "Controle formal de entrega",
      corpo:
        "Registre recibos de entrega dos envelopes às salas.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
  },
  {
    id: "exec-08",
    phase: "during",
    text: "Preencher Termo de Abertura dos Malotes",
    role: "Coordenador",
    suggestedTime: "13:00–13:20",
    info: {
      titulo: "Registro de integridade dos malotes",
      corpo:
        "Registre horários, lacres e assinaturas no termo.",
      fonte: { manual: "Coordenador", pagina: 42 },
    },
    critical: true,
  },
  {
    id: "exec-09",
    phase: "during",
    text: "Acompanhar fiscais volantes e assistentes",
    role: "Coordenador",
    info: {
      titulo: "Fluxo de apoio contínuo",
      corpo:
        "Monitore deslocamentos e atendimentos às salas.",
      fonte: { manual: "Coordenador", pagina: 20 },
    },
  },
  {
    id: "exec-10",
    phase: "during",
    text:
      "Monitorar salas com atendimento especializado (tempo adicional, lactantes, TEA/DNV)",
    role: "Coordenador",
    info: {
      titulo: "Garantia de condições específicas",
      corpo:
        "Verifique tempo adicional, lactantes e demais recursos especializados.",
      fonte: { manual: "Coordenador", pagina: 38 },
    },
    critical: true,
  },
  {
    id: "exec-11",
    phase: "during",
    text: "Supervisionar leitura de avisos obrigatórios nos marcos de tempo",
    role: "Coordenador",
    info: {
      titulo: "Avisos marcados no quadro",
      corpo:
        "Garanta leitura de avisos nos marcos (2h, 60min, 15min).",
      fonte: { manual: "Chefe de Sala", pagina: 2 },
    },
  },
  {
    id: "exec-12",
    phase: "during",
    text: "Registrar e validar ocorrências em ata/sistema em tempo real",
    role: "Coordenador",
    info: {
      titulo: "Rastreabilidade e transparência",
      corpo:
        "Registre ocorrências como documentação irregular, incidentes de saúde, etc.",
      fonte: { manual: "Coordenador", pagina: 57 },
    },
    critical: true,
  },
  {
    id: "exec-13",
    phase: "during",
    text: "Autorizar/acompanhar idas ao banheiro via fiscal volante",
    role: "Coordenador",
    info: {
      titulo: "Controle de deslocamentos",
      corpo:
        "Mantenha controle de entradas/saídas com apoio do fiscal volante.",
      fonte: { manual: "Chefe de Sala", pagina: 3 },
    },
  },
  {
    id: "exec-14",
    phase: "during",
    text: "Comunicar avisos gerais quando necessário",
    role: "Coordenador",
    info: {
      titulo: "Comando central",
      corpo:
        "Use avisos centralizados para orientações importantes, sem ruído excessivo.",
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
        "Recolha cartões, folhas, atas e listas com assinaturas e contagens corretas.",
      fonte: { manual: "Coordenador", pagina: 57 },
    },
    critical: true,
  },
  {
    id: "enc-02",
    phase: "closing",
    text: "Fechar e lacrar malotes",
    role: "Coordenador",
    info: {
      titulo: "Integridade do lacre e conferência",
      corpo:
        "Lacre malotes com conferência de volumes e numeração.",
      fonte: { manual: "Coordenador", pagina: 63 },
    },
    critical: true,
  },
  {
    id: "enc-03",
    phase: "closing",
    text: "Verificar lacres antes da devolução",
    role: "Coordenador",
    info: {
      titulo: "Conferência final de segurança",
      corpo:
        "Confira todos os lacres e numerações; registre divergências.",
      fonte: { manual: "Coordenador", pagina: 63 },
    },
  },
  {
    id: "enc-04",
    phase: "closing",
    text: "Preencher e assinar Termo de Encerramento da Aplicação",
    role: "Coordenador",
    info: {
      titulo: "Fechamento formal do dia",
      corpo:
        "Registre horários, volumes, ocorrências e assinaturas no termo final.",
      fonte: { manual: "Coordenador", pagina: 60 },
    },
    critical: true,
  },
  {
    id: "enc-05",
    phase: "closing",
    text: "Conferir assinaturas dos chefes de sala",
    role: "Coordenador",
    info: {
      titulo: "Documentação completa",
      corpo:
        "Garanta assinaturas em todas as atas e listas.",
      fonte: { manual: "Coordenador", pagina: 57 },
    },
  },
  {
    id: "enc-06",
    phase: "closing",
    text: "Conferir devolução de detectores e equipamentos",
    role: "Coordenador",
    info: {
      titulo: "Controle de bens",
      corpo:
        "Registre devolução e estado de equipamentos.",
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
        "Liste volumes, confira e gere recibo com assinatura do recebedor.",
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
        "Registre problemas e soluções para orientar próximas aplicações.",
      fonte: { manual: "Coordenador", pagina: 60 },
    },
  },
  {
    id: "enc-09",
    phase: "closing",
    text: "Feedback rápido com chefes de sala (debriefing)",
    role: "Coordenador",
    info: {
      titulo: "Alinhamento final",
      corpo:
        "Reúna chefes de sala para revisar incidentes e ações.",
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
        "Confirme salas vazias, trancadas e prédio em condições adequadas.",
      fonte: { manual: "Coordenador", pagina: 64 },
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

function safeLoadState(): EnemState {
  if (typeof window === "undefined") {
    return {
      coordinator: null,
      preparation: [],
      morning: [],
      closing: [],
      occurrences: [],
      stats: { present: 0, absent: 0 },
      notes: {},
      log: [],
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        coordinator: null,
        preparation: [],
        morning: [],
        closing: [],
        occurrences: [],
        stats: { present: 0, absent: 0 },
        notes: {},
        log: [],
      };
    }
    const parsed = JSON.parse(raw) as EnemState;
    return {
      coordinator: parsed.coordinator ?? null,
      preparation: parsed.preparation ?? [],
      morning: parsed.morning ?? [],
      closing: parsed.closing ?? [],
      occurrences: parsed.occurrences ?? [],
      stats: parsed.stats ?? { present: 0, absent: 0 },
      notes: parsed.notes ?? {},
      log: parsed.log ?? [],
    };
  } catch {
    return {
      coordinator: null,
      preparation: [],
      morning: [],
      closing: [],
      occurrences: [],
      stats: { present: 0, absent: 0 },
      notes: {},
      log: [],
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

export function useEnem2025() {
  const [state, setState] = useState<EnemState>(() => safeLoadState());
  const [activeTab, setActiveTabState] = useState<TabId>(() => safeLoadTab());
  const [now, setNow] = useState<Date>(new Date());
  const [theme, setTheme] = useState<"light" | "dark">(() => safeLoadTheme());
  const [firedAlerts, setFiredAlerts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
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
    const toStore: EnemState = {
      coordinator: state.coordinator,
      preparation: state.preparation,
      morning: state.morning,
      closing: state.closing,
      occurrences: state.occurrences,
      stats: state.stats,
      notes: state.notes,
      log: state.log,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  }, [state]);

  function setActiveTab(tab: TabId) {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_TAB_KEY, tab);
    }
  }

  const currentTimes = useMemo(() => {
    if (!state.coordinator) return null;
    return state.coordinator.examDay === 1
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
  }, [state.coordinator]);

  const currentStage = useMemo(() => {
    if (!state.coordinator) return "-";
    const hour = now.getHours();
    if (hour < 8) return "Preparação";
    if (hour >= 8 && hour < 13) return "Manhã do Exame";
    if (hour >= 13 && hour < 19) return "Durante a Aplicação";
    return "Encerramento";
  }, [now, state.coordinator]);

  const examTimeRemaining = useMemo(() => {
    if (!currentTimes) return "--:--:--";
    const end = parseTimeToToday(currentTimes.examEndRegular);
    if (now >= end || now.getHours() < 13) return "--:--:--";
    const diff = end.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
      s,
    ).padStart(2, "0")}`;
  }, [now, currentTimes]);

  // Alertas automáticos
  useEffect(() => {
    if (!state.coordinator || !currentTimes) return;

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
      const key = `${cfg.id}_${state.coordinator?.examDay}`;
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
  }, [now, currentTimes, state.coordinator, firedAlerts]);

  // Logs
  function addLog(name: string, category: LogCategory, status: LogStatus) {
    setState((prev) => ({
      ...prev,
      log: [
        {
          id: Date.now(),
          name,
          category,
          status,
          timestamp: new Date().toLocaleTimeString("pt-BR", {
            timeZone: "America/Sao_Paulo",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        },
        ...prev.log,
      ],
    }));
  }

  // Ações públicas

  function initializeCoordinator(payload: CoordinatorData) {
    const toastId = showLoading("Iniciando sistema...");
    setState((prev) => ({
      ...prev,
      coordinator: { ...payload },
    }));
    dismissToast(String(toastId));
    showSuccess(`Bem-vinda(o), ${payload.name}! Sistema pronto para o ENEM.`);
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
    showSuccess(`Tema ${theme === "light" ? "escuro" : "claro"} ativado.`);
  }

  function toggleChecklistItem(
    list: "preparation" | "morning" | "closing",
    itemId: string,
  ) {
    const source =
      list === "preparation"
        ? preparationItems
        : list === "morning"
        ? morningItems
        : closingItems;
    const item = source.find((i) => i.id === itemId);
    if (!item) return;

    setState((prev) => {
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
        addLog(item.text, category, "completed");
      }

      return {
        ...prev,
        [list]: nextList,
      };
    });
  }

  function setNote(id: string, value: string) {
    setState((prev) => ({
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
    if (!data.type || !data.description) {
      showError("Preencha tipo e descrição da ocorrência.");
      return;
    }
    const occ: Occurrence = {
      id: Date.now(),
      type: data.type,
      description: data.description,
      critical: data.critical,
      timestamp: formatNow(),
    };
    setState((prev) => ({
      ...prev,
      occurrences: [...prev.occurrences, occ],
    }));
    addLog(
      occ.type,
      "incidents",
      occ.critical ? "warning" : "completed",
    );
    if (occ.critical) {
      showError(`Ocorrência crítica registrada: ${occ.type}`);
    } else {
      showSuccess("Ocorrência registrada.");
    }
  }

  function resetAll() {
    setState({
      coordinator: null,
      preparation: [],
      morning: [],
      closing: [],
      occurrences: [],
      stats: { present: 0, absent: 0 },
      notes: {},
      log: [],
    });
    setFiredAlerts({});
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(STORAGE_TAB_KEY);
    }
    showSuccess("Sistema reiniciado.");
  }

  function buildTextReport(): string {
    const coord = state.coordinator;
    if (!coord) return "Configure o sistema antes de gerar o relatório.";

    const criticalOccurrences = state.occurrences.filter((o) => o.critical)
      .length;

    let report = `
RELATÓRIO FINAL - ENEM 2025
--------------------------

Coordenador(a): ${coord.name}
Local: ${coord.location}
Cidade/Estado: ${coord.city} - ${coord.state}
Dia do Exame: ${coord.examDay}º dia
Salas: ${coord.classrooms}
Participantes: ${coord.participants}
${coord.simulationMode ? "MODO SIMULAÇÃO ATIVADO\n" : ""}

Preparação: ${state.preparation.length}/${preparationItems.length}
Manhã: ${state.morning.length}/${morningItems.length}
Encerramento: ${state.closing.length}/${closingItems.length}

Ocorrências: ${state.occurrences.length} (Críticas: ${criticalOccurrences})

`;

    if (state.occurrences.length) {
      report += "Detalhamento das ocorrências:\n";
      state.occurrences.forEach((o, idx) => {
        report += `${idx + 1}. ${o.critical ? "[CRÍTICA] " : ""}${o.type}\n`;
        report += `   Horário: ${o.timestamp}\n`;
        report += `   Descrição: ${o.description}\n`;
      });
    }

    report += `\nRelatório gerado em: ${formatNow()}\n`;
    return report;
  }

  function downloadTextReport() {
    const text = buildTextReport();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const city = state.coordinator?.city || "local";
    const day = state.coordinator?.examDay || 1;
    a.href = url;
    a.download = `relatorio_enem_${city}_dia${day}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess("Relatório TXT baixado com sucesso.");
  }

  return {
    state,
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
    downloadTextReport,
  };
}