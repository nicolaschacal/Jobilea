import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { buttonVariants } from "./ui/button";

interface DeleteAlertDialogProps {
  pageTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  alertTitle?: string;
  alertDescription?: ReactNode;
  deleteAction?: boolean;
  actionLabel?: string;
  actionVariant?: "destructive" | "default";
}

export function DeleteAlertDialog({
  open,
  onOpenChange,
  onDelete,
  alertTitle,
  alertDescription = "No se puede deshacer. Se borra para siempre.",
  deleteAction = true,
  actionLabel = "Eliminar",
  actionVariant = "destructive",
}: DeleteAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {alertTitle ?? "¿Seguro que querés eliminarlo?"}
          </AlertDialogTitle>
          {/* asChild: a description may carry a list, which cannot nest in a p. */}
          <AlertDialogDescription asChild>
            <div>{alertDescription}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {deleteAction && (
            <AlertDialogAction
              className={buttonVariants({ variant: actionVariant })}
              onClick={onDelete}
            >
              {actionLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
