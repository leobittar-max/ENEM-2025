import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useDayTeamPresence } from "@/hooks/use-day-team-presence";

interface SupervisionarPanelProps {
  onClose?: () => void;
}

const DAY_1 = "2025-11-09";
const DAY_2 = "2025-11-16";

export const SupervisionarPanel = ({ onClose }: SupervisionarPanelProps) => {
  const [openDay, setOpenDay] = useState<"d1" | "d2" | null>(null);

  const { loading: loadingD1, allowed: allowedD1, members: membersD1, togglePresent: toggleD1 } =
    useDayTeamPresence(DAY_1);
  const { loading: loadingD2, allowed: allowedD2, members: membersD2, togglePresent: toggleD2 } =
    useDayTeamPresence(DAY_2);

  const allAllowed = allowedD1 || allowedD2;

  const day1Complete = useMemo(
    () => membersD1.length > 0 && membersD1.every((m) => m.present),
    [membersD1],
  );
  const day2Complete = useMemo(
    () => membersD2.length > 0 && membersD2.every((m) => m.present),
    [membersD2],
  );

  return (
    <div className="space-y-3 no-x-overflow">
      {/* Cabeçalho */}
      <div className="card-elevated flex items-start gap-3">
        <div className="h-8 w-8 rounded-2xl bg-primary/10 flex items-center justify-center text-lg">
          🕵️
        </div>
        <div className="space-y-0.5">
          <div className="text-xs md:text-sm font-semibold">
            Supervisionar Salas e Equipe
          </div>
          <p className="text-[10px] md:text-xs text-muted-foreground">
            Use esta aba para controlar rapidamente a presença da equipe nos dias oficiais do ENEM.
          </p>
        </div>
      </div>

      {/* Mensagem fora das datas */}
      {!allAllowed && (
        <div className="card-elevated bg-muted/60 text-[9px] md:text-xs text-muted-foreground">
          O registro de presença da equipe só estará disponível nos dias oficiais
          de aplicação do ENEM (09/11 e 16/11).
        </div>
      )}

      {/* Card Presença Dia 1 */}
      <PresenceDayCard
        label="Dia 09/11/2025 · 1º Dia"
        dayKey="d1"
        isOpen={openDay === "d1"}
        onToggle={() => setOpenDay(openDay === "d1" ? null : "d1")}
        loading={loadingD1}
        allowed={allowedD1}
        members={membersD1}
        onToggleMember={toggleD1}
        complete={day1Complete}
      />

      {/* Card Presença Dia 2 */}
      <PresenceDayCard
        label="Dia 16/11/2025 · 2º Dia"
        dayKey="d2"
        isOpen={openDay === "d2"}
        onToggle={() => setOpenDay(openDay === "d2" ? null : "d2")}
        loading={loadingD2}
        allowed={allowedD2}
        members={membersD2}
        onToggleMember={toggleD2}
        complete={day2Complete}
      />

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

interface PresenceDayCardProps {
  label: string;
  dayKey: "d1" | "d2";
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
      {/* Cabeçalho dia */}
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

      {/* Resumo */}
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

      {/* Conteúdo expandido */}
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