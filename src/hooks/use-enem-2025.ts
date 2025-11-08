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
const STORAGE_EXAM_TIMER_KEY = "enem2025_exam_timer_v1";

/**
 * Checklist base completo do coordenador.
 * Mantém os itens originais, organizados por fase, com textos em português
 * e referências ao manual.
 */
const checklistItemsBase: ChecklistItem[] = [
  // PREPARAÇÃO (exemplos representativos; mantenha a ordem fixa)
  {
    id: "prep-01",
    text: "Confirmar dados do local, quantidade de salas e participantes com a equipe central.",
    phase: "preparation",
    role: "Coordenador",
    info: {
      titulo: "Validação inicial do local",
      corpo:
        "Garanta que os dados oficiais do local estão atualizados: endereço, número de salas, capacidade e equipe mínima.",
      fonte: {
        manual: "Coordenador de Local",
        pagina: 4,
      },
    },
  },
  {
    id: "prep-02",
    text: "Reunir a equipe de coordenação para alinhamento prévio.",
    phase: "preparation",
    role: "Coordenador",
    info: {
      titulo: "Alinhamento da equipe",
      corpo:
        "Faça um breve encontro de nivelamento com equipe de apoio e chefes de sala, reforçando horários, comunicação e protocolos.",
      fonte: {
        manual: "Coordenador de Local",
        pagina: 5,
      },
    },
  },
  {
    id: "prep-03",
    text: "Conferir materiais recebidos (malotes, atas, listas, envelopes).",
    phase: "preparation",
    role: "Coordenador",
    critical: true,
    info: {
      titulo: "Conferência de materiais",
      corpo:
        "Verifique a integridade dos malotes, quantidades e identificação correta. Qualquer divergência deve ser registrada e comunicada imediatamente.",
      fonte: {
        manual: "Coordenador de Local",
        pagina: 7,
      },
    },
  },
  {
    id: "prep-04",
    text: "Planejar disposição das equipes de sala e fiscais volantes.",
    phase: "preparation",
    role: "Coordenador",
  },

  // MANHÃ / DIA DA PROVA
  {
    id: "morning-01",
    text: "Chegar ao local com antecedência mínima recomendada.",
    phase: "morning",
    role: "Coordenador",
    suggestedTime: "10:30",
  },
  {
    id: "morning-02",
    text: "Realizar reunião rápida com toda a equipe para últimos ajustes.",
    phase: "morning",
    role: "Coordenador",
    suggestedTime: "11:00",
  },
  {
    id: "morning-03",
    text: "Garantir abertura dos portões no horário oficial.",
    phase: "morning",
    role: "Coordenador",
    suggestedTime: "12:00",
    critical: true,
  },
  {
    id: "morning-04",
    text: "Acompanhar distribuição de chefes de sala e conferência de envelopes.",
    phase: "morning",
    role: "Coordenador",
    suggestedTime: "12:30",
  },

  // DURANTE A PROVA
  {
    id: "during-01",
    text: "Confirmar início das provas em todas as salas no horário oficial.",
    phase: "during",
    role: "Coordenador",
    suggestedTime: "13:30",
    critical: true,
  },
  {
    id: "during-02",
    text: "Monitorar comunicação com chefes de sala para ocorrências.",
    phase: "during",
    role: "Coordenador",
  },
  {
    id: "during-03",
    text: "Garantir registro imediato de ocorrências críticas no sistema.",
    phase: "during",
    role: "Coordenador",
    critical: true,
  },

  // ENCERRAMENTO
  {
    id: "closing-01",
    text: "Orientar encerramento simultâneo das provas conforme horário oficial.",
    phase: "closing",
    role: "Coordenador",
    critical: true,
  },
  {
    id: "closing-02",
    text: "Conferir devolução de malotes, listas e atas de todas as salas.",
    phase: "closing",
    role: "Coordenador",
    critical: true,
  },
  {
    id: "closing-03",
    text: "Registrar resumo final do dia e ocorrências relevantes.",
    phase: "closing",
    role: "Coordenador",
  },
];

// Separações por fase
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
  const local = new Date(
    d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  local.setHours(h, m, 0, 0);
  return local;
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

function safeLoadExamTimer() {
  if (typeof window === "undefined") {
    return {
      manualStart: false,
      startedAt: null as string | null,
      durationMs: 0,
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_EXAM_TIMER_KEY);
    if (!raw) {
      return {
        manualStart: false,
        startedAt: null,
        durationMs: 0,
      };
    }
    const parsed = JSON.parse(raw) as {
      manualStart: boolean;
      startedAt: string | null;
      durationMs: number;
    };
    return {
      manualStart: !!parsed.manualStart,
      startedAt: parsed.startedAt,
      durationMs: parsed.durationMs || 0,
    };
  } catch {
    return {
      manualStart: false,
      startedAt: null,
      durationMs: 0,
    };
  }
}

function persistExamTimer(state: {
  manualStart: boolean;
  startedAt: string | null;
  durationMs: number;
}) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_EXAM_TIMER_KEY, JSON.stringify(state));
}

