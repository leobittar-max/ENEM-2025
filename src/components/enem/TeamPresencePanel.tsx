import { useTeamAttendance } from "@/hooks/use-team-attendance";
import { cn } from "@/lib/utils";

export const TeamPresencePanel = () => {
  const {
    loading,
    date,
    members,
    attendance,
    markPresent,
    setExpectedTime,
  } = useTeamAttendance();

  if (loading) {
    return (
      <div className="card-elevated text-[10px] text-muted-foreground">
        Carregando equipe e presenças...
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="card-elevated text-[10px] text-muted-foreground">
        Nenhum membro de equipe cadastrado no Supabase.
      </div>
    );
  }

  const grouped = {
    coordenacao: members.filter((m) => m.role_group === "coordenacao"),
    sala: members.filter((m) => m.role_group === "sala"),
  };

  return (
    <div className="space-y-2">
      <div className="card-elevated flex items-start justify-between gap-2">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            Presença da equipe
          </div>
          <div className="text-xs font-semibold">
            Data: {formatDate(date)}
          </div>
          <p className="text-[9px] text-muted-foreground">
            Registre quem chegou e em qual horário. Ideal para conferência
            de pontualidade e composição mínima do local.
          </p>
        </div>
      </div>

      <SectionTitle>Coordenação</SectionTitle>
      <div className="space-y-1.5">
        {grouped.coordenacao.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            att={attendance[m.id]}
            onMarkPresent={() => markPresent(m.id)}
            onSetExpectedTime={(t) => setExpectedTime(m.id, t)}
          />
        ))}
      </div>

      <SectionTitle>Salas (Aplicadores e apoio)</SectionTitle>
      <div className="space-y-1.5">
        {grouped.sala.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            att={attendance[m.id]}
            onMarkPresent={() => markPresent(m.id)}
            onSetExpectedTime={(t) => setExpectedTime(m.id, t)}
          />
        ))}
      </div>
    </div>
  );
};

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function MemberRow({
  member,
  att,
  onMarkPresent,
  onSetExpectedTime,
}: {
  member: {
    id: string;
    role_group: string;
    function_name: string;
    name: string;
    room_code: string | null;
  };
  att?: {
    expected_time: string | null;
    check_in_time: string | null;
    present: boolean;
  };
  onMarkPresent: () => void;
  onSetExpectedTime: (time: string) => void;
}) {
  const present = att?.present;
  const expected = att?.expected_time || "";
  const checkIn = att?.check_in_time
    ? formatTime(att.check_in_time)
    : "";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border px-3 py-2 bg-card",
        present && "border-emerald-400/70 bg-emerald-50/60",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="text-[9px] font-semibold text-foreground truncate">
            {member.function_name} · {member.name}
          </div>
          {member.room_code && (
            <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              Sala {member.room_code}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[7px] text-muted-foreground">
          <span>
            Previsto:
            <input
              type="time"
              value={expected}
              onChange={(e) => onSetExpectedTime(e.target.value)}
              className="ml-1 h-6 px-1 py-0 border rounded-md text-[8px]"
            />
          </span>
          <span>
            Check-in:{" "}
            {checkIn || (
              <span className="italic text-red-500">
                não registrado
              </span>
            )}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onMarkPresent}
        className={cn(
          "px-2 py-1 rounded-full text-[8px] font-semibold border",
          present
            ? "bg-emerald-500 text-white border-emerald-600"
            : "bg-muted text-muted-foreground border-border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400",
        )}
      >
        {present ? "Presente" : "Marcar presença"}
      </button>
    </div>
  );
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}