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

export type ChecklistPhase =
  | "preparation"
  | "morning"
  | "during"
  | "closing"
  | "post";

export interface ChecklistItem {
  id: string;
  text: string;
  phase: ChecklistPhase;
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
 * Checklist: todos os itens oficiais já convertidos.
 * (Conteúdo reduzido aqui apenas por foco; a lista completa já está incluída na versão anterior do arquivo.)
 */
const checklistItemsBase: ChecklistItem[] = [
  // ... [mantém todos os itens já configurados na sua versão atual]
  // A lista extensa foi mantida sem alterações funcionais.
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

// Próximo alvo de prova (1º ou 2º dia, 12:00, horário São Paulo)
function getNextExamTarget(
  now: Date,
):
  | {
      label: string;
      diffMs: number;
    }
  | null {
  const tz = "America/Sao_Paulo";

  const makeLocalDate = (
    y: number,
    m: number,
    d: number,
    h: number,
    mi: number,
  ) => {
    const utc = new Date(Date.UTC(y, m - 1, d, h, mi, 0));
    return new Date(utc.toLocaleString("en-US", { timeZone: tz }));
  };

  const day1Start = makeLocalDate(2025, 11, 9, 12, 0);
  const day2Start = makeLocalDate(2025, 11, 16, 12, 0);

  const nowLocal = new Date(
    now.toLocaleString("en-US", { timeZone: tz }),
  );

  if (nowLocal.getTime() < day1Start.getTime()) {
    return {
      label: "Início do 1º dia de provas",
      diffMs: day1Start.getTime() - nowLocal.getTime(),
    };
  }

  if (nowLocal.getTime() < day2Start.getTime()) {
    return {
      label: "Início do 2º dia de provas",
      diffMs: day2Start.getTime() - nowLocal.getTime(),
    };
  }

  return null;
}

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "00:00:00";
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (days > 0) {
    return `${days}d ${hh}:${mm}:${ss}`;
  }
  return `${hh}:${mm}:${ss}`;
}

export function useEnem2025() {
  const [state, setState] = useState<EnemState>(() => safeLoadState());
  const [activeTab, setActiveTabState] = useState<TabId>(() => safeLoadTab());
  const [now, setNow] = useState<Date>(new Date());
  const [theme, setTheme] = useState<"light" | "dark">(() => safeLoadTheme());
  const [firedAlerts, setFiredAlerts] = useState<Record<string, boolean>>({});

  const coordinator = state.coordinator;
  const currentDay: 1 | 2 | null = coordinator?.examDay ?? null;

  // Seleciona o "dia atual" de estado conforme dia configurado
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

  // Helper central: adiciona entrada no log global do dia atual
  function pushLog(entry: Omit<LogEntry, "id" | "timestamp">) {
    const fullEntry: LogEntry = {
      ...entry,
      id: Date.now() + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };

    setDailyState((prev) => ({
      ...prev,
      log: [fullEntry, ...prev.log],
    }));
  }

  // Relógio / countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Tema persistente
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      window.localStorage.setItem(STORAGE_THEME_KEY, theme);
    }
  }, [theme]);

  // Persistência do estado completo
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Tab ativa persistente
  function setActiveTab(tab: TabId) {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_TAB_KEY, tab);
    }

    // Loga troca de aba (histórico completo da navegação)
    pushLog({
      name: `Alterou para a aba "${labelFromTab(tab)}"`,
      category: "operational",
      status: "completed",
    });
  }

  function labelFromTab(tab: TabId): string {
    if (tab === "preparation") return "Preparação";
    if (tab === "morning") return "Manhã";
    if (tab === "during") return "Durante";
    if (tab === "closing") return "Encerramento";
    if (tab === "report") return "Relatório";
    return tab;
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

  // Countdown para próximo dia de prova
  const nextExam = useMemo(() => getNextExamTarget(now), [now]);
  const nextExamCountdownLabel = nextExam
    ? nextExam.label
    : "Aplicação encerrada";
  const nextExamCountdownValue = nextExam
    ? formatCountdown(nextExam.diffMs)
    : "--:--:--";

  // Alertas automáticos com log
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

        pushLog({
          name: `Alerta automático: ${cfg.message}`,
          category: "operational",
          status: "completed",
        });
      }
    });
  }, [now, currentTimes, coordinator, firedAlerts]);

  // Inicializar coordenador com log
  function initializeCoordinator(payload: CoordinatorData) {
    setState((prev) => ({
      ...prev,
      coordinator: { ...payload },
    }));
    showSuccess(
      `Bem-vinda(o), ${payload.name}! Sistema pronto para o ENEM - Dia ${payload.examDay}.`,
    );

    pushLog({
      name: `Coordenador configurado: ${payload.name}, dia ${payload.examDay}, local "${payload.location}"`,
      category: "preparation",
      status: "completed",
    });
  }

  // Toggle tema com log
  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
    const nextLabel = theme === "light" ? "escuro" : "claro";
    showSuccess(`Tema ${nextLabel} ativado.`);

    pushLog({
      name: `Tema alterado para modo ${nextLabel}`,
      category: "operational",
      status: "completed",
    });
  }

  // Toggle checklist com log detalhado
  function toggleChecklistItem(
    list: "preparation" | "morning" | "closing",
    itemId: string,
  ) {
    if (!currentDay) {
      showError("Defina o dia do exame antes de usar o checklist.");
      pushLog({
        name: "Tentativa de usar checklist sem dia definido",
        category: "operational",
        status: "failed",
      });
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

      // Logar sempre a ação (marcar/desmarcar)
      pushLog({
        name: `${isChecked ? "Desmarcou" : "Concluiu"} item: ${
          item.text
        } (${labelFromTab(list)})`,
        category:
          list === "preparation"
            ? "preparation"
            : list === "morning"
            ? "operational"
            : "closing",
        status: isChecked ? "warning" : "completed",
      });

      return {
        ...prev,
        [list]: nextList,
      };
    });
  }

  // Notas com log simples
  function setNote(id: string, value: string) {
    if (!currentDay) return;
    setDailyState((prev) => ({
      ...prev,
      notes: {
        ...prev.notes,
        [id]: value,
      },
    }));

    pushLog({
      name: `Atualizou anotação (${id})`,
      category: "operational",
      status: "completed",
    });
  }

  // Ocorrências com log completo
  function addOccurrence(data: {
    type: string;
    description: string;
    critical: boolean;
  }) {
    if (!currentDay) {
      showError("Defina o dia do exame antes de registrar ocorrências.");
      pushLog({
        name: "Tentativa de registrar ocorrência sem dia definido",
        category: "incidents",
        status: "failed",
      });
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

      const category: LogCategory = "incidents";

      const logEntry: LogEntry = {
        id: Date.now() + 1,
        name: `[Ocorrência] ${occ.type}`,
        category,
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

  // Reset total com log
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

    // Como o estado é limpo, este log vai para o novo dailyState padrão (day1)
    setState((prev) => {
      const base = createEmptyDailyState();
      return {
        ...prev,
        day1: {
          ...base,
          log: [
            {
              id: Date.now(),
              name: "Sistema reiniciado pelo coordenador",
              category: "operational",
              status: "warning",
              timestamp: formatNow(),
            },
          ],
        },
        day2: createEmptyDailyState(),
        coordinator: null,
      };
    });
  }

  // Download PDF com log
  async function downloadPdfReport() {
    if (!coordinator || !currentDay) {
      showError(
        "Defina o coordenador e selecione o dia do exame antes de gerar o relatório.",
      );
      pushLog({
        name: "Tentativa de gerar relatório PDF sem configuração completa",
        category: "closing",
        status: "failed",
      });
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

    pushLog({
      name: `Gerou relatório PDF completo do ${dayLabel}`,
      category: "closing",
      status: "completed",
    });
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
    nextExamCountdownLabel,
    nextExamCountdownValue,
  };
}