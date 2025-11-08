import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getSimpleRoom } from "@/components/enem/room-data";
import {
  roomChecklistItems,
  RoomChecklistItem,
} from "@/components/enem/room-checklist-data";
import { InfoDialog } from "@/components/enem/InfoDialog";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "enem2025_room_checklist_v1";

function buildStorageKey(roomCode: string) {
  return `${STORAGE_PREFIX}_${roomCode}`;
}

function loadChecked(roomCode: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(buildStorageKey(roomCode));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function saveChecked(roomCode: string, data: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(buildStorageKey(roomCode), JSON.stringify(data));
}

const RoomChecklistPage = () => {
  const params = useParams();
  const roomCode = (params.roomCode || "").trim();

  const room = useMemo(() => getSimpleRoom(roomCode), [roomCode]);

  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Carrega estado salvo localmente
  useEffect(() => {
    if (!roomCode) return;
    setChecked(loadChecked(roomCode));
  }, [roomCode]);

  // Ordena: pendentes em cima, concluídos embaixo (não interfere nos dados)
  const sortedItems: RoomChecklistItem[] = useMemo(() => {
    const pending: RoomChecklistItem[] = [];
    const done: RoomChecklistItem[] = [];
    roomChecklistItems.forEach((item) => {
      if (checked[item.id]) {
        done.push(item);
      } else {
        pending.push(item);
      }
    });
    return [...pending, ...done];
  }, [checked]);

  const total = roomChecklistItems.length;
  const completedCount = roomChecklistItems.filter(
    (i) => checked[i.id],
  ).length;
  const pendingCount = total - completedCount;

  const handleToggle = (id: string) => {
    setChecked((prev) => {
      const next = {
        ...prev,
        [id]: !prev[id],
      };
      if (!next[id]) {
        delete next[id];
      }
      saveChecked(roomCode, next);
      return next;
    });
  };

  if (!roomCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-xs text-muted-foreground">
        Código de sala não informado.
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
        <div className="card-elevated max-w-sm space-y-2">
          <div className="text-2xl">🤔</div>
          <div className="text-sm font-semibold">
            Sala {roomCode} não encontrada
          </div>
          <p className="text-[10px] text-muted-foreground">
            Verifique se o endereço está correto. Exemplo:
            <br />
            <span className="font-mono text-[9px]">
              enem2025-beta.vercel.app/101
            </span>
          </p>
          <Link
            to="/"
            className="mt-1 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-[10px]"
          >
            Voltar ao painel do coordenador
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Cabeçalho fixo */}
      <header className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border px-4 pt-3 pb-2 shadow-sm">
        <div className="flex items-start gap-2">
          <div className="h-8 w-8 rounded-2xl bg-primary/10 flex items-center justify-center text-lg">
            🎓
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              {room.eventName} · Checklist Chefe de Sala
            </div>
            <div className="text-sm font-semibold truncate">
              Sala {room.code}
            </div>
            <div className="text-[9px] text-muted-foreground truncate">
              {room.location}
            </div>
            <div className="mt-0.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[8px] text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">
                  Dia:
                </span>{" "}
                {room.dateLabel}
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  Chefe:
                </span>{" "}
                {room.chiefName}
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  Aplicador:
                </span>{" "}
                {room.applicatorName}
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  Participantes:
                </span>{" "}
                {room.expectedParticipants} previstos
              </div>
            </div>
          </div>
        </div>
        <p className="mt-2 text-[9px] text-muted-foreground">
          Este checklist foi elaborado com base nas orientações oficiais do
          Manual do Chefe de Sala do ENEM 2025. Marque cada item à medida que
          as ações forem sendo cumpridas.
        </p>
      </header>

      {/* Lista */}
      <main className="flex-1 px-4 pt-2 pb-4 space-y-2">
        {sortedItems.map((item) => {
          const isChecked = checked[item.id];
          return (
            <div
              key={item.id}
              onClick={() => handleToggle(item.id)}
              className={cn(
                "flex items-start gap-2 rounded-2xl border px-3 py-2 mb-1 select-none cursor-pointer transition-all duration-200",
                isChecked
                  ? "bg-gray-100/95 border-gray-300 text-gray-500 shadow-none scale-[0.99]"
                  : "bg-card border-border text-foreground hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm",
              )}
            >
              <input
                type="checkbox"
                checked={isChecked}
                readOnly
                className={cn(
                  "mt-0.5 h-4 w-4 rounded border border-border cursor-pointer transition-colors",
                  isChecked && "border-gray-400 bg-gray-200",
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold leading-snug">
                      {item.title}
                      {item.critical && (
                        <span className="ml-1 text-[9px] text-destructive">
                          ⚡
                        </span>
                      )}
                    </div>
                    <div className="text-[8px] text-muted-foreground">
                      Manual do Chefe de Sala · p. {item.manualPage}
                    </div>
                  </div>
                  <InfoDialog
                    triggerIcon="i"
                    title={item.title}
                    body={`${item.description}\n\nPágina do Manual do Chefe de Sala: ${item.manualPage}.`}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Resumo final */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-[9px]">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2 flex flex-col gap-0.5">
            <div className="text-[11px]">
              ✅ Itens concluídos:{" "}
              <span className="font-semibold text-emerald-700">
                {completedCount} de {total}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2 flex flex-col gap-0.5">
            <div className="text-[11px]">
              ⚠️ Pendentes:{" "}
              <span className="font-semibold text-amber-700">
                {pendingCount}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-1 text-[7px] text-muted-foreground text-center">
          As marcações ficam salvas somente neste dispositivo (offline friendly).
        </p>
      </main>
    </div>
  );
};

export default RoomChecklistPage;