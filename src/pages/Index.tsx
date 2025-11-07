import { useState } from "react";
import { useEnem2025 } from "@/hooks/use-enem-2025";
import { SetupModal } from "@/components/enem/SetupModal";
import { Sidebar } from "@/components/enem/Sidebar";
import { PreparationTab } from "@/components/enem/PreparationTab";
import { MorningTab } from "@/components/enem/MorningTab";
import { DuringTab } from "@/components/enem/DuringTab";
import { ClosingTab } from "@/components/enem/ClosingTab";
import { ReportTab } from "@/components/enem/ReportTab";
import { LogPanel } from "@/components/enem/LogPanel";
import { SupervisionarPanel } from "@/components/enem/SupervisionarPanel";
import { TeamPresencePanel } from "@/components/enem/TeamPresencePanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useRoomProgressRealtime, RoomProgress } from "@/hooks/use-room-progress-realtime";
import { RoomCompletionDialog } from "@/components/enem/RoomCompletionDialog";
import { toast } from "sonner";

const Index = () => {
  const {
    state,
    now,
    theme,
    activeTab,
    setActiveTab,
    currentStage,
    examTimeRemaining,
    preparationItems,
    morningItems,
    closingItems,
    initializeCoordinator,
    toggleTheme,
    toggleChecklistItem,
    addOccurrence,
    resetAll,
    downloadTextReport,
  } = useEnem2025();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSupervision, setShowSupervision] = useState(false);

  // Controle do popup de sala 100%
  const [completionDialog, setCompletionDialog] = useState<{
    open: boolean;
    roomLabel: string;
  }>({ open: false, roomLabel: "" });

  const coordinator = state.coordinator;

  const formattedNow = now.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const showLayout = Boolean(coordinator);

  const handleExit = () => {
    resetAll();
    setShowHistory(false);
    setShowSupervision(false);
    setSidebarOpen(false);
  };

  const handleBackToPanel = () => {
    setShowHistory(false);
    setShowSupervision(false);
  };

  const handleOpenSupervision = () => {
    setShowHistory(false);
    setShowSupervision(true);
    setSidebarOpen(false);
  };

  // Hook de progresso em tempo real: apenas se coordenador já configurado
  useRoomProgressRealtime({
    onItemCompleted: (room: RoomProgress) => {
      if (!coordinator) return;
      // Toast discreto avisando atividade concluída na sala
      toast.success(
        `Sala ${room.roomLabel} avançou no checklist (${room.completed}/${room.total}).`,
        {
          duration: 3000,
        },
      );
    },
    onRoomCompleted: (room: RoomProgress) => {
      if (!coordinator) return;
      // Popup chamativo quando sala atinge 100%
      setCompletionDialog({
        open: true,
        roomLabel: room.roomLabel,
      });
    },
  });

  return (
    <div
      className={cn(
        "min-h-screen w-full bg-background text-foreground no-x-overflow",
      )}
    >
      <SetupModal open={!coordinator} onSubmit={initializeCoordinator} />

      {completionDialog.open && (
        <RoomCompletionDialog
          open={completionDialog.open}
          roomLabel={completionDialog.roomLabel}
          onClose={() =>
            setCompletionDialog((prev) => ({
              ...prev,
              open: false,
            }))
          }
        />
      )}

      {showLayout && coordinator && (
        <div className="flex min-h-screen">
          {/* Sidebar desktop */}
          <div className="hidden md:block">
            <Sidebar
              coordinator={coordinator}
              occurrences={state.occurrences}
              currentTime={formattedNow}
              currentStage={currentStage}
              onOpenHistory={() => {
                setShowHistory(true);
                setShowSupervision(false);
              }}
              onBackToPanel={handleBackToPanel}
              onExit={handleExit}
              showBackToPanel={showHistory || showSupervision}
              onOpenSupervision={handleOpenSupervision}
            />
          </div>

          {/* Sidebar mobile overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 flex md:hidden">
              <div className="h-full w-72 bg-sidebar-background shadow-xl">
                <Sidebar
                  coordinator={coordinator}
                  occurrences={state.occurrences}
                  currentTime={formattedNow}
                  currentStage={currentStage}
                  onCloseMobile={() => setSidebarOpen(false)}
                  onOpenHistory={() => {
                    setSidebarOpen(false);
                    setShowSupervision(false);
                    setShowHistory(true);
                  }}
                  onBackToPanel={() => {
                    setSidebarOpen(false);
                    handleBackToPanel();
                  }}
                  onExit={handleExit}
                  showBackToPanel={showHistory || showSupervision}
                  onOpenSupervision={handleOpenSupervision}
                />
              </div>
              <div
                className="flex-1 bg-black/40"
                onClick={() => setSidebarOpen(false)}
              />
            </div>
          )}

          {/* Main area */}
          <div className="flex-1 flex flex-col app-safe-area">
            {/* AppBar */}
            {!showHistory && !showSupervision && (
              <header className="sticky top-0 z-30 bg-card shadow-sm border-b border-border px-4 pt-2 pb-2 flex items-center gap-3">
                <button
                  className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-full border bg-muted text-sm touch-target"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Abrir menu de navegação"
                >
                  ☰
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                    ENEM Coordinator Pro
                  </div>
                  <div className="text-sm font-semibold truncate">
                    {coordinator.location}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {coordinator.city} - {coordinator.state}
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end text-[8px] text-muted-foreground">
                  <span>
                    {formattedNow} ·{" "}
                    <span className="font-semibold text-primary">
                      {currentStage}
                    </span>
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 text-xs touch-target"
                  onClick={toggleTheme}
                  aria-label="Alternar tema claro/escuro"
                >
                  {theme === "dark" ? "☀️" : "🌙"}
                </Button>
              </header>
            )}

            {/* TabBar principal */}
            {!showHistory && !showSupervision && (
              <nav className="bg-card px-2 pb-2 pt-1 border-b border-border">
                <div className="tabbar-scroll">
                  <TabItem
                    label="Preparação"
                    icon="📋"
                    active={activeTab === "preparation"}
                    onClick={() => setActiveTab("preparation")}
                  />
                  <TabItem
                    label="Manhã"
                    icon="🌅"
                    active={activeTab === "morning"}
                    onClick={() => setActiveTab("morning")}
                  />
                  <TabItem
                    label="Durante"
                    icon="🕒"
                    active={activeTab === "during"}
                    onClick={() => setActiveTab("during")}
                  />
                  <TabItem
                    label="Encerrar"
                    icon="🔒"
                    active={activeTab === "closing"}
                    onClick={() => setActiveTab("closing")}
                  />
                  <TabItem
                    label="Relatório"
                    icon="📊"
                    active={activeTab === "report"}
                    onClick={() => setActiveTab("report")}
                  />
                </div>
              </nav>
            )}

            {/* Conteúdo central */}
            <main className="flex-1 px-4 pt-2 pb-3 md:px-6 space-y-3 no-x-overflow">
              {showHistory ? (
                <LogPanel log={state.log} />
              ) : showSupervision ? (
                <SupervisionarPanel onClose={handleBackToPanel} />
              ) : (
                <>
                  {activeTab === "preparation" && (
                    <PreparationTab
                      items={preparationItems}
                      completed={state.preparation}
                      onToggle={(id) =>
                        toggleChecklistItem("preparation", id)
                      }
                    />
                  )}
                  {activeTab === "morning" && (
                    <MorningTab
                      items={morningItems}
                      examDay={coordinator.examDay}
                      completed={state.morning}
                      onToggle={(id) =>
                        toggleChecklistItem("morning", id)
                      }
                    />
                  )}
                  {activeTab === "during" && (
                    <DuringTab
                      examTimeRemaining={examTimeRemaining}
                      stats={state.stats}
                      occurrences={state.occurrences}
                      onAddOccurrence={addOccurrence}
                    />
                  )}
                  {activeTab === "closing" && (
                    <ClosingTab
                      items={closingItems}
                      completed={state.closing}
                      onToggle={(id) =>
                        toggleChecklistItem("closing", id)
                      }
                      stats={state.stats}
                      occurrences={state.occurrences}
                    />
                  )}
                  {activeTab === "report" && (
                    <ReportTab
                      coordinator={coordinator}
                      preparation={state.preparation}
                      morning={state.morning}
                      closing={state.closing}
                      occurrences={state.occurrences}
                      preparationItems={preparationItems}
                      morningItems={morningItems}
                      closingItems={closingItems}
                      onDownloadTxt={downloadTextReport}
                      onReset={resetAll}
                    />
                  )}

                  {/* Painel de presença da equipe logo abaixo do conteúdo principal */}
                  <TeamPresencePanel />

                  <div className="pt-2">
                    <MadeWithDyad />
                  </div>
                </>
              )}
            </main>

            {/* Rodapé mobile */}
            {!showHistory && !showSupervision && (
              <div className="px-4 pb-2 pt-1 flex gap-2 md:hidden bg-background border-t border-border">
                <Button
                  className="flex-1 touch-target text-xs font-semibold"
                  variant="outline"
                  onClick={downloadTextReport}
                  aria-label="Exportar relatório do local em arquivo TXT"
                >
                  📄 Exportar Relatório
                </Button>
                <Button
                  className="w-24 touch-target text-xs font-semibold"
                  variant="ghost"
                  onClick={handleExit}
                  aria-label="Sair e reiniciar configuração"
                >
                  ⏏ Sair
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface TabItemProps {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}

const TabItem = ({ label, icon, active, onClick }: TabItemProps) => (
  <button
    onClick={onClick}
    className={cn("tab-item", active && "tab-item-active")}
    aria-label={`Ir para aba ${label}`}
  >
    <span className="text-base">{icon}</span>
    <span>{label}</span>
  </button>
);

export default Index;