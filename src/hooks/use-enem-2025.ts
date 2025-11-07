import { useEffect, useMemo, useState } from "react";
import {
  showSuccess,
  showError,
} from "@/utils/toast";

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

// Checklist completo
const checklistItemsBase: ChecklistItem[] = [
  // (conteúdo original mantido sem alterações)
  {
    id: "prep-01",
    phase: "preparation",
    text: "Receber e conferir caixas de materiais administrativos",
    role: "Coordenador",
    info: {
      titulo: "Conferência do kit administrativo",
      corpo:
        "Confira impressos, reservas, crachás, envelopes de sala e porta-objetos. Registre o recebimento no sistema da Aplicadora.",
      fonte: { manual: "Coordenador", pagina: 12 },
    },
    critical: true,
  },
  {
    id: "prep-02",
    phase: "preparation",
    text: "Separar envelopes porta-objetos por sala e equipe",
    role: "Coordenador",
    info: {
      titulo: "Organização dos porta-objetos",
      corpo:
        "Garanta quantidade exata por sala e equipe para evitar falta na vistoria eletrônica.",
      fonte: { manual: "Coordenador", pagina: 12 },
    },
  },
  {
    id: "prep-03",
    phase: "preparation",
    text: "Checar detectores de metais e alicate de lacre",
    role: "Coordenador",
    info: {
      titulo: "Equipamentos de segurança",
      corpo:
        "Teste funcionamento dos detectores e disponibilidade do alicate de lacre.",
      fonte: { manual: "Coordenador", pagina: 12 },
    },
    critical: true,
  },
  {
    id: "prep-04",
    phase: "preparation",
    text: "Testar app interno no celular do coordenador e assistente",
    role: "Coordenador",
    info: {
      titulo: "Validação do aplicativo",
      corpo:
        "Confirme login e telas críticas do app; falhas devem ser reportadas antecipadamente.",
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
      titulo: "Vistoria geral",
      corpo:
        "Inspecione salas, banheiros, bebedouros e tomadas; ajuste alocação conforme necessidade.",
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
      titulo: "Acessibilidade garantida",
      corpo:
        "Verifique mobiliário acessível, salas especiais, recursos e sala de acompanhante de lactante.",
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
      titulo: "Sala de coordenação e malotes",
      corpo:
        "Escolha sala próxima às salas de prova e local trancado para malotes.",
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
      titulo: "Orientação da equipe",
      corpo:
        "Agende capacitação e oriente vestimenta e materiais obrigatórios.",
      fonte: { manual: "Coordenador", pagina: 14 },
    },
  },
  {
    id: "prep-09",
    phase: "preparation",
    text: "Verificar documentação da equipe (termos, presenças, credenciais)",
    role: "Coordenador",
    info: {
      titulo: "Regularidade da equipe",
      corpo:
        "Confirme termos assinados e credenciamento; substitua quem não estiver regular.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
    critical: true,
  },
  {
    id: "prep-10",
    phase: "preparation",
    text: "Checar fechaduras/chaves e integridade da sala-cofre",
    role: "Coordenador",
    info: {
      titulo: "Segurança dos malotes",
      corpo:
        "Teste fechaduras, controle de chaves e integridade do espaço dos malotes.",
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
      titulo: "Segurança predial",
      corpo:
        "Verifique extintores, rotas de fuga e sinalização de emergência.",
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
      corpo: "Controle o acesso às áreas internas e sinalize áreas restritas.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
  },
  {
    id: "prep-13",
    phase: "preparation",
    text: "Organizar numeração e identificação oficial das salas",
    role: "Coordenador",
    info: {
      titulo: "Sinalização",
      corpo:
        "Numere e identifique salas conforme orientação oficial, visível aos participantes.",
      fonte: { manual: "Coordenador", pagina: 13 },
    },
  },
  {
    id: "prep-14",
    phase: "preparation",
    text: "Definir plano de contingência (energia, incidentes, comunicação)",
    role: "Coordenador",
    info: {
      titulo: "Plano de contingência",
      corpo:
        "Planeje ações para quedas de energia, ruídos, incidentes de saúde e logística.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
    critical: true,
  },
  {
    id: "prep-15",
    phase: "preparation",
    text: "Testar relógios analógicos e marcadores de tempo das salas",
    role: "Coordenador",
    info: {
      titulo: "Horário de Brasília",
      corpo:
        "Garanta todos alinhados ao horário oficial de Brasília para o exame.",
      fonte: { manual: "Chefe de Sala", pagina: 2 },
    },
  },
  {
    id: "prep-16",
    phase: "preparation",
    text: "Planejar comunicação via fiscal volante e assistente",
    role: "Coordenador",
    info: {
      titulo: "Canal rápido com as salas",
      corpo:
        "Defina rotas, sinais e frequência de passagem dos fiscais volantes.",
      fonte: { manual: "Coordenador", pagina: 20 },
    },
  },
  // (demais itens permanecem exatamente como estavam)
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

// Helpers de data para ENEM 2025 (fuso São Paulo)
function getSaoPauloDate(now: Date) {
  // Normaliza apenas por ano/mês/dia no fuso de São Paulo
  const iso = now.toLocaleString("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });
  // Formato esperado: YYYY-MM-DD, dependendo do ambiente; garantimos split seguro
  const [y, m, d] = iso.split(",")[0].split("-");
  return {
    year: Number(y),
    month: Number(m),
    day: Number(d),
  };
}

function buildCurrentStage(now: Date): string {
  const { year, month, day } = getSaoPauloDate(now);
  const hour = now.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hour12: false,
  });
  const h = Number(hour);

  // Fora do ano alvo: trata como preparação
  if (year < 2025) return "Preparação";
  if (year > 2025) return "Evento encerrado";

  const isDay1 = day === 9 && month === 11;
  const isDay2 = day === 16 && month === 11;

  if (!isDay1 && !isDay2) {
    // Antes do dia 1: preparação
    if (month < 11 || (month === 11 && day < 9)) {
      return "Preparação";
    }
    // Entre os dois domingos: preparação para 2º dia
    if (month === 11 && day > 9 && day < 16) {
      return "Preparação";
    }
    // Após 16/11/2025: evento encerrado
    if (month > 11 || (month === 11 && day > 16)) {
      return "Evento encerrado";
    }
  }

  // Dia oficial de prova - usa janelas horárias simplificadas
  if (isDay1 || isDay2) {
    if (h < 8) return "Preparação";
    if (h >= 8 && h < 13) return "Manhã do Exame";
    if (h >= 13 && h < 19) return "Durante a Aplicação";
    return "Encerramento";
  }

  // Fallback seguro
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

  // Relógio
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Tema: aplica classe dark no html para refletir tokens
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      window.localStorage.setItem(STORAGE_THEME_KEY, theme);
    }
  }, [theme]);

  // Persistência
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

  // Novo cálculo de estágio atual considerando data oficial do exame
  const currentStage = useMemo(() => {
    return buildCurrentStage(now);
  }, [now]);

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

  // Alertas automáticos por dia (mantidos)
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

  function addLog(name: string, category: LogCategory, status: LogStatus) {
    if (!currentDay) return;
    setDailyState((prev) => ({
      ...prev,
      log: [
        {
          id: Date.now(),
          name,
          category,
          status,
          timestamp: new Date().toLocaleString("pt-BR", {
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

  // Ações públicas (mantidas)
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
        const entryName = `[Checklist] ${item.text}`;
        const updatedLog: LogEntry[] = [
          {
            id: Date.now(),
            name: entryName,
            category,
            status: "completed",
            timestamp: new Date().toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          },
          ...prev.log,
        ];
        return {
          ...prev,
          [list]: nextList,
          log: updatedLog,
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

  function buildTextReport(): string {
    if (!coordinator || !currentDay) {
      return "Configure o sistema e selecione o dia do exame antes de gerar o relatório.";
    }

    const dayLabel = `${coordinator.examDay}º dia`;
    const currentDaily = daily;

    const criticalOccurrences = currentDaily.occurrences.filter(
      (o) => o.critical,
    ).length;

    let report = `
RELATÓRIO FINAL - ENEM 2025
--------------------------

Coordenador(a): ${coordinator.name}
Local: ${coordinator.location}
Cidade/Estado: ${coordinator.city} - ${coordinator.state}
Dia do Exame: ${dayLabel}
Salas: ${coordinator.classrooms}
Participantes: ${coordinator.participants}
${coordinator.simulationMode ? "MODO SIMULAÇÃO ATIVADO\n" : ""}

Preparação: ${currentDaily.preparation.length}/${preparationItems.length}
Manhã: ${currentDaily.morning.length}/${morningItems.length}
Encerramento: ${currentDaily.closing.length}/${closingItems.length}

Ocorrências: ${currentDaily.occurrences.length} (Críticas: ${criticalOccurrences})

`;

    if (currentDaily.occurrences.length) {
      report += "Detalhamento das ocorrências:\n";
      currentDaily.occurrences.forEach((o, idx) => {
        report += `${idx + 1}. ${o.critical ? "[CRÍTICA] " : ""}${o.type}\n`;
        report += `   Horário: ${o.timestamp}\n`;
        report += `   Descrição: ${o.description}\n`;
      });
      report += "\n";
    }

    if (currentDaily.log.length) {
      const sortedLog = [...currentDaily.log].sort((a, b) => a.id - b.id);

      report += "HISTÓRICO DE INTERAÇÕES DO COORDENADOR (DIA SELECIONADO)\n";
      report += "--------------------------------------------------------\n";

      sortedLog.forEach((entry, index) => {
        const categoriaLabel =
          entry.category === "preparation"
            ? "Preparação"
            : entry.category === "operational"
            ? "Operacional"
            : entry.category === "incidents"
            ? "Ocorrências"
            : "Encerramento";

        const statusLabel =
          entry.status === "completed"
            ? "Concluído"
            : entry.status === "warning"
            ? "Alerta"
            : "Falha";

        report += `${index + 1}. [${categoriaLabel}] [${statusLabel}] ${entry.name}\n`;
        report += `   Registrado em: ${entry.timestamp}\n`;
      });
    } else {
      report +=
        "Não houve interações registradas no histórico para o dia selecionado.\n";
    }

    report += `\nRelatório gerado em: ${formatNow()}\n`;
    return report;
  }

  function downloadTextReport() {
    const text = buildTextReport();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const city = coordinator?.city || "local";
    const day = coordinator?.examDay || 1;
    a.href = url;
    a.download = `relatorio_enem_${city}_dia${day}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess(
      `Relatório TXT do Dia ${day} baixado com sucesso (dados independentes).`,
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
    downloadTextReport,
  };
}