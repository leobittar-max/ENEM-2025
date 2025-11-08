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
 * IMPORTANTE:
 * Este array deve ser a cópia EXATA do JSON oficial (enem_coordinator_checklist_v3_coordenador.json),
 * com os campos:
 * - id
 * - fase
 * - titulo
 * - papel
 * - hora_sugerida
 * - info_popup: { titulo, corpo, fonte: { manual, pagina } }
 *
 * Abaixo está um exemplo reduzido; na sua base, mantenha TODOS os itens.
 */
const rawChecklist: {
  id: string;
  fase: string;
  titulo: string;
  papel: string;
  hora_sugerida: string | null;
  info_popup?: {
    titulo: string;
    corpo: string;
    fonte: { manual: string; pagina: number };
  };
  critico?: boolean;
}[] = [
  // Exemplos iniciais (substitua/complete com todo o conteúdo do JSON oficial):
  {
    id: "prep-01",
    fase: "Preparação Prévia",
    titulo: "Receber e conferir caixas de materiais administrativos",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Conferência completa do kit administrativo",
      corpo:
        "Confira se as caixas trazem todos os impressos e reservas (listas de presença, atas, cartões-resposta, folhas de redação/rascunho), crachás, envelopes de sala e envelopes porta-objetos. Registre o recebimento no sistema da Instituição Aplicadora e separe por sala conforme o Relatório de Participantes e Salas.",
      fonte: { manual: "Coordenador", pagina: 12 },
    },
    critico: true,
  },
  {
    id: "prep-02",
    fase: "Preparação Prévia",
    titulo: "Separar e reservar envelopes porta-objetos (salas e equipe)",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Envelope porta-objetos por sala e por colaborador",
      corpo:
        "Separe envelopes porta-objetos na quantidade exata por sala e uma cota para a equipe, evitando falta no momento de identificação e vistoria.",
      fonte: { manual: "Coordenador", pagina: 12 },
    },
  },
  {
    id: "dia1-01",
    fase: "Dia do Exame - Manhã",
    titulo: "Chegada antecipada do coordenador ao local",
    papel: "Coordenador",
    hora_sugerida: "10:30",
  },
  {
    id: "dia1-02",
    fase: "Dia do Exame - Manhã",
    titulo: "Reunião rápida com equipe e confirmação dos horários",
    papel: "Coordenador",
    hora_sugerida: "11:00",
  },
  {
    id: "portoes-01",
    fase: "Dia do Exame - Portões e entrada",
    titulo: "Garantir abertura dos portões no horário oficial",
    papel: "Coordenador",
    hora_sugerida: "12:00",
    critico: true,
  },
  {
    id: "durante-01",
    fase: "Durante a Prova",
    titulo: "Confirmar início das provas em todas as salas",
    papel: "Coordenador",
    hora_sugerida: "13:30",
    critico: true,
  },
  {
    id: "durante-02",
    fase: "Durante a Prova",
    titulo: "Monitorar ocorrências e apoio às salas",
    papel: "Coordenador",
    hora_sugerida: null,
  },
  {
    id: "enc-01",
    fase: "Encerramento",
    titulo: "Orientar encerramento simultâneo conforme horário",
    papel: "Coordenador",
    hora_sugerida: null,
    critico: true,
  },
  {
    id: "enc-02",
    fase: "Encerramento",
    titulo: "Conferir devolução de malotes, listas e atas",
    papel: "Coordenador",
    hora_sugerida: null,
    critico: true,
  },
  {
    id: "pos-01",
    fase: "Pós-Aplicação",
    titulo: "Registrar resumo final do dia e ocorrências críticas",
    papel: "Coordenador",
    hora_sugerida: null,
  },
];

/**
 * Mapeia o campo "fase" do JSON oficial para a fase interna usada nas abas.
 * Ajuste aqui para alinhar exatamente com os nomes do seu arquivo JSON.
 */
function mapPhase(fase: string): ChecklistPhase {
  const f = fase.toLowerCase();

  if (f.includes("preparação")) return "preparation";
  if (f.includes("manhã")) return "morning";
  if (f.includes("portões")) return "morning";
  if (f.includes("durante a prova")) return "during";
  if (f === "encerramento" || f.includes("encerramento")) return "closing";
  if (f.includes("pós-aplicação") || f.includes("pós aplicação")) return "post";

  // fallback: considerar como preparação se algo não casar
  return "preparation";
}

/**
 * Converte rawChecklist para ChecklistItem usado pelo app.
 */
const checklistItems: ChecklistItem[] = rawChecklist.map((item) => ({
  id: item.id,
  text: item.titulo,
  phase: mapPhase(item.fase),
  role: item.papel || "Coordenador",
  suggestedTime: item.hora_sugerida,
  info: item.info_popup
    ? {
        titulo: item.info_popup.titulo,
        corpo: item.info_popup.corpo,
        fonte: {
          manual: item.info_popup.fonte.manual,
          pagina: item.info_popup.fonte.pagina,
        },
      }
    : undefined,
  critical: !!item.critico,
}));

