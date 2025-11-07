import { useEffect, useState } from "react";
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

export interface TeamAttendanceRow {
  member_id: string;
  date: string;
  expected_time: string | null;
  check_in_time: string | null;
  present: boolean;
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

export function useTeamAttendance() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [attendance, setAttendance] = useState<Record<string, TeamAttendanceRow>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [date] = useState<string>(() => getTodayISO());

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: membersData, error: membersError } = await supabase
        .from("team_members")
        .select(
          "id, role_group, function_name, name, cpf, room_code",
        )
        .order("role_group", { ascending: true })
        .order("function_name", { ascending: true })
        .order("name", { ascending: true });

      if (membersError || !membersData) {
        showError("Não foi possível carregar a equipe.");
        setLoading(false);
        return;
      }

      setMembers(membersData as TeamMember[]);

      const memberIds = membersData.map((m) => m.id);
      if (memberIds.length === 0) {
        setAttendance({});
        setLoading(false);
        return;
      }

      const { data: attData, error: attError } = await supabase
        .from("team_attendance")
        .select(
          "member_id, date, expected_time, check_in_time, present",
        )
        .eq("date", date)
        .in("member_id", memberIds);

      if (attError) {
        showError("Não foi possível carregar presenças.");
        setLoading(false);
        return;
      }

      const map: Record<string, TeamAttendanceRow> = {};
      (attData || []).forEach((row) => {
        map[row.member_id] = {
          member_id: row.member_id,
          date: row.date,
          expected_time: row.expected_time,
          check_in_time: row.check_in_time,
          present: row.present,
        };
      });
      setAttendance(map);

      setLoading(false);
    }

    load();
  }, [date]);

  async function markPresent(memberId: string) {
    const now = new Date();
    const nowISO = now.toISOString();

    const { error } = await supabase.from("team_attendance").upsert(
      {
        member_id: memberId,
        date,
        present: true,
        check_in_time: nowISO,
      },
      { onConflict: "member_id,date" },
    );

    if (error) {
      showError("Erro ao registrar presença.");
      return;
    }

    setAttendance((prev) => ({
      ...prev,
      [memberId]: {
        member_id: memberId,
        date,
        present: true,
        check_in_time: nowISO,
        expected_time: prev[memberId]?.expected_time || null,
      },
    }));

    showSuccess("Presença registrada.");
  }

  async function setExpectedTime(memberId: string, time: string) {
    const { error } = await supabase.from("team_attendance").upsert(
      {
        member_id: memberId,
        date,
        expected_time: time,
      },
      { onConflict: "member_id,date" },
    );

    if (error) {
      showError("Erro ao ajustar horário previsto.");
      return;
    }

    setAttendance((prev) => ({
      ...prev,
      [memberId]: {
        member_id: memberId,
        date,
        expected_time: time,
        check_in_time: prev[memberId]?.check_in_time || null,
        present: prev[memberId]?.present || false,
      },
    }));
  }

  return {
    loading,
    date,
    members,
    attendance,
    markPresent,
    setExpectedTime,
  };
}