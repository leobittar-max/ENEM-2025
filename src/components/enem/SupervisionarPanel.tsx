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
 * - Lista salas com barra de progresso (checklist Chefe de Sala).
 * - Ao expandir uma sala:
 *    - Mostra cabeçalho compacto.
 *    - Mostra responsáveis em lista simples com checkbox de presença.
 * - Apenas uma sala aberta por vez.
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
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    null,
  );
  const [totalChecklistItems, setTotalChecklistItems] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => getTodayISO(), []);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      setLoading(true);

      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("id, code, name")
        .order("code", { ascending: true });

      if (roomsError || !roomsData || roomsData.length === 0) {
        if (active) resetState();
        return;
      }

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

      const { data: statusData, error: statusError } = await supabase
        .from("checklist_status")
        .select("room_id, item_id, checked")
        .eq("date", today);

      if (statusError || !statusData) {
        if (active) resetState();
        return;
      }

      const { data: chiefsData, error: chiefsError } = await supabase
        .from("room_chiefs")
        .select("id, name, room_id, active");

      if (chiefsError) {
        if (active) resetState();
        return;
      }

      const { data: teamData, error: teamError } = await supabase
        .from("team_members")
        .select("id, role_group, function_name, name, cpf, room_code");

      if (teamError) {
        if (active) resetState();
        return;
      }

      const { data: attendanceData } = await supabase
        .from("team_attendance")
        .select("member_id, date, present")
        .eq("date", today);

      if (!active) return;

      // Status por sala
      const statusMap: Record<string, ChecklistStatusRow[]> = {};
      (statusData || []).forEach((row: any) => {
        if (!statusMap[row.room_id]) statusMap[row.room_id] = [];
        statusMap[row.room_id].push({
          item_id: row.item_id,
          checked: row.checked,
        });
      });

      // Responsáveis por sala
      const responsiblesMap: Record<string, Responsible[]> = {};
      roomsData.forEach((room: Room) => {
        responsiblesMap[room.id] = [];
      });

      (chiefsData || []).forEach((chief: any) => {
        if (!chief.active) return;
        const roomId = chief.room_id;
        if (!responsiblesMap[roomId]) responsiblesMap[roomId] = [];
        responsiblesMap[roomId].push({
          id: chief.id,
          name: chief.name,
          role: "chefe",
          roomId,
        });
      });

      (teamData || []).forEach((member: any) => {
        if (!member.room_code) return;
        const room = roomsData.find(
          (r: any) => r.code === member.room_code,
        );
        if (!room) return;
        if (!responsiblesMap[room.id]) responsiblesMap[room.id] = [];
        responsiblesMap[room.id].push({
          id: member.id,
          name: member.name,
          document: member.cpf,
          role: "aplicador",
          roomId: room.id,
          functionName: member.function_name,
        });
      });

      // Presenças
      const attendanceMap: Record<string, boolean> = {};
      (attendanceData || []).forEach((row: any) => {
        attendanceMap[row.member_id] = !!row.present;
      });

      // Salas com progresso
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

  // Realtime para progresso
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
            Acompanhe o avanço dos checklists dos Chefes de Sala e marque
            rapidamente quem está presente em cada sala, em um layout
            otimizado para celular.
          </p>
        </div>
      </div>

      {/* Lista de salas */}
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
              const responsibles = responsiblesByRoom[room.id] || [];
              const presentCount = responsibles.filter(
                (r) => attendanceByMember[r.id],
              ).length;

              return (
                <div
                  key={room.id}
                  className={cn(
                    "rounded-2xl border bg-card px-3 py-2 flex flex-col gap-1.5 transition-colors",
                    isSelected
                      ? "border-primary/70 bg-primary/5 shadow-sm"
                      : "border-border hover:bg-muted/40 cursor-pointer",
                  )}
                  onClick={() =>
                    setSelectedRoomId(
                      isSelected ? null : room.id,
                    )
                  }
                >
                  {/* Cabeçalho do card da sala */}
                  <div className="flex items-center gap-2 text-[9px]">
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold">
                        Sala {room.code}
                      </span>
                      {room.label !== room.code && (
                        <span className="text-[7px] text-muted-foreground truncate">
                          {room.label}
                        </span>
                      )}
                    </div>
                    <div className="ml-auto flex flex-col items-end gap-0 leading-tight">
                      <span className="text-[8px] text-muted-foreground">
                        Checklist
                      </span>
                      <span className="text-[9px] font-semibold text-primary">
                        {room.percent}%{" "}
                        <span className="text-[7px] text-muted-foreground">
                          ({room.completed}/{room.total})
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Barra de progresso */}
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

                  {/* Resumo rápidos */}
                  <div className="flex items-center gap-2 text-[7px] text-muted-foreground">
                    <span>
                      Resp.:{" "}
                      <span className="font-semibold">
                        {responsibles.length}
                      </span>
                    </span>
                    <span className="text-[6px] text-muted-foreground/80">
                      {presentCount} presentes
                    </span>
                    <span className="ml-auto text-[6px] text-muted-foreground/70">
                      Toque para ver detalhes
                    </span>
                  </div>

                  {/* Detalhe da sala: lista de responsáveis */}
                  {isSelected && (
                    <div className="mt-1.5 border-t border-border/60 pt-1.5">
                      <RoomDetailHeader
                        room={room}
                        total={responsibles.length}
                        present={presentCount}
                      />
                      <ResponsiblesList
                        roomId={room.id}
                        responsibles={responsibles}
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

      {/* Voltar */}
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

function RoomDetailHeader({
  room,
  total,
  present,
}: {
  room: RoomWithProgress;
  total: number;
  present: number;
}) {
  return (
    <div className="flex items-center gap-2 text-[7px] mb-1">
      <div className="flex flex-col">
        <span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide">
          Sala selecionada
        </span>
        <span className="text-[9px] font-semibold text-foreground">
          {room.code}
          {room.label !== room.code && (
            <span className="text-[7px] text-muted-foreground">
              {" "}
              · {room.label}
            </span>
          )}
        </span>
      </div>
      <div className="ml-auto flex flex-col items-end gap-0.5">
        <span className="text-[7px] text-muted-foreground">
          Responsáveis presentes
        </span>
        <span className="text-[9px] font-semibold text-emerald-600">
          {present}/{total}
        </span>
      </div>
    </div>
  );
}

function ResponsiblesList({
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
        Nenhum responsável vinculado a esta sala.
      </div>
    );
  }

  const chiefs = roomResponsibles.filter((r) => r.role === "chefe");
  const aplicadores = roomResponsibles.filter(
    (r) => r.role === "aplicador",
  );

  return (
    <div className="space-y-0.75">
      {chiefs.length > 0 && (
        <div className="space-y-0.25">
          <div className="text-[7px] font-semibold text-muted-foreground uppercase tracking-wide">
            Chefes de Sala
          </div>
          <ul className="space-y-0.5">
            {chiefs.map((resp) => {
              const present = !!attendanceByMember[resp.id];
              return (
                <li
                  key={resp.id}
                  className="flex items-center gap-2 px-1.5 py-1 rounded-lg bg-muted/40"
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border border-border accent-emerald-500"
                    checked={present}
                    onChange={(e) =>
                      onTogglePresence(resp.id, e.target.checked)
                    }
                  />
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="text-[8px] font-semibold text-foreground truncate">
                      {resp.name}
                    </span>
                    <span className="text-[6px] text-muted-foreground">
                      Chefe de Sala
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {aplicadores.length > 0 && (
        <div className="space-y-0.25">
          <div className="text-[7px] font-semibold text-muted-foreground uppercase tracking-wide">
            Aplicadores e Auxiliares
          </div>
          <ul className="space-y-0.5">
            {aplicadores.map((resp) => {
              const present = !!attendanceByMember[resp.id];
              return (
                <li
                  key={resp.id}
                  className="flex items-center gap-2 px-1.5 py-1 rounded-lg bg-muted/20"
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border border-border accent-emerald-500"
                    checked={present}
                    onChange={(e) =>
                      onTogglePresence(resp.id, e.target.checked)
                    }
                  />
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="text-[8px] font-semibold text-foreground truncate">
                      {resp.functionName || "Aplicador"} · {resp.name}
                    </span>
                    <span className="text-[6px] text-muted-foreground truncate">
                      {resp.document || "Documento não informado"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
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