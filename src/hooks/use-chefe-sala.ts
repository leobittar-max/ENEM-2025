import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

export interface ChefeSalaContext {
  loading: boolean;
  error: string | null;
  roomName: string;
  localName: string | null;
  chiefName: string;
  date: string;
  items: ChecklistItemWithStatus[];
  toggleItem: (itemId: string) => Promise<void>;
}

export interface ChecklistItem {
  id: string;
  bloco: string;
  titulo: string;
  corpo: string;
  fonte_manual: string | null;
  fonte_pagina: number | null;
  order_index: number;
}

export interface ChecklistItemWithStatus extends ChecklistItem {
  checked: boolean;
  updated_at: string | null;
}

interface RoomChiefRecord {
  id: string;
  name: string;
  room_id: string;
  access_token: string;
  active: boolean;
}

interface RoomRecord {
  id: string;
  code: string;
  name: string | null;
}

interface ChecklistStatusRecord {
  item_id: string;
  checked: boolean;
  updated_at: string | null;
}

function getTodaySaoPauloISODate(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now); // YYYY-MM-DD
}

export function useChefeSala(token: string | undefined): ChefeSalaContext {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chief, setChief] = useState<RoomChiefRecord | null>(null);
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [items, setItems] = useState<ChecklistItemWithStatus[]>([]);
  const [date] = useState<string>(() => getTodaySaoPauloISODate());

  useEffect(() => {
    if (!token) {
      setError("Token de acesso inválido.");
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);

      // 1) Encontrar chefe pelo token
      const { data: chiefs, error: chiefError } = await supabase
        .from("room_chiefs")
        .select("id, name, room_id, access_token, active")
        .eq("access_token", token)
        .eq("active", true)
        .limit(1);

      if (chiefError || !chiefs || chiefs.length === 0) {
        setError("Link de acesso inválido ou desativado.");
        setLoading(false);
        return;
      }

      const chiefRec = chiefs[0] as RoomChiefRecord;
      setChief(chiefRec);

      // 2) Buscar sala
      const { data: rooms, error: roomError } = await supabase
        .from("rooms")
        .select("id, code, name")
        .eq("id", chiefRec.room_id)
        .limit(1);

      if (roomError || !rooms || rooms.length === 0) {
        setError("Sala vinculada não encontrada.");
        setLoading(false);
        return;
      }

      const roomRec = rooms[0] as RoomRecord;
      setRoom(roomRec);

      // 3) Buscar itens de checklist para chefe de sala
      const { data: checklist, error: checklistError } = await supabase
        .from("checklist_items")
        .select(
          "id, bloco, titulo, corpo, fonte_manual, fonte_pagina, order_index",
        )
        .eq("role", "chefe_sala")
        .order("order_index", { ascending: true });

      if (checklistError || !checklist) {
        setError("Não foi possível carregar o checklist.");
        setLoading(false);
        return;
      }

      // 4) Buscar status atual desta sala + data
      const { data: status, error: statusError } = await supabase
        .from("checklist_status")
        .select("item_id, checked, updated_at")
        .eq("room_id", chiefRec.room_id)
        .eq("date", date);

      if (statusError) {
        setError("Não foi possível carregar o status do checklist.");
        setLoading(false);
        return;
      }

      const statusMap = new Map<string, ChecklistStatusRecord>();
      (status || []).forEach((s) => {
        statusMap.set(s.item_id, {
          item_id: s.item_id,
          checked: s.checked,
          updated_at: s.updated_at,
        });
      });

      const merged: ChecklistItemWithStatus[] = (checklist || []).map(
        (item) => {
          const st = statusMap.get(item.id);
          return {
            id: item.id,
            bloco: item.bloco,
            titulo: item.titulo,
            corpo: item.corpo,
            fonte_manual: item.fonte_manual,
            fonte_pagina: item.fonte_pagina,
            order_index: item.order_index,
            checked: st?.checked ?? false,
            updated_at: st?.updated_at ?? null,
          };
        },
      );

      setItems(merged);
      setLoading(false);
    }

    load();
  }, [token, date]);

  async function toggleItem(itemId: string) {
    if (!chief || !room) return;
    const target = items.find((i) => i.id === itemId);
    if (!target) return;

    const nextChecked = !target.checked;

    // Otimista no frontend
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              checked: nextChecked,
              updated_at: new Date().toISOString(),
            }
          : i,
      ),
    );

    const { error: upsertError } = await supabase.from("checklist_status").upsert(
      {
        date,
        room_id: room.id,
        room_chief_id: chief.id,
        item_id: itemId,
        checked: nextChecked,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "date,room_id,item_id",
      },
    );

    if (upsertError) {
      showError("Falha ao atualizar item. Tente novamente.");
      // Reverte em caso de erro
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                checked: target.checked,
                updated_at: target.updated_at,
              }
            : i,
        ),
      );
      return;
    }

    if (nextChecked) {
      showSuccess(`Item ${itemId} marcado como concluído.`);
    }
  }

  const context: ChefeSalaContext = useMemo(
    () => ({
      loading,
      error,
      roomName: room ? room.name || room.code : "",
      localName: null,
      chiefName: chief?.name || "",
      date,
      items,
      toggleItem,
    }),
    [loading, error, room, chief, date, items],
  );

  return context;
}