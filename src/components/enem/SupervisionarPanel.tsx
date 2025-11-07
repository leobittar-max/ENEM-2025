import { useEffect, useMemo, useState } from "react";
import { InfoDialog } from "@/components/enem/InfoDialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type SupervisionChecklistItem = {
  id: string;
  bloco: string;
  titulo: string;
  info_popup: {
    titulo: string;
    corpo: string;
    fonte: {
      manual: string;
      pagina: number;
    };
  };
};

const supervisionData: SupervisionChecklistItem[] = [
  {
    id: "A-01",
    bloco: "Antes das provas",
    titulo:
      "Identificar participantes e orientar sobre documentos, envelope porta-objetos e itens proibidos",
    info_popup: {
      titulo: "Identificação e orientações iniciais",
      corpo:
        "Conferir documento com foto (físico ou digital oficial), confirmar nome civil/social, orientar sobre objetos proibidos e uso do envelope porta-objetos.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 2,
      },
    },
  },
  {
    id: "A-02",
    bloco: "Antes das provas",
    titulo:
      "Lacrar envelope porta-objetos e manter embaixo da carteira",
    info_popup: {
      titulo: "Uso correto do envelope porta-objetos",
      corpo:
        "Recolher celulares e eletrônicos desligados, lacrar o envelope identificado e manter embaixo da carteira.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 4,
      },
    },
  },
  {
    id: "A-03",
    bloco: "Antes das provas",
    titulo:
      "Realizar vistoria eletrônica com detector de metais",
    info_popup: {
      titulo: "Vistoria eletrônica obrigatória",
      corpo:
        "Executar a vistoria eletrônica de forma padronizada, em modo sonoro. Em caso de recusa ou alerta, solicitar fiscal volante e acionar a Coordenação.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 4,
      },
    },
  },
  {
    id: "A-04",
    bloco: "Antes das provas",
    titulo:
      "Controlar ida ao banheiro com fiscal volante (um por vez)",
    info_popup: {
      titulo: "Saída controlada para banheiro",
      corpo:
        "Permitir saída sempre acompanhada por fiscal volante, um participante por vez. Se a saída ocorrer antes do início, refazer identificação e vistoria.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 3,
      },
    },
  },
  {
    id: "B-01",
    bloco: "Distribuição e início",
    titulo:
      "Conferir número da sala nos envelopes e quantitativos recebidos",
    info_popup: {
      titulo: "Conferência dos materiais de sala",
      corpo:
        "Conferir se os envelopes correspondem à sala correta e se a quantidade de materiais está adequada.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 2,
      },
    },
  },
  {
    id: "B-02",
    bloco: "Distribuição e início",
    titulo:
      "Dar avisos obrigatórios e registrar horários no quadro",
    info_popup: {
      titulo: "Avisos e horários de referência",
      corpo:
        "Registrar no quadro os horários oficiais e reforçar regras de permanência mínima.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 2,
      },
    },
  },
  {
    id: "B-03",
    bloco: "Distribuição e início",
    titulo:
      "Abrir envelope com testemunha e distribuir material nominalmente",
    info_popup: {
      titulo: "Abertura e distribuição",
      corpo:
        "Abrir o envelope com testemunha e distribuir material nominalmente, com atenção a nomes iguais e Nome Social.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 3,
      },
    },
  },
  {
    id: "B-04",
    bloco: "Distribuição e início",
    titulo:
      "Reportar ausentes e tratar sala 100% ausente via Coordenação",
    info_popup: {
      titulo: "Gestão de ausências",
      corpo:
        "Reportar ausentes na janela indicada e seguir o procedimento específico para sala 100% ausente.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 3,
      },
    },
  },
  {
    id: "C-01",
    bloco: "Durante a aplicação",
    titulo:
      "Manter procedimento de vistoria eletrônica e exceções conforme regras",
    info_popup: {
      titulo: "Boas práticas de segurança",
      corpo:
        "Aplicar a vistoria eletrônica sempre que necessário, respeitando exceções previstas.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 4,
      },
    },
  },
  {
    id: "C-02",
    bloco: "Durante a aplicação",
    titulo:
      "Controlar saídas e permanência mínima de 2 horas",
    info_popup: {
      titulo: "Controle de fluxo e horários",
      corpo:
        "Organizar saídas acompanhadas, garantindo permanência mínima de 2 horas.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 3,
      },
    },
  },
  {
    id: "C-03",
    bloco: "Durante a aplicação",
    titulo:
      "Fazer leituras de tempo (60 min e 15 min finais) e orientar sobre caderno",
    info_popup: {
      titulo: "Avisos de tempo e caderno",
      corpo:
        "Anunciar marcos de tempo finais e reforçar regras para levar o caderno.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 5,
      },
    },
  },
  {
    id: "C-04",
    bloco: "Durante a aplicação",
    titulo:
      "Registrar ocorrências em ata/sistema imediatamente",
    info_popup: {
      titulo: "Rastreabilidade das ocorrências",
      corpo:
        "Registrar imediatamente ocorrências relevantes, acionando Coordenação em casos críticos.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 2,
      },
    },
  },
  {
    id: "D-01",
    bloco: "Encerramento e devolução",
    titulo:
      "Anunciar término, recolher materiais e interromper marcações",
    info_popup: {
      titulo: "Fechamento de prova em sala",
      corpo:
        "Anunciar término, interromper marcações e recolher materiais oficiais.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 5,
      },
    },
  },
  {
    id: "D-02",
    bloco: "Encerramento e devolução",
    titulo:
      "Preencher Lista de Presença e Ata de Sala com assinaturas finais",
    info_popup: {
      titulo: "Documentação de encerramento",
      corpo:
        "Conferir presentes/ausentes, registrar ocorrências na ata e colher assinaturas finais.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 2,
      },
    },
  },
  {
    id: "D-03",
    bloco: "Encerramento e devolução",
    titulo:
      "Organizar e devolver materiais à Coordenação",
    info_popup: {
      titulo: "Entrega organizada dos materiais",
      corpo:
        "Organizar materiais por envelope correto e devolver à Coordenação.",
      fonte: {
        manual: "Chefe de Sala",
        pagina: 2,
      },
    },
  },
];

