export interface RoomChecklistItem {
  id: string;
  title: string;
  manualPage: number;
  description: string;
  critical?: boolean;
}

export const roomChecklistItems: RoomChecklistItem[] = [
  {
    id: "cs-01",
    title: "Conferir identificação da sala e lista de participantes",
    manualPage: 2,
    description:
      "Verifique se a numeração da sala e a lista afixada na porta estão corretas, em conformidade com o Relatório de Participantes.",
    critical: true,
  },
  {
    id: "cs-02",
    title: "Organizar carteiras e quadro de avisos",
    manualPage: 2,
    description:
      "Garanta distanciamento adequado entre carteiras e quadro visível com informações obrigatórias.",
  },
  {
    id: "cs-03",
    title: "Receber envelopes e materiais com conferência de quantidades",
    manualPage: 3,
    description:
      "Conferir se todos os materiais chegaram lacrados e na quantidade indicada para a sala.",
    critical: true,
  },
  {
    id: "cs-04",
    title: "Identificar participantes e recolher itens proibidos",
    manualPage: 4,
    description:
      "Conferir documento, recolher celulares e guardar nos envelopes porta-objetos conforme orientações.",
    critical: true,
  },
  {
    id: "cs-05",
    title: "Realizar leitura dos avisos obrigatórios",
    manualPage: 2,
    description:
      "Efetuar a leitura integral dos avisos oficiais no horário indicado.",
  },
  {
    id: "cs-06",
    title: "Controlar horários de início, permanência mínima e saídas",
    manualPage: 5,
    description:
      "Seguir rigorosamente os horários oficiais de início, permanência mínima e saída de participantes.",
    critical: true,
  },
  {
    id: "cs-07",
    title: "Registrar ocorrências na ata da sala",
    manualPage: 6,
    description:
      "Registrar qualquer irregularidade, troca de lugar, atraso, incidente ou atendimento especial na ata.",
  },
  {
    id: "cs-08",
    title: "Conferir cartões-resposta, redações e listas ao final",
    manualPage: 7,
    description:
      "Verificar se todos os materiais obrigatórios foram recolhidos e assinados antes de lacrar os envelopes.",
    critical: true,
  },
  {
    id: "cs-09",
    title: "Lacrar envelopes e devolver materiais ao responsável",
    manualPage: 7,
    description:
      "Lacrar corretamente os envelopes da sala e entregar ao responsável designado, conforme instruções.",
    critical: true,
  },
];