'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Loader2, Info, X } from 'lucide-react';
import { ToastMessage } from '@/lib/types';

interface ToasterProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toaster: React.FC<ToasterProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="absolute top-12 right-3 z-50 flex flex-col gap-1.5 max-w-xs w-full pointer-events-none font-sans select-none">
      {toasts.map((toast) => {
        let borderClass = 'border-[var(--border-default)]';
        let icon = <Info className="w-3.5 h-3.5 text-[var(--accent-text)] shrink-0" />;

        if (toast.type === 'error') {
          borderClass = 'border-[var(--status-error)] text-[var(--status-error)]';
          icon = <AlertCircle className="w-3.5 h-3.5 text-[var(--status-error)] shrink-0" />;
        } else if (toast.type === 'success') {
          borderClass = 'border-[var(--status-success)] text-[var(--status-success)]';
          icon = <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-success)] shrink-0" />;
        } else if (toast.type === 'loading') {
          borderClass = 'border-[var(--accent)] text-[var(--accent-text)]';
          icon = <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)] shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-2 p-2 rounded-[var(--radius-sm)] border bg-[var(--bg-surface)] text-[11px] leading-snug shadow-sm ${borderClass}`}
          >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 text-[var(--text-primary)] break-words font-medium">
              {toast.message}
            </div>
            {toast.type !== 'loading' && (
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="p-0.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
