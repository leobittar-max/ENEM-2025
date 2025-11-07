import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RoomCompletionDialogProps {
  open: boolean;
  roomLabel: string;
  onClose: () => void;
}

export const RoomCompletionDialog = ({
  open,
  roomLabel,
  onClose,
}: RoomCompletionDialogProps) => {
  useEffect(() => {
    if (!open) return;
    const audio = new Audio(
      "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg",
    );
    audio.volume = 0.2;
    audio.play().catch(() => {
      // Ignora falha de autoplay silenciosamente
    });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm w-[92vw] rounded-3xl border-2 border-emerald-400 bg-gradient-to-b from-emerald-50 via-white to-emerald-50 shadow-2xl flex flex-col items-center gap-3 py-6">
        <DialogHeader className="w-full text-center space-y-2">
          <DialogTitle className="flex flex-col items-center gap-2 text-lg font-extrabold text-emerald-700">
            <span className="text-4xl animate-bounce">🎉</span>
            Sala concluída com sucesso!
          </DialogTitle>
          <DialogDescription className="text-xs text-emerald-800 font-medium">
            A <span className="font-semibold">{roomLabel}</span> atingiu
            100% das atividades do checklist de Chefe de Sala.
          </DialogDescription>
        </DialogHeader>
        <div className="w-full px-4 flex flex-col items-center gap-2">
          <div className="w-full h-2 rounded-full bg-emerald-100 overflow-hidden">
            <div className="h-full w-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-[10px] text-emerald-700 text-center">
            Você pode registrar este status no seu relatório final e focar nas
            demais salas que ainda não concluíram.
          </p>
        </div>
        <Button
          onClick={onClose}
          className="mt-2 px-6 py-2 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
        >
          Entendido, continuar acompanhando
        </Button>
      </DialogContent>
    </Dialog>
  );
};