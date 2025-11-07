import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RoomProgress {
  roomId: string;
  roomLabel: string;
  completed: number;
  total: number;
  percent: number;
}

interface UseRoomProgressRealtimeOptions {
  onItemCompleted?: (room: RoomProgress, itemId: string) => void;
  onRoomCompleted?: (room: RoomProgress) => void;
}

function getTodayISODate(): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now); // YYYY-MM-DD
}

/**
 * Acompanha o progresso das salas baseado em checklist_status para a data de hoje.
 * - Calcula progresso inicial com base no banco.
 * - A cada mudança realtime, recarrega apenas os registros da sala afetada
 *   para garantir contagem exata de itens concluídos.
 */
export function useRoomProgressRealtime(
  options: UseRoomProgressRealtimeOptions = {},
) {
  const [loading, setLoading] = useState(true);
  const [progressByRoom, setProgressByRoom] = useState<Record<string, RoomProgress>>(
    {},
  );
  const [totalChecklistItems, setTotalChecklistItems] = useState(0);
  const today = useRef(getTodayISODate());

  const roomCompletedNotified = useRef<Set<string>>(new Set());
  const roomLabelsRef = useRef<Record<string, string>>({});

  // Carrega estado inicial
  useEffect(() => {
    let active = true;

    async function loadInitial() {
      setLoading(true);

      // Rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("id, code, name");

      if (roomsError || !roomsData) {
        setLoading(false);
        return;
      }

      const labels: Record<string, string> = {};
      roomsData.forEach((r) => {
        labels[r.id] = r.name || r.code;
      });
      roomLabelsRef.current = labels;

      // Checklist items de chefe de sala
      const { data: itemsData, error: itemsError } = await supabase
        .from("checklist_items")
        .select("id")
        .eq("role", "chefe_sala");

      if (itemsError || !itemsData || itemsData.length === 0) {
        setTotalChecklistItems(0);
        setProgressByRoom({});
        setLoading(false);
        return;
      }

      const totalItems = itemsData.length;
      setTotalChecklistItems(totalItems);

      // Status de hoje
      const { data: statusData, error: statusError } = await supabase
        .from("checklist_status")
        .select("room_id, item_id, checked")
        .eq("date", today.current);

      if (statusError || !statusData) {
        setLoading(false);
        return;
      }

      if (!active) return;

      const next: Record<string, RoomProgress> = {};

      roomsData.forEach((room) => {
        const checkedForRoom = statusData.filter(
          (st) => st.room_id === room.id && st.checked,
        ).length;

        const percent =
          totalItems > 0
            ? Math.round((checkedForRoom / totalItems) * 100)
            : 0;

        const roomProgress: RoomProgress = {
          roomId: room.id,
          roomLabel: labels[room.id],
          completed: checkedForRoom,
          total: totalItems,
          percent,
        };

        next[room.id] = roomProgress;

        if (percent === 100) {
          roomCompletedNotified.current.add(room.id);
        }
      });

      setProgressByRoom(next);
      setLoading(false);
    }

    loadInitial();

    return () => {
      active = false;
    };
  }, []);

  // Função auxiliar: recarrega progresso exato de uma sala específica
  async function recomputeRoomProgress(
    roomId: string,
    changedItemId: string | null,
    triggerCallbacks: boolean,
  ) {
    if (!roomId || totalChecklistItems === 0) return;

    const roomLabel =
      roomLabelsRef.current[roomId] || `Sala ${roomId.slice(0, 4)}`;

    const { data: statusData, error: statusError } = await supabase
      .from("checklist_status")
      .select("item_id, checked")
      .eq("date", today.current)
      .eq("room_id", roomId);

    if (statusError) {
      return;
    }

    const completed = (statusData || []).filter((s) => s.checked).length;

    setProgressByRoom((prev) => {
      const percent =
        totalChecklistItems > 0
          ? Math.round((completed / totalChecklistItems) * 100)
          : 0;

      const updated: RoomProgress = {
        roomId,
        roomLabel,
        completed,
        total: totalChecklistItems,
        percent,
      };

      // Callbacks somente se solicitado (em mudanças realtime)
      if (triggerCallbacks && changedItemId) {
        // onItemCompleted: sempre que um item entra como checked,
        // quem decide é quem chamou (via payload).
        if (options.onItemCompleted) {
          options.onItemCompleted(updated, changedItemId);
        }

        // onRoomCompleted: apenas na transição para 100%
        if (
          options.onRoomCompleted &&
          percent === 100 &&
          !roomCompletedNotified.current.has(roomId)
        ) {
          roomCompletedNotified.current.add(roomId);
          options.onRoomCompleted(updated);
        }
      }

      return {
        ...prev,
        [roomId]: updated,
      };
    });
  }

  // Realtime: escuta mudanças na checklist_status e recarrega a sala afetada
  useEffect(() => {
    if (totalChecklistItems === 0) return;

    const channel = supabase
      .channel("room-checklist-status")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checklist_status",
          filter: `date=eq.${today.current}`,
        },
        async (payload) => {
          const newRow: any = payload.new;
          const oldRow: any = payload.old;

          const roomId: string = newRow?.room_id ?? oldRow?.room_id;
          const itemId: string = newRow?.item_id ?? oldRow?.item_id;
          const newChecked: boolean | null =
            "checked" in (newRow || {}) ? newRow.checked : null;
          const oldChecked: boolean | null =
            "checked" in (oldRow || {}) ? oldRow.checked : null;

          if (!roomId || !itemId) return;

          // Só dispara callbacks quando há mudança efetiva de checked
          const changedToChecked =
            newChecked === true && oldChecked !== true;

          const shouldTriggerCallbacks = changedToChecked;

          await recomputeRoomProgress(
            roomId,
            shouldTriggerCallbacks ? itemId : null,
            shouldTriggerCallbacks,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [totalChecklistItems, options.onItemCompleted, options.onRoomCompleted]);

  const roomsProgressList = useMemo(
    () => Object.values(progressByRoom),
    [progressByRoom],
  );

  return {
    loading,
    rooms: roomsProgressList,
    byRoomId: progressByRoom,
    totalChecklistItems,
  };
}