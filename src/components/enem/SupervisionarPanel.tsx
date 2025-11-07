import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { InfoDialog } from "@/components/enem/InfoDialog";

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
  completed: number;
  total: number;
  percent: number;
}

interface SupervisionarPanelProps {
  onClose?: () => void;
}

/**
 * Painel de supervisão do Coordenador:
 * - Mostra todas as salas cadastradas.
 * - Exibe barra de progresso do checklist de Chefe de Sala (dados Supabase).
 * - Ao clicar em uma sala, mostra lista compacta de itens com status:
 *   - Ícone verde pequeno para concluído
 *   - Ícone vermelho discreto para pendente
 * - Apenas uma sala pode estar "aberta" por vez.
 */
export const SupervisionarPanel = ({ onClose }: SupervisionarPanelProps) => {
  const [rooms, setRooms] = useState<RoomWithProgress[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomItemsStatus, setRoomItemsStatus] = useState<
    Record<string, ChecklistStatusRow[]>
  >({});
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => getTodayISO(), []);

  // Carregar salas, itens e progresso inicial
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
        if (active) {
          setRooms([]);
          setItems([]);
          setLoading(false);
        }
        return;
      }

      // 2) Itens de checklist para Chefe de Sala
      const { data: itemsData, error: itemsError } = await supabase
        .from("checklist_items")
        .select("id, bloco, titulo, order_index")
        .eq("role", "chefe_sala")
        .order("order_index", { ascending: true });

      if (itemsError || !itemsData || itemsData.length === 0) {
        if (active) {
          setRooms([]);
          setItems([]);
          setLoading(false);
        }
        return;
      }

      const total = itemsData.length;

      // 3) Status de hoje (para calcular progresso inicial)
      const { data: statusData, error: statusError } = await supabase
        .from("checklist_status")
        .select("room_id, item_id, checked")
        .eq("date", today);

      if (statusError || !statusData) {
        if (active) {
          setRooms([]);
          setItems(itemsData as ChecklistItem[]);
          setLoading(false);
        }
        return;
      }

      if (!active) return;

      // Mapa de status por sala
      const statusMap: Record<string, ChecklistStatusRow[]> = {};
      statusData.forEach((row: any) => {
        if (!statusMap[row.room_id]) statusMap[row.room_id] = [];
        statusMap[row.room_id].push({
          item_id: row.item_id,
          checked: row.checked,
        });
      });

      const roomList: RoomWithProgress[] = roomsData.map((room: any) => {
        const label = room.name || room.code;
        const statuses = statusMap[room.id] || [];
        const completed = statuses.filter((s) => s.checked).length;
        const percent =
          total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          id: room.id,
          label,
          completed,
          total,
          percent,
        };
      });

      setRoomItemsStatus(statusMap);
      setItems(itemsData as ChecklistItem[]);
      setRooms(roomList);
      setLoading(false);
    }

    loadInitial();

    return () => {
      active = false;
    };
  }, [today]);

  // Realtime: sempre que checklist_status mudar, atualiza apenas a sala afetada
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
    // Recarrega status daquela sala
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

    // Atualiza progresso daquela sala
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

  const selectedItems = useMemo(() => {
    if (!selectedRoomId) return [];
    const statusMap = new Map(
      selectedRoomStatus.map((s) => [s.item_id, s.checked]),
    );
    return items.map((item) => ({
      ...item,
      checked: statusMap.get(item.id) || false,
    }));
  }, [items, selectedRoomId, selectedRoomStatus]);

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
            Acompanhe o progresso das salas em tempo real. Clique em uma sala
            para ver uma visão compacta dos itens já cumpridos e pendentes,
            sem editar nada: os próprios Chefes de Sala atualizam seus
            checklists.
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
                    setSelectedRoomId(
                      isSelected ? null : room.id,
                    )
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
                    <div className="mt-1.5 border-t border-border/60 pt-1.5">
                      <RoomCompactChecklist
                        items={selectedItems}
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
};

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

  // Agrupar por bloco para leitura rápida
  const grouped: Record<string, (ChecklistItem & { checked: boolean })[]> =
    {};
  items.forEach((item) => {
    if (!grouped[item.bloco]) grouped[item.bloco] = [];
    grouped[item.bloco].push(item);
  });

  return (
    <div className="space-y-1.5">
      {Object.entries(grouped).map(([bloco, blocoItens]) => (
        <div key={bloco} className="space-y-0.5">
          <div className="text-[7px] font-semibold text-muted-foreground uppercase tracking-wide">
            {bloco}
          </div>
          <div className="space-y-0.25">
            {blocoItens.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-1.5 text-[7px]"
              >
                <span
                  className={cn(
                    "inline-flex h-3 w-3 items-center justify-center rounded-full border",
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
        </div>
      ))}

      <div className="mt-1 text-[7px] text-muted-foreground/80">
        Itens são somente leitura aqui; atualizados diretamente pelos
        Chefes de Sala em seus próprios painéis.
      </div>
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