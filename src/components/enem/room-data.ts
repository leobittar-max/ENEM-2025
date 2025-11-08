export interface SimpleRoomInfo {
  code: string;
  eventName: string;
  dateLabel: string;
  location: string;
  chiefName: string;
  applicatorName: string;
  expectedParticipants: number;
}

const defaultLocation =
  "Centro de Ensino Paulo Freire – Santos Dumont/MG";

export const simpleRooms: Record<string, SimpleRoomInfo> = {
  "101": {
    code: "101",
    eventName: "ENEM 2025",
    dateLabel: "09/11/2025",
    location: defaultLocation,
    chiefName: "Chefe de Sala 101",
    applicatorName: "Aplicador 101",
    expectedParticipants: 30,
  },
  "102": {
    code: "102",
    eventName: "ENEM 2025",
    dateLabel: "09/11/2025",
    location: defaultLocation,
    chiefName: "Chefe de Sala 102",
    applicatorName: "Aplicador 102",
    expectedParticipants: 30,
  },
  "103": {
    code: "103",
    eventName: "ENEM 2025",
    dateLabel: "09/11/2025",
    location: defaultLocation,
    chiefName: "Chefe de Sala 103",
    applicatorName: "Aplicador 103",
    expectedParticipants: 30,
  },
  // Adicione aqui as demais salas (104, 105, etc.) conforme sua necessidade.
};

export function getSimpleRoom(code: string): SimpleRoomInfo | null {
  const key = (code || "").trim();
  return simpleRooms[key] || null;
}