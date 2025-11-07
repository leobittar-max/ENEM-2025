import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

export interface TeamMember {
  id: string;
  role_group: string;
  function_name: string;
  name: string;
  cpf: string | null;
  room_code: string | null;
}

export interface PresenceMember {
  id: string;
  name: string;
  cpf: string | null;
  functionName: string;
  roomCode: string | null;
  present: boolean;
}

interface UseDayTeamPresenceResult {
  loading: boolean;
  allowed: boolean;
  members: PresenceMember[];
  togglePresent: (memberId: string) => Promise<void>;
}

const STORAGE_KEY = "enem2025_team_presence_v1";
const OFFICIAL_DAYS = ["2025-11-09", "2025-11-16"];

function loadLocal(): Record<string, Record<string, boolean>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Record<string, boolean>>;
  } catch {
    return {};
  }
}

function saveLocal(data: Record<string, Record<string, boolean>>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function sortMembersForSupervision(list: PresenceMember[]): PresenceMember[] {
  const withRoom = list.filter((m) => !!m.roomCode);
  const withoutRoom = list.filter((m) => !m.roomCode);

  // Ordena os que têm sala:
  // 1) por código da sala (alfanumérico)
  // 2) por função (para aproximar chefe/fiscal/aplicador)
  // 3) por nome
  const orderByFunction = (fn: string) => {
    const f = fn.toLowerCase();
    if (f.includes("chefe")) return 0;
    if (f.includes("fiscal")) return 1;
    if (f.includes("aplicador")) return 2;
    if (f.includes("apoio")) return 3;
    return 4;
  };

  withRoom.sort((a, b) => {
    const roomA = (a.roomCode || "").toString();
    const roomB = (b.roomCode || "").toString();
    if (roomA !== roomB) {
      return roomA.localeCompare(roomB, "pt-BR", { numeric: true });
    }
    const funcDiff =
      orderByFunction(a.functionName) - orderByFunction(b.functionName);
    if (funcDiff !== 0) return funcDiff;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  // Os que não têm sala ficam depois, ordenados por função e nome
  withoutRoom.sort((a, b) => {
    const fA = a.functionName.toLowerCase();
    const fB = b.functionName.toLowerCase();
    if (fA !== fB) return fA.localeCompare(fB, "pt-BR");
    return a.name.localeCompare(b.name, "pt-BR");
  });

  return [...withRoom, ...withoutRoom];
}

export function useDayTeamPresence(date: string): UseDayTeamPresenceResult {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [localMap, setLocalMap] = useState<
    Record<string, Record<string, boolean>>
  >(() => loadLocal());

  const allowed = useMemo(
    () => OFFICIAL_DAYS.includes(date),
    [date],
  );

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: teamData, error: teamError } = await supabase
        .from("team_members")
        .select("id, role_group, function_name, name, cpf, room_code")
        .order("role_group", { ascending: true })
        .order("function_name", { ascending: true })
        .order("name", { ascending: true });

      if (teamError || !teamData) {
        showError("Não foi possível carregar a equipe.");
        setLoading(false);
        return;
      }

      const { data: attData, error: attError } = await supabase
        .from("team_attendance")
        .select("member_id, date, present")
        .eq("date", date);

      if (attError) {
        showError("Não foi possível carregar as presenças.");
      }

      const serverMap: Record<string, boolean> = {};
      (attData || []).forEach((row: any) => {
        serverMap[row.member_id] = !!row.present;
      });

      const localForDay = localMap[date] || {};
      const merged: Record<string, boolean> = { ...localForDay, ...serverMap };

      const rawList: PresenceMember[] = (teamData as TeamMember[]).map(
        (m) => ({
          id: m.id,
          name: m.name,
          cpf: m.cpf,
          functionName: m.function_name,
          roomCode: m.room_code,
          present: !!merged[m.id],
        }),
      );

      const sorted = sortMembersForSupervision(rawList);
      setMembers(sorted);

      const nextLocal = {
        ...localMap,
        [date]: {
          ...(localMap[date] || {}),
          ...merged,
        },
      };
      setLocalMap(nextLocal);
      saveLocal(nextLocal);

      setLoading(false);
    }

    if (!allowed) {
      setMembers([]);
      setLoading(false);
      return;
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, allowed]);

  async function togglePresent(memberId: string) {
    if (!allowed) {
      showError(
        "O registro de presença só está disponível nos dias oficiais do ENEM.",
      );
      return;
    }

    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const nextPresent = !member.present;

    setMembers((prev) =>
      sortMembersForSupervision(
        prev.map((m) =>
          m.id === memberId ? { ...m, present: nextPresent } : m,
        ),
      ),
    );

    const { error } = await supabase.from("team_attendance").upsert(
      {
        member_id: memberId,
        date,
        present: nextPresent,
      },
      { onConflict: "member_id,date" },
    );

    if (error) {
      setMembers((prev) =>
        sortMembersForSupervision(
          prev.map((m) =>
            m.id === memberId ? { ...m, present: !nextPresent } : m,
          ),
        ),
      );
      showError("Não foi possível atualizar a presença. Tente novamente.");
      return;
    }

    setLocalMap((prev) => {
      const next = {
        ...prev,
        [date]: {
          ...(prev[date] || {}),
          [memberId]: nextPresent,
        },
      };
      saveLocal(next);
      return next;
    });

    if (nextPresent) {
      showSuccess(`${member.name} marcado como presente.`);
    }
  }

  return {
    loading,
    allowed,
    members,
    togglePresent,
  };
}