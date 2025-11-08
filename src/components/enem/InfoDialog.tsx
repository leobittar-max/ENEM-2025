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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-[0.75rem] font-semibold text-primary shadow-sm hover:bg-primary/18 transition-colors"
        aria-label={triggerLabel || "Ver detalhes do procedimento"}
      >
        {triggerIcon}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="
            max-w-xl w-[94vw] sm:w-[90vw]
            max-h-[80vh]
            bg-card/98 backdrop-blur-xl
            shadow-2xl border border-border/80
            rounded-3xl p-6
            flex flex-col gap-3
          "
        >
          <DialogHeader>
            <DialogTitle className="text-[1rem] font-semibold flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-[0.85rem]">
                i
              </span>
              <span className="leading-snug">
                {title}
              </span>
            </DialogTitle>
            <DialogDescription
              className="
                mt-3
                text-[0.9rem]
                leading-relaxed
                text-muted-foreground
                whitespace-pre-line
              "
            >
              {body}
            </DialogDescription>
          </DialogHeader>

          {sourceLabel && (
            <div
              className="
                mt-1.5 pt-2
                text-[0.7rem]
                text-muted-foreground/80
                border-t border-border/60
              "
            >
              {sourceLabel}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};