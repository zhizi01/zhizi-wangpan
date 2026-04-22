import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  name: string;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
}

export default function DeleteConfirmDialog({
  open,
  onOpenChange,
  title = '确认删除',
  name,
  onConfirm,
  isDeleting = false,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !isDeleting && onOpenChange(v)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[101] w-[min(100%,20rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-linear-border bg-linear-surface p-6 shadow-xl focus:outline-none"
          onPointerDownOutside={(e) => isDeleting && e.preventDefault()}
          onEscapeKeyDown={(e) => isDeleting && e.preventDefault()}
        >
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-400/10">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-semibold text-linear-text">{title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-linear-text-muted">
                将永久删除
                <span className="font-medium text-linear-text">「{name}」</span>
                ，此操作不可恢复。
              </Dialog.Description>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={isDeleting}
                className="rounded-lg border border-linear-border bg-linear-surface px-3 py-2 text-sm font-medium text-linear-text transition-colors hover:bg-linear-surface-hover disabled:opacity-50"
              >
                取消
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => onConfirm()}
              className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              删除
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
