import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useDayTeamPresence } from "@/hooks/use-day-team-presence";
import { supabase } from "@/integrations/supabase/client";

interface SupervisionarPanelProps {
  onClose?: () => void;
}

const DAY_1 = "2025-11-09";
const DAY_2 = "2025-11-16";

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

export const SupervisionarPanel = ({ onClose }: SupervisionarPanelProps) => {
  const [openDay, setOpenDay] = useState<"d1" | "d2" | null>("d1");

  const {
    loading: loadingD1,
    allowed: allowedD1,
    members: membersD1,
    togglePresent: toggleD1,
  } = useDayTeamPresence(DAY_1);

  const {
    loading: loadingD2,
    allowed: allowedD2,
    members: membersD2,
    togglePresent: toggleD2,
  } = useDayTeamPresence(DAY_2);

  const allAllowed = allowedD1 || allowedD2;

  const day1Complete = useMemo(
    () => membersD1.length > 0 && membersD1.every((m) => m.present),
    [membersD1],
  );
  const day2Complete = useMemo(
    () => membersD2.length > 0 && membersD2.every((m) => m.present),
    [membersD2],
  );

  const { loadingRooms, roomsProgress } = useRoomsChecklistProgress();

  return (
    <div className="space-y-4 no-x-overflow">
      {/* Cabeçalho geral */}
      <div className="rounded-3xl bg-card border border-border/80 px-4 py-4 shadow-md flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
          🕵️
        </div>
        <div className="space-y-1">
          <div className="text-base font-semibold">
            Supervisão Geral do Local
          </div>
          <p className="text-[0.8rem] text-muted-foreground leading-snug">
            Visual premium para acompanhar, em tempo real, presenças da equipe
            e progresso dos checklists em todas as salas.
          </p>
        </div>
      </div>

      {/* Mensagem fora das datas oficiais */}
      {!allAllowed && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-[0.8rem] text-amber-800 shadow-sm">
          O registro consolidado da equipe é liberado automaticamente nos dias
          oficiais (09/11 e 16/11). Antes disso, use apenas para conferências.
        </div>
      )}

      {/* Presença - Dia 1 */}
      <PresenceDayCard
        label="1º Dia · 09/11/2025"
        isOpen={openDay === "d1"}
        onToggle={() => setOpenDay(openDay === "d1" ? null : "d1")}
        loading={loadingD1}
        allowed={allowedD1}
        members={membersD1}
        onToggleMember={toggleD1}
        complete={day1Complete}
      />

      {/* Presença - Dia 2 */}
      <PresenceDayCard
        label="2º Dia · 16/11/2025"
        isOpen={openDay === "d2"}
        onToggle={() => setOpenDay(openDay === "d2" ? null : "d2")}
        loading={loadingD2}
        allowed={allowedD2}
        members={membersD2}
        onToggleMember={toggleD2}
        complete={day2Complete}
      />

      {/* Progresso dos Checklists das Salas */}
      <div className="rounded-3xl bg-card border border-border/85 px-4 py-3.5 shadow-md space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Checklists dos Chefes de Sala
            </div>
            <div className="text-sm font-semibold">
              Progresso por sala em tempo real
            </div>
          </div>
          <span className="text-xl">📊</span>
        </div>
        <p className="text-[0.78rem] text-muted-foreground">
          Visualize rapidamente quais salas estão adiantadas, em atenção ou
          pendentes, com barras de progresso claras.
        </p>

        {loadingRooms ? (
          <div className="text-[0.8rem] text-muted-foreground">
            Carregando salas e progresso...
          </div>
        ) : roomsProgress.length === 0 ? (
          <div className="text-[0.8rem] text-muted-foreground">
            Nenhuma sala ou checklist de Chefe de Sala encontrado no Supabase.
          </div>
        ) : (
          <div className="space-y-1.5">
            {roomsProgress.map((room) => (
              <RoomProgressRow key={room.id} room={room} />
            ))}
          </div>
        )}
      </div>

      {/* Botão voltar */}
      {onClose && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-2xl border border-border bg-card text-[0.8rem] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground shadow-sm"
          >
            ⬅ Voltar ao painel
          </button>
        </div>
      )}
    </div>
  );
};

/* ---------- Presença da equipe por dia ---------- */

interface PresenceDayCardProps {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  loading: boolean;
  allowed: boolean;
  members: ReturnType<typeof useDayTeamPresence>["members"];
  onToggleMember: (memberId: string) => Promise<void>;
  complete: boolean;
}

