import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Room {
  id: string;
  code: string;
  name: string | null;
}

interface ChecklistStatusRow {
  item_id: string;
  checked: boolean;
}

interface RoomWithProgress {
  id: string;
  label: string;
  code: string;
  completed: number;
  total: number;
  percent: number;
}

interface Responsible {
  id: string;
  name: string;
  document?: string | null;
  role: "chefe" | "aplicador";
  roomId: string;
  functionName?: string | null;
}

interface SupervisionarPanelProps {
  onClose?: () => void;
}

/**
 * Painel de supervisão do Coordenador:
 * - Mostra todas as salas com barra de progresso do checklist do Chefe de Sala (dados Supabase).
 * - Ao clicar em uma sala:
 *    - Exibe uma visão compacta dos responsáveis: Chefe(s) e Aplicadores/Auxiliares.
 *    - Permite marcar presença de cada responsável com um checkbox.
 * - Apenas uma sala pode estar "aberta" por vez.
 * - Checklist não é exibido aqui; apenas o progresso agregado.
 */
export const SupervisionarPanel = ({ onClose }: SupervisionarPanelProps) => {
  const [rooms, setRooms] = useState<RoomWithProgress[]>([]);
  const [roomItemsStatus, setRoomItemsStatus] = useState<
    Record<string, ChecklistStatusRow[]>
  >({});
  const [responsiblesByRoom, setResponsiblesByRoom] = useState<
    Record<string, Responsible[]>
  >({});
  const [attendanceByMember, setAttendanceByMember] = useState<
    Record<string, boolean>
  >({});
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [totalChecklistItems, setTotalChecklistItems] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => getTodayISO(), []);

  // Carregar salas, checklist (para progresso), responsáveis e presença inicial
  useEffect(() => {
    let active = true;

    async function loadInitial() {
      setLoading(true);

      // 1) Salas
      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("id, code, name")
        .order("code", { ascending: true });

      if (roomsError || !roomsData || roomsData.length === 0) {
        if (active) resetState();
        return;
      }

      // 2) Total de itens de checklist para Chefe de Sala (para cálculo de %)
      const { data: itemsData, error: itemsError } = await supabase
        .from("checklist_items")
        .select("id")
        .eq("role", "chefe_sala");

      if (itemsError || !itemsData || itemsData.length === 0) {
        if (active) resetState();
        return;
      }

      const total = itemsData.length;
      setTotalChecklistItems(total);

      // 3) Status de hoje (para progresso inicial)
      const { data: statusData, error: statusError } = await supabase
        .from("checklist_status")
        .select("room_id, item_id, checked")
        .eq("date", today);

      if (statusError || !statusData) {
        if (active) {
          resetState();
        }
        return;
      }

      // 4) Responsáveis: chefes de sala
      const { data: chiefsData, error: chiefsError } = await supabase
        .from("room_chiefs")
        .select("id, name, room_id, active, access_token");

      if (chiefsError) {
        if (active) {
          resetState();
        }
        return;
      }

      // 5) Responsáveis: aplicadores/auxiliares (team_members vinculados à sala)
      const { data: teamData, error: teamError } = await supabase
        .from("team_members")
        .select("id, role_group, function_name, name, cpf, room_code");

      if (teamError) {
        if (active) {
          resetState();
        }
        return;
      }

      // 6) Presenças atuais (team_attendance) para hoje
      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("team_attendance")
          .select("member_id, date, present")
          .eq("date", today);

      if (!active) return;

      if (attendanceError) {
        // Se falhar, apenas não pré-carregamos presença
      }

      // Mapa status por sala
      const statusMap: Record<string, ChecklistStatusRow[]> = {};
      (statusData || []).forEach((row: any) => {
        if (!statusMap[row.room_id]) statusMap[row.room_id] = [];
        statusMap[row.room_id].push({
          item_id: row.item_id,
          checked: row.checked,
        });
      });

      // Mapa responsáveis por sala
      const responsiblesMap: Record<string, Responsible[]> = {};
      roomsData.forEach((room: Room) => {
        responsiblesMap[room.id] = [];
      });

      (chiefsData || []).forEach((chief: any) => {
        if (!chief.active) return;
        if (!responsiblesMap[chief.room_id]) {
          responsiblesMap[chief.room_id] = [];
        }
        responsiblesMap[chief.room_id].push({
          id: chief.id,
          name: chief.name,
          document: null,
          role: "chefe",
          roomId: chief.room_id,
        });
      });

      (teamData || []).forEach((member: any) => {
        if (!member.room_code) return;
        const room = roomsData.find(
          (r: any) => r.code === member.room_code,
        );
        if (!room) return;
        if (!responsiblesMap[room.id]) {
          responsiblesMap[room.id] = [];
        }
        responsiblesMap[room.id].push({
          id: member.id,
          name: member.name,
          document: member.cpf,
          role: "aplicador",
          roomId: room.id,
          functionName: member.function_name,
        });
      });

      // Mapa presença por responsável
      const attendanceMap: Record<string, boolean> = {};
      (attendanceData || []).forEach((row: any) => {
        attendanceMap[row.member_id] = !!row.present;
      });

      // Lista final de salas com progresso
      const roomList: RoomWithProgress[] = roomsData.map((room: any) => {
        const label = room.name || room.code;
        const statuses = statusMap[room.id] || [];
        const completed = statuses.filter((s) => s.checked).length;
        const percent =
          total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          id: room.id,
          label,
          code: room.code,
          completed,
          total,
          percent,
        };
      });

      setRooms(roomList);
      setRoomItemsStatus(statusMap);
      setResponsiblesByRoom(responsiblesMap);
      setAttendanceByMember(attendanceMap);
      setLoading(false);
    }

    function resetState() {
      setRooms([]);
      setRoomItemsStatus({});
      setResponsiblesByRoom({});
      setAttendanceByMember({});
      setTotalChecklistItems(0);
      setLoading(false);
    }

    loadInitial();

    return () => {
      active = false;
    };
  }, [today]);

  // Realtime: atualiza progresso com base em checklist_status (sem mostrar itens)
  useEffect(() => {
    if (!totalChecklistItems) return;

    const channel = supabase
      .channel("supervision-room-status")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checklist_status",
          filter: `date=eq.${today}`,
        },
        async (payload) => {
          const newRow: any = payload.new;
          const oldRow: any = payload.old;
          const roomId: string = newRow?.room_id ?? oldRow?.room_id;
          if (!roomId) return;
          await reloadRoomStatus(roomId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalChecklistItems, today]);

  async function reloadRoomStatus(roomId: string) {
    const { data: statusData, error: statusError } = await supabase
      .from("checklist_status")
      .select("item_id, checked")
      .eq("date", today)
      .eq("room_id", roomId);

    if (statusError) return;

    const statuses: ChecklistStatusRow[] = (statusData || []).map(
      (row: any) => ({
        item_id: row.item_id,
        checked: row.checked,
      }),
    );

    setRoomItemsStatus((prev) => ({
      ...prev,
      [roomId]: statuses,
    }));

    setRooms((prev) => {
      if (!totalChecklistItems) return prev;

      const completed = statuses.filter((s) => s.checked).length;
      const percent = Math.round(
        (completed / totalChecklistItems) * 100,
      );

      return prev.map((room) =>
        room.id === roomId
          ? {
              ...room,
              completed,
              total: totalChecklistItems,
              percent,
            }
          : room,
      );
    });
  }

  const selectedRoomResponsibles =
    (selectedRoomId && responsiblesByRoom[selectedRoomId]) || [];

  return (
    <div className="space-y-3 no-x-overflow">
      {/* Cabeçalho */}
      <div className="card-elevated flex items-start gap-3">
        <div className="h-8 w-8 rounded-2xl bg-primary/10 flex items-center justify-center text-lg">
          🕵️
        </div>
        <div className="space-y-0.5">
          <div className="text-xs font-semibold">
            Supervisionar Salas
          </div>
          <p className="text-[10px] text-muted-foreground">
            Acompanhe, em tempo real, o progresso dos checklists dos Chefes de
            Sala e a presença dos responsáveis em cada sala, em uma visão
            compacta e clara.
          </p>
        </div>
      </div>

      {/* Lista de salas + progresso + responsáveis compactos */}
      <div className="card-elevated space-y-1.5">
        <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
          Progresso das salas
        </div>

        {loading ? (
          <div className="text-[9px] text-muted-foreground">
            Carregando salas e progresso...
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-[9px] text-muted-foreground">
            Nenhuma sala cadastrada no Supabase.
          </div>
        ) : (
          <div className="space-y-1.5">
            {rooms.map((room) => {
              const isSelected = room.id === selectedRoomId;
              return (
                <div
                  key={room.id}
                  className={cn(
                    "rounded-2xl border bg-card px-3 py-2 flex flex-col gap-1.5 cursor-pointer transition-colors",
                    isSelected
                      ? "border-primary/70 bg-primary/5 shadow-sm"
                      : "border-border hover:bg-muted/40",
                  )}
                  onClick={() =>
                    setSelectedRoomId(isSelected ? null : room.id)
                  }
                >
                  {/* Linha principal: número/nome da sala + progresso */}
                  <div className="flex items-center gap-2 text-[9px]">
                    <div className="font-semibold truncate">
                      Sala {room.code}
                      {room.label !== room.code && (
                        <span className="ml-1 text-[8px] text-muted-foreground">
                          · {room.label}
                        </span>
                      )}
                    </div>
                    <div className="ml-auto text-muted-foreground">
                      {room.completed}/{room.total} · {room.percent}%
                    </div>
                  </div>

                  {/* Barra de progresso conectada ao checklist do Chefe de Sala */}
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        room.percent >= 80
                          ? "bg-emerald-500"
                          : room.percent >= 40
                          ? "bg-amber-400"
                          : "bg-red-400",
                      )}
                      style={{ width: `${room.percent}%` }}
                    />
                  </div>

                  {/* Detalhes da sala: apenas quando selecionada */}
                  {isSelected && (
                    <div className="mt-1.5 border-t border-border/60 pt-1.5">
                      <ResponsiblesCompactList
                        roomId={room.id}
                        responsibles={selectedRoomResponsibles}
                        attendanceByMember={attendanceByMember}
                        onTogglePresence={handleTogglePresence}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Botão voltar opcional */}
      {onClose && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-full border text-[9px] text-muted-foreground hover:bg-muted"
          >
            Voltar ao painel
          </button>
        </div>
      )}
    </div>
  );

  async function handleTogglePresence(memberId: string, next: boolean) {
    const { error } = await supabase.from("team_attendance").upsert(
      {
        member_id: memberId,
        date: today,
        present: next,
      },
      { onConflict: "member_id,date" },
    );

    if (error) {
      return;
    }

    setAttendanceByMember((prev) => ({
      ...prev,
      [memberId]: next,
    }));
  }
};

function ResponsiblesCompactList({
  roomId,
  responsibles,
  attendanceByMember,
  onTogglePresence,
}: {
  roomId: string;
  responsibles: Responsible[];
  attendanceByMember: Record<string, boolean>;
  onTogglePresence: (memberId: string, next: boolean) => void;
}) {
  const roomResponsibles = responsibles.filter(
    (r) => r.roomId === roomId,
  );

  if (!roomResponsibles.length) {
    return (
      <div className="text-[7px] text-muted-foreground">
        Nenhum responsável vinculado a esta sala no momento.
      </div>
    );
  }

  const chiefs = roomResponsibles.filter((r) => r.role === "chefe");
  const aplicadores = roomResponsibles.filter(
    (r) => r.role === "aplicador",
  );

  return (
    <div className="space-y-0.75">
      <div className="text-[7px] font-semibold text-muted-foreground uppercase tracking-wide">
        Responsáveis na sala
      </div>

      {/* Chefes de sala */}
      {chiefs.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chiefs.map((resp) => {
            const present = !!attendanceByMember[resp.id];
            return (
              <label
                key={resp.id}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[7px] cursor-pointer select-none",
                  present
                    ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                    : "bg-muted border-border text-muted-foreground",
                )}
              >
                <input
                  type="checkbox"
                  className="h-2.5 w-2.5 rounded-sm border border-border accent-emerald-500"
                  checked={present}
                  onChange={(e) =>
                    onTogglePresence(resp.id, e.target.checked)
                  }
                />
                <span className="font-semibold">Chefe</span>
                <span className="truncate max-w-[96px]">
                  {resp.name}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Aplicadores / auxiliares */}
      {aplicadores.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {aplicadores.map((resp) => {
            const present = !!attendanceByMember[resp.id];
            return (
              <label
                key={resp.id}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[7px] cursor-pointer select-none",
                  present
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-muted border-border text-muted-foreground",
                )}
              >
                <input
                  type="checkbox"
                  className="h-2.5 w-2.5 rounded-sm border border-border accent-emerald-500"
                  checked={present}
                  onChange={(e) =>
                    onTogglePresence(resp.id, e.target.checked)
                  }
                />
                <span className="font-semibold">
                  {resp.functionName || "Aplicador"}
                </span>
                <span className="truncate max-w-[96px]">
                  {resp.name}
                </span>
                {resp.document && (
                  <span className="text-[6px] text-muted-foreground">
                    · {resp.document}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getTodayISO(): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}