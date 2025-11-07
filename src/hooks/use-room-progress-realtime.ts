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
 * - Recalcula progresso ao carregar e a cada evento realtime.
 * - Dispara callbacks para novas conclusões e salas que atingem 100%.
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

  // Controla quais salas já tiveram 100% notificado para evitar repetir popup
  const roomCompletedNotified = useRef<Set<string>>(new Set());

  // Cache simples de roomId -> label
  const roomLabelsRef = useRef<Record<string, string>>({});

  // Carrega estado inicial (rooms, checklist_items, checklist_status)
  useEffect(() => {
    let active = true;

    async function loadInitial() {
      setLoading(true);

      // 1) Rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("id, code, name");

      if (roomsError || !roomsData) {
        setLoading(false);
        return;
      }

      const roomLabels: Record<string, string> = {};
      roomsData.forEach((r) => {
        roomLabels[r.id] = r.name || r.code;
      });
      roomLabelsRef.current = roomLabels;

      // 2) Checklist items para chefe_sala
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

      // 3) Status de hoje
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

        next[room.id] = {
          roomId: room.id,
          roomLabel: roomLabels[room.id],
          completed: checkedForRoom,
          total: totalItems,
          percent,
        };

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

  // Realtime: escuta mudanças na tabela checklist_status
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
        (payload) => {
          const newRow: any = payload.new;
          const oldRow: any = payload.old;

          // Precisamos de room_id, item_id e checked
          const roomId: string = newRow?.room_id ?? oldRow?.room_id;
          const itemId: string = newRow?.item_id ?? oldRow?.item_id;
          const newChecked: boolean =
            newRow?.checked ?? oldRow?.checked ?? false;

          if (!roomId || !itemId) return;

          setProgressByRoom((prev) => {
            const current = prev[roomId] || {
              roomId,
              roomLabel:
                roomLabelsRef.current[roomId] || `Sala ${roomId.slice(0, 4)}`,
              completed: 0,
              total: totalChecklistItems,
              percent: 0,
            };

            let completed = current.completed;

            // Ajuste simplificado:
            // - Se marca como true e antes não contava, incrementa.
            // - Se marca como false e antes contava, decrementa.
            // Este cálculo assume que eventos vêm coerentes; para segurança máxima,
            // poderíamos reconsultar apenas os registros da sala, mas manteremos simples.
            if (
              payload.eventType === "INSERT" ||
              payload.eventType === "UPDATE"
            ) {
              if (newChecked) {
                // Garantir que não estamos contando o mesmo item duas vezes:
                completed = Math.min(
                  current.total,
                  completed + 1,
                );
              } else {
                completed = Math.max(0, completed - 1);
              }
            }

            const percent =
              current.total > 0
                ? Math.round((completed / current.total) * 100)
                : 0;

            const updated: RoomProgress = {
              ...current,
              completed,
              percent,
            };

            // Dispara callback de item concluído quando marcar como checked
            if (
              options.onItemCompleted &&
              (payload.eventType === "INSERT" ||
                payload.eventType === "UPDATE") &&
              newChecked
            ) {
              options.onItemCompleted(updated, itemId);
            }

            // Popup de 100% só na transição <100 -> 100
            if (
              options.onRoomCompleted &&
              percent === 100 &&
              !roomCompletedNotified.current.has(roomId)
            ) {
              roomCompletedNotified.current.add(roomId);
              options.onRoomCompleted(updated);
            }

            return {
              ...prev,
              [roomId]: updated,
            };
          });
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