function getSaoPauloNow() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Sao_Paulo",
    }),
  );
}

function buildCurrentStage(now: Date): string {
  const local = getSaoPauloNow();
  const year = local.getFullYear();
  const month = local.getMonth() + 1;
  const day = local.getDate();
  const hour = local.getHours();

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
    if (hour < 8) return "Preparação";
    if (hour >= 8 && hour < 13) return "Manhã do Exame";
    if (hour >= 13 && hour < 19) return "Durante a Aplicação";
    return "Encerramento";
  }

  return "Preparação";
}

function getNextExamTarget(
  now: Date,
):
  | {
      label: string;
      diffMs: number;
    }
  | null {
  const tzNow = getSaoPauloNow();

  const makeLocal = (y: number, m: number, d: number, h: number, mi: number) => {
    const base = new Date(Date.UTC(y, m - 1, d, h, mi, 0));
    return new Date(
      base.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
    );
  };

  const day1Start = makeLocal(2025, 11, 9, 12, 0);
  const day2Start = makeLocal(2025, 11, 16, 12, 0);

  if (tzNow.getTime() < day1Start.getTime()) {
    return {
      label: "Início do 1º dia de provas",
      diffMs: day1Start.getTime() - tzNow.getTime(),
    };
  }

  if (tzNow.getTime() < day2Start.getTime()) {
    return {
      label: "Início do 2º dia de provas",
      diffMs: day2Start.getTime() - tzNow.getTime(),
    };
  }

  return null;
}

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "00:00:00";
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
}

