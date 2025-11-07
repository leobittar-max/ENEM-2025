import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

export interface TeamMember {
  id: string;
  role_group: string;
  function_name: string;
  name: string;
  cpf: string | null;
}

export interface PresenceMember {
  id: string;
  name: string;
  cpf: string | null;
  functionName: string;
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

      // Carrega membros
      const { data: teamData, error: teamError } = await supabase
        .from("team_members")
        .select("id, role_group, function_name, name, cpf")
        .order("role_group", { ascending: true })
        .order("function_name", { ascending: true })
        .order("name", { ascending: true });

      if (teamError || !teamData) {
        showError("Não foi possível carregar a equipe.");
        setLoading(false);
        return;
      }

      // Presença do Supabase para a data
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

      // Merge: server tem prioridade; local complementa
      const merged: Record<string, boolean> = { ...localForDay, ...serverMap };

      const list: PresenceMember[] = teamData.map((m: any) => ({
        id: m.id,
        name: m.name,
        cpf: m.cpf,
        functionName: m.function_name,
        present: !!merged[m.id],
      }));

      setMembers(list);

      // Atualiza local com o merge (para esta data)
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

    // Otimista local
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, present: nextPresent } : m,
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
      // Reverte em caso de erro
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, present: !nextPresent } : m,
        ),
      );
      showError("Não foi possível atualizar a presença. Tente novamente.");
      return;
    }

    // Atualiza localStorage
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