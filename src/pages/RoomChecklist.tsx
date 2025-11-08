import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getSimpleRoom } from "@/components/enem/room-data";
import {
  roomChecklistItems,
  RoomChecklistItem,
} from "@/components/enem/room-checklist-data";
import { InfoDialog } from "@/components/enem/InfoDialog";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "enem2025_room_checklist_v2";

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

  useEffect(() => {
    if (!roomCode) return;
    setChecked(loadChecked(roomCode));
  }, [roomCode]);

  const items: RoomChecklistItem[] = useMemo(
    () => roomChecklistItems,
    [],
  );

  const total = items.length;
  const completedCount = items.filter((i) => checked[i.id]).length;
  const pendingCount = total - completedCount;

  const handleToggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!next[id]) delete next[id];
      saveChecked(roomCode, next);
      return next;
    });
  };

  if (!roomCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-[0.8rem] text-muted-foreground px-4 text-center">
        Código de sala não informado.
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
        <div className="card-elevated max-w-sm space-y-2">
          <div className="text-2xl">🤔</div>
          <div className="text-[0.9rem] font-semibold">
            Sala {roomCode} não encontrada
          </div>
          <p className="text-[0.75rem] text-muted-foreground">
            Verifique se o endereço está correto. Exemplos válidos:
            <br />
            <span className="font-mono text-[0.7rem] block">
              https://enem-2025-kohl.vercel.app/101
            </span>
            <span className="font-mono text-[0.7rem] block">
              https://enem-2025-kohl.vercel.app/102
            </span>
            <span className="font-mono text-[0.7rem] block">
              https://enem-2025-kohl.vercel.app/103
            </span>
          </p>
          <Link
            to="/"
            className="mt-1 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-[0.8rem]"
          >
            Voltar ao painel do coordenador
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col no-x-overflow">
      <header className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border px-4 pt-3 pb-2 shadow-sm">
        <div className="flex items-start gap-2">
          <div className="h-8 w-8 rounded-2xl bg-primary/10 flex items-center justify-center text-lg">
            🎓
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              ENEM 2025 · Checklist Chefe de Sala
            </div>
            <div className="text-[0.95rem] font-semibold truncate">
              Sala {room.code}
            </div>
            <div className="text-[0.75rem] text-muted-foreground truncate">
              {room.location}
            </div>
            <div className="mt-0.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[0.7rem] text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">Dia:</span>{" "}
                {room.dateLabel}
              </div>
              <div>
                <span className="font-semibold text-foreground">Chefe:</span>{" "}
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
        <p className="mt-2 text-[0.7rem] text-muted-foreground">
          Marque cada item conforme os procedimentos forem executados. A ordem
          segue o fluxo oficial para facilitar a leitura e evitar confusão.
        </p>
      </header>

      <main className="flex-1 px-4 pt-2 pb-4 space-y-2">
        {items.map((item) => {
          const isChecked = !!checked[item.id];
          return (
            <div
              key={item.id}
              onClick={() => handleToggle(item.id)}
              className={cn(
                "checklist-item mb-1 cursor-pointer select-none transition-all duration-200",
                isChecked
                  ? "bg-gray-100/95 border-gray-300 text-gray-600 shadow-none scale-[0.99] checklist-marked"
                  : "bg-card border-border text-foreground hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm",
              )}
            >
              <div className="flex flex-col items-center justify-center w-16">
                <div className="text-[0.65rem] font-semibold text-primary truncate">
                  {item.hora_sugerida || "--"}
                </div>
                <div className="text-[0.6rem] text-muted-foreground truncate text-center">
                  {item.fase}
                </div>
              </div>
              <input
                type="checkbox"
                checked={isChecked}
                readOnly
                className={cn(
                  "h-4 w-4 rounded border border-border cursor-pointer mt-0.5 transition-colors",
                  isChecked && "border-primary bg-primary text-primary-foreground",
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.8rem] font-semibold leading-snug">
                      {item.titulo}
                      {item.critical && (
                        <span className="ml-1 text-[0.7rem] text-destructive">
                          ⚡
                        </span>
                      )}
                    </div>
                    <div className="text-[0.65rem] text-muted-foreground">
                      {item.papel || "Chefe de Sala/Aplicador"}
                    </div>
                  </div>
                  {item.info && (
                    <InfoDialog
                      triggerIcon="i"
                      title={item.info.titulo || item.titulo}
                      body={`${item.info.corpo}\n\nFonte: Manual do ${item.info.fonte.manual}, p. ${item.info.fonte.pagina}.`}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="mt-3 grid grid-cols-2 gap-2 text-[0.7rem]">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2">
            <div className="text-[0.8rem]">
              ✅ Itens concluídos:{" "}
              <span className="font-semibold text-emerald-700">
                {completedCount} de {total}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2">
            <div className="text-[0.8rem]">
              ⚠️ Pendentes:{" "}
              <span className="font-semibold text-amber-700">
                {pendingCount}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-1 text-[0.6rem] text-muted-foreground text-center">
          As marcações ficam salvas somente neste dispositivo (offline).
        </p>
      </main>
    </div>
  );
};

export default RoomChecklistPage;