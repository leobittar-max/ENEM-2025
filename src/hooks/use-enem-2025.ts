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
 * Checklist oficial completo do coordenador,
 * copiado do arquivo enem_coordinator_checklist_v3_coordenador.json.
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
  {
    id: "prep-01",
    fase: "Preparação Prévia",
    titulo: "Receber e conferir caixas de materiais administrativos",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Conferência completa do kit administrativo",
      corpo:
        "Confira se as caixas trazem todos os impressos e reservas (listas de presença, atas, cartões-resposta/folha de redaão, folhas de rascunho), crachás, envelopes de sala e envelopes porta-objetos. Registre o recebimento no sistema da Instituição Aplicadora e separe por sala conforme o Relatório de Participantes e Salas. Se faltar algo, contate imediatamente a Aplicadora. Fonte: Manual do Coordenador, p.12.",
      fonte: { manual: "Coordenador", pagina: 12 },
    },
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
        "Separe envelopes porta-objetos na quantidade exata por sala, conforme o Relatório de Participantes e Salas, e reserve uma cota para toda a equipe de aplicação. Isso evita falta no momento de identificação e vistoria eletrônica. Fonte: Manual do Coordenador, p.12.",
      fonte: { manual: "Coordenador", pagina: 12 },
    },
  },
  {
    id: "prep-03",
    fase: "Preparação Prévia",
    titulo: "Checar detectores de metais e alicate de lacre",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Segurança e abertura de malotes",
      corpo:
        "Confirme o funcionamento dos detectores (bateria/carga, modo sonoro) e a disponibilidade do alicate para corte do lacre de aço dos malotes. Registre a quantidade recebida no sistema. Fonte: Manual do Coordenador, p.12 e p.15.",
      fonte: { manual: "Coordenador", pagina: 12 },
    },
  },
  {
    id: "prep-04",
    fase: "Preparação Prévia",
    titulo: "Testar app interno no celular do coordenador e do assistente",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Verificação do aplicativo",
      corpo:
        "Instale/atualize o app indicado pela Aplicadora e valide o login e as telas críticas (relatórios, checklist, registro de ocorrências). Falhas devem ser reportadas ainda na semana prévia. Fonte: Manual do Coordenador, p.12.",
      fonte: { manual: "Coordenador", pagina: 12 },
    },
  },
  {
    id: "prep-05",
    fase: "Preparação Prévia",
    titulo:
      "Vistoriar prédio e salas (iluminação, ventilação, água, energia)",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Vistoria geral do local",
      corpo:
        "Inspecione luz, ventilação/climatização, abastecimento de água, banheiros, bebedouros e tomadas. Prefira salas longe dos banheiros para reduzir ruído; se usá-las, que seja como Sala Extra. Fonte: Manual do Coordenador, p.13.",
      fonte: { manual: "Coordenador", pagina: 13 },
    },
  },
  {
    id: "prep-06",
    fase: "Preparação Prévia",
    titulo:
      "Garantir acessibilidade, salas especiais e sala de acompanhante",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Acessibilidade mapeada e mobiliário adequado",
      corpo:
        "Verifique mesas e cadeiras acessíveis, tomadas para videoprova/leitor de tela, identificação das salas de fácil acesso e a sala do acompanhante de lactante. Ajuste antes do dia da prova. Fonte: Manual do Coordenador, p.13.",
      fonte: { manual: "Coordenador", pagina: 13 },
    },
  },
  {
    id: "prep-07",
    fase: "Preparação Prévia",
    titulo:
      "Definir Sala de Coordenação e guarda segura dos malotes",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Coordenação próxima às salas e malotes sob guarda",
      corpo:
        "Escolha a Sala de Coordenação próxima às salas de prova e garanta local trancado para malotes (preferencialmente sem janelas). Sem essa sala, designe vigilância dedicada. Fonte: Manual do Coordenador, p.13.",
      fonte: { manual: "Coordenador", pagina: 13 },
    },
  },
  {
    id: "prep-08",
    fase: "Preparação Prévia",
    titulo:
      "Planejar capacitação e comunicar dress code da equipe",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Capacitação obrigatória e orientações de vestimenta",
      corpo:
        "Agende a capacitação (presencial) e reforce: camisa branca (intérprete de Libras de preto), calça jeans/preta, documento com foto, caneta preta transparente e relógio analógico. Fonte: Manual do Coordenador, p.14.",
      fonte: { manual: "Coordenador", pagina: 14 },
    },
  },
  {
    id: "prep-09",
    fase: "Preparação Prévia",
    titulo:
      "Verificar documentação da equipe (termos e lista de presença)",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Regularidade documental da equipe",
      corpo:
        "Confirme que todos assinaram os termos obrigatórios e que a lista de presença/credenciamento está correta. Sem documentação regular, o colaborador deve ser substituído. Fonte: Manual do Coordenador, p.14–15.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
  },
  {
    id: "prep-10",
    fase: "Preparação Prévia",
    titulo:
      "Checar fechaduras/chaves e integridade da sala-cofre dos malotes",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Proteção física dos malotes",
      corpo:
        "Teste as fechaduras e confira quem tem a guarda das chaves. A sala de malotes deve ser trancada e, preferencialmente, sem janelas. Fonte: Manual do Coordenador, p.13.",
      fonte: { manual: "Coordenador", pagina: 13 },
    },
  },
  {
    id: "prep-11",
    fase: "Preparação Prévia",
    titulo:
      "Inspecionar dispositivos de segurança e combate a incêndio",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Segurança predial e preventiva",
      corpo:
        "Verifique a sinalização de emergência, extintores acessíveis, rotas de fuga e iluminação de segurança. Oriente a equipe sobre pontos de encontro. Fonte: Manual do Coordenador, p.13–14.",
      fonte: { manual: "Coordenador", pagina: 14 },
    },
  },
  {
    id: "prep-12",
    fase: "Preparação Prévia",
    titulo:
      "Restringir acesso de terceiros e circulação no prédio",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Perímetro controlado",
      corpo:
        "Garanta que apenas equipe, certificador e candidatos acessem as áreas autorizadas. Sinalize proibições e defina pontos de controle de entrada. Fonte: Manual do Coordenador, p.13–15.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
  },
  {
    id: "prep-13",
    fase: "Preparação Prévia",
    titulo:
      "Organizar numeração e identificação oficial das salas",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Sinalização e distribuição por sala",
      corpo:
        "Numere e identifique as salas conforme etiquetas/planilhas oficiais, fixando sinalização visível nos corredores e portas. Fonte: Manual do Coordenador, p.13.",
      fonte: { manual: "Coordenador", pagina: 13 },
    },
  },
  {
    id: "prep-14",
    fase: "Preparação Prévia",
    titulo:
      "Definir plano de contingência (energia, incidentes, comunicação)",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Procedimentos para imprevistos",
      corpo:
        "Combine rotas de ação para falta de energia, ruídos externos, incidentes médicos e substituições urgentes. Atribua responsáveis e use fiscal volante como principal canal de acionamento. Fonte: Manual do Coordenador, p.14–15.",
      fonte: { manual: "Coordenador", pagina: 14 },
    },
  },
  {
    id: "prep-15",
    fase: "Preparação Prévia",
    titulo:
      "Testar relógios analógicos e cronômetros das salas",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Sincronização de tempo",
      corpo:
        "Garanta que todas as salas tenham marcador de tempo funcional e sincronizado ao horário de Brasília. Disponibilize relógio reserva se necessário. Fonte: Manual do Chefe de Sala, p.1–2.",
      fonte: { manual: "Chefe de Sala", pagina: 2 },
    },
  },
  {
    id: "prep-16",
    fase: "Preparação Prévia",
    titulo:
      "Planejar comunicação via fiscal volante e assistente",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Canal rápido de apoio às salas",
      corpo:
        "Estabeleça o fiscal volante como ponte entre Coordenação e salas para documentos, ocorrências e deslocamentos ao banheiro. Defina sinais e rotas. Fonte: Manual do Coordenador, p.20 e p.37.",
      fonte: { manual: "Coordenador", pagina: 20 },
    },
  },
  {
    id: "manha-01",
    fase: "Dia do Exame – Manhã (pré-portões)",
    titulo: "Chegada do coordenador e assistente (08:00)",
    papel: "Coordenador",
    hora_sugerida: "08:00",
    info_popup: {
      titulo: "Início formal das atividades no local",
      corpo:
        "Coordenador e assistente chegam às 8h, recebem supervisor/certificador (se houver) e organizam a distribuição de materiais. Registre código/CPF e horários do certificador no relatório. Fonte: Manual do Coordenador, p.15.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
  },
  {
    id: "manha-02",
    fase: "Dia do Exame – Manhã (pré-portões)",
    titulo:
      "Chegada da equipe (09:00 no 1º dia; 09:30 no 2º)",
    papel: "Coordenador",
    hora_sugerida: "09:00/09:30",
    info_popup: {
      titulo: "Ponto de encontro e presença",
      corpo:
        "Confirme presença, substitua ausentes e direcione chefes de sala e fiscais. Entregue envelopes de sala com recibo e faça a minicapacitação com reforço dos procedimentos. Fonte: Manual do Coordenador, p.15 e p.20.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
  },
  {
    id: "manha-03",
    fase: "Dia do Exame – Manhã (pré-portões)",
    titulo:
      "Distribuir materiais às salas (envelopes, reservas, crachás)",
    papel: "Coordenador",
    hora_sugerida: "09:30",
    info_popup: {
      titulo: "Kits completos por sala",
      corpo:
        "Cada sala recebe envelope com lista, ata, avaliações (se houver), envelopes porta-objetos e materiais reserva. Chefes de sala confirmam recebimento. Fonte: Manual do Coordenador, p.15.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
  },
  {
    id: "portoes-01",
    fase: "Dia do Exame – Portões e Malotes",
    titulo: "ABRIR portões (12:00) e FECHAR (13:00)",
    papel: "Coordenador",
    hora_sugerida: "12:00 / 13:00",
    info_popup: {
      titulo:
        "Controle de acesso no horário de Brasília",
      corpo:
        "Abra os portões às 12h e feche às 13h, conforme horário de Brasília. Após o fechamento, inicie a abertura dos malotes e a distribuição de envelopes nas salas. Fonte: Manual do Coordenador, p.11.",
      fonte: { manual: "Coordenador", pagina: 11 },
    },
  },
  {
    id: "portoes-02",
    fase: "Dia do Exame – Portões e Malotes",
    titulo:
      "Abrir malotes (após 13:00) e distribuir envelopes/provas",
    papel: "Coordenador",
    hora_sugerida: "13:00+",
    info_popup: {
      titulo:
        "Integridade e distribuição nominal",
      corpo:
        "Abertura dos malotes somente após 13h, com integridade verificada e registro. Distribua envelopes de provas às salas e garanta a distribuição nominal dos cadernos e folhas de rascunho (2º dia). Fonte: Manual do Coordenador, p.42–44.",
      fonte: { manual: "Coordenador", pagina: 42 },
    },
  },
  {
    id: "exec-01",
    fase: "Durante a Prova",
    titulo:
      "Supervisionar: Início das provas (13:30) e avisos obrigatórios",
    papel: "Coordenador",
    hora_sugerida: "13:30",
    info_popup: {
      titulo:
        "Supervisão do Coordenador — Ritual de abertura em sala",
      corpo:
        "O coordenador deve supervisionar que os Chefes de Sala iniciem às 13h30, façam a leitura dos avisos obrigatórios e mantenham o marcador de tempo visível. O coordenador presta suporte via fiscal volante e registra ocorrências quando necessário. Fonte: Manual do Chefe de Sala, p.2.",
      fonte: { manual: "Chefe de Sala", pagina: 2 },
    },
  },
  {
    id: "exec-02",
    fase: "Durante a Prova",
    titulo:
      "Supervisionar: Identificação e conferência de documentos",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Supervisão do Coordenador — Documentos aceitos e procedimentos",
      corpo:
        "O coordenador deve supervisionar que os Chefes de Sala confiram nome (civil/social), documento com foto (impresso ou digital nos apps oficiais) e façam orientação sobre envelope porta-objetos e detector de metais. Prestar suporte via fiscal volante e registrar ocorrências quando necessário. Fonte: Manual do Chefe de Sala, p.2–4.",
      fonte: { manual: "Chefe de Sala", pagina: 2 },
    },
  },
  {
    id: "exec-03",
    fase: "Durante a Prova",
    titulo:
      "Supervisionar: Envelope porta-objetos — guarda de itens e vistorias",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Supervisão do Coordenador — Itens obrigatórios no envelope",
      corpo:
        "O coordenador deve supervisionar a correta utilização dos envelopes porta-objetos (celular desligado, eletrônicos e impressos), a guarda sob a carteira e a vistoria eletrônica. Prestar suporte via fiscal volante e registrar ocorrências quando necessário. Fonte: Manual do Chefe de Sala, p.4.",
      fonte: { manual: "Chefe de Sala", pagina: 4 },
    },
  },
  {
    id: "exec-04",
    fase: "Durante a Prova",
    titulo:
      "Supervisionar: Controle de horários e saídas (2h mín.; 15:30/18:30/18:00)",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Supervisão do Coordenador — Marcos de tempo e saídas",
      corpo:
        "O coordenador assegura que as salas cumpram os marcos de tempo: saída sem caderno a partir de 15h30; saída com caderno às 18h30 (1º dia) e 18h (2º dia); término normal às 19h/18h30; e gestão adequada do tempo adicional. Prestar suporte via fiscal volante e registrar ocorrências quando necessário. Fonte: Manual do Coordenador, p.11.",
      fonte: { manual: "Coordenador", pagina: 11 },
    },
  },
  {
    id: "exec-05",
    fase: "Durante a Prova",
    titulo:
      "Sala Extra e participantes fora do cadastro (gestão e reporte)",
    papel: "Coordenador",
    hora_sugerida: "14:20 (comunicação)",
    info_popup: {
      titulo: "Direcionamento e reporte",
      corpo:
        "Gerencie Sala Extra para casos necessários e informe, no horário indicado, ausentes e participantes fora do cadastro à Instituição Aplicadora. Fonte: Manual do Coordenador (checklist operacional), p.37–40.",
      fonte: { manual: "Coordenador", pagina: 37 },
    },
  },
  {
    id: "exec-06",
    fase: "Durante a Prova",
    titulo:
      "Supervisionar: Procedimentos de segurança e detector de metais",
    papel: "Coordenador",
    hora_sugerida: "13:45 (vistoria equipe)",
    info_popup: {
      titulo:
        "Supervisão do Coordenador — Fluxo de vistoria e reforços",
      corpo:
        "O coordenador deve supervisionar a vistoria eletrônica e, quando aplicável, a vistoria de lanches/medicamentos conforme regras, apoiando as salas e registrando anomalias. Fonte: Manual do Chefe de Sala, p.4–5.",
      fonte: { manual: "Chefe de Sala", pagina: 4 },
    },
  },
  {
    id: "exec-07",
    fase: "Durante a Prova",
    titulo:
      "Distribuição dos envelopes com recibo assinado pelo Chefe de Sala",
    papel: "Coordenador",
    hora_sugerida: "13:05",
    info_popup: {
      titulo: "Controle formal de entrega",
      corpo:
        "Entregue os envelopes às salas com conferência por assinatura do Chefe de Sala, garantindo rastreabilidade e responsabilidade pelos materiais. Fonte: Manual do Coordenador, p.15.",
      fonte: { manual: "Coordenador", pagina: 15 },
    },
  },
  {
    id: "exec-08",
    fase: "Durante a Prova",
    titulo:
      "Preencher e assinar o Termo de Abertura dos Malotes",
    papel: "Coordenador",
    hora_sugerida: "13:00–13:20",
    info_popup: {
      titulo:
        "Registro de integridade dos malotes",
      corpo:
        "Registre horário de abertura, número do lacre cortado e assinatura dos responsáveis. Sem este termo, não prossiga com a distribuição. Fonte: Manual do Coordenador, p.42–44.",
      fonte: { manual: "Coordenador", pagina: 42 },
    },
  },
  {
    id: "exec-09",
    fase: "Durante a Prova",
    titulo:
      "Acompanhar fiscais volantes e assistentes nas demandas das salas",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Fluxo de apoio contínuo",
      corpo:
        "Monitore deslocamentos, autorize atendimentos e mantenha o canal ágil para entregas, substituições e ocorrências. Fonte: Manual do Coordenador, p.20 e p.37.",
      fonte: { manual: "Coordenador", pagina: 20 },
    },
  },
  {
    id: "exec-10",
    fase: "Durante a Prova",
    titulo:
      "Monitorar salas com atendimento especializado (tempo adicional, lactantes, TEA/DNV)",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Garantia de condições específicas",
      corpo:
        "Verifique aplicação correta de tempo adicional, salas de lactantes, recursos de acessibilidade e procedimentos diferenciados quando previstos. Fonte: Manual do Coordenador, p.13 e p.38.",
      fonte: { manual: "Coordenador", pagina: 38 },
    },
  },
  {
    id: "exec-11",
    fase: "Durante a Prova",
    titulo:
      "Supervisionar: Leituras de avisos obrigatórios no tempo certo",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Supervisão do Coordenador — Avisos marcados no quadro",
      corpo:
        "Garanta que os marcos do marcador de tempo sejam lidos e registrados nos horários indicados (2h mín., 60 min restantes, 15 min finais). Prestar suporte via fiscal volante e registrar ocorrências quando necessário. Fonte: Manual do Chefe de Sala, p.1–2.",
      fonte: { manual: "Chefe de Sala", pagina: 2 },
    },
  },
  {
    id: "exec-12",
    fase: "Durante a Prova",
    titulo:
      "Registrar/validar ocorrências em ata/sistema (em tempo real)",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Rastreabilidade e transparência",
      corpo:
        "Registre e valide ocorrências (documentação irregular, desistências, problemas de saúde, barulho, energia e quaisquer incidentes) e oriente as salas. Fonte: Manuais — rotinas de ocorrência (Coordenador p.57+; Chefe de Sala p.2–5).",
      fonte: { manual: "Coordenador", pagina: 57 },
    },
  },
  {
    id: "exec-13",
    fase: "Durante a Prova",
    titulo:
      "Autorizar/acompanhar idas ao banheiro via fiscal volante",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Controle de deslocamentos",
      corpo:
        "Defina e fiscalize o fluxo de acompanhamento por fiscal volante. Se houver saída antes do início, refaça identificação e vistoria. Registre horários em ata quando aplicável. Fonte: Manual do Chefe de Sala, p.2–4.",
      fonte: { manual: "Chefe de Sala", pagina: 3 },
    },
  },
  {
    id: "exec-14",
    fase: "Durante a Prova",
    titulo:
      "Comunicar avisos gerais (alto-falante) quando necessário",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Comando central do exame",
      corpo:
        "Use comunicação centralizada para padronizar avisos importantes (início, alerta de 2h, 60 min restantes, 15 min finais), sem gerar ruído excessivo. Fonte: Manual do Coordenador, p.11 e p.20.",
      fonte: { manual: "Coordenador", pagina: 11 },
    },
  },
  {
    id: "enc-01",
    fase: "Encerramento",
    titulo:
      "Recolher materiais e conferir assinaturas/listas",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Fechamento administrativo das salas",
      corpo:
        "Recolha cartões-resposta, folhas de redação, atas e listas de presença com assinaturas. Confirme contagens (presentes/ausentes) e registre ocorrências restantes. Fonte: Manual do Coordenador, p.57–63.",
      fonte: { manual: "Coordenador", pagina: 57 },
    },
  },
  {
    id: "enc-02",
    fase: "Encerramento",
    titulo:
      "Fechamento e lacre dos malotes",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Integridade do lacre e conferência de volumes",
      corpo:
        "Organize documentos por envelope correto, confira números/integração dos lacres e registre horários. Lacre os malotes e prepare a devolução formal. Fonte: Manual do Coordenador, p.63.",
      fonte: { manual: "Coordenador", pagina: 63 },
    },
  },
  {
    id: "enc-03",
    fase: "Encerramento",
    titulo:
      "Verificar fisicamente os lacres (número/integ.) antes da devolução",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Conferência final de segurança",
      corpo:
        "Confirme que todos os envelopes e malotes estão com lacres íntegros e numeração registrada. Divergências devem ser registradas e comunicadas. Fonte: Manual do Coordenador, p.63.",
      fonte: { manual: "Coordenador", pagina: 63 },
    },
  },
  {
    id: "enc-04",
    fase: "Encerramento",
    titulo:
      "Preencher e assinar o Termo de Encerramento da Aplicação",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Fechamento formal do dia",
      corpo:
        "Registre horários, volumes, ocorrências resumidas e assinaturas dos responsáveis. Documento indispensável para entrega à Aplicadora. Fonte: Manual do Coordenador, p.60–64.",
      fonte: { manual: "Coordenador", pagina: 60 },
    },
  },
  {
    id: "enc-05",
    fase: "Encerramento",
    titulo:
      "Conferir assinaturas dos chefes de sala nas atas e listas",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo:
        "Documentação completa",
      corpo:
        "Garanta que todas as atas, listas e relatórios foram assinados. Sem assinaturas, o material não deve ser lacrado. Fonte: Manual do Coordenador, p.57–63.",
      fonte: { manual: "Coordenador", pagina: 57 },
    },
  },
  {
    id: "enc-06",
    fase: "Encerramento",
    titulo:
      "Conferir devolução de detectores de metais e equipamentos",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Controle de bens",
      corpo:
        "Confira quantidade e estado dos equipamentos e registre a devolução. Itens com defeito devem ser anotados para substituição. Fonte: Manual do Coordenador, p.12 e p.60.",
      fonte: { manual: "Coordenador", pagina: 60 },
    },
  },
  {
    id: "enc-07",
    fase: "Encerramento",
    titulo:
      "Conferir lista de volumes e emitir recibo de entrega",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Rastreio da remessa",
      corpo:
        "Relacione todos os volumes/malotes, confira a lista, gere recibo e colha assinatura do responsável pelo recebimento. Fonte: Manual do Coordenador, p.63–64.",
      fonte: { manual: "Coordenador", pagina: 63 },
    },
  },
  {
    id: "enc-08",
    fase: "Encerramento",
    titulo:
      "Registrar ocorrências operacionais (energia, barulho, logística)",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Lições para o próximo dia",
      corpo:
        "Descreva problemas e soluções aplicadas, para orientar a equipe no dia seguinte (ou em futuras aplicações). Fonte: Manual do Coordenador, p.60–62.",
      fonte: { manual: "Coordenador", pagina: 60 },
    },
  },
  {
    id: "enc-09",
    fase: "Encerramento",
    titulo:
      "Feedback imediato com chefes de sala (debriefing)",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Alinhamento final",
      corpo:
        "Reúna os chefes de sala rapidamente para revisar incidentes e alinhar melhorias. Registre pontos críticos e ações. Fonte: Manual do Coordenador, p.60–61.",
      fonte: { manual: "Coordenador", pagina: 61 },
    },
  },
  {
    id: "enc-10",
    fase: "Encerramento",
    titulo:
      "Verificar fechamento das salas e condições do prédio",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Encerramento do local",
      corpo:
        "Confirme que as salas estão vazias, limpas e trancadas; luzes apagadas e acesso restrito após a devolução dos malotes. Fonte: Manual do Coordenador, p.63–64.",
      fonte: { manual: "Coordenador", pagina: 64 },
    },
  },
  {
    id: "pos-01",
    fase: "Pós-Aplicação",
    titulo:
      "Entrega à Instituição Aplicadora e relatório final",
    papel: "Coordenador",
    hora_sugerida: null,
    info_popup: {
      titulo: "Devolução formal e fechamento",
      corpo:
        "Entregue todos os malotes e equipamentos (detectores etc.), finalize relatórios/ocorrências no app e valide pendências com chefes de sala. Fonte: Manual do Coordenador, p.60–64.",
      fonte: { manual: "Coordenador", pagina: 60 },
    },
  },
];

/**
 * Mapeia o campo "fase" do JSON para as fases internas usadas nas abas.
 */
function mapPhase(fase: string): ChecklistPhase {
  const f = fase.toLowerCase();

  if (f.includes("preparação prévia")) return "preparation";

  if (f.includes("manhã")) return "morning";
  if (f.includes("portões") || f.includes("malotes")) return "morning";

  if (f.includes("durante a prova")) return "during";

  if (f === "encerramento" || f.includes("encerramento")) return "closing";

  if (f.includes("pós-aplicação") || f.includes("pós aplicação")) return "post";

  return "preparation";
}

/**
 * Converte rawChecklist para ChecklistItem interno.
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

  const makeLocal = (
    y: number,
    m: number,
    d: number,
    h: number,
    mi: number,
  ) =>
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

  // Persistir estado principal
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

  // Horários oficiais
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
    showSuccess(
      `Tema ${theme === "light" ? "escuro" : "claro"} ativado.`,
    );
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
      notes: { ...prev.notes, [id]: value },
    }));
  }

  function addOccurrence(data: {
    type: string;
    description: string;
    critical: boolean;
  }) {
    if (!currentDay) {
      showError(
        "Defina o dia do exame antes de registrar ocorrências.",
      );
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