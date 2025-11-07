import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import type {
  CoordinatorData,
  ChecklistItem,
  LogEntry,
  Occurrence,
} from "@/hooks/use-enem-2025";

interface GeneratePdfReportParams {
  coordinator: CoordinatorData;
  dayLabel: string;
  preparationCompletedIds: string[];
  morningCompletedIds: string[];
  closingCompletedIds: string[];
  preparationItems: ChecklistItem[];
  morningItems: ChecklistItem[];
  closingItems: ChecklistItem[];
  occurrences: Occurrence[];
  log: LogEntry[];
}

interface RoomWithProgress {
  id: string;
  code: string;
  label: string;
  completed: number;
  total: number;
  percent: number;
}

/**
 * Gera um PDF completo com:
 * - Dados do coordenador/local
 * - Checklists do coordenador (pré, manhã, encerramento)
 * - Presenças da equipe (Supabase)
 * - Progresso dos checklists das salas (Supabase)
 * - Ocorrências
 * - Histórico de ações do coordenador
 */
export async function generateFullPdfReport({
  coordinator,
  dayLabel,
  preparationCompletedIds,
  morningCompletedIds,
  closingCompletedIds,
  preparationItems,
  morningItems,
  closingItems,
  occurrences,
  log,
}: GeneratePdfReportParams) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const marginLeft = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
  let cursorY = 12;

  const addTitle = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, marginLeft, cursorY);
    cursorY += 6;
  };

  const addSubTitle = (text: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(text, marginLeft, cursorY);
    cursorY += 5;
  };

  const addText = (text: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(text, pageWidth - marginLeft * 2);
    doc.text(lines, marginLeft, cursorY);
    cursorY += lines.length * 4;
  };

  const ensureSpace = (needed: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (cursorY + needed > pageHeight - 12) {
      doc.addPage();
      cursorY = 12;
    }
  };

  const nowStr = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  // Cabeçalho
  addTitle("Relatório Geral - ENEM 2025");
  addText(
    `Documento gerado automaticamente pelo Painel do Coordenador de Local.\nData/Hora de geração: ${nowStr}`,
  );
  cursorY += 2;

  // Seção 1 - Identificação do local
  ensureSpace(24);
  addSubTitle("1. Identificação do Local e Responsável");
  addText(
    `Coordenador(a): ${coordinator.name}\n` +
      `Local de aplicação: ${coordinator.location}\n` +
      `Cidade/Estado: ${coordinator.city} - ${coordinator.state}\n` +
      `Dia do exame: ${dayLabel}\n` +
      `Número de salas: ${coordinator.classrooms}\n` +
      `Participantes previstos: ${coordinator.participants}\n` +
      `Modo simulação: ${coordinator.simulationMode ? "ATIVADO" : "Desativado"}`,
  );

  // Seção 2 - Checklists do Coordenador
  const mapChecklist = (
    title: string,
    items: ChecklistItem[],
    doneIds: string[],
  ) => {
    if (!items.length) return;
    ensureSpace(14);
    addSubTitle(title);

    const rows = items.map((item) => [
      item.id,
      item.text,
      doneIds.includes(item.id) ? "Concluído" : "Pendente",
      item.critical ? "Crítico" : "",
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [["ID", "Item", "Status", "!"]],
      body: rows,
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      headStyles: {
        fillColor: [41, 98, 255],
        textColor: 255,
      },
      columnStyles: {
        0: { cellWidth: 14 },
        2: { cellWidth: 20 },
        3: { cellWidth: 10 },
      },
      margin: { left: marginLeft, right: marginLeft },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 4;
  };

  mapChecklist(
    "2. Checklist - Preparação Prévia do Local",
    preparationItems,
    preparationCompletedIds,
  );
  mapChecklist(
    "3. Checklist - Manhã do Exame",
    morningItems,
    morningCompletedIds,
  );
  mapChecklist(
    "4. Checklist - Encerramento do Dia",
    closingItems,
    closingCompletedIds,
  );

  // Seção 5 - Presença da Equipe (Supabase)
  const {
    teamRows,
    teamPresentCount,
    teamTotalCount,
  } = await fetchTeamPresenceSnapshot();

  ensureSpace(18);
  addSubTitle("5. Equipe - Lista de Presença Consolidada");
  addText(
    `Total de membros cadastrados: ${teamTotalCount}\n` +
      `Presentes em algum dia oficial: ${teamPresentCount}`,
  );

  if (teamRows.length) {
    autoTable(doc, {
      startY: cursorY,
      head: [["Função", "Nome", "CPF", "Sala", "Presença"]],
      body: teamRows,
      styles: {
        fontSize: 6.5,
        cellPadding: 1.2,
      },
      headStyles: {
        fillColor: [3, 155, 229],
        textColor: 255,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        3: { cellWidth: 14 },
        4: { cellWidth: 25 },
      },
      margin: { left: marginLeft, right: marginLeft },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 4;
  }

  // Seção 6 - Progresso de Checklists das Salas (Chefe de Sala)
  const rooms = await fetchRoomsChecklistSnapshot();

  ensureSpace(16);
  addSubTitle("6. Salas - Progresso dos Checklists dos Chefes de Sala");
  if (!rooms.length) {
    addText("Nenhuma sala ou checklist de Chefe de Sala registrado no período.");
  } else {
    const body = rooms.map((r) => [
      r.code,
      r.label,
      `${r.completed}/${r.total}`,
      `${r.percent}%`,
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [["Sala", "Identificação", "Itens concluídos", "Progresso"]],
      body,
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      headStyles: {
        fillColor: [76, 175, 80],
        textColor: 255,
      },
      columnStyles: {
        0: { cellWidth: 16 },
        3: { cellWidth: 22 },
      },
      margin: { left: marginLeft, right: marginLeft },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 4;
  }

  // Seção 7 - Ocorrências
  ensureSpace(16);
  addSubTitle("7. Ocorrências Registradas");
  if (!occurrences.length) {
    addText("Nenhuma ocorrência registrada.");
  } else {
    const occRows = occurrences.map((o, idx) => [
      String(idx + 1),
      o.critical ? "CRÍTICA" : "Normal",
      o.type,
      o.timestamp,
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [["#", "Tipo", "Título", "Horário"]],
      body: occRows,
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      headStyles: {
        fillColor: [244, 67, 54],
        textColor: 255,
      },
      columnStyles: {
        0: { cellWidth: 6 },
        1: { cellWidth: 16 },
        3: { cellWidth: 26 },
      },
      margin: { left: marginLeft, right: marginLeft },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 4;

    const detailStartIdx = 0;
    const detailEndIdx = Math.min(occurrences.length, 12);
    const slice = occurrences.slice(detailStartIdx, detailEndIdx);
    if (slice.length) {
      ensureSpace(10);
      addText(
        "Resumo descritivo das primeiras ocorrências (ver sistema para histórico completo):",
      );
      slice.forEach((o, i) => {
        ensureSpace(8);
        addText(
          `${i + 1}. [${o.critical ? "CRÍTICA" : "Normal"}] ${o.type} - ${o.timestamp}\n` +
            `   ${o.description}`,
        );
      });
    }
  }

  // Seção 8 - Histórico de Ações
  ensureSpace(16);
  addSubTitle("8. Histórico de Ações do Coordenador no Sistema");
  if (!log.length) {
    addText("Não houve registros no histórico interno para este período.");
  } else {
    const limitedLog = log.slice(0, 150);
    const logRows = limitedLog.map((e, idx) => [
      String(idx + 1),
      mapLogCategory(e.category),
      mapLogStatus(e.status),
      e.name,
      e.timestamp,
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [["#", "Categoria", "Status", "Ação", "Horário"]],
      body: logRows,
      styles: {
        fontSize: 6.5,
        cellPadding: 1.2,
      },
      headStyles: {
        fillColor: [96, 125, 139],
        textColor: 255,
      },
      columnStyles: {
        0: { cellWidth: 6 },
        1: { cellWidth: 18 },
        2: { cellWidth: 16 },
        4: { cellWidth: 24 },
      },
      margin: { left: marginLeft, right: marginLeft },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 4;

    if (log.length > limitedLog.length) {
      ensureSpace(6);
      addText(
        `Observação: existem mais ${log.length - limitedLog.length} registros no histórico interno não listados aqui para manter o relatório compacto.`,
      );
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(150);
    doc.text(
      `Relatório ENEM 2025 - Painel do Coordenador · Página ${i}/${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: "center" },
    );
  }

  const safeCity = (coordinator.city || "local").replace(/\s+/g, "_");
  const fileName = `relatorio_enem_${safeCity}_${dayLabel.replace(
    /\s+/g,
    "_",
  )}.pdf`;

  doc.save(fileName);
}

/* ---------- Helpers internos ---------- */

function mapLogCategory(category: string): string {
  if (category === "preparation") return "Preparação";
  if (category === "operational") return "Operacional";
  if (category === "incidents") return "Ocorrências";
  if (category === "closing") return "Encerramento";
  return category;
}

function mapLogStatus(status: string): string {
  if (status === "completed") return "Concluído";
  if (status === "warning") return "Alerta";
  if (status === "failed") return "Falha";
  return status;
}

async function fetchTeamPresenceSnapshot() {
  const days = ["2025-11-09", "2025-11-16"];

  const { data: members, error: membersError } = await supabase
    .from("team_members")
    .select("id, role_group, function_name, name, cpf, room_code");

  if (membersError || !members) {
    return {
      teamRows: [] as string[][],
      teamPresentCount: 0,
      teamTotalCount: 0,
    };
  }

  const memberIds = members.map((m) => m.id);
  if (!memberIds.length) {
    return {
      teamRows: [],
      teamPresentCount: 0,
      teamTotalCount: 0,
    };
  }

  const { data: attendance, error: attError } = await supabase
    .from("team_attendance")
    .select("member_id, date, present")
    .in("date", days)
    .in("member_id", memberIds);

  if (attError) {
    return {
      teamRows: [],
      teamPresentCount: 0,
      teamTotalCount: members.length,
    };
  }

  const presentByMember: Record<string, boolean> = {};
  (attendance || []).forEach((row: any) => {
    if (row.present) {
      presentByMember[row.member_id] = true;
    }
  });

  const rows: string[][] = members.map((m: any) => {
    const sala = m.room_code ? String(m.room_code) : "";
    const presente = presentByMember[m.id]
      ? "Presente em dia oficial"
      : "Não registrado";
    return [m.function_name || "", m.name || "", m.cpf || "", sala, presente];
  });

  const teamPresentCount = Object.values(presentByMember).filter(Boolean).length;

  return {
    teamRows: rows,
    teamPresentCount,
    teamTotalCount: members.length,
  };
}

async function fetchRoomsChecklistSnapshot(): Promise<RoomWithProgress[]> {
  const days = ["2025-11-09", "2025-11-16"];

  const { data: roomsData, error: roomsError } = await supabase
    .from("rooms")
    .select("id, code, name")
    .order("code", { ascending: true });

  if (roomsError || !roomsData || roomsData.length === 0) {
    return [];
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from("checklist_items")
    .select("id")
    .eq("role", "chefe_sala");

  if (itemsError || !itemsData || itemsData.length === 0) {
    return [];
  }

  const totalItems = itemsData.length;

  const { data: statusData, error: statusError } = await supabase
    .from("checklist_status")
    .select("room_id, item_id, checked, date")
    .in("date", days);

  if (statusError || !statusData) {
    return [];
  }

  const grouped: Record<string, { completed: number }> = {};
  (statusData || []).forEach((row: any) => {
    if (!row.checked) return;
    if (!grouped[row.room_id]) grouped[row.room_id] = { completed: 0 };
    grouped[row.room_id].completed += 1;
  });

  const result: RoomWithProgress[] = roomsData.map((room: any) => {
    const g = grouped[room.id];
    const completed = g?.completed || 0;
    const percent =
      totalItems > 0
        ? Math.round((completed / totalItems) * 100)
        : 0;
    return {
      id: room.id,
      code: room.code,
      label: room.name || room.code,
      completed,
      total: totalItems,
      percent,
    };
  });

  return result;
}