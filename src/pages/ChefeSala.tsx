import { useParams } from "react-router-dom";
import { useChefeSala } from "@/hooks/use-chefe-sala";
import { InfoDialog } from "@/components/enem/InfoDialog";
import { cn } from "@/lib/utils";

const ChefeSalaPage = () => {
  const { token } = useParams<{ token: string }>();
  const { loading, error, roomName, chiefName, date, items, toggleItem } =
    useChefeSala(token);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-xs text-muted-foreground">
        Carregando painel do Chefe de Sala...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-sm rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-center space-y-2">
          <div className="text-lg">⚠️</div>
          <div className="text-sm font-semibold text-destructive">
            Não foi possível acessar este painel
          </div>
          <div className="text-xs text-muted-foreground">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-3 space-y-3 no-x-overflow">
      {/* Cabeçalho */}
      <header className="card-elevated flex items-start gap-3">
        <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center text-xl">
          🎓
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            ENEM 2025 · Painel Chefe de Sala
          </div>
          <div className="text-sm font-semibold truncate">
            Sala {roomName || "-"}
          </div>
          <div className="text-[9px] text-muted-foreground truncate">
            Chefe: {chiefName || "-"} · Data: {date}
          </div>
          <div className="mt-1 text-[8px] text-muted-foreground">
            Use este painel apenas nesta sala. Itens marcados são enviados
            ao Coordenador em tempo quase real.
          </div>
        </div>
      </header>

      {/* Checklist */}
      <main className="space-y-3 pb-4">
        {groupByBlock(items).map(({ bloco, itens }) => (
          <section key={bloco} className="space-y-1.5">
            <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
              {bloco}
            </div>
            <div className="space-y-1.5">
              {itens.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-2 rounded-2xl border bg-card px-3 py-2 shadow-sm",
                    item.checked && "border-primary/40 bg-primary/5",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border border-border cursor-pointer"
                    checked={item.checked}
                    onChange={() => toggleItem(item.id)}
                    aria-label={`Marcar item ${item.id} como concluído`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-semibold text-foreground">
                          {item.id} · {item.titulo}
                        </div>
                        {item.updated_at && (
                          <div className="text-[8px] text-muted-foreground">
                            Atualizado em {formatTime(item.updated_at)}
                          </div>
                        )}
                      </div>
                      <InfoDialog
                        triggerIcon="i"
                        title={item.titulo}
                        body={`${item.corpo}${
                          item.fonte_manual && item.fonte_pagina
                            ? `\n\nFonte: Manual do ${item.fonte_manual}, p.${item.fonte_pagina}.`
                            : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {items.length === 0 && (
          <div className="card-elevated text-[10px] text-muted-foreground text-center">
            Nenhum checklist configurado para este perfil de Chefe de Sala.
            Entre em contato com a coordenação do local.
          </div>
        )}
      </main>
    </div>
  );
};

function groupByBlock(items: ReturnType<typeof useChefeSala>["items"]) {
  const map: Record<string, typeof items> = {};
  items.forEach((i) => {
    if (!map[i.bloco]) map[i.bloco] = [];
    map[i.bloco].push(i);
  });
  return Object.entries(map).map(([bloco, itens]) => ({ bloco, itens }));
}

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default ChefeSalaPage;