const STORAGE_KEY = "enem2025_supervision_v1";

type SupervisionStatus = {
  checked: boolean;
  timestamp?: string;
};

// Mapa de itens por sala+chefe
type SupervisionRoomMap = Record<string, SupervisionStatus>;

// store[data][sala::chefe] = SupervisionRoomMap
type SupervisionStore = Record<string, Record<string, SupervisionRoomMap>>;

function getApplicationDate(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

function buildKey(sala: string, chefe: string) {
  const cleanSala = sala.trim();
  const cleanChefe = chefe.trim();
  if (!cleanSala || !cleanChefe) return "";
  return `${cleanSala}::${cleanChefe}`;
}

function loadStore(): SupervisionStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SupervisionStore) : {};
  } catch {
    return {};
  }
}

function saveStore(store: SupervisionStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

interface SupervisionarPanelProps {
  onClose?: () => void;
}

interface RoomProgress {
  roomId: string;
  roomLabel: string;
  completed: number;
  total: number;
}

export const SupervisionarPanel = ({ onClose }: SupervisionarPanelProps) => {
  const [sala, setSala] = useState("");
  const [chefe, setChefe] = useState("");
  const [store, setStore] = useState<SupervisionStore>(() => loadStore());
  const [roomsProgress, setRoomsProgress] = useState<RoomProgress[]>([]);

  const dataAplicacao = getApplicationDate();
  const currentKey = buildKey(sala, chefe);

  useEffect(() => {
    setStore(loadStore());
  }, []);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  // Carrega progresso por sala a partir do Supabase (usado pelo coordenador)
  useEffect(() => {
    async function loadProgress() {
      const today = getApplicationDate();
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id, code, name");

      if (!rooms || rooms.length === 0) {
        setRoomsProgress([]);
        return;
      }

      const { data: items } = await supabase
        .from("checklist_items")
        .select("id")
        .eq("role", "chefe_sala");

      const totalById = items ? items.length : 0;
      if (!items || items.length === 0) {
        setRoomsProgress([]);
        return;
      }

      const { data: status } = await supabase
        .from("checklist_status")
        .select("room_id, item_id, checked")
        .eq("date", today);

      const progress: RoomProgress[] = rooms.map((room) => {
        const st = (status || []).filter(
          (s) => s.room_id === room.id && s.checked,
        );
        return {
          roomId: room.id,
          roomLabel: room.name || room.code,
          completed: st.length,
          total: totalById,
        };
      });

      setRoomsProgress(progress);
    }

    loadProgress();
  }, []);

  const currentStatus: SupervisionRoomMap = useMemo(() => {
    if (!currentKey) return {};
    return store[dataAplicacao]?.[currentKey] || {};
  }, [store, dataAplicacao, currentKey]);

  const grouped = useMemo(() => {
    const byBlock: Record<string, SupervisionChecklistItem[]> = {};
    supervisionData.forEach((item) => {
      if (!byBlock[item.bloco]) byBlock[item.bloco] = [];
      byBlock[item.bloco].push(item);
    });
    return byBlock;
  }, []);

  const handleToggle = (itemId: string) => {
    if (!currentKey) return;
    setStore((prev) => {
      const next: SupervisionStore = { ...prev };

      if (!next[dataAplicacao]) next[dataAplicacao] = {};
      if (!next[dataAplicacao][currentKey]) {
        next[dataAplicacao][currentKey] = {};
      }

      const roomMap = next[dataAplicacao][currentKey];
      const prevItem = roomMap[itemId];
      const checked = !prevItem?.checked;

      roomMap[itemId] = {
        checked,
        timestamp: checked
          ? new Date().toLocaleTimeString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : undefined,
      };

      return next;
    });
  };

  const totalItems = supervisionData.length;
  const completedCount = supervisionData.filter(
    (item) => currentStatus[item.id]?.checked,
  ).length;
  const progress =
    totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  return (
    <div className="space-y-3 no-x-overflow">
      <div className="card-elevated flex items-start gap-3">
        <div className="h-8 w-8 rounded-2xl bg-primary/10 flex items-center justify-center text-lg">
          🕵️
        </div>
        <div className="space-y-0.5">
          <div className="text-xs font-semibold">
            Supervisionar Chefes de Sala
          </div>
          <p className="text-[10px] text-muted-foreground">
            Veja o progresso dos checklists por sala (dados via Supabase) e,
            abaixo, utilize o checklist rápido para registrar sua própria
            supervisão presencial por sala e Chefe.
          </p>
        </div>
      </div>

      {/* Visão geral de progresso por sala */}
      <div className="card-elevated space-y-1.5">
        <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
          Visão geral das salas
        </div>
        {roomsProgress.length === 0 ? (
          <div className="text-[9px] text-muted-foreground">
            Nenhuma sala cadastrada no Supabase. Cadastre salas e chefes para
            acompanhar aqui.
          </div>
        ) : (
          <div className="space-y-1.5">
            {roomsProgress.map((room) => {
              const pct =
                room.total > 0
                  ? Math.round((room.completed / room.total) * 100)
                  : 0;
              return (
                <div
                  key={room.roomId}
                  className="flex flex-col gap-0.5 rounded-2xl border bg-card px-3 py-2"
                >
                  <div className="flex items-center justify-between text-[9px]">
                    <div className="font-semibold truncate">
                      Sala {room.roomLabel}
                    </div>
                    <div className="text-muted-foreground">
                      {room.completed}/{room.total} · {pct}%
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        pct >= 80
                          ? "bg-emerald-500"
                          : pct >= 40
                          ? "bg-amber-400"
                          : "bg-red-400",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form local para checklist de supervisão manual por sala+chefe (offline/local) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className="text-[9px] font-semibold text-muted-foreground">
            Data da aplicação
          </label>
          <div className="px-3 py-2 rounded-2xl bg-muted text-[10px] border border-border">
            {dataAplicacao}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-semibold text-muted-foreground">
            Sala
          </label>
          <Input
            placeholder="Ex: 101, 2º andar..."
            value={sala}
            onChange={(e) => setSala(e.target.value)}
            className="text-[10px] rounded-2xl h-9 py-1.5"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-semibold text-muted-foreground">
            Chefe de Sala (observado)
          </label>
          <Input
            placeholder="Nome do Chefe observado"
            value={chefe}
            onChange={(e) => setChefe(e.target.value)}
            className="text-[10px] rounded-2xl h-9 py-1.5"
          />
        </div>
      </div>

      {currentKey ? (
        <div className="card-elevated flex items-center gap-3 text-[9px]">
          <div className="flex-1">
            <div className="font-semibold text-xs">
              Progresso da supervisão presencial
            </div>
            <div className="text-muted-foreground">
              {completedCount}/{totalItems} itens marcados
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-full border text-[9px] text-muted-foreground hover:bg-muted"
            >
              Voltar ao painel
            </button>
          )}
        </div>
      ) : (
        <div className="card-elevated text-[9px] text-muted-foreground">
          Informe sala e nome do Chefe de Sala para registrar a supervisão
          presencial detalhada abaixo.
        </div>
      )}

      {/* Checklist de supervisão manual (localStorage) */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([block, items]) => (
          <div key={block} className="space-y-1.5">
            <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
              {block}
            </div>
            <div className="space-y-1.5">
              {items.map((item) => {
                const status = currentStatus[item.id];
                const checked = Boolean(status?.checked);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-start gap-2 rounded-2xl border bg-card px-3 py-2 shadow-sm",
                      checked && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border border-border cursor-pointer"
                      checked={checked}
                      onChange={() => handleToggle(item.id)}
                      aria-label={`Marcar item ${item.id} como concluído`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-semibold text-foreground">
                            {item.id} · {item.titulo}
                          </div>
                          {status?.timestamp && (
                            <div className="text-[8px] text-muted-foreground">
                              Marcado às {status.timestamp}
                            </div>
                          )}
                        </div>
                        <InfoDialog
                          triggerIcon="i"
                          title={item.info_popup.titulo}
                          body={`${item.info_popup.corpo}\n\nFonte: Manual do Chefe de Sala, p.${item.info_popup.fonte.pagina}.`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};