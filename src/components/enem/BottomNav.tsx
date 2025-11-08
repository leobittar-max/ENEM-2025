import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

type BottomNavVariant = "root" | "external";

interface BottomNavProps {
  variant?: BottomNavVariant;
  onNavigatePanel?: () => void;
  onNavigateSupervision?: () => void;
  onNavigateProva?: () => void;
  onNavigateRelatorio?: () => void;
}

/**
 * Menu inferior estilo Android premium.
 * - variant="root": usado na página principal, chama callbacks para trocar abas/seções sem recarregar.
 * - variant="external": usado em páginas independentes, usa rotas para voltar às telas principais.
 */
export const BottomNav = ({
  variant = "external",
  onNavigatePanel,
  onNavigateSupervision,
  onNavigateProva,
  onNavigateRelatorio,
}: BottomNavProps) => {
  const location = useLocation();
  const isRoot = variant === "root";

  const currentPath = location.pathname;

  const items = [
    {
      key: "panel",
      label: "Painel",
      icon: "🏠",
      isActive: isRoot
        ? !currentPath.includes("/chefe/") &&
          !currentPath.includes("/relatorio") &&
          !currentPath.includes("supervisao") &&
          !currentPath.includes("supervisionar")
        : currentPath === "/",
      onClick: () => {
        if (isRoot && onNavigatePanel) onNavigatePanel();
      },
      to: "/",
    },
    {
      key: "supervisao",
      label: "Supervisão",
      icon: "🕵️",
      isActive:
        currentPath.includes("supervisao") ||
        currentPath.includes("supervisionar"),
      onClick: () => {
        if (isRoot && onNavigateSupervision) onNavigateSupervision();
      },
      to: "/",
    },
    {
      key: "prova",
      label: "Prova",
      icon: "🕒",
      isActive: false, // controlado via callback no root
      onClick: () => {
        if (isRoot && onNavigateProva) onNavigateProva();
      },
      to: "/",
    },
    {
      key: "relatorio",
      label: "Relatório",
      icon: "📑",
      isActive: currentPath.includes("relatorio"),
      onClick: () => {
        if (isRoot && onNavigateRelatorio) onNavigateRelatorio();
      },
      to: "/",
    },
  ];

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-card/98 backdrop-blur-md border-t border-border/70",
        "px-4 pb-[env(safe-area-inset-bottom,0.5rem)] pt-1.5",
        "md:max-w-[480px] md:left-1/2 md:-translate-x-1/2 md:rounded-3xl md:mb-2 md:shadow-[0_8px_28px_rgba(15,23,42,0.22)]",
      )}
    >
      <div className="flex items-stretch justify-between gap-2">
        {items.map((item) => {
          const active = item.isActive;
          const content = (
            <button
              type="button"
              onClick={isRoot ? item.onClick : undefined}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5",
                "py-1.5 touch-target min-h-[42px]",
                "relative transition-colors",
                active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="text-[1.2rem] leading-none">
                {item.icon}
              </span>
              <span className="text-[0.7rem] tracking-wide">
                {item.label}
              </span>
              {active && (
                <span className="absolute left-3 right-3 bottom-0 h-[3px] rounded-full bg-primary" />
              )}
            </button>
          );

          if (!isRoot) {
            return (
              <Link
                key={item.key}
                to={item.to}
                className="flex-1"
              >
                {content}
              </Link>
            );
          }

          return (
            <div key={item.key} className="flex-1">
              {content}
            </div>
          );
        })}
      </div>
    </nav>
  );
};