const PresenceDayCard = ({
  label,
  isOpen,
  onToggle,
  loading,
  allowed,
  members,
  onToggleMember,
  complete,
}: PresenceDayCardProps) => {
  const presentCount = members.filter((m) => m.present).length;

  const handleMarkAll = async () => {
    if (!allowed || loading || members.length === 0) return;
    const toMark = members.filter((m) => !m.present);
    for (const m of toMark) {
      await onToggleMember(m.id);
    }
  };

  const handleUnmarkAll = async () => {
    if (!allowed || loading || members.length === 0) return;
    const toUnmark = members.filter((m) => m.present);
    for (const m of toUnmark) {
      await onToggleMember(m.id);
    }
  };

  return (
    <div className="rounded-3xl bg-card border border-border/85 px-4 py-3.5 shadow-md">
      {/* Cabeçalho do dia */}
      <button
        type="button"
        className="w-full flex items-center gap-3 text-left"
        onClick={onToggle}
      >
        <div className="flex flex-col flex-1">
          <span className="text-[0.9rem] font-semibold">
            {label}
          </span>
          <span className="text-[0.75rem] text-muted-foreground">
            Toque para {isOpen ? "recolher" : "ver"} a presença detalhada.
          </span>
        </div>
        {complete && members.length > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[0.7rem] font-semibold">
            ✅ Equipe completa
          </span>
        )}
        <span
          className={cn(
            "h-6 w-6 flex items-center justify-center rounded-full bg-muted text-[0.9rem] text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        >
          ˅
        </span>
      </button>

      {/* Resumo rápido */}
      <div className="mt-2 flex items-center justify-between text-[0.75rem] text-muted-foreground">
        <span>
          Membros:{" "}
          <span className="font-semibold text-foreground">
            {members.length}
          </span>
        </span>
        <span>
          Presentes:{" "}
          <span className="font-semibold text-emerald-600">
            {presentCount}
          </span>
        </span>
      </div>

      {isOpen && (
        <div className="mt-3 space-y-2">
          {/* Controles Marcar/Desmarcar todos */}
          <div className="flex flex-wrap gap-1.5 justify-end mb-1">
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={!allowed || loading || members.length === 0}
              className={cn(
                "px-3 py-1.5 rounded-full text-[0.72rem] font-semibold border touch-target min-h-[30px]",
                !allowed || loading || members.length === 0
                  ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                  : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-sm",
              )}
            >
              ✅ Marcar todos
            </button>
            <button
              type="button"
              onClick={handleUnmarkAll}
              disabled={!allowed || loading || members.length === 0}
              className={cn(
                "px-3 py-1.5 rounded-full text-[0.72rem] font-semibold border touch-target min-h-[30px]",
                !allowed || loading || members.length === 0
                  ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                  : "bg-red-50 text-red-700 border-red-300 hover:bg-red-100 shadow-sm",
              )}
            >
              ✖ Desmarcar todos
            </button>
          </div>

          {!allowed && (
            <div className="text-[0.72rem] text-muted-foreground">
              Este dia será liberado automaticamente na data oficial da aplicação.
            </div>
          )}

          {loading ? (
            <div className="text-[0.78rem] text-muted-foreground">
              Carregando equipe...
            </div>
          ) : members.length === 0 ? (
            <div className="text-[0.78rem] text-muted-foreground">
              Nenhum membro de equipe cadastrado.
            </div>
          ) : (
            members.map((m) => (
              <MemberRow
                key={m.id}
                memberId={m.id}
                name={m.name}
                cpf={m.cpf}
                functionName={m.functionName}
                roomCode={m.roomCode}
                present={m.present}
                disabled={!allowed}
                onToggle={onToggleMember}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

interface MemberRowProps {
  memberId: string;
  name: string;
  cpf: string | null;
  functionName: string;
  roomCode: string | null;
  present: boolean;
  disabled: boolean;
  onToggle: (memberId: string) => Promise<void>;
}

const MemberRow = ({
  memberId,
  name,
  cpf,
  functionName,
  roomCode,
  present,
  disabled,
  onToggle,
}: MemberRowProps) => {
  const roomLabel = roomCode ? `Sala ${roomCode}` : null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-2xl border bg-card text-[0.75rem] shadow-sm",
        present && "border-emerald-400 bg-emerald-50/90",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="font-semibold text-foreground truncate">
            {functionName}
          </div>
          {roomLabel && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-[0.65rem] text-muted-foreground">
              {roomLabel}
            </span>
          )}
        </div>
        <div className="text-[0.72rem] text-muted-foreground truncate">
          {name}
        </div>
        <div className="text-[0.6rem] text-muted-foreground truncate">
          CPF: {cpf || "não informado"}
        </div>
      </div>
      <button
        type="button"
        onClick={() => !disabled && onToggle(memberId)}
        className={cn(
          "px-3 py-1.5 rounded-full text-[0.72rem] font-semibold border transition-colors touch-target min-h-[30px]",
          disabled
            ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
            : present
            ? "bg-emerald-500 text-white border-emerald-600 shadow-md"
            : "bg-white text-emerald-700 border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 shadow-sm",
        )}
      >
        {present ? "Presente" : "Marcar"}
      </button>
    </div>
  );
};

/* ---------- Progresso dos checklists das salas ---------- */

function useRoomsChecklistProgress() {
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsProgress, setRoomsProgress] = useState<RoomWithProgress[]>([]);
  const [totalChecklistItems, setTotalChecklistItems] = useState(0);
  const [today] = useState<string>(() => getTodayISO());

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      setLoadingRooms(true);

      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("id, code, name")
        .order("code", { ascending: true });

      if (roomsError || !roomsData || roomsData.length === 0) {
        if (active) {
          setRoomsProgress([]);
          setTotalChecklistItems(0);
          setLoadingRooms(false);
        }
        return;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("checklist_items")
        .select("id")
        .eq("role", "chefe_sala");

      if (itemsError || !itemsData || itemsData.length === 0) {
        if (active) {
          setRoomsProgress([]);
          setTotalChecklistItems(0);
          setLoadingRooms(false);
        }
        return;
      }

      const totalItems = itemsData.length;
      setTotalChecklistItems(totalItems);

      const { data: statusData, error: statusError } = await supabase
        .from("checklist_status")
        .select("room_id, item_id, checked")
        .eq("date", today);

      if (statusError || !statusData) {
        if (active) {
          setRoomsProgress([]);
          setLoadingRooms(false);
        }
        return;
      }

      if (!active) return;

      const statusMap: Record<string, ChecklistStatusRow[]> = {};
      (statusData || []).forEach((row: any) => {
        if (!statusMap[row.room_id]) statusMap[row.room_id] = [];
        statusMap[row.room_id].push({
          item_id: row.item_id,
          checked: row.checked,
        });
      });

      const list: RoomWithProgress[] = roomsData.map((room: Room) => {
        const label = room.name || room.code;
        const statuses = statusMap[room.id] || [];
        const completed = statuses.filter((s) => s.checked).length;
        const percent =
          totalItems > 0
            ? Math.round((completed / totalItems) * 100)
            : 0;

        return {
          id: room.id,
          label,
          code: room.code,
          completed,
          total: totalItems,
          percent,
        };
      });

      setRoomsProgress(list);
      setLoadingRooms(false);
    }

    loadInitial();

    return () => {
      active = false;
    };
  }, [today]);

  useEffect(() => {
    if (!totalChecklistItems) return;

    const channel = supabase
      .channel("rooms-checklist-progress")
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
          await recomputeRoom(roomId);
        },
      )
      .subscribe();

    async function recomputeRoom(roomId: string) {
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("id, code, name")
        .eq("id", roomId)
        .limit(1);

      if (roomError || !roomData || roomData.length === 0) return;

      const room = roomData[0] as Room;

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

      setRoomsProgress((prev) => {
        const completed = statuses.filter((s) => s.checked).length;
        const percent =
          totalChecklistItems > 0
            ? Math.round((completed / totalChecklistItems) * 100)
            : 0;

        const updated: RoomWithProgress = {
          id: room.id,
          code: room.code,
          label: room.name || room.code,
          completed,
          total: totalChecklistItems,
          percent,
        };

        const exists = prev.some((r) => r.id === roomId);
        if (!exists) {
          return [...prev, updated].sort((a, b) =>
            a.code.localeCompare(b.code),
          );
        }

        return prev
          .map((r) => (r.id === roomId ? updated : r))
          .sort((a, b) => a.code.localeCompare(b.code));
      });
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [today, totalChecklistItems]);

  return {
    loadingRooms,
    roomsProgress,
  };
}

const RoomProgressRow = ({ room }: { room: RoomWithProgress }) => (
  <div className="rounded-2xl border bg-card px-3.5 py-2.5 flex flex-col gap-1.5 shadow-sm">
    <div className="flex items-center gap-2">
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[0.8rem] font-semibold">
          Sala {room.code}
        </span>
        {room.label !== room.code && (
          <span className="text-[0.7rem] text-muted-foreground truncate">
            {room.label}
          </span>
        )}
      </div>
      <div className="flex flex-col items-end gap-0 leading-tight">
        <span className="text-[0.65rem] text-muted-foreground">
          Checklist Chefe de Sala
        </span>
        <span className="text-[0.8rem] font-semibold text-primary">
          {room.percent}%{" "}
          <span className="text-[0.65rem] text-muted-foreground">
            ({room.completed}/{room.total})
          </span>
        </span>
      </div>
    </div>
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
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
  </div>
);

/* ---------- Utils ---------- */

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