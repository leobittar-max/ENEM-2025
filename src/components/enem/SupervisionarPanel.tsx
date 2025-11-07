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
  const [openDay, setOpenDay] = useState<"d1" | "d2" | null>(null);

  // Presença da equipe por dia
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

  // Progresso das salas (checklist Chefe de Sala)
  const {
    loadingRooms,
    roomsProgress,
  } = useRoomsChecklistProgress();

  return (
    <div className="space-y-3 no-x-overflow">
      {/* Cabeçalho geral */}
      <div className="card-elevated flex items-start gap-3">
        <div className="h-8 w-8 rounded-2xl bg-primary/10 flex items-center justify-center text-lg">
          🕵️
        </div>
        <div className="space-y-0.5">
          <div className="text-xs md:text-sm font-semibold">
            Supervisionar Salas e Equipe
          </div>
          <p className="text-[10px] md:text-xs text-muted-foreground">
            Veja em uma única tela quem está presente e o progresso dos checklists
            de cada sala, para intervenção rápida durante a aplicação.
          </p>
        </div>
      </div>

      {/* Mensagem fora das datas oficiais */}
      {!allAllowed && (
        <div className="card-elevated bg-muted/60 text-[9px] md:text-xs text-muted-foreground">
          O registro de presença da equipe só estará disponível nos dias oficiais
          de aplicação do ENEM (09/11 e 16/11).
        </div>
      )}

      {/* Presença da Equipe - Dia 1 */}
      <PresenceDayCard
        label="Dia 09/11/2025 · 1º Dia"
        isOpen={openDay === "d1"}
        onToggle={() => setOpenDay(openDay === "d1" ? null : "d1")}
        loading={loadingD1}
        allowed={allowedD1}
        members={membersD1}
        onToggleMember={toggleD1}
        complete={day1Complete}
      />

      {/* Presença da Equipe - Dia 2 */}
      <PresenceDayCard
        label="Dia 16/11/2025 · 2º Dia"
        isOpen={openDay === "d2"}
        onToggle={() => setOpenDay(openDay === "d2" ? null : "d2")}
        loading={loadingD2}
        allowed={allowedD2}
        members={membersD2}
        onToggleMember={toggleD2}
        complete={day2Complete}
      />

      {/* Progresso dos Checklists das Salas */}
      <div className="card-elevated space-y-1.5">
        <div className="text-[9px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Progresso dos checklists das salas
        </div>
        <p className="text-[8px] md:text-[9px] text-muted-foreground">
          Baseado nos itens de checklist dos Chefes de Sala registrados no sistema.
        </p>

        {loadingRooms ? (
          <div className="text-[9px] md:text-xs text-muted-foreground">
            Carregando salas e progresso...
          </div>
        ) : roomsProgress.length === 0 ? (
          <div className="text-[9px] md:text-xs text-muted-foreground">
            Nenhuma sala ou checklist de Chefe de Sala encontrada no Supabase.
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
            className="px-3 py-1.5 rounded-full border text-[9px] md:text-xs text-muted-foreground hover:bg-muted"
          >
            Voltar ao painel
          </button>
        </div>
      )}
    </div>
  );
};

/* ----------------- Presença da equipe por dia ----------------- */

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

  return (
    <div className="rounded-2xl border bg-card px-3 py-2 shadow-sm">
      {/* Cabeçalho do dia */}
      <button
        type="button"
        className="w-full flex items-center gap-2 text-left"
        onClick={onToggle}
      >
        <div className="flex flex-col flex-1">
          <span className="text-[10px] md:text-xs font-semibold">
            {label}
          </span>
          <span className="text-[7px] md:text-[9px] text-muted-foreground">
            Toque para {isOpen ? "recolher" : "ver"} a equipe cadastrada.
          </span>
        </div>
        {complete && members.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[7px] md:text-[9px] font-semibold">
            ✅ Equipe completa
          </span>
        )}
        <span
          className={cn(
            "h-5 w-5 flex items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        >
          ˅
        </span>
      </button>

      {/* Resumo rápido */}
      <div className="mt-1 flex items-center justify-between text-[7px] md:text-[9px] text-muted-foreground">
        <span>
          Membros:{" "}
          <span className="font-semibold">{members.length}</span>
        </span>
        <span>
          Presentes:{" "}
          <span className="font-semibold text-emerald-600">
            {presentCount}
          </span>
        </span>
      </div>

      {/* Lista expandida */}
      {isOpen && (
        <div className="mt-2 space-y-1.5">
          {!allowed && (
            <div className="text-[8px] md:text-[9px] text-muted-foreground">
              O registro deste dia só ficará ativo na data oficial da aplicação.
            </div>
          )}

          {loading ? (
            <div className="text-[8px] md:text-[9px] text-muted-foreground">
              Carregando equipe...
            </div>
          ) : members.length === 0 ? (
            <div className="text-[8px] md:text-[9px] text-muted-foreground">
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
  present: boolean;
  disabled: boolean;
  onToggle: (memberId: string) => Promise<void>;
}

const MemberRow = ({
  memberId,
  name,
  cpf,
  functionName,
  present,
  disabled,
  onToggle,
}: MemberRowProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-2xl border bg-card text-[8px] md:text-[9px]",
        present && "border-emerald-400 bg-emerald-50",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-foreground truncate">
          {functionName} · {name}
        </div>
        <div className="text-[7px] md:text-[8px] text-muted-foreground truncate">
          CPF: {cpf || "não informado"}
        </div>
      </div>
      <button
        type="button"
        onClick={() => !disabled && onToggle(memberId)}
        className={cn(
          "px-2 py-1 rounded-full text-[7px] md:text-[9px] font-semibold border transition-colors touch-target min-h-[28px]",
          disabled
            ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
            : present
            ? "bg-emerald-500 text-white border-emerald-600"
            : "bg-muted text-muted-foreground border-border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400",
        )}
      >
        {present ? "Presente ✅" : "Marcar presença"}
      </button>
    </div>
  );
};

/* ----------------- Progresso dos checklists das salas ----------------- */

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

  // Realtime: atualiza progresso quando checklist_status mudar
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

const RoomProgressRow = ({ room }: { room: RoomWithProgress }) => {
  return (
    <div className="rounded-2xl border bg-card px-3 py-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[9px] md:text-[10px] font-semibold">
            Sala {room.code}
          </span>
          {room.label !== room.code && (
            <span className="text-[7px] md:text-[8px] text-muted-foreground truncate">
              {room.label}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-0 leading-tight">
          <span className="text-[6px] md:text-[8px] text-muted-foreground">
            Checklist Chefe de Sala
          </span>
          <span className="text-[8px] md:text-[10px] font-semibold text-primary">
            {room.percent}%{" "}
            <span className="text-[6px] md:text-[8px] text-muted-foreground">
              ({room.completed}/{room.total})
            </span>
          </span>
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
    </div>
  );
};

/* ----------------- Utils ----------------- */

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