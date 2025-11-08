export interface RoomChecklistInfoSource {
  manual: string;
  pagina: number;
}

export interface RoomChecklistInfoPopup {
  titulo: string;
  corpo: string;
  fonte: RoomChecklistInfoSource;
}

export type RoomChecklistPhase =
  | "Antes (pré-portões)"
  | "Distribuição e início"
  | "Durante a aplicação"
  | "Encerramento e devolução";

export interface RoomChecklistItem {
  id: string;
  titulo: string;
  fase: RoomChecklistPhase;
  papel: string;
  hora_sugerida: string | null;
  info?: RoomChecklistInfoPopup;
  critical?: boolean;
}

export const roomChecklistItems: RoomChecklistItem[] = [
  {
    id: "pre-01",
    fase: "Antes (pré-portões)",
    titulo: "Chegada do Chefe de Sala e Aplicador à sala designada",
    papel: "Chefe de Sala/Aplicador",
    hora_sugerida: "12:30–12:50",
    info: {
      titulo: "Instalação e preparação inicial",
      corpo:
        "Abrir a sala, organizar carteiras, posicionar relógio visível e conferir materiais básicos de uso em sala. Alinhar comunicação com a Coordenação e fiscal volante para chamados rápidos.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 2,
      },
    },
  },
  {
    id: "pre-02",
    fase: "Antes (pré-portões)",
    titulo: "Conferir envelope de sala e quantitativos",
    papel: "Chefe de Sala",
    hora_sugerida: "12:50–13:00",
    info: {
      titulo: "Materiais corretos para a sala",
      corpo:
        "Verificar número da sala no envelope, quantidades (provas, listas, atas, cartões-resposta, folhas de redação/rascunho) e integridade. Reportar divergências imediatamente à Coordenação.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 2,
      },
    },
    critical: true,
  },
  {
    id: "pre-03",
    fase: "Antes (pré-portões)",
    titulo: "Preparar quadro com horários oficiais e regras",
    papel: "Aplicador",
    hora_sugerida: "13:00–13:20",
    info: {
      titulo: "Referências de tempo e permanência",
      corpo:
        "Escrever no quadro: horário de início, permanência mínima de 2h, marcações de 60 e 15 minutos finais, e horário para saída com/sem caderno.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 2,
      },
    },
  },
  {
    id: "pre-04",
    fase: "Antes (pré-portões)",
    titulo: "Organizar identificação e orientação inicial dos participantes",
    papel: "Chefe de Sala",
    hora_sugerida: "13:00–13:25",
    info: {
      titulo: "Documento e regras de objetos",
      corpo:
        "Conferir documento com foto (físico ou digital oficial), validar nome civil/social, orientar envelope porta-objetos e itens proibidos. Dúvidas ou irregularidades são encaminhadas à Coordenação.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 2,
      },
    },
  },
  {
    id: "pre-05",
    fase: "Antes (pré-portões)",
    titulo: "Coletar e lacrar envelope porta-objetos sob a carteira",
    papel: "Aplicador",
    hora_sugerida: null,
    info: {
      titulo: "Guarda de aparelhos e impressos",
      corpo:
        "Recolher celulares e eletrônicos desligados. Lacrar envelope identificado e mantê-lo sob a carteira do participante durante toda a aplicação.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 4,
      },
    },
    critical: true,
  },
  {
    id: "inicio-01",
    fase: "Distribuição e início",
    titulo: "Dar avisos obrigatórios antes da abertura do envelope",
    papel: "Chefe de Sala",
    hora_sugerida: "13:25–13:30",
    info: {
      titulo: "Avisos e transparência do procedimento",
      corpo:
        "Reforçar regras do exame, silêncio, identificação, vistoria eletrônica e horários. Confirmar integridade do envelope diante dos presentes.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 2,
      },
    },
  },
  {
    id: "inicio-02",
    fase: "Distribuição e início",
    titulo: "Abrir envelope com testemunha e iniciar distribuição nominal",
    papel: "Chefe de Sala/Aplicador",
    hora_sugerida: "13:30",
    info: {
      titulo: "Integridade e distribuição",
      corpo:
        "Abrir envelope conforme orientação, com testemunha. Distribuir material nominalmente. No 2º dia, entregar também a Folha de Rascunho. Atenção a homônimos e Nome Social.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 3,
      },
    },
    critical: true,
  },
  {
    id: "inicio-03",
    fase: "Distribuição e início",
    titulo: "Registrar ausentes e informar sala 100% ausente à Coordenação",
    papel: "Chefe de Sala",
    hora_sugerida: "13:35–13:50",
    info: {
      titulo: "Gestão de presença",
      corpo:
        "Anotar ausentes conforme janela indicada. Em sala 100% ausente, seguir o procedimento com a Coordenação, mantendo materiais sob guarda.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 3,
      },
    },
  },
  {
    id: "durante-01",
    fase: "Durante a aplicação",
    titulo: "Aplicar vistoria eletrônica com detector (modo sonoro)",
    papel: "Aplicador",
    hora_sugerida: null,
    info: {
      titulo: "Segurança e padronização",
      corpo:
        "Realizar vistoria eletrônica dos participantes e, quando aplicável, vistoria de itens (lanches/medicamentos) conforme regras. Recusas ou alertas devem ser registradas e encaminhadas.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 4,
      },
    },
    critical: true,
  },
  {
    id: "durante-02",
    fase: "Durante a aplicação",
    titulo: "Controlar saídas ao banheiro (um por vez, sempre acompanhado)",
    papel: "Chefe de Sala",
    hora_sugerida: null,
    info: {
      titulo: "Fluxo de deslocamento",
      corpo:
        "Autorizar saídas sempre com fiscal volante, um participante por vez. Saída antes do início exige nova identificação e vistoria ao retornar.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 3,
      },
    },
  },
  {
    id: "durante-03",
    fase: "Durante a aplicação",
    titulo: "Manter controle de tempo e leituras (60 min e 15 min finais)",
    papel: "Aplicador",
    hora_sugerida: null,
    info: {
      titulo: "Marcos de tempo",
      corpo:
        "Cumprir permanência mínima de 2h e anunciar marcos de 60 min e 15 min finais. Reforçar regras para levar o caderno nos horários permitidos.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 5,
      },
    },
  },
  {
    id: "durante-04",
    fase: "Durante a aplicação",
    titulo: "Registrar ocorrências em ata/sistema em tempo real",
    papel: "Chefe de Sala",
    hora_sugerida: null,
    info: {
      titulo: "Rastreabilidade",
      corpo:
        "Registrar documentos irregulares, desistências, intercorrências médicas, barulho e falhas de energia. Em casos críticos, acionar a Coordenação imediatamente.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 2,
      },
    },
  },
  {
    id: "enc-01",
    fase: "Encerramento e devolução",
    titulo: "Anunciar término, interromper marcações e recolher materiais",
    papel: "Chefe de Sala/Aplicador",
    hora_sugerida: null,
    info: {
      titulo: "Fechamento de prova",
      corpo:
        "Anunciar término, recolher cartões-resposta, cadernos e folhas de redação. Em recusa, solicitar apoio da Coordenação e registrar.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 5,
      },
    },
    critical: true,
  },
  {
    id: "enc-02",
    fase: "Encerramento e devolução",
    titulo: "Preencher Lista de Presença e Ata de Sala com assinaturas finais",
    papel: "Chefe de Sala",
    hora_sugerida: null,
    info: {
      titulo: "Documentos administrativos",
      corpo:
        "Finalizar presentes/ausentes, registrar ocorrências na ata e colher assinaturas finais, observando os últimos três participantes quando aplicável.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 2,
      },
    },
  },
  {
    id: "enc-03",
    fase: "Encerramento e devolução",
    titulo: "Organizar e devolver materiais à Coordenação",
    papel: "Aplicador",
    hora_sugerida: null,
    info: {
      titulo: "Entrega organizada",
      corpo:
        "Separar por envelope correto, identificar a sala e devolver todo o material à Coordenação para conferência e lacre.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 2,
      },
    },
    critical: true,
  },
];