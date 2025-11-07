import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Room {
  id: string;
  code: string;
  name: string | null;
}

interface ChecklistItem {
  id: string;
  titulo: string;
  bloco: string;
  order_index: number;
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
  role: "chefe" | "aplicador";
  roomId: string;
}

interface SupervisionarPanelProps {
  onClose?: () => void;
}

/**
 * Painel de supervisão do Coordenador:
 * - Mostra todas as salas cadastradas.
 * - Exibe barra de progresso do checklist de Chefe de Sala (dados Supabase).
 * - Ao clicar em uma sala, mostra:
 *    - Lista compacta dos responsáveis (chefe e aplicadores) com checkboxes de presença.
 *    - Lista compacta do checklist (itens concluídos/pendentes) com ícones.
 * - Apenas uma sala pode estar "aberta" por vez.
 * - Tudo é somente leitura de checklists; presença é controlada pelo Coordenador.
 */
export const SupervisionarPanel = ({ onClose }: SupervisionarPanelProps) => {
  const [rooms, setRooms] = useState<RoomWithProgress[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomItemsStatus, setRoomItemsStatus] = useState<
    Record<string, ChecklistStatusRow[]>
  >({});
  const [responsiblesByRoom, setResponsiblesByRoom] = useState<
    Record<string, Responsible[]>
  >({});
  const [attendanceByMember, setAttendanceByMember] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => getTodayISO(), []);

  // Carregar salas, checklist, responsáveis e presença inicial
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

      // 2) Itens de checklist (Chefe de Sala)
      const { data: itemsData, error: itemsError } = await supabase
        .from("checklist_items")
        .select("id, bloco, titulo, order_index")
        .eq("role", "chefe_sala")
        .order("order_index", { ascending: true });

      if (itemsError || !itemsData || itemsData.length === 0) {
        if (active) resetState();
        return;
      }

      const total = itemsData.length;

      // 3) Status de hoje (para progresso)
      const { data: statusData, error: statusError } = await supabase
        .from("checklist_status")
        .select("room_id, item_id, checked")
        .eq("date", today);

      if (statusError || !statusData) {
        if (active) {
          initRoomsOnly(roomsData, itemsData, total);
          setLoading(false);
        }
        return;
      }

      // 4) Responsáveis: chefes de sala
      const { data: chiefsData, error: chiefsError } = await supabase
        .from("room_chiefs")
        .select("id, name, room_id, active");

      if (chiefsError) {
        if (active) {
          initRoomsOnly(roomsData, itemsData, total);
          setLoading(false);
        }
        return;
      }

      // 5) Responsáveis: aplicadores (team_members vinculados à sala)
      const { data: teamData, error: teamError } = await supabase
        .from("team_members")
        .select("id, role_group, function_name, name, room_code");

      if (teamError) {
        if (active) {
          initRoomsOnly(roomsData, itemsData, total);
          setLoading(false);
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
        // Se der erro, seguimos sem travar o painel; presenças iniciam vazias
      }

      // Mapa checklist_status por sala
      const statusMap: Record<string, ChecklistStatusRow[]> = {};
      (statusData || []).forEach((row: any) => {
        if (!statusMap[row.room_id]) statusMap[row.room_id] = [];
        statusMap[row.room_id].push({
          item_id: row.item_id,
          checked: row.checked,
        });
      });

      // Mapa de responsáveis por sala
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
          role: "chefe",
          roomId: chief.room_id,
        });
      });

      (teamData || []).forEach((member: any) => {
        if (member.role_group !== "sala" || !member.room_code) return;
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
          role: "aplicador",
          roomId: room.id,
        });
      });

      // Mapa de presença por responsável (team_attendance -> present)
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

      setRoomItemsStatus(statusMap);
      setItems(itemsData as ChecklistItem[]);
      setRooms(roomList);
      setResponsiblesByRoom(responsiblesMap);
      setAttendanceByMember(attendanceMap);
      setLoading(false);
    }

    function resetState() {
      setRooms([]);
      setItems([]);
      setRoomItemsStatus({});
      setResponsiblesByRoom({});
      setAttendanceByMember({});
      setLoading(false);
    }

    function initRoomsOnly(
      roomsData: any[],
      itemsData: any[],
      total: number,
    ) {
      const list: RoomWithProgress[] = roomsData.map((room: any) => ({
        id: room.id,
        label: room.name || room.code,
        code: room.code,
        completed: 0,
        total,
        percent: 0,
      }));
      setRooms(list);
      setItems(itemsData as ChecklistItem[]);
    }

    loadInitial();

    return () => {
      active = false;
    };
  }, [today]);

  // Realtime: atualiza apenas progresso do checklist (responsáveis e presença ficam estáveis o suficiente)
  useEffect(() => {
    if (!items.length) return;

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
  }, [items, today]);

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
      const total = items.length || 0;
      const completed = statuses.filter((s) => s.checked).length;
      const percent =
        total > 0 ? Math.round((completed / total) * 100) : 0;

      return prev.map((room) =>
        room.id === roomId
          ? {
              ...room,
              completed,
              total,
              percent,
            }
          : room,
      );
    });
  }

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;
  const selectedRoomStatus = selectedRoomId
    ? roomItemsStatus[selectedRoomId] || []
    : [];

  const selectedChecklistItems = useMemo(() => {
    if (!selectedRoomId) return [];
    const statusMap = new Map(
      selectedRoomStatus.map((s) => [s.item_id, s.checked]),
    );
    return items.map((item) => ({
      ...item,
      checked: statusMap.get(item.id) || false,
    }));
  }, [items, selectedRoomId, selectedRoomStatus]);

  const selectedResponsibles =
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
            Supervisionar Chefes de Sala
          </div>
          <p className="text-[10px] text-muted-foreground">
            Veja rapidamente quais salas estão avançando, quem são os
            responsáveis e quais itens do checklist já foram cumpridos,
            em uma visão compacta e somente leitura.
          </p>
        </div>
      </div>

      {/* Visão geral das salas */}
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
                  <div className="flex items-center gap-2 text-[9px]">
                    <div className="font-semibold truncate">
                      Sala {room.label}
                    </div>
                    <div className="ml-auto text-muted-foreground">
                      {room.completed}/{room.total} · {room.percent}%
                    </div>
                  </div>
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

                  {isSelected && (
                    <div className="mt-1.5 border-t border-border/60 pt-1.5 space-y-1.5">
                      <ResponsiblesCompactList
                        roomId={room.id}
                        responsibles={selectedResponsibles}
                        attendanceByMember={attendanceByMember}
                        onTogglePresence={handleTogglePresence}
                      />
                      <RoomCompactChecklist
                        items={selectedChecklistItems}
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

  return (
    <div className="space-y-0.5">
      <div className="text-[7px] font-semibold text-muted-foreground uppercase tracking-wide">
        Responsáveis na sala
      </div>
      <div className="flex flex-wrap gap-1.5">
        {roomResponsibles.map((resp) => {
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
              <span className="font-semibold">
                {resp.role === "chefe" ? "Chefe" : "Aplicador"}
              </span>
              <span className="truncate max-w-[96px]">
                {resp.name}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function RoomCompactChecklist({
  items,
}: {
  items: (ChecklistItem & { checked: boolean })[];
}) {
  if (!items.length) {
    return (
      <div className="text-[8px] text-muted-foreground">
        Nenhum item de checklist configurado para Chefes de Sala.
      </div>
    );
  }

  const grouped: Record<string, (ChecklistItem & { checked: boolean })[]> =
    {};
  items.forEach((item) => {
    if (!grouped[item.bloco]) grouped[item.bloco] = [];
    grouped[item.bloco].push(item);
  });

  return (
    <div className="space-y-1">
      <div className="text-[7px] font-semibold text-muted-foreground uppercase tracking-wide">
        Checklist da sala (resumo)
      </div>
      {Object.entries(grouped).map(([bloco, blocoItens]) => (
        <div key={bloco} className="space-y-0.25">
          <div className="text-[7px] font-semibold text-muted-foreground/80">
            {bloco}
          </div>
          {blocoItens.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-1.5 text-[7px]"
            >
              <span
                className={cn(
                  "inline-flex h-3 w-3 items-center justify-center rounded-full border flex-shrink-0",
                  item.checked
                    ? "bg-emerald-500 border-emerald-600"
                    : "bg-red-50 border-red-300",
                )}
              >
                {item.checked ? (
                  <span className="text-[7px] text-white">✓</span>
                ) : (
                  <span className="text-[7px] text-red-500">!</span>
                )}
              </span>
              <span
                className={cn(
                  "truncate",
                  item.checked
                    ? "text-emerald-700"
                    : "text-muted-foreground",
                )}
              >
                {item.id} · {item.titulo}
              </span>
            </div>
          ))}
        </div>
      ))}
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