import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface NativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accentColor?: 'cyan' | 'mint' | 'amber' | 'crimson';
  variant?: 'center' | 'bottom-sheet';
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export const NativeModal: React.FC<NativeModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  variant = 'center',
  headerAction,
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Modern Web Guidance: light-dismiss-a-dialog fallback for browsers without closedBy support
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };

    dialog.addEventListener('close', handleClose);

    let handleBackdropClick: ((event: MouseEvent) => void) | null = null;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;

        if (isDialogContent) return;
        dialog.close();
      };
      dialog.addEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      if (handleBackdropClick) {
        dialog.removeEventListener('click', handleBackdropClick);
      }
    };
  }, [onClose]);

  const positionClasses =
    variant === 'bottom-sheet'
      ? 'w-[94vw] max-w-[406px] mx-auto mt-auto rounded-3xl border border-theme max-h-[85vh] z-50'
      : 'w-[94vw] max-w-[386px] m-auto rounded-2xl border border-theme max-h-[86vh] z-50';

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      style={
        variant === 'bottom-sheet'
          ? {
              bottom: 0,
              marginBottom: 'max(env(safe-area-inset-bottom, 16px), 20px)',
            }
          : undefined
      }
      className={`${positionClasses} bg-surface/95 backdrop-blur-xl text-primary p-0 open:flex open:flex-col overflow-hidden shadow-2xl transition-colors duration-200`}
    >
      {variant === 'bottom-sheet' && (
        <div className="pt-2.5 pb-0.5 flex justify-center bg-surface/95 shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
        </div>
      )}

      {/* Sticky Header with optional headerAction next to Close button */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-surface/95 backdrop-blur-md border-b border-theme">
        <div className="min-w-0 pr-2">
          <h2 id={titleId} className="text-sm font-extrabold tracking-tight text-primary truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] font-mono font-semibold text-muted mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {headerAction}
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close modal"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-muted border border-theme hover:opacity-80 text-muted hover:text-primary active:scale-95 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Content Container with generous bottom padding (pb-8 / 2rem) */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-3 pb-8"
        style={{ paddingBottom: '2rem' }}
      >
        {isOpen ? children : null}
      </div>
    </dialog>
  );
};