// Listas filtradas por fase, usadas nas abas
const preparationItems = checklistItems.filter(
  (i) => i.phase === "preparation",
);
const morningItems = checklistItems.filter((i) => i.phase === "morning");
const duringItems = checklistItems.filter((i) => i.phase === "during");
const closingItems = checklistItems.filter((i) => i.phase === "closing");

// ----------------- Estado e utilitários -----------------

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
    return { day1: createEmptyDailyState(), day2: createEmptyDailyState(), coordinator: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { day1: createEmptyDailyState(), day2: createEmptyDailyState(), coordinator: null };
    }
    const parsed = JSON.parse(raw) as EnemState;
    return {
      day1: parsed.day1 ?? createEmptyDailyState(),
      day2: parsed.day2 ?? createEmptyDailyState(),
      coordinator: parsed.coordinator ?? null,
    };
  } catch {
    return { day1: createEmptyDailyState(), day2: createEmptyDailyState(), coordinator: null };
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

interface SafeTimerState {
  manualStart: boolean;
  startedAt: string | null;
  durationMs: number;
}

function safeLoadExamTimer(): SafeTimerState {
  if (typeof window === "undefined") {
    return { manualStart: false, startedAt: null, durationMs: 0 };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_EXAM_TIMER_KEY);
    if (!raw) {
      return { manualStart: false, startedAt: null, durationMs: 0 };
    }
    const parsed = JSON.parse(raw) as SafeTimerState;
    return {
      manualStart: !!parsed.manualStart,
      startedAt: parsed.startedAt,
      durationMs: parsed.durationMs || 0,
    };
  } catch {
    return { manualStart: false, startedAt: null, durationMs: 0 };
  }
}

function persistExamTimer(state: SafeTimerState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_EXAM_TIMER_KEY, JSON.stringify(state));
}

function getSaoPauloNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
}

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "00:00:00";
  const totalSeconds = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(
    2,
    "0",
  )}:${String(s).padStart(2, "0")}`;
}

function parseTimeToToday(time: string) {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const base = getSaoPauloNow();
  base.setHours(h, m, 0, 0);
  return base;
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

function getNextExamTarget(now: Date) {
  const tzNow = getSaoPauloNow();

  const makeLocal = (y: number, m: number, d: number, h: number, mi: number) =>
    new Date(
      new Date(Date.UTC(y, m - 1, d, h, mi, 0)).toLocaleString("en-US", {
        timeZone: "America/Sao_Paulo",
      }),
    );

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

// ----------------- Hook principal -----------------

export function useEnem2025() {
  const [state, setState] = useState<EnemState>(() => safeLoadState());
  const [activeTab, setActiveTabState] = useState<TabId>(() => safeLoadTab());
  const [now, setNow] = useState<Date>(new Date());
  const [theme, setTheme] = useState<"light" | "dark">(() => safeLoadTheme());
  const [firedAlerts, setFiredAlerts] = useState<Record<string, boolean>>({});
  const [examTimer, setExamTimer] = useState<SafeTimerState>(() =>
    safeLoadExamTimer(),
  );

  const coordinator = state.coordinator;
  const currentDay: 1 | 2 | null = coordinator?.examDay ?? null;

  const getDailyState = (): DailyState =>
    currentDay === 2 ? state.day2 : state.day1;

  const setDailyState = (updater: (prev: DailyState) => DailyState) => {
    setState((prev) => {
      if (currentDay === 2) {
        return { ...prev, day2: updater(prev.day2) };
      }
      return { ...prev, day1: updater(prev.day1) };
    });
  };

  const daily = getDailyState();

  // Relógio global
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

  // Persistir estado
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Persistir timer
  useEffect(() => {
    persistExamTimer(examTimer);
  }, [examTimer]);

  function setActiveTab(tab: TabId) {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_TAB_KEY, tab);
    }
  }

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

  // Countdown (auto ou manual)
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

    return {
      running: true,
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
    setState((prev) => ({ ...prev, coordinator: { ...payload } }));
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
          timestamp: getSaoPauloNow().toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          }),
        };

        return {
          ...prev,
          [list]: nextList,
          log: [entry, ...prev.log],
        };
      }

      return { ...prev, [list]: nextList };
    });
  }

  function setNote(id: string, value: string) {
    if (!currentDay) return;
    setDailyState((prev) => ({
      ...prev,
      notes: { ...prev.notes, [id]: value },
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

    const timestamp = getSaoPauloNow().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

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
    setExamTimer({ manualStart: false, startedAt: null, durationMs: 0 });
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