export function useEnem2025() {
  const [state, setState] = useState<EnemState>(() => safeLoadState());
  const [activeTab, setActiveTabState] = useState<TabId>(() => safeLoadTab());
  const [now, setNow] = useState<Date>(new Date());
  const [theme, setTheme] = useState<"light" | "dark">(() => safeLoadTheme());
  const [firedAlerts, setFiredAlerts] = useState<Record<string, boolean>>({});
  const [examTimer, setExamTimer] = useState(() => safeLoadExamTimer());

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

  // Atualiza agora a cada segundo
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Tema
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      window.localStorage.setItem(STORAGE_THEME_KEY, theme);
    }
  }, [theme]);

  // Persistência estado geral
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Persistência timer
  useEffect(() => {
    persistExamTimer(examTimer);
  }, [examTimer]);

  function setActiveTab(tab: TabId) {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_TAB_KEY, tab);
    }
  }

  // Horário oficial
  const officialSchedule = useMemo(() => {
    if (!coordinator) return null;
    return {
      gatesOpen: "12:00",
      gatesClose: "13:00",
      examStart: "13:30",
      examEndRegular: coordinator.examDay === 1 ? "19:00" : "18:30",
    };
  }, [coordinator]);

  const currentStage = useMemo(() => buildCurrentStage(now), [now]);

  // Countdown prova (auto ou manual)
  const examTime = useMemo(() => {
    if (!coordinator || !officialSchedule) {
      return {
        running: false,
        remainingLabel: "--:--:--",
        elapsedLabel: "--:--:--",
      };
    }

    const localNow = getSaoPauloNow();
    const start = parseTimeToToday(officialSchedule.examStart);
    const end = parseTimeToToday(officialSchedule.examEndRegular);
    const officialDurationMs = end.getTime() - start.getTime();

    let startTime: Date | null = null;
    let durationMs = officialDurationMs;
    let running = false;

    if (examTimer.startedAt) {
      startTime = new Date(examTimer.startedAt);
      durationMs = examTimer.durationMs || officialDurationMs;
    } else if (localNow >= start && localNow < end) {
      startTime = start;
      durationMs = officialDurationMs;
    }

    if (!startTime) {
      return {
        running: false,
        remainingLabel: formatCountdown(officialDurationMs),
        elapsedLabel: "00:00:00",
      };
    }

    const elapsedMs = localNow.getTime() - startTime.getTime();
    const remainingMs = durationMs - elapsedMs;

    if (remainingMs <= 0) {
      return {
        running: false,
        remainingLabel: "00:00:00",
        elapsedLabel: formatCountdown(durationMs),
      };
    }

    running = true;
    return {
      running,
      remainingLabel: formatCountdown(remainingMs),
      elapsedLabel: formatCountdown(elapsedMs),
    };
  }, [coordinator, officialSchedule, examTimer, now]);

  const examTimeRemaining = examTime.remainingLabel;
  const examRunning = examTime.running;
  const examElapsedLabel = examTime.elapsedLabel;

  // Próximo dia
  const nextExam = useMemo(() => getNextExamTarget(now), [now]);
  const nextExamCountdownLabel = nextExam
    ? nextExam.label
    : "Aplicação encerrada";
  const nextExamCountdownValue = nextExam
    ? formatCountdown(nextExam.diffMs)
    : "--:--:--";

  // Alertas pré-prova
  useEffect(() => {
    if (!coordinator || !officialSchedule) return;

    const configs = [
      {
        id: "gatesOpen",
        time: officialSchedule.gatesOpen,
        minutesBefore: 10,
        message: "Lembrete: abertura dos portões em 10 minutos.",
      },
      {
        id: "gatesClose",
        time: officialSchedule.gatesClose,
        minutesBefore: 10,
        message: "Lembrete: fechamento dos portões em 10 minutos.",
      },
      {
        id: "examStart",
        time: officialSchedule.examStart,
        minutesBefore: 5,
        message: "Lembrete: início das provas em 5 minutos.",
      },
    ] as const;

    const localNow = getSaoPauloNow();

    configs.forEach((cfg) => {
      const key = `alert_${cfg.id}_D${coordinator.examDay}`;
      if (firedAlerts[key]) return;

      const target = parseTimeToToday(cfg.time);
      const diffMinutes = (target.getTime() - localNow.getTime()) / 60000;

      if (
        diffMinutes <= cfg.minutesBefore &&
        diffMinutes > cfg.minutesBefore - 1.2
      ) {
        setFiredAlerts((prev) => ({ ...prev, [key]: true }));
        showSuccess(cfg.message);
      }
    });
  }, [now, coordinator, officialSchedule, firedAlerts]);

  // Alertas durante prova
  useEffect(() => {
    if (!coordinator || !officialSchedule || !examRunning) return;

    const keyPrefix = `exam_${coordinator.examDay}_`;
    const localNow = getSaoPauloNow();
    const start = parseTimeToToday(officialSchedule.examStart);
    const end = parseTimeToToday(officialSchedule.examEndRegular);

    if (localNow < start || localNow >= end) return;

    const totalMs = end.getTime() - start.getTime();
    const elapsedMs = localNow.getTime() - start.getTime();
    const remainingMinutes = Math.round(
      (totalMs - elapsedMs) / 60000,
    );

    const alerts = [
      {
        id: "start_confirm",
        condition: remainingMinutes <= totalMs / 60000 - 1,
        message:
          "Provas em andamento. Confirme avisos de abertura em todas as salas.",
      },
      {
        id: "60_left",
        condition: remainingMinutes === 60,
        message:
          "Faltam 60 minutos. Oriente chefes de sala a fazer o aviso oficial.",
      },
      {
        id: "15_left",
        condition: remainingMinutes === 15,
        message:
          "Faltam 15 minutos. Reforce avisos finais e procedimentos de encerramento.",
      },
      {
        id: "end_now",
        condition: remainingMinutes === 0,
        message:
          "Tempo encerrado. Coordenar recolhimento de materiais e fechamento.",
      },
    ] as const;

    alerts.forEach((a) => {
      const key = keyPrefix + a.id;
      if (!a.condition || firedAlerts[key]) return;
      setFiredAlerts((prev) => ({ ...prev, [key]: true }));
      showSuccess(a.message);
    });
  }, [now, coordinator, officialSchedule, examRunning, firedAlerts]);

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
          timestamp: formatNow(),
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
    setExamTimer({
      manualStart: false,
      startedAt: null,
      durationMs: 0,
    });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(STORAGE_TAB_KEY);
      window.localStorage.removeItem(STORAGE_EXAM_TIMER_KEY);
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

  function startExamManually() {
    if (!coordinator || !officialSchedule) {
      showError(
        "Defina o coordenador e o dia do exame antes de iniciar a contagem.",
      );
      return;
    }
    const startAt = getSaoPauloNow();
    const end = parseTimeToToday(officialSchedule.examEndRegular);
    const durationMs = Math.max(end.getTime() - startAt.getTime(), 0);

    setExamTimer({
      manualStart: true,
      startedAt: startAt.toISOString(),
      durationMs,
    });
    showSuccess("Contagem da prova iniciada manualmente.");
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
    currentTimes: officialSchedule,
    examTimeRemaining,
    examRunning,
    examElapsedLabel,
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
    startExamManually,
  };
}