import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface InfoDialogProps {
  triggerLabel?: string;
  triggerIcon?: string;
  title: string;
  body: string;
  sourceLabel?: string;
}

export const InfoDialog = ({
  triggerLabel,
  triggerIcon = "i",
  title,
  body,
  sourceLabel,
}: InfoDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botão de gatilho mais visível e fácil de tocar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          ml-1
          inline-flex items-center justify-center
          h-8 w-8
          rounded-full
          bg-primary
          text-white
          text-sm font-semibold
          shadow-md
          hover:bg-primary/90
          active:scale-[0.96]
          transition-all
        "
        aria-label={triggerLabel || "Ver detalhes do procedimento"}
      >
        {triggerIcon.toUpperCase()}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="
            max-w-2xl
            w-[96vw] sm:w-[90vw]
            max-h-[85vh]
            bg-card
            shadow-2xl
            border border-border
            rounded-3xl
            px-6 py-6
            flex flex-col gap-4
            overflow-hidden
          "
        >
          <DialogHeader className="pb-1">
            <DialogTitle
              className="
                flex items-center gap-3
                text-[1.15rem] sm:text-[1.25rem]
                font-semibold
                text-foreground
              "
            >
              <span
                className="
                  inline-flex items-center justify-center
                  h-9 w-9 sm:h-10 sm:w-10
                  rounded-full
                  bg-primary
                  text-primary-foreground
                  text-[0.95rem] sm:text-[1.05rem]
                  font-bold
                  shadow-md
                "
              >
                i
              </span>
              <span className="leading-snug">
                {title}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Conteúdo rolável para textos longos */}
          <div
            className="
              flex-1
              overflow-y-auto
              pr-1
              space-y-3
            "
          >
            <DialogDescription
              className="
                text-[0.95rem] sm:text-[1rem]
                leading-relaxed
                text-foreground
                whitespace-pre-line
              "
            >
              {body}
            </DialogDescription>

            {sourceLabel && (
              <div
                className="
                  pt-3 mt-1
                  border-t border-border/80
                  text-[0.8rem] sm:text-[0.85rem]
                  text-muted-foreground
                "
              >
                {sourceLabel}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};